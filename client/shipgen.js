// =====================================================================
//  SHIPGEN — the geometry engine behind every ship, part and wreck.
//
//  Ships are built straight into one vertex stream per material (a Batch),
//  so a whole ship is a handful of draw calls however much detail it has.
//  Hulls are smooth lofts through rounded cross-sections (superellipses);
//  details are placed on the hull's analytic surface (hullFrame), so they
//  sit flush instead of floating. Every design builds at two levels of
//  detail: lod 0 up close, lod 1 for distant ships.
//  Concatenated after shipkit.js, before ships.js (shared module scope).
// =====================================================================

const _m4 = new THREE.Matrix4(), _n3 = new THREE.Matrix3(), _v = new THREE.Vector3(), _w = new THREE.Vector3();

// ---------------------------------------------------------------------
//  Raw geometry: non-indexed triangles { p: number[], n: number[] }
// ---------------------------------------------------------------------
function rawOf(g) {
  const ng = g.index ? g.toNonIndexed() : g;
  if (!ng.attributes.normal) ng.computeVertexNormals();
  return { p: Array.from(ng.attributes.position.array), n: Array.from(ng.attributes.normal.array) };
}
function rawFlat(g) { // hard edges: every face keeps its own normal
  const ng = g.index ? g.toNonIndexed() : g.clone();
  ng.deleteAttribute('normal'); ng.computeVertexNormals();
  return { p: Array.from(ng.attributes.position.array), n: Array.from(ng.attributes.normal.array) };
}
// a placement matrix: position, rotation (Euler array, Quaternion) and scale
function T(pos = [0, 0, 0], rot = null, scl = null) {
  const q = rot instanceof THREE.Quaternion ? rot : new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0])));
  const s = scl == null ? [1, 1, 1] : typeof scl === 'number' ? [scl, scl, scl] : scl;
  return new THREE.Matrix4().compose(new THREE.Vector3(...pos), q, new THREE.Vector3(...s));
}

