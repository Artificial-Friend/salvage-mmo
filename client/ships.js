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
      { id: 'eng3', cls: 'engine', name: 'Aux engine · dorsal', pos: [0, 11.6, -50], n: [0, 0, -1] },
      { id: 'hp1', cls: 'hardpoint', name: 'Hardpoint · dorsal fore', pos: [0, 10.3, 40], n: [0, 1, 0] },
      { id: 'hp2', cls: 'hardpoint', name: 'Hardpoint · ventral fore', pos: [0, -10.3, 40], n: [0, -1, 0] },
      { id: 'hp3', cls: 'hardpoint', name: 'Hardpoint · port', pos: [11.2, 0, 20], n: [1, 0, 0] },
      { id: 'hp4', cls: 'hardpoint', name: 'Hardpoint · starboard', pos: [-11.2, 0, 20], n: [-1, 0, 0] },
      { id: 'ut1', cls: 'utility', name: 'Utility · port', pos: [11.2, -2, -22], n: [1, 0, 0] },
      { id: 'ut2', cls: 'utility', name: 'Utility · starboard', pos: [-11.2, -2, -22], n: [-1, 0, 0] },
      { id: 'st1', cls: 'structure', name: 'Armor · port bow', pos: [11.2, -2, 46], n: [1, 0, 0] },
      { id: 'st2', cls: 'structure', name: 'Armor · starboard bow', pos: [-11.2, -2, 46], n: [-1, 0, 0] },
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
  MAT.racer = surf('racer', () => pbr(hullMaps({ seed: 111, base: '#d9dcd8', base2: '#2f8fa0', stripe: '#2f8fa0', rust: 0.08, scorch: 0.08, panel: 88, bare: 0.12, rough: 0.38 })));
  MAT.hauler = surf('hauler', () => pbr(hullMaps({ seed: 121, base: '#c98a2b', base2: '#59605d', stripe: '#161512', rust: 0.35, scorch: 0.15, panel: 64, bare: 0.3, rough: 0.62 })));
  MAT.container = surf('container', () => pbr(hullMaps({ seed: 125, base: '#6e7d52', base2: '#a5492f', stripe: '#d9d4c4', rust: 0.4, scorch: 0.1, panel: 40, bare: 0.25, rough: 0.7 })));
  MAT.gunship = surf('gunship', () => pbr(hullMaps({ seed: 131, base: '#4b5157', base2: '#373c41', stripe: '#d0a03a', rust: 0.1, scorch: 0.2, panel: 72, bare: 0.18, rough: 0.5 })));
  MAT.capital = surf('capital', () => pbr(hullMaps({ seed: 141, base: '#7b8186', base2: '#5c6267', stripe: '#d0a03a', rust: 0.12, scorch: 0.12, panel: 96, bare: 0.15, rough: 0.52 })));
}

// Hull cross-section families
const SEC = {
  work: { keel: 0.55, deck: 0.6, lo: -0.3, hi: 0.35, up: 0.88 },     // cutter: boxy, chined
  dart: { keel: 0.3, deck: 0.38, lo: -0.15, hi: 0.35, up: 0.78 },    // racer: narrow diamond
  pod: { keel: 0.45, deck: 0.45, lo: -0.45, hi: 0.45, up: 1 },       // octagonal pods and nacelles
  box: { keel: 0.65, deck: 0.6, lo: -0.4, hi: 0.35, up: 0.9 },       // hauler cab
  war: { keel: 0.5, deck: 0.5, lo: -0.2, hi: 0.3, up: 0.85 },        // gunship: armoured hexagon
  cap: { keel: 0.5, deck: 0.45, lo: -0.3, hi: 0.3, up: 0.86 },       // battlecruiser
  tier: { keel: 0.9, deck: 0.8, lo: -0.6, hi: 0.5, up: 0.95 },       // superstructure
  tusk: { keel: 0.4, deck: 0.4, lo: -0.3, hi: 0.3, up: 0.9 },        // prongs, mandibles
};
// overlapping armour strakes: plates welded along the hull at given angles round the section,
// clear of the mounts. Returns geometries.
function cladding(probe, { cy = 0, angles, z0, z1, step, w, l, t, skip = [], jag = 0, seed = 7 }) {
  const rnd = mulberry(seed), out = [];
  for (const a of angles) {
    for (let z = z0; z <= z1; z += step) {
      const n = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
      const c = new THREE.Vector3(0, cy, z);
      const hit = probe(c, n, 40);
      if (!hit) continue;
      if (skip.some((s) => hit.p.distanceTo(new THREE.Vector3(...s)) < Math.max(w, l) * 0.6 + 2.2)) continue;
      const g = armorPlateG(w * (0.9 + rnd() * 0.2), l * (0.9 + rnd() * 0.2), t, 0.2, jag && rnd() < 0.4 ? l * jag : 0, rnd);
      g.rotateZ((rnd() - 0.5) * 0.04);
      out.push(atMount(g, hit.p.toArray(), hit.n.toArray(), -0.02));
    }
  }
  return out;
}

