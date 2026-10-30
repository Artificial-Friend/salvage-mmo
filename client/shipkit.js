// =====================================================================
//  SHIPKIT — hard-surface geometry for ships.
//  Faceted lofted hulls, angular armour plates, spikes, mount hardware,
//  and salvage accretion: plates welded on around every fitted part,
//  painted in the colours of the hull it was torn from.
//  Concatenated after surfaces.js, before ships.js (shared module scope).
// =====================================================================

const AX_Y = new THREE.Vector3(0, 1, 0);
const AX_Z = new THREE.Vector3(0, 0, 1);

// UVs projected from the dominant normal axis, in texture repeats (painted-texture fallback only)
function boxUV(g) {
  const pos = g.attributes.position, nrm = g.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nrm.getX(i)), ay = Math.abs(nrm.getY(i)), az = Math.abs(nrm.getZ(i));
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const [u, v] = ax >= ay && ax >= az ? [z, y] : ay >= az ? [x, z] : [x, y];
    uv[i * 2] = u / UVS; uv[i * 2 + 1] = v / UVS;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
// hard edges: every face keeps its own normal
function faceted(g) {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute('normal'); n.computeVertexNormals();
  return boxUV(n);
}

// Hull cross-section: eight corners, keel flat → lower chine → upper chine → deck flat, mirrored.
// w/h are half-width/half-height; keel/deck are flat widths as fractions of w; lo/hi are chine
// heights as fractions of h; up is the upper chine's width fraction.
function sectionRing(s) {
  const w = s.w, h = s.h, x = s.x || 0, y = s.y || 0;
  const keel = s.keel ?? 0.5, deck = s.deck ?? 0.55, lo = s.lo ?? -0.35, hi = s.hi ?? 0.3, up = s.up ?? 0.9;
  const R = [[keel * w, -h], [w, lo * h], [up * w, hi * h], [deck * w, h]];
  const L = R.slice().reverse().map(([a, b]) => [-a, b]);
  return [...R, ...L].map(([a, b]) => [x + a, y + b]);
}
// a hull lofted through stations along +Z: [{ z, w, h, y?, x?, keel?, deck?, lo?, hi?, up? }]
function loftG(stations, shape = {}) {
  const rings = stations.map((s) => { const ss = { ...shape, ...s }; return sectionRing(ss).map(([a, b]) => new THREE.Vector3(a, b, ss.z)); });
  const pos = [];
  const tri = (a, b, c) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  const n = rings[0].length;
  for (let i = 0; i < rings.length - 1; i++) {
    const A = rings[i], B = rings[i + 1];
    for (let j = 0; j < n; j++) { const j2 = (j + 1) % n; tri(A[j], A[j2], B[j]); tri(A[j2], B[j2], B[j]); }
  }
  const cap = (ring, front) => {
    const c = ring.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / ring.length);
    for (let j = 0; j < n; j++) { const j2 = (j + 1) % n; if (front) tri(c, ring[j], ring[j2]); else tri(c, ring[j2], ring[j]); }
  };
  cap(rings[0], false); cap(rings[rings.length - 1], true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return boxUV(g);
}
// the same loft, built along +Y (for parts, whose up axis is the mount normal)
function loftUpG(stations, shape = {}) { const g = loftG(stations, shape); g.rotateX(-Math.PI / 2); return g; }

// a flat plate from an outline in the XZ plane, t thick, lying on y = 0 … t
function plateG(outline, t, bevel = 0) {
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, steps: 1 });
  g.rotateX(-Math.PI / 2);
  return faceted(g);
}
// angular armour plate, w × l (X × Z), corners cut; jag tears the aft edge
function armorPlateG(w, l, t, cut = 0.22, jag = 0, rnd = Math.random) {
  const hw = w / 2, hl = l / 2, c = Math.min(w, l) * cut;
  const pts = [[hw - c, hl], [hw, hl - c], [hw, -hl + c * 0.4], [hw - c * 0.4, -hl]];
  if (jag > 0) {
    const k = 3 + Math.floor(rnd() * 3);
    for (let i = 1; i <= k; i++) pts.push([hw - (w * i) / (k + 1), -hl + (i % 2 ? rnd() * jag : 0)]);
  }
  pts.push([-hw + c * 0.4, -hl], [-hw, -hl + c * 0.4], [-hw, hl - c], [-hw + c, hl]);
  return plateG(pts, t, Math.min(0.06, t * 0.3));
}
const mirrorX = (pts) => pts.map(([x, z]) => [-x, z]).reverse();
// a vertical fin: outline in (height, z), standing on y = 0
function finG(outline, t) { const g = plateG(outline, t); g.translate(0, -t / 2, 0); g.rotateZ(Math.PI / 2); return g; }
// faceted spike along +Y, base on y = 0
function spikeG(r, len, sides = 4) {
  const g = new THREE.ConeGeometry(r, len, sides, 1);
  g.translate(0, len / 2, 0);
  return faceted(g);
}
// a square beam between two points
function strutG(a, b, t) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const d = B.clone().sub(A);
  return place(boxG(t, t, d.length()), A.clone().add(B).multiplyScalar(0.5).toArray(), alignQ(AX_Z, d));
}
// faceted cylinder (n sides), axis along Y
function facetCylG(r1, r2, h, n = 8) { return faceted(new THREE.CylinderGeometry(r2, r1, h, n, 1)); }
// orient + place a part-local geometry (Y = normal, Z = forward) at a mount
function atMount(g, pos, n, lift = 0) {
  const N = new THREE.Vector3(...n).normalize();
  const q = alignQ(AX_Y, N);
  g.applyQuaternion(q);
  g.translate(pos[0] + N.x * lift, pos[1] + N.y * lift, pos[2] + N.z * lift);
  return g;
}