// ---------------------------------------------------------------------
//  Batch: per-material vertex streams with a transform stack
// ---------------------------------------------------------------------
class Batch {
  constructor(lod = 0) { this.s = new Map(); this.lod = lod; this.stack = [new THREE.Matrix4()]; }
  get m() { return this.stack[this.stack.length - 1]; }
  push(m) { this.stack.push(this.m.clone().multiply(m)); return this; }
  pop() { this.stack.pop(); return this; }
  within(m, fn) { this.push(m); fn(); this.pop(); }
  add(key, g, m = null) {
    let st = this.s.get(key); if (!st) { st = { p: [], n: [] }; this.s.set(key, st); }
    const M = m ? _m4.copy(this.m).multiply(m) : this.m;
    _n3.getNormalMatrix(M);
    const { p, n } = g;
    const H = this.holes;
    for (let i = 0; i < p.length; i += 9) {
      const tri = [];
      for (let k = 0; k < 9; k += 3) tri.push(new THREE.Vector3(p[i + k], p[i + k + 1], p[i + k + 2]).applyMatrix4(M));
      // blast holes (destroyed ships): drop triangles inside a ragged sphere round each hole
      if (H) {
        const c = tri[0].clone().add(tri[1]).add(tri[2]).multiplyScalar(1 / 3);
        if (H.some((h) => { const d = c.distanceTo(h.c); if (d > h.r * 1.4) return false; const rag = Math.sin(c.x * 3.1 + c.z * 2.3) * Math.cos(c.y * 2.7 - c.z * 1.9); return d < h.r * (0.85 + 0.3 * rag); })) continue;
      }
      for (let k = 0; k < 3; k++) {
        st.p.push(tri[k].x, tri[k].y, tri[k].z);
        _w.set(n[i + k * 3], n[i + k * 3 + 1], n[i + k * 3 + 2]).applyMatrix3(_n3).normalize(); st.n.push(_w.x, _w.y, _w.z);
      }
    }
    return this;
  }
  // BufferGeometries keyed by material, with box-projected UVs (painted-texture fallback only)
  geometries() {
    const out = [];
    for (const [key, st] of this.s) {
      if (!st.p.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(st.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(st.n, 3));
      boxUV(g); g.computeBoundingSphere();
      out.push([key, g]);
    }
    return out;
  }
  triangles() { let t = 0; for (const st of this.s.values()) t += st.p.length / 9; return t; }
}

// ---------------------------------------------------------------------
//  Lofted hulls through superellipse sections
//  station: { z, a, b, x?, y?, e? (exponent: 2 ellipse … 8 nearly a box), crease? }
// ---------------------------------------------------------------------
function seRing(st, seg) {
  const e = st.e || 4, k = 2 / e, pts = [];
  for (let j = 0; j < seg; j++) {
    const t = (j / seg) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    pts.push([(st.x || 0) + st.a * Math.sign(c) * Math.pow(Math.abs(c), k), (st.y || 0) + st.b * Math.sign(s) * Math.pow(Math.abs(s), k), st.z]);
  }
  return pts;
}
// opts.cut(x, y, z) → true drops the triangle there (blast holes); opts.zStep subdivides along Z
// so a hole can be cut with a ragged edge
function loftRaw(stations, seg = 32, caps = [true, true], opts = null) {
  if (opts && opts.zStep) {
    const S = [stations[0]];
    for (let i = 1; i < stations.length; i++) {
      const A = stations[i - 1], B = stations[i], n = Math.max(1, Math.ceil((B.z - A.z) / opts.zStep));
      for (let k = 1; k <= n; k++) {
        const t = k / n, L = (u, v) => u + (v - u) * t;
        S.push(k === n ? B : { z: L(A.z, B.z), a: L(A.a, B.a), b: L(A.b, B.b), x: L(A.x || 0, B.x || 0), y: L(A.y || 0, B.y || 0), e: L(A.e || 4, B.e || 4) });
      }
    }
    stations = S;
  }
  const cut = opts && opts.cut;
  const p = [], n = [];
  // split at creases: each run is smooth along its length, and runs share the crease ring
  const runs = []; let cur = [stations[0]];
  for (let i = 1; i < stations.length; i++) { cur.push(stations[i]); if (stations[i].crease && i < stations.length - 1) { runs.push(cur); cur = [stations[i]]; } }
  runs.push(cur);
  const V = (a) => new THREE.Vector3(...a);
  for (const run of runs) {
    const R = run.map((s) => seRing(s, seg).map(V));
    const N = R.map((ring, i) => ring.map((P, j) => {
      const tu = R[i][(j + 1) % seg].clone().sub(R[i][(j - 1 + seg) % seg]);
      const tv = R[Math.min(R.length - 1, i + 1)][j].clone().sub(R[Math.max(0, i - 1)][j]);
      const nn = tu.cross(tv);
      // a section shrunk to a point has no tangent along z: fall back to the cap direction
      if (nn.lengthSq() < 1e-12) return new THREE.Vector3(0, 0, i === 0 ? -1 : 1);
      return nn.normalize();
    }));
    for (let i = 0; i < R.length - 1; i++) {
      for (let j = 0; j < seg; j++) {
        const j2 = (j + 1) % seg;
        if (cut) {
          const P0 = R[i][j], P1 = R[i + 1][j2];
          if (cut((P0.x + P1.x) / 2, (P0.y + P1.y) / 2, (P0.z + P1.z) / 2)) continue;
        }
        for (const [ri, ci] of [[i, j], [i, j2], [i + 1, j], [i, j2], [i + 1, j2], [i + 1, j]]) {
          const P = R[ri][ci], Nn = N[ri][ci]; p.push(P.x, P.y, P.z); n.push(Nn.x, Nn.y, Nn.z);
        }
      }
    }
  }
  const cap = (st, front) => {
    const ring = seRing(st, seg), c = [st.x || 0, st.y || 0, st.z], nz = front ? 1 : -1;
    for (let j = 0; j < seg; j++) {
      const a = ring[j], b = ring[(j + 1) % seg];
      const tri = front ? [c, a, b] : [c, b, a];
      for (const P of tri) { p.push(...P); n.push(0, 0, nz); }
    }
  };
  if (caps[0] && stations[0].a > 1e-3) cap(stations[0], false);
  const last = stations[stations.length - 1];
  if (caps[1] && last.a > 1e-3) cap(last, true);
  return { p, n };
}
// a hull: named loft stations plus helpers to find points on its surface
class Hull {
  constructor(stations, seg = 40) { this.st = stations; this.seg = seg; }
  raw(lod = 0, caps, opts = null) { return loftRaw(this.st, lod ? Math.max(10, this.seg >> 2) : this.seg, caps, opts); }
  // section parameters at z (linear between stations)
  at(z) {
    const S = this.st;
    if (z <= S[0].z) return { ...S[0], z };
    for (let i = 0; i < S.length - 1; i++) {
      const A = S[i], B = S[i + 1];
      if (z <= B.z) {
        const t = (z - A.z) / Math.max(1e-6, B.z - A.z), L = (u, v) => u + (v - u) * t;
        return { z, a: L(A.a, B.a), b: L(A.b, B.b), x: L(A.x || 0, B.x || 0), y: L(A.y || 0, B.y || 0), e: L(A.e || 4, B.e || 4) };
      }
    }
    return { ...S[S.length - 1], z };
  }
  point(z, ang) { // ang: radians around the section, 0 = +X (starboard is −X), π/2 = top
    const s = this.at(z), e = s.e || 4, k = 2 / e, c = Math.cos(ang), sn = Math.sin(ang);
    return new THREE.Vector3((s.x || 0) + s.a * Math.sign(c) * Math.pow(Math.abs(c), k), (s.y || 0) + s.b * Math.sign(sn) * Math.pow(Math.abs(sn), k), z);
  }
  // surface frame: o (point), n (outward normal), t (along +Z on the surface), b = n × t
  frame(z, ang) {
    const h = 0.02;
    const o = this.point(z, ang);
    const tu = this.point(z, ang + h).sub(this.point(z, ang - h));
    const tv = this.point(z + 0.05, ang).sub(this.point(z - 0.05, ang));
    const n = tu.clone().cross(tv).normalize();
    const t = tv.normalize(), b = n.clone().cross(t).normalize();
    t.copy(b).cross(n).normalize();
    return { o, n, t, b };
  }
  // how far a point is inside the hull (> 0 inside, metres along the section's smaller axis)
  depth(p) {
    const S = this.st;
    if (p.z < S[0].z || p.z > S[S.length - 1].z) return -1;
    const s = this.at(p.z), e = s.e || 4;
    const k = Math.pow(Math.abs((p.x - (s.x || 0)) / s.a) ** e + Math.abs((p.y - (s.y || 0)) / s.b) ** e, 1 / e);
    return (1 - k) * Math.min(s.a, s.b);
  }
  // a surface frame that remembers where it is on the hull (for parts that conform to it)
  slot(z, ang) { const f = this.frame(z, ang); f.hull = this; f.z = z; f.ang = ang; return f; }
  // the angle whose surface normal points most nearly along a direction in the section plane
  angleFor(dx, dy) { return Math.atan2(dy, dx); }
}
// matrix that maps part-local axes (Y = out of the surface, Z = along the hull) onto a frame
function frameM(fr, lift = 0, spin = 0, scl = 1) {
  const n = fr.n, t = fr.t.clone(), b = fr.b.clone();
  if (spin) { const q = new THREE.Quaternion().setFromAxisAngle(n, spin); t.applyQuaternion(q); b.applyQuaternion(q); }
  const m = new THREE.Matrix4().makeBasis(b, n, t);   // right-handed: b = n × t
  m.scale(new THREE.Vector3(scl, scl, scl));
  m.setPosition(fr.o.clone().addScaledVector(n, lift));
  return m;
}
// a frame from a point and outward normal (forward is +Z where possible)
function frameAtN(o, n) {
  const N = (n.isVector3 ? n.clone() : new THREE.Vector3(...n)).normalize();
  const up = Math.abs(N.z) > 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
  const b = N.clone().cross(up).normalize(), t = b.clone().cross(N).normalize();
  return { o: o.isVector3 ? o.clone() : new THREE.Vector3(...o), n: N, t, b };
}

// a plate that follows the hull's curvature: a patch of the surface between z ± halfLen and an arc
// of ± halfArc metres round `ang`, lifted to [t0, t1] above the skin, with closed edges
function conformRaw(hull, z, ang, halfLen, halfArc, t0, t1, nz = 8, na = 8) {
  const sp = hull.point(z, ang + 0.01).distanceTo(hull.point(z, ang - 0.01)) / 0.02;
  const da = halfArc / Math.max(0.2, sp);
  const grid = (t) => { const G = []; for (let i = 0; i <= nz; i++) { const zz = z - halfLen + (2 * halfLen * i) / nz, row = []; for (let j = 0; j <= na; j++) { const f = hull.frame(zz, ang - da + (2 * da * j) / na); row.push(f.o.addScaledVector(f.n, t)); } G.push(row); } return G; };
  const O = grid(t1), I = grid(t0), out = { p: [], n: [] };
  const put = (r) => { out.p.push(...r.p); out.n.push(...r.n); };
  for (let i = 0; i < nz; i++) { put(stripRaw(O[i], O[i + 1])); put(stripRaw(I[i + 1], I[i])); }
  put(stripRaw(O[0], I[0])); put(stripRaw(I[nz], O[nz]));
  put(stripRaw(O.map((r) => r[0]), I.map((r) => r[0]))); put(stripRaw(I.map((r) => r[na]), O.map((r) => r[na])));
  return out;
}
// a strip of quads between two equal-length polylines (double-sided materials light either face)
function stripRaw(A, B) {
  const p = [], n = [];
  for (let i = 0; i < A.length - 1; i++) {
    const a0 = A[i], a1 = A[i + 1], b0 = B[i], b1 = B[i + 1];
    const nn = a1.clone().sub(a0).cross(b0.clone().sub(a0)).normalize();
    for (const P of [a0, a1, b0, a1, b1, b0]) { p.push(P.x, P.y, P.z); n.push(nn.x, nn.y, nn.z); }
  }
  return { p, n };
}

// ---------------------------------------------------------------------
//  Primitive library (raw, in local space)
// ---------------------------------------------------------------------
const RAW = new Map();
const cached = (key, fn) => { let r = RAW.get(key); if (!r) { r = fn(); RAW.set(key, r); } return r; };
// rounded box w × h × d (X × Y × Z), centred
const rbox = (w, h, d, r = null, lod = 0) => {
  const rr = Math.min(r ?? Math.min(w, h, d) * 0.12, Math.min(w, h, d) * 0.45);
  return cached(`rb${w}|${h}|${d}|${rr}|${lod}`, () => rr > 0.01 ? rawOf(new RoundedBoxGeometry(w, h, d, lod ? 1 : 2, rr)) : rawOf(new THREE.BoxGeometry(w, h, d)));
};
// cylinder along Y, centred; smooth sides, flat caps
const cyl = (r1, r2, h, seg = 16, open = false) => cached(`cy${r1}|${r2}|${h}|${seg}|${open}`, () => rawOf(new THREE.CylinderGeometry(r2, r1, h, seg, 1, open)));
const cylF = (r1, r2, h, seg = 8) => cached(`cf${r1}|${r2}|${h}|${seg}`, () => rawFlat(new THREE.CylinderGeometry(r2, r1, h, seg, 1)));
const sph = (r, ws = 16, hs = 10, thetaLen = Math.PI) => cached(`sp${r}|${ws}|${hs}|${thetaLen}`, () => rawOf(new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, 0, thetaLen)));
const tor = (R, r, rs = 8, ts = 24) => cached(`to${R}|${r}|${rs}|${ts}`, () => rawOf(new THREE.TorusGeometry(R, r, rs, ts)));
// lathe around Y through [radius, y] points
const lathe = (pts, seg = 24) => cached(`la${pts.join(';')}|${seg}`, () => rawOf(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg)));
// a pipe through points (sharp bends get a joint sphere)
function pipeRaw(points, r, seg = 8) {
  const out = { p: [], n: [] };
  const V = points.map((p) => new THREE.Vector3(...p));
  for (let i = 0; i < V.length - 1; i++) {
    const a = V[i], b = V[i + 1], d = b.clone().sub(a), L = d.length();
    if (L < 1e-4) continue;
    const g = new THREE.CylinderGeometry(r, r, L, seg, 1, true);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(AX_Y, d.normalize()));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    const rr = rawOf(g); out.p.push(...rr.p); out.n.push(...rr.n);
    if (i > 0) { const s = new THREE.SphereGeometry(r, seg, 6); s.translate(a.x, a.y, a.z); const rs = rawOf(s); out.p.push(...rs.p); out.n.push(...rs.n); }
  }
  return out;
}
// a flat plate from an outline in XZ, t thick, on y ∈ [0, t], small bevel
function plateRaw(outline, t, bevel = 0.03) {
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 1, steps: 1 });
  g.rotateX(-Math.PI / 2);
  return rawFlat(g);
}

