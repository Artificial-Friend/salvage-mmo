// =====================================================================
//  SURFACES — shader-generated hull materials.
//  Panels, seams, rivets, chipped paint, grime and scorch are computed
//  per pixel in object space, so they stay crisp at any distance, never
//  stretch on odd geometry, and move with the hull they belong to.
//  Concatenated after graphics.js (shares the module scope).
// =====================================================================

// relief from a computed height: screen-space derivatives of the height perturb the view-space normal
// (three's bumpMap() samples a texture through its UVs, which a procedural height does not have)
const bumpFromHeight = Fn(([h, scale]) => {
  const dHdxy = vec2(h.dFdx(), h.dFdy()).mul(scale);
  const vSigmaX = positionView.dFdx().normalize();
  const vSigmaY = positionView.dFdy().normalize();
  const R1 = vSigmaY.cross(normalView);
  const R2 = normalView.cross(vSigmaX);
  const fDet = vSigmaX.dot(R1).mul(faceDirection);
  const vGrad = fDet.sign().mul(dHdxy.x.mul(R1).add(dHdxy.y.mul(R2)));
  return fDet.abs().mul(normalView).sub(vGrad).normalize();
});

// one projection per pixel: the axis the surface faces most (geometry here is mostly boxes and prisms)
const dominantUV = Fn(([p, n]) => {
  const a = abs(n);
  const uvX = vec2(p.z, p.y), uvY = vec2(p.x, p.z), uvZ = vec2(p.x, p.y);
  return select(a.x.greaterThan(a.y).and(a.x.greaterThan(a.z)), uvX, select(a.y.greaterThan(a.z), uvY, uvZ));
});

// three's hash() truncates its seed to an unsigned int, so every id here stays a whole number
const hid = (id, k) => hash(id.mul(8).add(k));
const reid = (id, k) => floor(hid(id, k).mul(1048576));

// one recursive split of a plate rectangle (x0,x1,y0,y1 in cell units): longer sides split more often
function splitPlate(f, r, prob) {
  const w = r.x1.sub(r.x0), ht = r.y1.sub(r.y0);
  const doSplit = hid(r.id, 1).lessThan(prob);
  const alongX = hid(r.id, 2).lessThan(w.div(w.add(ht)));
  const t = hid(r.id, 3).mul(0.5).add(0.25);
  const sx = r.x0.add(w.mul(t)), sy = r.y0.add(ht.mul(t));
  const right = f.x.greaterThan(sx), up = f.y.greaterThan(sy);
  const cx = doSplit.and(alongX), cy = doSplit.and(alongX.not());
  return {
    x0: select(cx.and(right), sx, r.x0), x1: select(cx.and(right.not()), sx, r.x1),
    y0: select(cy.and(up), sy, r.y0), y1: select(cy.and(up.not()), sy, r.y1),
    id: reid(r.id, select(cx, select(right, float(4), float(5)), select(cy, select(up, float(6), float(7)), float(0)))),
  };
}

// plate layout: each grid cell is split up to three times into plates of different sizes, the way
// a hull is patched over its life. Returns metres to the nearest seam, plate id, and the direction of that seam.
function plateField(uv2, size) {
  const q = uv2.div(size);
  const c = mod(floor(q), 1024);
  const f = fract(q);
  let r = { x0: float(0), x1: float(1), y0: float(0), y1: float(1), id: c.x.add(c.y.mul(1024)) };
  r = splitPlate(f, r, 0.9);
  r = splitPlate(f, r, 0.65);
  r = splitPlate(f, r, 0.35);
  const ex = min(f.x.sub(r.x0), r.x1.sub(f.x)).mul(size);
  const ey = min(f.y.sub(r.y0), r.y1.sub(f.y)).mul(size);
  return { edge: min(ex, ey), ex, ey, id: r.id, area: r.x1.sub(r.x0).mul(r.y1.sub(r.y0)) };
}

