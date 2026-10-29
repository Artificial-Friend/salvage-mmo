// =====================================================================
//  SHIPS — hull classes, their characteristics, mount points and models.
//  Concatenated after main.js and before hub.js (shared module scope).
// =====================================================================

// Base characteristics of each hull, before fittings.
// thrust/rcs in N, masses in kg, kr = radiator emissivity·σ·area (W/K⁴), reactor = idle waste heat (W)
const SHIP_CLASSES = {
  cutter: {
    name: 'Cutter', role: 'Starter salvage cutter', scrap: 0, bay: 'pad',
    dry: 38000, prop: 14000, thrust: 420000, rcs: 70000, rcsArm: 6, isp: 1500, kr: 1.6e-4, reactor: 1.5e6,
    hull: 100, armor: 0, cargo: 60000, jf: 1.10, jumpRated: 52000, radius: 6, nose: 8, inertia: 1, sig: 1, busC: 1.6e6,
    blurb: 'Balanced and forgiving. A cutting laser, a harpoon and five mounts.',
    slots: [
      { id: 'eng', cls: 'engine', name: 'Aux engine', pos: [0, 1.7, -6.2], n: [0, 0, -1] },
      { id: 'hp', cls: 'hardpoint', name: 'Dorsal hardpoint', pos: [0, 1.55, 2.6], n: [0, 1, 0] },
      { id: 'ut1', cls: 'utility', name: 'Ventral utility · port', pos: [1.2, -1.55, -3.4], n: [0, -1, 0] },
      { id: 'ut2', cls: 'utility', name: 'Ventral utility · starboard', pos: [-1.2, -1.55, -3.4], n: [0, -1, 0] },
      { id: 'ar', cls: 'structure', name: 'Bow armor', pos: [0, 1.35, 5.6], n: [0, 1, 0] },
    ],
  },
  racer: {
    name: 'Racer', role: 'Light, fast, quiet', scrap: 30, bay: 'pad',
    dry: 21000, prop: 8000, thrust: 360000, rcs: 50000, rcsArm: 5, isp: 1700, kr: 1.2e-4, reactor: 1.2e6,
    hull: 65, armor: 0, cargo: 18000, jf: 1.0, jumpRated: 30000, radius: 5, nose: 11, inertia: 0.8, sig: 0.65, busC: 1.1e6,
    blurb: 'Twice the cutter’s acceleration and a third less signature, but a small hold and a thin skin.',
    slots: [
      { id: 'eng-p', cls: 'engine', name: 'Nacelle · port', pos: [2.4, 1.05, -3.6], n: [0, 0, -1] },
      { id: 'eng-s', cls: 'engine', name: 'Nacelle · starboard', pos: [-2.4, 1.05, -3.6], n: [0, 0, -1] },
      { id: 'hp', cls: 'hardpoint', name: 'Dorsal hardpoint', pos: [0, 0.95, 1.6], n: [0, 1, 0] },
      { id: 'ut', cls: 'utility', name: 'Ventral utility', pos: [0, -0.95, -1.6], n: [0, -1, 0] },
    ],
  },
  hauler: {
    name: 'Hauler', role: 'Big hold, big tanks', scrap: 50, bay: 'pad',
    dry: 56000, prop: 32000, thrust: 560000, rcs: 95000, rcsArm: 9, isp: 1500, kr: 2.4e-4, reactor: 1.8e6,
    hull: 150, armor: 0.05, cargo: 160000, jf: 1.75, jumpRated: 95000, radius: 9, nose: 19, inertia: 2.6, sig: 1.25, busC: 2.4e6,
    blurb: 'Hauls home what would strand anything else. Sluggish to turn and easy to see.',
    slots: [
      { id: 'eng-p', cls: 'engine', name: 'Aux engine · port', pos: [3.6, -2.4, -15.5], n: [0, 0, -1] },
      { id: 'eng-s', cls: 'engine', name: 'Aux engine · starboard', pos: [-3.6, -2.4, -15.5], n: [0, 0, -1] },
      { id: 'hp', cls: 'hardpoint', name: 'Dorsal hardpoint', pos: [0, 2.9, 13], n: [0, 1, 0] },
      { id: 'ut1', cls: 'utility', name: 'Rack utility · port fore', pos: [4.6, 0, 7], n: [1, 0, 0] },
      { id: 'ut2', cls: 'utility', name: 'Rack utility · starboard fore', pos: [-4.6, 0, 7], n: [-1, 0, 0] },
      { id: 'ut3', cls: 'utility', name: 'Rack utility · port aft', pos: [4.6, 0, -7], n: [1, 0, 0] },
      { id: 'ut4', cls: 'utility', name: 'Rack utility · starboard aft', pos: [-4.6, 0, -7], n: [-1, 0, 0] },
      { id: 'st1', cls: 'structure', name: 'Cab armor · port', pos: [2.6, 0, 16.2], n: [1, 0, 0] },
      { id: 'st2', cls: 'structure', name: 'Cab armor · starboard', pos: [-2.6, 0, 16.2], n: [-1, 0, 0] },
    ],
  },
  gunship: {
    name: 'Gunship', role: 'Armored, four hardpoints', scrap: 80, bay: 'pad',
    dry: 66000, prop: 22000, thrust: 700000, rcs: 120000, rcsArm: 8, isp: 1500, kr: 2.6e-4, reactor: 2.2e6,
    hull: 220, armor: 0.25, cargo: 36000, jf: 1.35, jumpRated: 88000, radius: 8, nose: 14, inertia: 1.9, sig: 1.3, busC: 2.6e6,
    blurb: 'Built to take hits and hand them out. Fit point defense and a coilgun and drones become salvage.',
    slots: [
      { id: 'eng-p', cls: 'engine', name: 'Aux engine · port', pos: [3.0, -1.2, -10.5], n: [0, 0, -1] },
      { id: 'eng-s', cls: 'engine', name: 'Aux engine · starboard', pos: [-3.0, -1.2, -10.5], n: [0, 0, -1] },
      { id: 'hp1', cls: 'hardpoint', name: 'Hardpoint · dorsal', pos: [0, 2.5, 5], n: [0, 1, 0] },
      { id: 'hp2', cls: 'hardpoint', name: 'Hardpoint · ventral', pos: [0, -2.5, 5], n: [0, -1, 0] },
      { id: 'hp3', cls: 'hardpoint', name: 'Hardpoint · port', pos: [3.65, 0, -1], n: [1, 0, 0] },
      { id: 'hp4', cls: 'hardpoint', name: 'Hardpoint · starboard', pos: [-3.65, 0, -1], n: [-1, 0, 0] },
      { id: 'ut1', cls: 'utility', name: 'Utility · dorsal port', pos: [1.6, 2.5, -3], n: [0, 1, 0] },
      { id: 'ut2', cls: 'utility', name: 'Utility · dorsal starboard', pos: [-1.6, 2.5, -3], n: [0, 1, 0] },
      { id: 'st1', cls: 'structure', name: 'Armor · port bow', pos: [3.65, 0, 7], n: [1, 0, 0] },
      { id: 'st2', cls: 'structure', name: 'Armor · starboard bow', pos: [-3.65, 0, 7], n: [-1, 0, 0] },
    ],
  },
  battlecruiser: {
    name: 'Battlecruiser', role: 'Capital hull, strategic handling', scrap: 300, bay: 'dock', needsReactor: true,
    dry: 480000, prop: 180000, thrust: 3.2e6, rcs: 700000, rcsArm: 40, isp: 1600, kr: 1.6e-3, reactor: 9e6,
    hull: 1200, armor: 0.45, cargo: 450000, jf: 2.6, jumpRated: 680000, radius: 26, nose: 78, inertia: 49, sig: 3.5, busC: 2.4e7,
    blurb: 'A 140 m capital hull: twelve mounts and a reactor bay. Turns like a building and burns like a star; you will fly it from the tactical view.',
    slots: [
      { id: 'core', cls: 'core', name: 'Reactor bay', pos: [0, 10.3, -2], n: [0, 1, 0] },
      { id: 'eng1', cls: 'engine', name: 'Aux engine · port', pos: [11.2, 0, -52], n: [0, 0, -1] },
      { id: 'eng2', cls: 'engine', name: 'Aux engine · starboard', pos: [-11.2, 0, -52], n: [0, 0, -1] },
      { id: 'eng3', cls: 'engine', name: 'Aux engine · dorsal', pos: [0, 10.3, -50], n: [0, 0, -1] },
      { id: 'hp1', cls: 'hardpoint', name: 'Hardpoint · dorsal fore', pos: [0, 10.3, 40], n: [0, 1, 0] },
      { id: 'hp2', cls: 'hardpoint', name: 'Hardpoint · ventral fore', pos: [0, -10.3, 40], n: [0, -1, 0] },
      { id: 'hp3', cls: 'hardpoint', name: 'Hardpoint · port', pos: [11.2, 0, 20], n: [1, 0, 0] },
      { id: 'hp4', cls: 'hardpoint', name: 'Hardpoint · starboard', pos: [-11.2, 0, 20], n: [-1, 0, 0] },
      { id: 'ut1', cls: 'utility', name: 'Utility · port', pos: [11.2, -4, -22], n: [1, 0, 0] },
      { id: 'ut2', cls: 'utility', name: 'Utility · starboard', pos: [-11.2, -4, -22], n: [-1, 0, 0] },
      { id: 'st1', cls: 'structure', name: 'Armor · port bow', pos: [11.2, -4, 46], n: [1, 0, 0] },
      { id: 'st2', cls: 'structure', name: 'Armor · starboard bow', pos: [-11.2, -4, 46], n: [-1, 0, 0] },
    ],
  },
};
const CLASS_ORDER = ['cutter', 'racer', 'hauler', 'gunship', 'battlecruiser'];
const PART_EFFECT = {
  0: 'Hull +30, damage taken −5%',
  1: 'Heat rejection +2.4 MW at 500 K',
  2: 'Thrust +160 kN',
  3: 'Point defense: shoots down slugs, engages awake drones',
  4: 'Coilgun: 60 damage per shot along your nose (B)',
  5: 'Laser cuts 50% faster, coilgun reloads 40% faster',
  6: 'Sensor range +60%',
  8: 'Laser runs 50% cooler, coilgun reloads 20% faster',
  9: 'Hull +8',
};
// part type → mount class (jump cells are fuel, not fittings)
const MOUNT_OF = { 0: 'structure', 1: 'utility', 2: 'engine', 3: 'hardpoint', 4: 'hardpoint', 5: 'core', 6: 'utility', 8: 'utility', 9: 'structure' };
const MOUNT_LABEL = { core: 'Reactor bay', engine: 'Engine', hardpoint: 'Hardpoint', utility: 'Utility', structure: 'Armor' };
// a fusion core is bulky but fits a gunship or hauler utility mount too
const fitsMount = (type, mountCls) => MOUNT_OF[type] === mountCls || (type === 5 && mountCls === 'utility');