// every builder returns { meshes: [[geo, mat, irKey]], radiators: [{pos, geo, side, fold}], nozzles: [{pos, r, len}],
//   laser, harpoon, nav, strobe, flood, rcs, cam, clad?(probe) } in ship-local metres; +Z is forward
const HULLS = {
  // A working salvage tug: chined box hull, a scowling brow over the cockpit, and two claws
  // either side of the cutting laser. Tanks ride in strapped pods; the drive is an open frame.
  cutter() {
    const body = loftG([
      { z: -6.2, w: 1.6, h: 1.35 }, { z: -5.2, w: 1.9, h: 1.5 }, { z: 4.2, w: 1.9, h: 1.5 },
      { z: 6.4, w: 1.55, h: 1.3, y: -0.05 }, { z: 8.6, w: 0.95, h: 0.75, y: -0.3 }, { z: 9.4, w: 0.55, h: 0.45, y: -0.35 },
    ], SEC.work);
    const spine = loftG([{ z: -8.6, w: 0.7, h: 0.4, y: 1.15 }, { z: -8.0, w: 0.85, h: 0.45, y: 1.1 }, { z: -4.8, w: 0.85, h: 0.45, y: 1.1 }], SEC.work);
    const pods = [], straps = [], dark = [], metal = [];
    for (const sx of [1, -1]) {
      const x = 2.85 * sx, y = -0.35;
      pods.push(loftG([{ z: -4.6, w: 0.3, h: 0.3, x, y }, { z: -3.7, w: 1.0, h: 1.0, x, y }, { z: 2.0, w: 1.0, h: 1.0, x, y }, { z: 3.1, w: 0.5, h: 0.5, x, y }, { z: 3.5, w: 0.18, h: 0.18, x, y }], SEC.pod));
      for (const z of [-2.6, -0.6, 1.3]) straps.push(loftG([{ z: z - 0.16, w: 1.07, h: 1.07, x, y }, { z: z + 0.16, w: 1.07, h: 1.07, x, y }], SEC.pod));
      for (const z of [-2.6, 1.3]) dark.push(strutG([1.75 * sx, -0.3, z], [2.2 * sx, -0.35, z], 0.5));
      // claws: forward prongs flanking the laser, toothed on the inside
      dark.push(loftG([
        { z: 5.6, x: 1.3 * sx, y: -0.8, w: 0.45, h: 0.55 }, { z: 8.4, x: 1.25 * sx, y: -0.92, w: 0.38, h: 0.45 },
        { z: 10.3, x: 0.98 * sx, y: -0.78, w: 0.22, h: 0.27 }, { z: 11.5, x: 0.62 * sx, y: -0.58, w: 0.04, h: 0.05 },
      ], SEC.tusk));
      for (const z of [7.4, 8.6, 9.7]) dark.push(place(spikeG(0.13, 0.55), [(1.25 - (z - 7.4) * 0.12) * sx - 0.3 * sx, -0.85, z], [0, 0, sx * Math.PI / 2]));
      // open drive frame: longerons from the hull corners to the thrust ring
      for (const sy of [1, -1]) metal.push(strutG([1.25 * sx, 1.0 * sy, -6.1], [0.8 * sx, 0.8 * sy, -9.7], 0.24));
      // RCS quads
      for (const [y, z] of [[1.05, 4.6], [-1.05, -4.6]]) metal.push(place(boxG(0.5, 0.5, 0.6), [1.7 * sx, y, z]));
    }
    dark.push(loftG([{ z: -10.3, w: 1.15, h: 1.15 }, { z: -9.4, w: 1.28, h: 1.28 }], SEC.pod));
    dark.push(place(boxG(1.5, 1.5, 2.2), [0, 0, -7.7]));
    for (const z of [-7.0, -8.9]) { metal.push(place(boxG(1.9, 0.18, 0.18), [0, 0.86, z]), place(boxG(1.9, 0.18, 0.18), [0, -0.86, z])); }
    // brow and cockpit glass
    dark.push(place(armorPlateG(2.5, 1.3, 0.22, 0.3), [0, 1.27, 6.75], [0.16, 0, 0]));
    dark.push(place(boxG(0.9, 0.7, 3.0), [0, -1.55, 4.9]));
    metal.push(place(facetCylG(0.3, 0.42, 2.2, 6), [0, 0.15, 9.4], [Math.PI / 2, 0, 0]), place(facetCylG(0.24, 0.24, 2.4, 6), [0, -1.6, 6.3], [Math.PI / 2, 0, 0]));
    // radiator rails
    for (const sx of [1, -1]) metal.push(place(boxG(0.45, 0.4, 6.0), [1.35 * sx, 1.62, -1.2]));
    return {
      meshes: [[merge([body, spine]), MAT.starter, 'hull'], [merge(pods), MAT.starter, 'hull'], [merge([...straps, ...dark]), MAT.dark, 'hull'], [merge(metal), MAT.metal, 'hull'],
        [place(boxG(1.25, 0.08, 1.5), [0, 0.88, 7.45], [0.35, 0, 0]), MAT.glass, 'hull']],
      radiators: [1, -1].map((side) => ({ side, pos: [1.35 * side, 1.7, -1.2], fold: 1.5,
        geo: merge([place(boxG(7.2, 0.09, 5.6), [3.75 * side, 0, 0]), ...[-2.2, -1.1, 0, 1.1, 2.2].map((z) => place(boxG(7.2, 0.18, 0.12), [3.75 * side, 0.02, z]))]) })),
      nozzles: [{ pos: [0, 0, -10.8], r: 1.5, len: 3.2 }],
      laser: [0, 0.15, 10.6], harpoon: [0, -1.6, 7.6], nav: [[1.98, 0, 3], [-1.98, 0, 3]], strobe: [0, 1.62, 1.2], flood: [0, -0.6, 8.6],
      rcs: [[1.9, 1.05, 4.6], [-1.9, 1.05, 4.6], [1.9, -1.05, -4.6], [-1.9, -1.05, -4.6]], cam: 1,
    };
  },
  // A needle on two nacelles: swept pylons, canards, a raked fin and a bubble canopy.
  racer() {
    const body = loftG([{ z: -7.2, w: 0.7, h: 0.6 }, { z: -5.6, w: 1.1, h: 0.9 }, { z: 1.0, w: 1.3, h: 0.95 }, { z: 5.0, w: 1.05, h: 0.8, y: -0.05 },
      { z: 9.6, w: 0.5, h: 0.4, y: -0.15 }, { z: 13.4, w: 0.07, h: 0.07, y: -0.2 }], SEC.dart);
    const pylon = [[0.8, -1.0], [0.8, -5.6], [2.2, -6.6], [2.2, -2.6]];
    const canard = [[0.9, 6.4], [0.9, 4.6], [2.7, 3.7], [2.8, 4.2]];
    const paint = [body], dark = [], metal = [];
    for (const sx of [1, -1]) {
      const x = 2.4 * sx;
      paint.push(loftG([{ z: -8.0, w: 0.9, h: 0.9, x }, { z: -7.2, w: 1.05, h: 1.0, x }, { z: -2.2, w: 1.0, h: 0.95, x }, { z: -0.4, w: 0.55, h: 0.5, x }, { z: 0.2, w: 0.2, h: 0.2, x }], SEC.pod));
      const pl = sx > 0 ? pylon : mirrorX(pylon), cn = sx > 0 ? canard : mirrorX(canard);
      paint.push(place(plateG(pl, 0.28), [0, -0.14, 0]), place(plateG(cn, 0.14), [0, -0.12, 0]));
      dark.push(place(boxG(0.25, 0.7, 1.2), [x, 0, -0.1]));
    }
    paint.push(place(finG([[0, -7.6], [0, -3.4], [2.3, -6.8], [2.45, -8.1]], 0.2), [0, 0.6, 0]));
    dark.push(place(finG([[0, -7.0], [0, -4.6], [1.0, -6.6], [1.1, -7.4]], 0.16), [0, -0.55, 0], [0, 0, Math.PI]));
    dark.push(loftG([{ z: 5.2, w: 0.25, h: 0.25, y: -0.75 }, { z: 6.0, w: 0.35, h: 0.3, y: -0.8 }, { z: 7.6, w: 0.3, h: 0.25, y: -0.75 }], SEC.pod));
    metal.push(place(facetCylG(0.07, 0.14, 2.2, 6), [0, -0.2, 13.4], [Math.PI / 2, 0, 0]));
    const canopy = loftG([{ z: 2.3, w: 0.25, h: 0.08, y: 0.86 }, { z: 3.5, w: 0.6, h: 0.3, y: 0.95 }, { z: 5.5, w: 0.5, h: 0.24, y: 0.8 }, { z: 6.6, w: 0.18, h: 0.06, y: 0.66 }], { keel: 0.9, deck: 0.5, lo: -0.2, hi: 0.4, up: 0.9 });
    return {
      meshes: [[merge(paint), MAT.racer, 'hull'], [merge(dark), MAT.dark, 'hull'], [merge(metal), MAT.metal, 'hull'], [canopy, MAT.glass, 'hull']],
      radiators: [1, -1].map((side) => ({ side, pos: [1.1 * side, 0, 0.5], fold: 1.2,
        geo: (() => { const g = merge([place(boxG(5.4, 0.08, 3.4), [2.9 * side, 0, 0]), ...[-1.2, 0, 1.2].map((z) => place(boxG(5.4, 0.16, 0.1), [2.9 * side, 0.02, z]))]); g.rotateY(side * 0.45); return g; })() })),
      nozzles: [{ pos: [2.4, 0, -8], r: 0.95, len: 2.2 }, { pos: [-2.4, 0, -8], r: 0.95, len: 2.2 }],
      laser: [0, -0.2, 14.6], harpoon: [0, -0.8, 7.8], nav: [[3.45, 0, -2], [-3.45, 0, -2]], strobe: [0, 3.0, -7.4], flood: [0, -0.6, 11],
      rcs: [[1.2, 0.8, 6], [-1.2, 0.8, 6], [1.2, -0.8, -6], [-1.2, -0.8, -6]], cam: 0.95,
    };
  },
  // A long-haul tug: armoured cab with a ram plough, a spine of framed containers, strapped tanks.
  hauler() {
    const cab = loftG([{ z: 13.0, w: 2.6, h: 2.2, y: 0.2 }, { z: 17.8, w: 2.6, h: 2.2, y: 0.2 }, { z: 19.8, w: 2.1, h: 1.7 }, { z: 21.6, w: 1.2, h: 0.95, y: -0.35 }], SEC.box);
    const stern = loftG([{ z: -19.2, w: 3.3, h: 2.6 }, { z: -15.6, w: 3.3, h: 2.6 }, { z: -14.4, w: 1.8, h: 1.6 }], { keel: 0.7, deck: 0.7, lo: -0.3, hi: 0.3, up: 0.92 });
    const plinth = loftG([{ z: 11.4, w: 1.7, h: 0.32, y: 2.55 }, { z: 14.6, w: 1.7, h: 0.32, y: 2.55 }], SEC.tier);
    const cont = [], dark = [], metal = [];
    for (const x of [2.9, -2.9]) for (const z of [-8, 0, 8]) cont.push(place(boxG(3.2, 3.2, 7.4), [x, 0, z]));
    dark.push(loftG([{ z: 17.4, w: 2.9, h: 0.55, y: -2.35 }, { z: 21.0, w: 2.2, h: 0.4, y: -2.05 }, { z: 23.2, w: 0.7, h: 0.12, y: -1.6 }], { keel: 0.8, deck: 0.8, lo: -0.2, hi: 0.2, up: 1 }));
    for (const x of [-1.5, 0, 1.5]) dark.push(place(spikeG(0.24, 1.5), [x * (1 - 0.2), -1.75, 22.4 - Math.abs(x) * 0.9], [Math.PI / 2, 0, 0]));
    dark.push(place(boxG(0.8, 0.6, 2.4), [0, -1.4, 20.4]));
    for (const z of [-12, -4, 4, 12]) {
      dark.push(place(boxG(9.8, 0.45, 0.6), [0, 2.05, z]), place(boxG(9.8, 0.45, 0.6), [0, -2.05, z]));
      dark.push(place(boxG(0.45, 4.55, 0.6), [4.75, 0, z]), place(boxG(0.45, 4.55, 0.6), [-4.75, 0, z]));
    }
    for (const sx of [1, -1]) {
      dark.push(place(boxG(1.6, 1.3, 2.2), [3.45 * sx, -2.35, -14.2]));
      metal.push(place(faceted(new THREE.IcosahedronGeometry(2.6, 1)), [3.2 * sx, 0, -13.5]));
      dark.push(place(new THREE.TorusGeometry(2.62, 0.16, 6, 20), [3.2 * sx, 0, -13.5]));
    }
    metal.push(place(boxG(2.2, 2.2, 28), [0, 0, -1]), place(facetCylG(0.3, 0.42, 2.0, 6), [0, 0.1, 22.2], [Math.PI / 2, 0, 0]), place(facetCylG(0.26, 0.26, 2.2, 6), [0, -1.4, 21.4], [Math.PI / 2, 0, 0]));
    dark.push(loftG([{ z: -20.0, w: 2.6, h: 2.1 }, { z: -19.1, w: 2.8, h: 2.3 }], SEC.pod));
    return {
      meshes: [[merge([cab, stern, plinth]), MAT.hauler, 'hull'], [merge(cont), MAT.container, 'hull'], [merge(dark), MAT.dark, 'hull'], [merge(metal), MAT.metal, 'hull'],
        [place(boxG(2.6, 0.08, 1.8), [0, 2.06, 18.8], [0.34, 0, 0]), MAT.glass, 'hull']],
      radiators: [1, -1].map((side) => ({ side, pos: [1.4 * side, 2.35, -3], fold: 1.45,
        geo: merge([place(boxG(9.0, 0.1, 8), [4.7 * side, 0, 0]), ...[-3, -1.5, 0, 1.5, 3].map((z) => place(boxG(9.0, 0.2, 0.14), [4.7 * side, 0.02, z]))]) })),
      nozzles: [{ pos: [0, 0, -20.0], r: 1.7, len: 3.4 }, { pos: [2.6, 0.6, -20.0], r: 1.2, len: 2.6 }, { pos: [-2.6, 0.6, -20.0], r: 1.2, len: 2.6 }],
      laser: [0, 0.1, 23.4], harpoon: [0, -1.4, 22.6], nav: [[4.98, 1.8, -12], [-4.98, 1.8, -12]], strobe: [0, 2.95, 11.8], flood: [0, -0.8, 21.4],
      rcs: [[2.6, 2.2, 15], [-2.6, 2.2, 15], [3.2, -2.4, -17], [-3.2, -2.4, -17]], cam: 1.7,
    };
  },
  // A warship's arrowhead: hexagonal armoured hull, layered strakes, a heavy brow over a slit
  // canopy, two tusks under the bow and engines in armoured sponsons.
  gunship() {
    const body = loftG([{ z: -10.8, w: 3.0, h: 2.2 }, { z: -8.5, w: 3.6, h: 2.5 }, { z: 8, w: 3.6, h: 2.5 }, { z: 11.6, w: 2.4, h: 1.7, y: -0.2 },
      { z: 14.4, w: 1.1, h: 0.8, y: -0.45 }, { z: 16.2, w: 0.3, h: 0.25, y: -0.55 }], SEC.war);
    const dark = [], metal = [];
    for (const sx of [1, -1]) {
      dark.push(loftG([{ z: -10.5, w: 0.95, h: 0.85, x: 3.0 * sx, y: -1.2 }, { z: -9.8, w: 1.05, h: 0.95, x: 3.0 * sx, y: -1.2 }, { z: -4.6, w: 1.0, h: 0.9, x: 3.0 * sx, y: -1.2 }, { z: -3.4, w: 0.45, h: 0.4, x: 3.0 * sx, y: -1.2 }], SEC.pod));
      dark.push(loftG([{ z: 8.5, x: 1.7 * sx, y: -1.45, w: 0.55, h: 0.6 }, { z: 13.5, x: 1.45 * sx, y: -1.35, w: 0.42, h: 0.45 }, { z: 16.4, x: 1.05 * sx, y: -1.05, w: 0.2, h: 0.22 }, { z: 18.2, x: 0.8 * sx, y: -0.85, w: 0.03, h: 0.03 }], SEC.tusk));
      dark.push(loftG([{ z: -12.3, w: 1.0, h: 1.0, x: 1.7 * sx }, { z: -10.5, w: 1.25, h: 1.25, x: 1.7 * sx }], SEC.pod));
      for (const [y, z] of [[2.0, 9.6], [-2.0, -9.4]]) metal.push(place(boxG(0.55, 0.55, 0.6), [2.75 * sx, y, z]));
    }
    dark.push(place(armorPlateG(3.0, 1.9, 0.3, 0.3), [0, 2.38, 9.6], [0.2, 0, 0]));
    dark.push(place(boxG(0.9, 0.7, 2.6), [0, -1.8, 12.2]));
    metal.push(place(facetCylG(0.3, 0.42, 2.4, 6), [0, -0.3, 16.2], [Math.PI / 2, 0, 0]), place(facetCylG(0.26, 0.26, 2.4, 6), [0, -1.85, 13.6], [Math.PI / 2, 0, 0]));
    const slots = SHIP_CLASSES.gunship.slots.map((s) => s.pos);
    return {
      meshes: [[body, MAT.gunship, 'hull'], [merge(dark), MAT.dark, 'hull'], [merge(metal), MAT.metal, 'hull'],
        [place(boxG(1.5, 0.08, 0.7), [0, 2.2, 10.7], [0.28, 0, 0]), MAT.glass, 'hull']],
      clad: (probe) => [...cladding(probe, { angles: [0.62, Math.PI - 0.62, -0.75, Math.PI + 0.75], z0: -7.5, z1: 7.5, step: 2.7, w: 1.7, l: 3.0, t: 0.22, skip: slots, jag: 0.3, seed: 31 }),
        ...cladding(probe, { angles: [0, Math.PI], z0: -7.8, z1: 5, step: 3.2, w: 1.2, l: 3.0, t: 0.18, skip: slots, seed: 37 })],
      radiators: [1, -1].map((side) => ({ side, pos: [1.7 * side, 2.62, -7.2], fold: 1.4,
        geo: merge([place(boxG(6.0, 0.08, 4.2), [3.1 * side, 0, 0]), ...[-1.5, 0, 1.5].map((z) => place(boxG(6.0, 0.16, 0.12), [3.1 * side, 0.02, z]))]) })),
      nozzles: [{ pos: [1.7, 0, -12.3], r: 1.4, len: 3 }, { pos: [-1.7, 0, -12.3], r: 1.4, len: 3 }],
      laser: [0, -0.3, 17.6], harpoon: [0, -1.85, 15], nav: [[3.68, 0, 2.6], [-3.68, 0, 2.6]], strobe: [0, 2.62, 1.6], flood: [0, -1.0, 14.8],
      rcs: [[2.75, 2.0, 9.6], [-2.75, 2.0, 9.6], [2.75, -2.0, -9.4], [-2.75, -2.0, -9.4]], cam: 1.45,
    };
  },
  // A 160 m capital hull: dagger-shaped armoured hull with belts and strakes, a stepped bridge
  // tower, two main-battery turrets, a spinal gun out of the prow, engines on outriggers.
  battlecruiser() {
    const body = loftG([{ z: -72, w: 8.6, h: 7.6 }, { z: -66, w: 10.6, h: 9.7 }, { z: -40, w: 11.2, h: 10.3 }, { z: 50, w: 11.2, h: 10.3 },
      { z: 64, w: 8.4, h: 7.8, y: -0.6 }, { z: 78, w: 3.8, h: 3.4, y: -1.6 }, { z: 86, w: 0.8, h: 0.8, y: -2 }], SEC.cap);
    const paint = [body], dark = [], metal = [];
    // armour belts
    for (const z of [-46, -10, 30]) dark.push(loftG([{ z, w: 11.55, h: 10.65 }, { z: z + 1.8, w: 11.55, h: 10.65 }], SEC.cap));
    // superstructure
    paint.push(loftG([{ z: 4, w: 5.6, h: 2.2, y: 12.3 }, { z: 28, w: 5.6, h: 2.2, y: 12.3 }, { z: 32, w: 3.2, h: 1.4, y: 11.6 }], SEC.tier));
    paint.push(loftG([{ z: 8, w: 4.0, h: 2.0, y: 16.3 }, { z: 24, w: 4.0, h: 2.0, y: 16.3 }, { z: 26, w: 2.6, h: 1.3, y: 15.8 }], SEC.tier));
    dark.push(loftG([{ z: 12, w: 3.4, h: 1.25, y: 19.4 }, { z: 21, w: 3.4, h: 1.25, y: 19.4 }, { z: 22.6, w: 2.4, h: 0.6, y: 19.2 }], SEC.tier));
    metal.push(place(facetCylG(0.6, 0.35, 7, 6), [0, 24, 15]), place(boxG(5, 0.3, 0.3), [0, 25.5, 15]), place(boxG(0.3, 0.3, 3), [0, 26, 14]));
    // main battery: dorsal and ventral turrets forward, one dorsal aft
    for (const [z, sy] of [[58, 1], [56, -1], [-24, 1]]) {
      const yb = sy * (z > 50 ? 8.9 : 10.3);
      dark.push(place(facetCylG(3.8, 3.4, 1.4, 12), [0, yb + sy * 0.6, z]));
      const house = loftG([{ z: z - 4, w: 3.4, h: 1.3 }, { z: z + 3, w: 3.4, h: 1.3 }, { z: z + 5, w: 2.0, h: 0.8 }], SEC.tier);
      house.translate(0, yb + sy * 2.4, 0); paint.push(house);
      for (const bx of [-1.1, 0, 1.1]) metal.push(place(facetCylG(0.42, 0.52, 14, 8), [bx, yb + sy * 2.4, z + 11], [Math.PI / 2 + sy * 0.04, 0, 0]));
    }
    // spinal gun: a coil barrel the length of the bow, out through the prow
    metal.push(place(facetCylG(1.5, 1.5, 54, 12), [0, -3.6, 66], [Math.PI / 2, 0, 0]));
    for (let k = 0; k < 5; k++) dark.push(loftG([{ z: 70 + k * 5, w: 2.2, h: 2.2, y: -3.6 }, { z: 71.6 + k * 5, w: 2.2, h: 2.2, y: -3.6 }], SEC.pod));
    // engine outriggers and the dorsal engine housing
    for (const sx of [1, -1]) dark.push(loftG([{ z: -51.6, w: 2.4, h: 2.8, x: 12.4 * sx }, { z: -38, w: 2.4, h: 2.8, x: 12.4 * sx }, { z: -33, w: 1.0, h: 1.2, x: 12.0 * sx }], SEC.pod));
    dark.push(loftG([{ z: -49.6, w: 3.0, h: 1.5, y: 11.6 }, { z: -38, w: 3.0, h: 1.5, y: 11.6 }, { z: -34, w: 1.6, h: 0.6, y: 10.8 }], SEC.tier));
    dark.push(loftG([{ z: -74.5, w: 7.2, h: 6.6 }, { z: -71.6, w: 8.0, h: 7.2 }], SEC.cap));
    dark.push(place(boxG(1.6, 1.4, 6), [0, -6.6, 70]));
    const slots = SHIP_CLASSES.battlecruiser.slots.map((s) => s.pos).concat([[0, 10.3, 58], [0, -9, 56], [0, 10.3, -24], [9.2, 4.2, -34], [-9.2, 4.2, -34], [9.2, 4.2, -14], [-9.2, 4.2, -14], [0, 12, 16]]);
    return {
      meshes: [[merge(paint), MAT.capital, 'hull'], [merge(dark), MAT.dark, 'hull'], [merge(metal), MAT.metal, 'hull'],
        [place(boxG(6.4, 0.9, 0.3), [0, 19.5, 22.3], [-0.35, 0, 0]), MAT.glass, 'hull']],
      clad: (probe) => [
        ...cladding(probe, { angles: [0.72, Math.PI - 0.72, -0.85, Math.PI + 0.85], z0: -62, z1: 60, step: 6.4, w: 4.2, l: 7.0, t: 0.5, skip: slots, jag: 0.25, seed: 41 }),
        ...cladding(probe, { angles: [0.02, Math.PI - 0.02], z0: -62, z1: 46, step: 7.4, w: 3.8, l: 6.6, t: 0.4, skip: slots, jag: 0.2, seed: 43 }),
        ...cladding(probe, { angles: [Math.PI / 2 - 0.25, Math.PI / 2 + 0.25, -Math.PI / 2 + 0.2, -Math.PI / 2 - 0.2], z0: -60, z1: 44, step: 9, w: 3.4, l: 7.0, t: 0.4, skip: slots, seed: 47 }),
      ],
      radiators: [[1, -34], [-1, -34], [1, -14], [-1, -14]].map(([side, z]) => ({ side, pos: [9.2 * side, 4.2, z], fold: 1.35,
        geo: merge([place(boxG(28, 0.4, 14), [14.5 * side, 0, 0]), ...[-5, -2.5, 0, 2.5, 5].map((dz) => place(boxG(28, 0.7, 0.4), [14.5 * side, 0.1, dz]))]) })),
      nozzles: [{ pos: [0, 0, -74.5], r: 6.5, len: 12 }, { pos: [6.2, 4, -74.5], r: 3.6, len: 8 }, { pos: [-6.2, 4, -74.5], r: 3.6, len: 8 }, { pos: [0, -5, -74.5], r: 3.6, len: 8 }],
      laser: [0, -3.6, 94], harpoon: [0, -6.6, 73.5], nav: [[11.4, 0, 30], [-11.4, 0, 30]], strobe: [0, 26.6, 14], flood: [0, -4, 80],
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
  const hullMeshes = [];
  const addMesh = (geo, mat, irm) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; m.userData.ir = irm; grp.add(m); return m; };
  for (const [geo, mat, key] of H.meshes) { const m = addMesh(geo, mat, ir[key].mat); if (mat !== MAT.glass) hullMeshes.push(m); }
  const probe = hullProbe(hullMeshes);
  // armour strakes welded along the hull, clear of the mounts
  if (H.clad) { const clad = H.clad(probe); if (clad.length) addMesh(merge(clad), MAT.dark, ir.hull.mat); }
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
  // mounts: every slot has visible hardware; a fitted part sits on it, painted in the colours
  // of the hull it was torn from, with torn plates from that hull welded on around it
  const slotMarkers = {};
  const markerMat = opts.markers ? new THREE.MeshStandardMaterial({ color: '#000', emissive: new THREE.Color(2.6, 1.5, 0.35) }) : null;
  const bases = [], scrap = [[], [], [], []];
  C.slots.forEach((s, si) => {
    const f = fitted.find((x) => x.slot === s.id);
    const n = new THREE.Vector3(...s.n);
    const lift = MOUNT_LIFT[s.cls] || 0.3;
    bases.push(atMount(mountBaseG(s.cls, !!f), s.pos, s.n));
    if (f) {
      if (!PROTOS[f.type]) PROTOS[f.type] = partPrototype(f.type);
      const g = PROTOS[f.type].clone();
      g.position.set(...s.pos).addScaledVector(n, lift);
      g.quaternion.copy(alignQ(new THREE.Vector3(0, 1, 0), n));
      if (f.type === 5 && s.cls !== 'core') g.scale.setScalar(0.7);
      const fi = factionIndex(f.prov);
      paintPart(g, fi);
      g.traverse((o) => { if (o.isMesh) o.userData.ir = ir.hull.mat; });
      grp.add(g);
      scrap[fi + 1].push(...accretionFor(s, (f.id || si + 1) * 7919 + si * 31, probe));
    } else if (markerMat) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.08, 6, 36), markerMat);
      m.position.set(...s.pos).addScaledVector(n, lift + 0.05); m.quaternion.copy(alignQ(new THREE.Vector3(0, 0, 1), n));
      grp.add(m); slotMarkers[s.id] = m;
    }
  });
  addMesh(merge(bases), MAT.dark, ir.hull.mat);
  scrap.forEach((list, k) => { if (list.length) addMesh(merge(list), k === 0 ? MAT.dark : factionMat(k - 1), ir.hull.mat); });
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