// opts: { base, base2, bare, panel (m), seam (m), rough, metal, wear, grime, scorch, stripe, bump, side }
function hullSurface(opts) {
  const o = {
    base: '#8a8f93', base2: null, bare: '#a3a7aa', panel: 2.4, seam: 0.03, rough: 0.55, metal: 0.55,
    wear: 0.35, grime: 0.45, scorch: 0.25, stripe: null, ...opts,
  };
  const mat = new THREE.MeshStandardNodeMaterial({ side: o.side ?? THREE.FrontSide });
  const p = positionLocal;
  const uv2 = dominantUV(p, normalLocal);
  const pf = plateField(uv2, float(o.panel));
  const kind = hid(pf.id, 9), rnd = hid(pf.id, 10);
  // pixel footprint in metres: detail smaller than a pixel fades instead of sparkling
  const fp = max(fwidth(uv2.x), fwidth(uv2.y));
  const seamW = max(float(o.seam), fp.mul(1.5));
  const seam = float(1).sub(smoothstep(0.0, seamW, pf.edge)).mul(float(o.seam).div(seamW));
  const near = float(1).sub(smoothstep(0.012, 0.04, fp));
  // rivet rows 7 cm inside each seam, every 18 cm, on about half the plates
  const along = select(pf.ex.lessThan(pf.ey), uv2.y, uv2.x);
  const rv = fract(along.div(0.18)).sub(0.5).abs().mul(0.18);
  const lineD = pf.edge.sub(0.07).abs();
  const rivet = float(1).sub(smoothstep(0.01, 0.018, vec2(rv, lineD).length())).mul(step(0.45, hid(pf.id, 11))).mul(near);
  // weathering in object space
  const grimeN = mx_fractal_noise_float(p.mul(0.13), 4, 2.0, 0.5).mul(0.5).add(0.5);
  const streak = mx_fractal_noise_float(vec3(p.x.mul(0.5), p.y.mul(0.05), p.z.mul(0.5)), 3, 2.0, 0.5).mul(0.5).add(0.5);
  const grime = clamp(grimeN.sub(float(1.05).sub(o.grime)).mul(1.8).add(streak.sub(0.5).mul(o.grime).mul(0.6)), 0, 1);
  const scorchN = mx_fractal_noise_float(p.mul(0.04).add(vec3(11.3, 2.1, 5.7)), 4, 2.0, 0.55).mul(0.5).add(0.5);
  const scorch = smoothstep(float(0.76 - o.scorch * 0.3), float(0.9 - o.scorch * 0.2), scorchN);
  // chipped paint: only in worn zones, and mostly along plate edges where tools and debris hit
  const zone = smoothstep(0.55, 0.8, mx_noise_float(p.mul(0.3).add(vec3(3.1, 7.7, 1.3))).mul(0.5).add(0.5).add(o.wear * 0.15));
  const chipN = mx_fractal_noise_float(p.mul(3.1), 2, 2.0, 0.5).mul(0.5).add(0.5);
  const edgeBias = float(1).sub(smoothstep(0.0, 0.16, pf.edge));
  const chip = smoothstep(0.62, 0.66, chipN.add(edgeBias.mul(0.22)).mul(zone)).mul(near.mul(0.6).add(0.4));
  // per-plate tint, the odd replacement plate in a second colour, primer on bare patches
  const toV = (c) => vec3(...new THREE.Color(c).toArray());
  const baseC = toV(o.base), altC = o.base2 ? toV(o.base2) : baseC, bareC = toV(o.bare);
  const plateC = mix(baseC, altC, step(0.88, kind)).mul(rnd.mul(0.14).add(0.93));
  let paint = plateC.mul(float(1).sub(grime.mul(0.5)));
  if (o.stripe) {
    const sc = toV(o.stripe);
    const band = step(0.5, fract(uv2.x.add(uv2.y).mul(1.8)));
    const hazard = step(0.97, kind).mul(step(0.04, pf.area));
    paint = mix(paint, mix(vec3(0.045, 0.04, 0.035), sc, band), hazard);
  }
  let colorN = mix(paint, bareC.mul(rnd.mul(0.15).add(0.8)), chip.mul(0.8));
  colorN = colorN.mul(float(1).sub(seam.mul(0.6))).mul(float(1).sub(scorch.mul(0.8)));
  mat.colorNode = colorN;
  const roughP = float(o.rough).add(rnd.sub(0.5).mul(0.14)).add(grime.mul(0.15));
  mat.roughnessNode = clamp(mix(roughP, float(0.42), chip).add(seam.mul(0.2)).add(scorch.mul(0.2)), 0.08, 1);
  mat.metalnessNode = clamp(mix(float(o.metal), float(0.9), chip).mul(float(1).sub(scorch.mul(0.4))), 0, 1);
  // relief: recessed seams, domed rivets, a few raised doubler plates, a step at chipped paint
  const height = seam.mul(-1).add(rivet.mul(0.6)).add(step(0.93, kind).mul(0.2)).add(chip.mul(-0.06));
  mat.normalNode = bumpFromHeight(height.mul(near.mul(0.7).add(0.3)), float(o.bump ?? 0.5));
  return mat;
}