// ---------------------------------------------------------------------
//  Characteristics of a fitted ship → core configuration
// ---------------------------------------------------------------------
function shipConfig(clsId, fitted) {
  const C = SHIP_CLASSES[clsId];
  const n = (t) => fitted.filter((p) => p.type === t).length;
  const fitMass = fitted.reduce((a, p) => a + p.mass, 0);
  const caps = n(8), reactor = n(5) > 0;
  const c = {
    dry: C.dry + fitMass, prop: C.prop,
    thrust: C.thrust + n(2) * 160000, rcs: C.rcs, rcsArm: C.rcsArm, isp: C.isp,
    kr: C.kr + n(1) * 0.6e-4, reactor: C.reactor + (reactor ? 1.0e6 : 0),
    hull: C.hull + n(0) * 30 + n(9) * 8, armor: Math.min(0.6, C.armor + n(0) * 0.05),
    // the yard re-tunes the jump drive for fitted mass, but not all of it: fittings still cost haul capacity
    cargo: C.cargo, jf: C.jf, jumpRated: C.jumpRated + fitMass * 0.85, radius: C.radius, nose: C.nose, inertia: C.inertia, sig: C.sig,
    pdc: n(3), coil: n(4), laserMul: reactor ? 1.5 : 1, laserCap: 1 + caps * 0.5,
    coilReload: 4 * (reactor ? 0.6 : 1) * Math.pow(0.8, caps), busC: C.busC, sensors: 1 + n(6) * 0.6,
  };
  const mass = c.dry + c.prop;
  c.accel = c.thrust / mass;
  c.dv = c.isp * 9.81 * Math.log(mass / c.dry);
  c.heatAt500 = c.kr * 500 ** 4 / 1e6;
  c.jumpCost = (m) => { const r = m / c.jumpRated; return 0.85 * r * (0.6519 + 0.4013 * r - 0.0533 * r * r); };
  // cargo the jump fuel can carry home, by bisection on the cost curve
  let lo = 0, hi = c.cargo; for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2; if (c.jumpCost(mass + mid) > c.jf) hi = mid; else lo = mid; }
  c.haul = lo;
  c.ready = !C.needsReactor || reactor;
  return c;
}
function writeConfig(c) {
  const K = new Float32Array(mem, core.configPtr(), 32);
  K.set([c.dry, c.prop, c.thrust, c.rcs, c.rcsArm, c.isp, c.kr, c.kr * 0.1, c.reactor, c.hull, c.armor, c.cargo,
    c.jf, c.jumpRated, c.radius, c.nose, c.inertia, c.sig, c.pdc, c.coil, c.laserMul, c.laserCap, c.coilReload, c.busC]);
  core.applyConfig();
}