// ---------------------------------------------------------------------
//  Detail library — each places itself on a surface frame (Y out, Z along the hull)
// ---------------------------------------------------------------------
const DETAIL = {
  // raised armour panel with a bevelled edge
  panel(B, fr, w, l, t = 0.12, key = 'paint', spin = 0) { B.add(key, rbox(w, t * 2, l, t * 0.9, B.lod), frameM(fr, 0, spin)); },
  // recessed hatch: frame ring, door with hinge bar and a grab handle
  hatch(B, fr, w = 1.0, l = 1.4) {
    if (B.lod) return;
    const m = frameM(fr, 0);
    B.add('dark', rbox(w + 0.22, 0.12, l + 0.22, 0.05), m);
    B.add('paint', rbox(w, 0.14, l, 0.06), m);
    B.add('metal', rbox(w * 0.6, 0.06, 0.08, 0.02), T([0, 0.08, l * 0.32]).premultiply(m));
    B.add('metal', rbox(0.08, 0.06, l * 0.8, 0.02), T([w * 0.42, 0.08, 0]).premultiply(m));
  },
  // four-nozzle RCS quad on a block
  rcs(B, fr, s = 1) {
    const m = frameM(fr, 0, 0, s);
    B.add('dark', rbox(0.7, 0.5, 0.7, 0.08, B.lod), T([0, 0.2, 0]).premultiply(m));
    if (B.lod) return;
    for (const [dx, dz, rx, rz] of [[0.38, 0, 0, -Math.PI / 2], [-0.38, 0, 0, Math.PI / 2], [0, 0.38, Math.PI / 2, 0], [0, -0.38, -Math.PI / 2, 0]]) {
      B.add('metal', lathe([[0.04, 0], [0.09, 0.05], [0.13, 0.2], [0.12, 0.2]], 10), T([dx, 0.25, dz], [rx, 0, rz]).premultiply(m));
    }
  },
  // running light: a small housing with an emissive lens
  light(B, fr, key = 'white', s = 1) {
    const m = frameM(fr, 0, 0, s);
    B.add('dark', cyl(0.14, 0.1, 0.12, 10), T([0, 0.06, 0]).premultiply(m));
    B.add(key, sph(0.09, 10, 6, Math.PI / 2), T([0, 0.12, 0]).premultiply(m));
  },
  // whip antenna on a foot
  antenna(B, fr, len = 2.5) {
    const m = frameM(fr, 0);
    B.add('dark', cyl(0.12, 0.08, 0.3, 8), T([0, 0.15, 0]).premultiply(m));
    B.add('metal', cyl(0.025, 0.015, len, 5), T([0, 0.3 + len / 2, 0]).premultiply(m));
    if (!B.lod) B.add('red', sph(0.05, 6, 4), T([0, 0.3 + len, 0]).premultiply(m));
  },
  // dish on a yoke, tilted up and forward
  dish(B, fr, r = 0.9, tilt = 0.7) {
    const m = frameM(fr, 0);
    B.add('dark', cyl(0.22, 0.18, 0.5, 10), T([0, 0.25, 0]).premultiply(m));
    B.add('metal', lathe([[0, 0], [r * 0.5, r * 0.06], [r, r * 0.25], [r * 0.97, r * 0.27], [r * 0.48, r * 0.09], [0, 0.03]], 20), T([0, 0.62, 0], [tilt, 0, 0]).premultiply(m));
    if (!B.lod) B.add('metal', cyl(0.03, 0.03, r * 0.8, 5), T([0, 0.62 + Math.cos(tilt) * r * 0.4, Math.sin(tilt) * r * 0.4], [tilt, 0, 0]).premultiply(m));
  },
  // a sensor blister
  blister(B, fr, r = 0.6) { B.add('dark', sph(r, 16, 8, Math.PI / 2), T([0, -0.02, 0], null, [1, 0.55, 1]).premultiply(frameM(fr, 0))); },
  // vent grille: a frame with slats
  vent(B, fr, w = 1.2, l = 0.8) {
    if (B.lod) return;
    const m = frameM(fr, 0);
    B.add('dark', rbox(w, 0.1, l, 0.03), m);
    const n = Math.max(3, Math.round(l / 0.12));
    for (let i = 0; i < n; i++) B.add('metal', rbox(w * 0.9, 0.05, 0.035, 0.01), T([0, 0.06, -l / 2 + (i + 0.5) * (l / n)]).premultiply(m));
  },
  // lit window strip: glass pane in a frame
  windows(B, fr, count = 4, w = 0.5, h = 0.32, gap = 0.18, along = false, key = 'glow') {
    const m = frameM(fr, 0, along ? Math.PI / 2 : 0);
    const L = count * w + (count - 1) * gap;
    B.add('dark', rbox(L + 0.2, 0.08, h + 0.2, 0.03), m);
    for (let i = 0; i < count; i++) B.add(key, rbox(w, 0.06, h, 0.02), T([-L / 2 + w / 2 + i * (w + gap), 0.04, 0]).premultiply(m));
  },
  // a short ladder of grab rungs
  rungs(B, fr, n = 4) {
    if (B.lod) return;
    const m = frameM(fr, 0);
    for (let i = 0; i < n; i++) B.add('metal', pipeRaw([[-0.2, 0, i * 0.35], [-0.2, 0.12, i * 0.35], [0.2, 0.12, i * 0.35], [0.2, 0, i * 0.35]], 0.025, 5), m);
  },
  // propellant tank with domed ends, girth straps and a feed pipe; axis along Z
  tank(B, pos, r, len, key = 'paint', rot = null) {
    const m = T(pos, rot);
    const seg = B.lod ? 10 : 24;
    B.add(key, cyl(r, r, len, seg, true), T([0, 0, 0], [Math.PI / 2, 0, 0]).premultiply(m));
    for (const s of [-1, 1]) B.add(key, sph(r, seg, B.lod ? 4 : 8, Math.PI / 2), T([0, 0, (s * len) / 2], [s * Math.PI / 2, 0, 0], [1, 0.55, 1]).premultiply(m));
    if (B.lod) return;
    const ns = Math.max(2, Math.round(len / 2.2));
    for (let i = 0; i < ns; i++) B.add('dark', cyl(r * 1.02, r * 1.02, 0.18, seg, true), T([0, 0, -len / 2 + (i + 0.5) * (len / ns)], [Math.PI / 2, 0, 0]).premultiply(m));
  },
  // lattice truss between two points, square section w
  truss(B, a, b, w = 0.8, key = 'metal') {
    const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A), L = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(AX_Z, d.clone().normalize());
    const m = T(A.clone().add(Bv).multiplyScalar(0.5).toArray(), q);
    const h = w / 2, t = Math.max(0.06, w * 0.09);
    for (const [x, y] of [[h, h], [-h, h], [h, -h], [-h, -h]]) B.add(key, rbox(t, t, L, t * 0.3, 1), T([x, y, 0]).premultiply(m));
    if (B.lod) return;
    const bays = Math.max(1, Math.round(L / w));
    for (let i = 0; i <= bays; i++) {
      const z = -L / 2 + (i * L) / bays;
      for (const [x1, y1, x2, y2] of [[h, h, -h, h], [h, -h, -h, -h], [h, h, h, -h], [-h, h, -h, -h]]) B.add(key, pipeRaw([[x1, y1, z], [x2, y2, z]], t * 0.4, 4), m);
      if (i < bays) {
        const z2 = z + L / bays;
        for (const [x1, y1, x2, y2] of [[h, h, -h, h], [h, -h, -h, -h]]) B.add(key, pipeRaw([[x1, y1, z], [x2, y2, z2]], t * 0.35, 4), m);
      }
    }
  },
  // drive bell with an exterior cooling-jacket ring and a thrust frame; points along −Z from pos
  bell(B, pos, r, len) {
    const m = T(pos);
    const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([r * (0.3 + 0.7 * Math.pow(t, 1.7)), -t * len]); }
    B.add('metal', lathe(pts.map(([x, y]) => [x * 1.03 + 0.04, y]), B.lod ? 12 : 32), T([0, 0, 0], [Math.PI / 2, 0, 0]).premultiply(m));
    if (B.lod) return;
    for (const f of [0.35, 0.7]) { const rr = r * (0.3 + 0.7 * Math.pow(f, 1.7)) * 1.03 + 0.07; B.add('dark', tor(rr, Math.max(0.05, r * 0.04), 6, 32), T([0, 0, -f * len]).premultiply(m)); }
    B.add('dark', tor(r * 1.08, r * 0.06, 6, 32), T([0, 0, -len]).premultiply(m));
  },
  // ring of bolts round an opening
  bolts(B, fr, R, n = 12, s = 0.08) {
    if (B.lod) return;
    const m = frameM(fr, 0);
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; B.add('metal', cyl(s, s, s * 1.2, 6), T([Math.cos(a) * R, s * 0.6, Math.sin(a) * R]).premultiply(m)); }
  },
};
// light anchor positions are reported back to the ship model (strobes, nav lights blink in code)