// the material set used by ships, wrecks and the hangar; replaces the canvas-texture versions
function buildSurfaceMaterials() {
  const S = (o) => hullSurface(o);
  return {
    starter: S({ base: '#a9a493', base2: '#c46a2b', stripe: '#d8a22a', panel: 2.4, rough: 0.5, metal: 0.25, wear: 0.45, grime: 0.35, scorch: 0.12 }),
    tcn: S({ base: '#5c656d', base2: '#424a51', stripe: '#c9c3b0', panel: 3.2, rough: 0.58, metal: 0.4, wear: 0.4, grime: 0.5, scorch: 0.42, side: THREE.DoubleSide }),
    ard: S({ base: '#7d3f2f', base2: '#522b22', stripe: '#d0c8b6', panel: 3.0, rough: 0.6, metal: 0.3, wear: 0.5, grime: 0.55, scorch: 0.45, side: THREE.DoubleSide }),
    bfc: S({ base: '#8d875a', base2: '#c88a2a', stripe: '#1c1a14', panel: 2.8, rough: 0.66, metal: 0.25, wear: 0.6, grime: 0.6, scorch: 0.35, side: THREE.DoubleSide }),
    metal: S({ base: '#9ba0a4', bare: '#c3c7ca', panel: 3.6, seam: 0.02, rough: 0.34, metal: 0.95, wear: 0.15, grime: 0.25, scorch: 0.1, bump: 0.35 }),
    dark: S({ base: '#2c3033', base2: '#1f2225', panel: 2.4, rough: 0.66, metal: 0.55, wear: 0.25, grime: 0.4, scorch: 0.3, side: THREE.DoubleSide }),
    scav: S({ base: '#c47c27', base2: '#3b3f3a', stripe: '#111111', panel: 2.6, rough: 0.6, metal: 0.3, wear: 0.5, grime: 0.45, scorch: 0.2 }),
    racer: S({ base: '#b1b5b2', base2: '#2f8fa0', stripe: '#2f8fa0', panel: 2.2, rough: 0.36, metal: 0.3, wear: 0.15, grime: 0.15, scorch: 0.06 }),
    hauler: S({ base: '#c98a2b', base2: '#59605d', stripe: '#161512', panel: 3.0, rough: 0.6, metal: 0.3, wear: 0.55, grime: 0.55, scorch: 0.15 }),
    container: S({ base: '#6e7d52', base2: '#a5492f', stripe: '#d9d4c4', panel: 1.8, seam: 0.05, rough: 0.7, metal: 0.25, wear: 0.5, grime: 0.6, scorch: 0.1 }),
    gunship: S({ base: '#4c5258', base2: '#383d42', stripe: '#d0a03a', panel: 2.8, rough: 0.5, metal: 0.45, wear: 0.3, grime: 0.35, scorch: 0.2 }),
    capital: S({ base: '#7c8287', base2: '#5d6368', stripe: '#d0a03a', panel: 7.0, seam: 0.06, rough: 0.52, metal: 0.4, wear: 0.25, grime: 0.4, scorch: 0.15 }),
    deck: S({ base: '#3d4244', base2: '#2d3234', stripe: '#c9a23a', panel: 4.0, seam: 0.05, rough: 0.62, metal: 0.35, wear: 0.15, grime: 0.55, scorch: 0.12 }),
    wall: S({ base: '#4b5051', base2: '#3b4041', panel: 4.5, seam: 0.05, rough: 0.66, metal: 0.35, wear: 0.12, grime: 0.5, scorch: 0.08, side: THREE.DoubleSide }),
  };
}

// Hull detail: 'shader' computes the plating per pixel (crisp at any distance, no boot cost);
// 'texture' paints 1024² canvas maps at boot (cheaper per pixel, blurry up close). Chosen at boot.
let SURF = null;
function surf(key, canvasMat) {
  if ((world.gfxBoot ? world.gfxBoot.surfaces : GFX.surfaces) === 'texture') return canvasMat();
  SURF = SURF || buildSurfaceMaterials();
  return SURF[key] || canvasMat();
}