// ---------------------------------------------------------------------
//  Hull models
// ---------------------------------------------------------------------
function ensureShipMats() {
  if (MAT.racer) return;
  MAT.racer = pbr(hullMaps({ seed: 111, base: '#d9dcd8', base2: '#2f8fa0', stripe: '#2f8fa0', rust: 0.08, scorch: 0.08, panel: 88, bare: 0.12, rough: 0.38 }));
  MAT.hauler = pbr(hullMaps({ seed: 121, base: '#c98a2b', base2: '#59605d', stripe: '#161512', rust: 0.35, scorch: 0.15, panel: 64, bare: 0.3, rough: 0.62 }));
  MAT.container = pbr(hullMaps({ seed: 125, base: '#6e7d52', base2: '#a5492f', stripe: '#d9d4c4', rust: 0.4, scorch: 0.1, panel: 40, bare: 0.25, rough: 0.7 }));
  MAT.gunship = pbr(hullMaps({ seed: 131, base: '#4b5157', base2: '#373c41', stripe: '#d0a03a', rust: 0.1, scorch: 0.2, panel: 72, bare: 0.18, rough: 0.5 }));
  MAT.capital = pbr(hullMaps({ seed: 141, base: '#7b8186', base2: '#5c6267', stripe: '#d0a03a', rust: 0.12, scorch: 0.12, panel: 96, bare: 0.15, rough: 0.52 }));
}