// ---------------------------------------------------------------------
//  Mount hardware: every slot has a visible base; a fitted part sits on it
// ---------------------------------------------------------------------
const MOUNT_LIFT = { hardpoint: 0.42, engine: 0.3, utility: 0.28, structure: 0.16, core: 0.5 };
function mountBaseG(cls, fitted) {
  const L = [];
  switch (cls) {
    case 'hardpoint': // barbette ring with bolt studs; a blanking cap when empty
      L.push(place(facetCylG(1.75, 1.55, 0.42, 10), [0, 0.21, 0]));
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 + 0.31; L.push(place(boxG(0.16, 0.12, 0.16), [Math.cos(a) * 1.45, 0.47, Math.sin(a) * 1.45])); }
      if (!fitted) L.push(place(facetCylG(1.15, 0.9, 0.22, 10), [0, 0.53, 0]));
      break;
    case 'engine': // thrust pad on four braced struts
      L.push(armorPlateG(2.6, 2.6, 0.22, 0.25));
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) L.push(strutG([x * 0.9, 0, z * 0.9], [x * 0.45, 0.32, z * 0.45], 0.22));
      L.push(place(boxG(1.4, 0.12, 1.4), [0, 0.3, 0]));
      break;
    case 'utility': // twin rails with clamps
      for (const x of [-0.8, 0.8]) L.push(place(boxG(0.26, 0.26, 2.9), [x, 0.13, 0]));
      for (const z of [-1.1, 1.1]) L.push(place(boxG(2.1, 0.14, 0.34), [0, 0.2, z]));
      break;
    case 'structure': // weld pad with studs
      L.push(armorPlateG(3.2, 2.6, 0.16, 0.2));
      for (const [x, z] of [[-1.2, -0.9], [1.2, -0.9], [-1.2, 0.9], [1.2, 0.9], [0, -1.05], [0, 1.05]]) L.push(place(boxG(0.18, 0.12, 0.18), [x, 0.2, z]));
      break;
    case 'core': // armoured cradle
      L.push(place(facetCylG(2.9, 2.6, 0.5, 12), [0, 0.25, 0]));
      for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; L.push(place(boxG(0.7, 1.4, 0.9), [Math.cos(a) * 2.45, 0.7, Math.sin(a) * 2.45], [0, -a, 0])); }
      break;
  }
  return merge(L);
}

// ---------------------------------------------------------------------
//  Provenance paint: a salvaged part keeps the colours of the navy that built it
// ---------------------------------------------------------------------
function factionIndex(prov) {
  const m = /^(TCN|ARD|BFC)\b/.exec(prov || '');
  return m ? ['TCN', 'ARD', 'BFC'].indexOf(m[1]) : -1;
}
const factionMat = (fi) => [MAT.tcn, MAT.ard, MAT.bfc][fi] || MAT.dark;
function paintPart(g, fi) {
  if (fi < 0) return;
  const m = factionMat(fi);
  g.traverse((o) => { if (o.isMesh && o.userData.paint) o.material = m; });
}

// Salvage accretion: torn plates welded on around a fitted part, a hull wearing what it has taken.
// probe(point, normal) finds the hull surface under a point; plates that would float are dropped.
function hullProbe(meshes) {
  const rc = new THREE.Raycaster();
  const targets = meshes.filter((m) => m.isMesh);
  targets.forEach((m) => m.updateMatrixWorld(true));
  return (p, n, reach = 4) => {
    rc.set(p.clone().addScaledVector(n, reach), n.clone().negate());
    rc.far = reach * 2;
    const hit = rc.intersectObjects(targets, false)[0];
    if (!hit || !hit.face) return null;
    const fn = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    if (fn.dot(n) < 0.35) return null;
    return { p: hit.point, n: fn };
  };
}
function accretionFor(slot, seed, probe) {
  const rnd = mulberry(seed);
  const N = new THREE.Vector3(...slot.n).normalize();
  const t1 = Math.abs(N.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0).cross(N).normalize();
  const t2 = N.clone().cross(t1).normalize();
  const out = [];
  const count = slot.cls === 'structure' ? 2 : 3;
  for (let k = 0; k < count; k++) {
    const a = (k / count) * Math.PI * 2 + rnd() * 1.2;
    const d = 1.9 + rnd() * 1.0;
    const w = 1.1 + rnd() * 1.4, l = 1.3 + rnd() * 1.8;
    const at = new THREE.Vector3(...slot.pos).addScaledVector(t1, Math.cos(a) * d).addScaledVector(t2, Math.sin(a) * d);
    const hit = probe(at, N);
    if (!hit) continue;
    const g = armorPlateG(w, l, 0.14 + rnd() * 0.1, 0.15 + rnd() * 0.2, l * 0.35, rnd);
    // a little tilted and sunk, as if welded on in a hurry
    g.rotateY(rnd() * Math.PI).rotateX((rnd() - 0.5) * 0.12).rotateZ((rnd() - 0.5) * 0.12);
    g.translate(0, -0.06, 0);
    out.push(atMount(g, hit.p.toArray(), hit.n.toArray()));
  }
  return out;
}