// every builder returns { meshes: [[geo, mat, irKey]], radiators: [{pos, geo, side, fold}], nozzles: [{pos, r, len}],
//   laser, harpoon, nav, strobe, flood, rcs, cam } in ship-local metres; +Z is forward
const HULLS = {
  cutter() {
    return {
      meshes: [
        [merge([place(boxG(3.6, 3.0, 9.5), [0, 0, 0]), place(boxG(2.8, 2.2, 3.0), [0, 0.2, 5.6]), place(cylG(1.1, 1.5, 2.2, 4), [0, 0.2, 7.9], [Math.PI / 2, Math.PI / 4, 0]),
          place(boxG(4.4, 0.6, 2.4), [0, 1.8, -1.0]), place(boxG(1.2, 1.0, 3.0), [0, -1.9, 2.0]), place(boxG(2.2, 2.2, 1.2), [0, 0, -5.4])]), MAT.starter, 'hull'],
        [merge([
          place(cylG(1.05, 1.05, 7.4, 16), [2.6, -0.4, -0.5], [Math.PI / 2, 0, 0]), place(cylG(1.05, 1.05, 7.4, 16), [-2.6, -0.4, -0.5], [Math.PI / 2, 0, 0]),
          ...[-3.6, -0.5, 2.6].flatMap((z) => [place(cylG(1.13, 1.13, 0.35, 16), [2.6, -0.4, z], [Math.PI / 2, 0, 0]), place(cylG(1.13, 1.13, 0.35, 16), [-2.6, -0.4, z], [Math.PI / 2, 0, 0])]),
          ...[[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].map(([x, y]) => place(boxG(0.22, 0.22, 4.2), [x, y, -7.8])),
          ...[-6.4, -8.0, -9.6].flatMap((z) => [place(boxG(2.0, 0.18, 0.18), [0, 0.9, z]), place(boxG(2.0, 0.18, 0.18), [0, -0.9, z])]),
          place(cylG(0.9, 1.0, 1.4, 16), [0, 0, -10.2], [Math.PI / 2, 0, 0]),
          place(cylG(0.32, 0.42, 2.4, 12), [0, 0.2, 9.3], [Math.PI / 2, 0, 0]), place(cylG(0.28, 0.28, 3.2, 10), [0, -1.9, 4.6], [Math.PI / 2, 0, 0]),
          place(boxG(0.5, 0.5, 6.0), [2.0, 1.55, -1.2]), place(boxG(0.5, 0.5, 6.0), [-2.0, 1.55, -1.2]),
          ...[[1.9, 1.6, 4.6], [-1.9, 1.6, 4.6], [1.9, -1.6, 4.6], [-1.9, -1.6, 4.6], [1.9, 1.6, -4.8], [-1.9, 1.6, -4.8], [1.9, -1.6, -4.8], [-1.9, -1.6, -4.8]].map((p) => place(boxG(0.55, 0.55, 0.55), p)),
        ]), MAT.metal, 'hull'],
        [place(boxG(2.3, 0.55, 0.2), [0, 0.75, 7.08], [-0.35, 0, 0]), MAT.glass, 'hull'],
      ],
      radiators: [1, -1].map((side) => ({ side, pos: [2.0 * side, 1.55, -1.2], fold: 1.5,
        geo: merge([place(boxG(7.2, 0.09, 5.6), [3.75 * side, 0, 0]), ...[-2.2, -1.1, 0, 1.1, 2.2].map((z) => place(boxG(7.2, 0.18, 0.12), [3.75 * side, 0.02, z]))]) })),
      nozzles: [{ pos: [0, 0, -10.8], r: 1.5, len: 3.2 }],
      laser: [0, 0.2, 10.4], harpoon: [0, -1.9, 6.2], nav: [[2.25, 0, 3], [-2.25, 0, 3]], strobe: [0, 2.2, -1], flood: [0, -0.6, 8.6],
      rcs: [[2, 1.6, 4.8], [-2, 1.6, 4.8], [2, -1.6, -4.8], [-2, -1.6, -4.8]], cam: 1,
    };
  },
  racer() {
    return {
      meshes: [
        [merge([place(cylG(1.25, 0.95, 13, 12), [0, 0, 1], [Math.PI / 2, 0, 0]), place(cylG(0.12, 0.95, 4.2, 12), [0, 0, 9.6], [Math.PI / 2, 0, 0]),
          place(boxG(0.25, 2.6, 3.2), [0, 1.6, -5.2]), place(boxG(1.6, 0.35, 2.4), [0, 0.95, -5.5])]), MAT.racer, 'hull'],
        [merge([place(cylG(1.05, 1.05, 7, 14), [2.4, 0, -4.5], [Math.PI / 2, 0, 0]), place(cylG(1.05, 1.05, 7, 14), [-2.4, 0, -4.5], [Math.PI / 2, 0, 0]),
          place(boxG(2.2, 0.35, 3.0), [1.3, 0, -4]), place(boxG(2.2, 0.35, 3.0), [-1.3, 0, -4]),
          ...[-2, -6.5].flatMap((z) => [place(cylG(1.12, 1.12, 0.3, 14), [2.4, 0, z], [Math.PI / 2, 0, 0]), place(cylG(1.12, 1.12, 0.3, 14), [-2.4, 0, z], [Math.PI / 2, 0, 0])]),
          place(cylG(0.18, 0.22, 2, 10), [0, -0.2, 12.4], [Math.PI / 2, 0, 0]), place(cylG(0.2, 0.2, 2.6, 10), [0, -0.95, 6.0], [Math.PI / 2, 0, 0])]), MAT.metal, 'hull'],
        [place(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), [0, 0.75, 4.2], [0, 0, 0], [0.85, 0.6, 2.6]), MAT.glass, 'hull'],
      ],
      radiators: [1, -1].map((side) => ({ side, pos: [1.1 * side, 0, 0.5], fold: 1.2,
        geo: (() => { const g = merge([place(boxG(5.4, 0.08, 3.4), [2.9 * side, 0, 0]), ...[-1.2, 0, 1.2].map((z) => place(boxG(5.4, 0.16, 0.1), [2.9 * side, 0.02, z]))]); g.rotateY(side * 0.45); return g; })() })),
      nozzles: [{ pos: [2.4, 0, -8], r: 0.95, len: 2.2 }, { pos: [-2.4, 0, -8], r: 0.95, len: 2.2 }],
      laser: [0, -0.2, 13.4], harpoon: [0, -0.95, 7.3], nav: [[4.6, 0, -2], [-4.6, 0, -2]], strobe: [0, 2.9, -5.5], flood: [0, -0.8, 11],
      rcs: [[1.4, 1, 6], [-1.4, 1, 6], [1.4, -1, -6], [-1.4, -1, -6]], cam: 0.95,
    };
  },
  hauler() {
    const cont = [];
    for (const x of [2.9, -2.9]) for (const z of [-8, 0, 8]) cont.push(place(boxG(3.2, 3.2, 7.4), [x, 0, z]));
    return {
      meshes: [
        [merge([place(boxG(5.2, 4.2, 6.2), [0, 0.2, 16.2]), place(cylG(1.6, 2.4, 2.4, 6), [0, 0.3, 20.2], [Math.PI / 2, Math.PI / 6, 0]), place(boxG(6.4, 5, 3), [0, 0, -17.5])]), MAT.hauler, 'hull'],
        [merge(cont), MAT.container, 'hull'],
        [merge([place(boxG(2.2, 2.2, 30), [0, 0, 0]),
          ...[-12, -4, 4, 12].map((z) => place(boxG(9.4, 0.5, 0.5), [0, 1.85, z])), ...[-12, -4, 4, 12].map((z) => place(boxG(9.4, 0.5, 0.5), [0, -1.85, z])),
          place(new THREE.SphereGeometry(2.6, 20, 14), [3.2, 0, -13.5]), place(new THREE.SphereGeometry(2.6, 20, 14), [-3.2, 0, -13.5]),
          place(cylG(0.35, 0.45, 2.6, 10), [0, 0.3, 21.6], [Math.PI / 2, 0, 0]), place(cylG(0.3, 0.3, 3.2, 10), [0, -2.2, 18.2], [Math.PI / 2, 0, 0])]), MAT.metal, 'hull'],
        [place(boxG(4.2, 0.8, 0.2), [0, 1.6, 19.35], [-0.3, 0, 0]), MAT.glass, 'hull'],
      ],
      radiators: [1, -1].map((side) => ({ side, pos: [1.4 * side, 2.1, -3], fold: 1.45,
        geo: merge([place(boxG(9.0, 0.1, 8), [4.7 * side, 0, 0]), ...[-3, -1.5, 0, 1.5, 3].map((z) => place(boxG(9.0, 0.2, 0.14), [4.7 * side, 0.02, z]))]) })),
      nozzles: [{ pos: [0, 0, -19], r: 1.7, len: 3.4 }, { pos: [2.6, 0, -19], r: 1.2, len: 2.6 }, { pos: [-2.6, 0, -19], r: 1.2, len: 2.6 }],
      laser: [0, 0.3, 22.9], harpoon: [0, -2.2, 19.8], nav: [[4.6, 1.8, 0], [-4.6, 1.8, 0]], strobe: [0, 3.2, 14], flood: [0, -0.8, 21],
      rcs: [[2.8, 2.2, 15], [-2.8, 2.2, 15], [3.2, -2.4, -16], [-3.2, -2.4, -16]], cam: 1.7,
    };
  },
  gunship() {
    const prof = hullProfile(0, 3.6);
    return {
      meshes: [
        [merge([prismG(prof, 20, -10, 0, 0, 7, false, UVS),
          place(cylG(0.8, 3.4, 5, 8), [0, 0, 12.4], [Math.PI / 2, Math.PI / 8, 0]),
          place(boxG(2.6, 1.0, 5), [0, 2.85, 1])]), MAT.gunship, 'hull'],
        [merge([...[-6, -1, 4].flatMap((z) => [place(boxG(0.5, 3.6, 4.4), [3.85, 0, z]), place(boxG(0.5, 3.6, 4.4), [-3.85, 0, z])]),
          place(boxG(7.2, 0.4, 4), [0, -2.75, -6]), place(boxG(6, 4.4, 2.2), [0, 0, -11])]), MAT.dark, 'hull'],
        [merge([place(cylG(0.3, 0.4, 2.6, 10), [0, 0, 15.4], [Math.PI / 2, 0, 0]), place(cylG(0.28, 0.28, 3, 10), [0, -2.6, 11], [Math.PI / 2, 0, 0]),
          ...[[2.6, 2.6, 8], [-2.6, 2.6, 8], [2.6, -2.6, -8], [-2.6, -2.6, -8]].map((p) => place(boxG(0.6, 0.6, 0.6), p))]), MAT.metal, 'hull'],
        [place(boxG(2.2, 0.4, 0.2), [0, 3.1, 3.55], [-0.5, 0, 0]), MAT.glass, 'hull'],
      ],
      radiators: [1, -1].map((side) => ({ side, pos: [1.7 * side, 2.6, -7.2], fold: 1.4,
        geo: merge([place(boxG(6.0, 0.08, 4.2), [3.1 * side, 0, 0]), ...[-1.5, 0, 1.5].map((z) => place(boxG(6.0, 0.16, 0.12), [3.1 * side, 0.02, z]))]) })),
      nozzles: [{ pos: [1.7, 0, -12.1], r: 1.4, len: 3 }, { pos: [-1.7, 0, -12.1], r: 1.4, len: 3 }],
      laser: [0, 0, 16.8], harpoon: [0, -2.6, 12.6], nav: [[4.2, 0, 2], [-4.2, 0, 2]], strobe: [0, 3.5, 0], flood: [0, -1.4, 14.5],
      rcs: [[3, 2.6, 9], [-3, 2.6, 9], [3, -2.6, -9], [-3, -2.6, -9]], cam: 1.45,
    };
  },
  battlecruiser() {
    const paint = [], dark = [], metal = [];
    const prof = (r) => hullProfile(0, r);
    const secs = [[-62, 26, 9.2], [-36, 26, 10], [-10, 26, 10], [16, 26, 10], [42, 20, 9]];
    for (const [z0, L, r] of secs) {
      paint.push(prismG(prof(r), L, z0, 0, 0, 3 + z0, false, UVS * 2));
      dark.push(prismG(prof(r * 1.04), 1.6, z0 + L * 0.5 - 0.8, 0.9, 0, 1, false, UVS * 2));
    }
    paint.push(place(cylG(2, 8, 16, 8), [0, 0, 70], [Math.PI / 2, Math.PI / 8, 0]));
    // superstructure, spinal barrel, main-battery turrets (not mounts: part of the hull)
    paint.push(place(boxG(8, 9, 20), [0, 11.5, 10]), place(boxG(5, 5, 9), [0, 18, 6]));
    dark.push(place(boxG(8.2, 1.2, 4), [0, 15.2, 18.8]));
    metal.push(place(cylG(1.6, 1.6, 150, 18), [0, -3, 8], [Math.PI / 2, 0, 0]));
    for (const z of [0, 30]) {
      dark.push(place(cylG(3.8, 4.4, 2.4, 24), [0, -9.4, z + 18]));
      for (const bx of [-1.1, 0, 1.1]) metal.push(place(cylG(0.4, 0.5, 14, 10), [bx, -11.2, z + 25], [Math.PI / 2 + 0.06, 0, 0]));
    }
    metal.push(prismG(prof(8), 6, -70, 0, 0, 2, false, UVS * 2));
    for (let k = 0; k < 40; k++) {
      const z = -58 + Math.random() * 110;
      const { p, n } = perimeterSample(prof(10), Math.random());
      const q = alignQ(new THREE.Vector3(0, 1, 0), new THREE.Vector3(n.x, n.y, 0));
      (k % 2 ? dark : metal).push(place(boxG(1 + Math.random() * 4, 0.6 + Math.random() * 1.6, 2 + Math.random() * 7), [p.x, p.y, z], q));
    }
    return {
      meshes: [[merge(paint), MAT.capital, 'hull'], [merge(dark), MAT.dark, 'hull'], [merge(metal), MAT.metal, 'hull'],
        [place(boxG(7, 1, 0.3), [0, 16.4, 20.8], [-0.4, 0, 0]), MAT.glass, 'hull']],
      radiators: [[1, -34], [-1, -34], [1, -14], [-1, -14]].map(([side, z]) => ({ side, pos: [9.6 * side, 4, z], fold: 1.35,
        geo: merge([place(boxG(28, 0.4, 14), [14.5 * side, 0, 0]), ...[-5, -2.5, 0, 2.5, 5].map((dz) => place(boxG(28, 0.7, 0.4), [14.5 * side, 0.1, dz]))]) })),
      nozzles: [{ pos: [0, 0, -70], r: 6.5, len: 12 }, { pos: [6.2, 4, -70], r: 3.6, len: 8 }, { pos: [-6.2, 4, -70], r: 3.6, len: 8 }, { pos: [0, -5, -70], r: 3.6, len: 8 }],
      laser: [0, 0, 79], harpoon: [0, -6, 72], nav: [[11, 0, 30], [-11, 0, 30]], strobe: [0, 21, 4], flood: [0, -4, 76],
      rcs: [[9, 8, 60], [-9, 8, 60], [9, -8, -60], [-9, -8, -60]], cam: 6.5,
    };
  },
};

// Build a ship model: hull, deployable radiators, drives with plumes, lights, and the fitted parts on their mounts.
// fitted: [{ slot, type }]
function buildShipModel(clsId, fitted, sc = scene, opts = {}) {
  ensureShipMats();
  const C = SHIP_CLASSES[clsId];
  const H = HULLS[clsId]();
  const grp = new THREE.Group();
  const ir = { hull: irMaterial(0.2), rad: irMaterial(0.25), bell: irMaterial(0.2) };
  for (const [geo, mat, key] of H.meshes) {
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; m.userData.ir = ir[key].mat; grp.add(m);
  }
  // radiators
  const radMat = MAT.radiator.clone();
  const radiators = H.radiators.map((r) => {
    const pivot = new THREE.Group(); pivot.position.set(...r.pos);
    const panel = new THREE.Mesh(r.geo, radMat); panel.castShadow = true; panel.receiveShadow = true; panel.userData.ir = ir.rad.mat;
    pivot.add(panel); grp.add(pivot);
    return { pivot, side: r.side, panel, fold: r.fold };
  });
  // drives
  const bellInMat = MAT.bellIn.clone();
  const plumeMat = new THREE.MeshBasicNodeMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const plumeU = uniform(0);
  const yv = uv().y;
  const flick = sin(time.mul(53.0)).mul(0.06).add(1);
  plumeMat.colorNode = mix(vec3(0.05, 0.12, 0.7), vec3(1.9, 1.35, 0.95), yv.pow(3.0)).mul(yv.pow(1.8)).mul(plumeU).mul(flick).mul(abs(normalView.z).pow(1.2));
  const nozzles = H.nozzles.map((nz) => {
    const [x, y, z] = nz.pos;
    const out = new THREE.Mesh(place(bellG(nz.r, nz.len), [x, y, z], [Math.PI / 2, 0, 0]), MAT.metal); out.castShadow = true; out.userData.ir = ir.bell.mat;
    const inn = new THREE.Mesh(place(bellG(nz.r * 0.95, nz.len * 0.97), [x, y, z - 0.05], [Math.PI / 2, 0, 0]), bellInMat); inn.userData.ir = ir.bell.mat;
    const plume = new THREE.Mesh(place(new THREE.CylinderGeometry(nz.r * 0.8, nz.r * 0.33, 1, 24, 1, true), [0, 0, -0.5], [Math.PI / 2, 0, 0]), plumeMat);
    plume.position.set(x, y, z - nz.len - 0.15); plume.frustumCulled = false;
    const core2 = new THREE.Mesh(place(new THREE.CylinderGeometry(nz.r * 0.37, nz.r * 0.1, 1, 16, 1, true), [0, 0, -0.5], [Math.PI / 2, 0, 0]), plumeMat);
    core2.position.copy(plume.position); core2.frustumCulled = false;
    grp.add(out, inn, plume, core2);
    return { plume, core2, r: nz.r, len: nz.len };
  });
  const tailZ = Math.min(...H.nozzles.map((n) => n.pos[2] - n.len));
  let engineLight = null;
  if (!opts.noLights) { engineLight = new THREE.PointLight(new THREE.Color(1.0, 0.75, 0.55), 0, 90 * H.cam, 1.6); engineLight.position.set(0, 0, tailZ - 3 * H.cam); grp.add(engineLight); }
  // lights
  const navR = new THREE.Mesh(new THREE.SphereGeometry(0.16 * Math.max(1, H.cam * 0.6), 8, 6), MAT.red); navR.position.set(...H.nav[0]);
  const navG = new THREE.Mesh(new THREE.SphereGeometry(0.16 * Math.max(1, H.cam * 0.6), 8, 6), MAT.green); navG.position.set(...H.nav[1]);
  const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.14 * Math.max(1, H.cam * 0.6), 8, 6), MAT.white.clone()); strobe.position.set(...H.strobe);
  grp.add(navR, navG, strobe);
  let flood = null;
  if (!opts.noLights) {
    flood = new THREE.SpotLight(new THREE.Color(1, 0.96, 0.88), 9000, 320 * H.cam, 0.36, 0.55, 1.8);
    flood.position.set(...H.flood);
    const ft = new THREE.Object3D(); ft.position.set(H.flood[0], H.flood[1] - 2, H.flood[2] + 60); grp.add(ft); flood.target = ft;
    grp.add(flood);
  }
  // fitted parts
  const slotMarkers = {};
  const markerMat = opts.markers ? new THREE.MeshStandardMaterial({ color: '#000', emissive: new THREE.Color(2.6, 1.5, 0.35) }) : null;
  for (const s of C.slots) {
    const f = fitted.find((x) => x.slot === s.id);
    const n = new THREE.Vector3(...s.n);
    if (f) {
      if (!PROTOS[f.type]) PROTOS[f.type] = partPrototype(f.type);
      const g = PROTOS[f.type].clone();
      g.position.set(...s.pos);
      g.quaternion.copy(alignQ(new THREE.Vector3(0, 1, 0), n));
      if (f.type === 5 && s.cls !== 'core') g.scale.setScalar(0.7);
      g.traverse((o) => { if (o.isMesh) o.userData.ir = ir.hull.mat; });
      grp.add(g);
    } else if (markerMat) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(0.9 * Math.max(1, H.cam * 0.5), 0.07 * Math.max(1, H.cam * 0.5), 6, 28), markerMat);
      m.position.set(...s.pos); m.quaternion.copy(alignQ(new THREE.Vector3(0, 0, 1), n));
      grp.add(m); slotMarkers[s.id] = m;
    }
  }
  sc.add(grp);
  return {
    grp, cls: clsId, radiators, radMat, nozzles, plume: nozzles[0].plume, core2: nozzles[0].core2, plumeU, engineLight, flood, strobe,
    bellInMat, ir, laserLocal: new THREE.Vector3(...H.laser), harpLocal: new THREE.Vector3(...H.harpoon), camScale: H.cam,
    rcsPts: H.rcs.map((p) => new THREE.Vector3(...p)), slotMarkers,
  };
}
function disposeShipModel(m) {
  if (!m) return;
  m.grp.parent && m.grp.parent.remove(m.grp);
}
