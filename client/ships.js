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
      { id: 'eng', cls: 'engine', name: 'Aux engine' },
      { id: 'hp', cls: 'hardpoint', name: 'Dorsal hardpoint' },
      { id: 'ut1', cls: 'utility', name: 'Ventral utility · port' },
      { id: 'ut2', cls: 'utility', name: 'Ventral utility · starboard' },
      { id: 'ar', cls: 'structure', name: 'Bow armor' },
    ],
  },
  racer: {
    name: 'Racer', role: 'Light, fast, quiet', scrap: 30, bay: 'pad',
    dry: 21000, prop: 8000, thrust: 360000, rcs: 50000, rcsArm: 5, isp: 1700, kr: 1.2e-4, reactor: 1.2e6,
    hull: 65, armor: 0, cargo: 18000, jf: 1.0, jumpRated: 30000, radius: 5, nose: 11, inertia: 0.8, sig: 0.65, busC: 1.1e6,
    blurb: 'Twice the cutter’s acceleration and a third less signature, but a small hold and a thin skin.',
    slots: [
      { id: 'eng-p', cls: 'engine', name: 'Nacelle · port' },
      { id: 'eng-s', cls: 'engine', name: 'Nacelle · starboard' },
      { id: 'hp', cls: 'hardpoint', name: 'Dorsal hardpoint' },
      { id: 'ut', cls: 'utility', name: 'Ventral utility' },
    ],
  },
  hauler: {
    name: 'Hauler', role: 'Big hold, big tanks', scrap: 50, bay: 'pad',
    dry: 56000, prop: 32000, thrust: 560000, rcs: 95000, rcsArm: 9, isp: 1500, kr: 2.4e-4, reactor: 1.8e6,
    hull: 150, armor: 0.05, cargo: 160000, jf: 1.75, jumpRated: 95000, radius: 9, nose: 19, inertia: 2.6, sig: 1.25, busC: 2.4e6,
    blurb: 'Hauls home what would strand anything else. Sluggish to turn and easy to see.',
    slots: [
      { id: 'eng-p', cls: 'engine', name: 'Aux engine · port' },
      { id: 'eng-s', cls: 'engine', name: 'Aux engine · starboard' },
      { id: 'hp', cls: 'hardpoint', name: 'Dorsal hardpoint' },
      { id: 'ut1', cls: 'utility', name: 'Rack utility · port fore' },
      { id: 'ut2', cls: 'utility', name: 'Rack utility · starboard fore' },
      { id: 'ut3', cls: 'utility', name: 'Rack utility · port aft' },
      { id: 'ut4', cls: 'utility', name: 'Rack utility · starboard aft' },
      { id: 'st1', cls: 'structure', name: 'Cab armor · port' },
      { id: 'st2', cls: 'structure', name: 'Cab armor · starboard' },
    ],
  },
  gunship: {
    name: 'Gunship', role: 'Armored, four hardpoints', scrap: 80, bay: 'pad',
    dry: 66000, prop: 22000, thrust: 700000, rcs: 120000, rcsArm: 8, isp: 1500, kr: 2.6e-4, reactor: 2.2e6,
    hull: 220, armor: 0.25, cargo: 36000, jf: 1.35, jumpRated: 88000, radius: 8, nose: 14, inertia: 1.9, sig: 1.3, busC: 2.6e6,
    blurb: 'Built to take hits and hand them out. Fit point defense and a coilgun and drones become salvage.',
    slots: [
      { id: 'eng-p', cls: 'engine', name: 'Aux engine · port' },
      { id: 'eng-s', cls: 'engine', name: 'Aux engine · starboard' },
      { id: 'hp1', cls: 'hardpoint', name: 'Hardpoint · dorsal' },
      { id: 'hp2', cls: 'hardpoint', name: 'Hardpoint · ventral' },
      { id: 'hp3', cls: 'hardpoint', name: 'Hardpoint · port' },
      { id: 'hp4', cls: 'hardpoint', name: 'Hardpoint · starboard' },
      { id: 'ut1', cls: 'utility', name: 'Utility · dorsal port' },
      { id: 'ut2', cls: 'utility', name: 'Utility · dorsal starboard' },
      { id: 'st1', cls: 'structure', name: 'Armor · port bow' },
      { id: 'st2', cls: 'structure', name: 'Armor · starboard bow' },
    ],
  },
  battlecruiser: {
    name: 'Battlecruiser', role: 'Capital hull, strategic handling', scrap: 300, bay: 'dock', needsReactor: true,
    dry: 480000, prop: 180000, thrust: 3.2e6, rcs: 700000, rcsArm: 40, isp: 1600, kr: 1.6e-3, reactor: 9e6,
    hull: 1200, armor: 0.45, cargo: 450000, jf: 2.6, jumpRated: 680000, radius: 26, nose: 78, inertia: 49, sig: 3.5, busC: 2.4e7,
    blurb: 'A 140 m capital hull: twelve mounts and a reactor bay. Turns like a building and burns like a star; you will fly it from the tactical view.',
    slots: [
      { id: 'core', cls: 'core', name: 'Reactor bay' },
      { id: 'eng1', cls: 'engine', name: 'Aux engine · port' },
      { id: 'eng2', cls: 'engine', name: 'Aux engine · starboard' },
      { id: 'eng3', cls: 'engine', name: 'Aux engine · dorsal' },
      { id: 'hp1', cls: 'hardpoint', name: 'Hardpoint · dorsal fore' },
      { id: 'hp2', cls: 'hardpoint', name: 'Hardpoint · ventral fore' },
      { id: 'hp3', cls: 'hardpoint', name: 'Hardpoint · port' },
      { id: 'hp4', cls: 'hardpoint', name: 'Hardpoint · starboard' },
      { id: 'ut1', cls: 'utility', name: 'Utility · port' },
      { id: 'ut2', cls: 'utility', name: 'Utility · starboard' },
      { id: 'st1', cls: 'structure', name: 'Armor · port bow' },
      { id: 'st2', cls: 'structure', name: 'Armor · starboard bow' },
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
// ---------------------------------------------------------------------
//  Ship designs. Each builds into a Batch and returns its anchors:
//  slots (surface frames by mount id), nozzles, radiators, light and tool positions.
//  +Z is forward, +Y is up, +X is port. Material keys: paint, accent, dark, metal,
//  glass, glow (lit windows), red / green / white (lights).
// ---------------------------------------------------------------------
const Q90X = [Math.PI / 2, 0, 0];
const fr = (o, n, spin = 0) => { const f = frameAtN(new THREE.Vector3(...o), new THREE.Vector3(...n)); f.spin = spin; return f; };
// a mount's placement matrix, including any spin of the part about the mount normal
const slotM = (frm, lift = 0) => frameM(frm, lift, frm.spin || 0);
// radiator wing: a thin panel with coolant ribs, hinged at the root (x = 0), extending along ±X
function radiatorGeo(side, span, chord, t = 0.08) {
  const B = new Batch(0);
  B.add('rad', rbox(span, t, chord, t * 0.45), T([side * span / 2, 0, 0]));
  const ribs = Math.max(3, Math.round(chord / 0.9));
  for (let i = 0; i < ribs; i++) B.add('rad', rbox(span, t * 1.8, 0.07, 0.03), T([side * span / 2, t * 0.6, -chord / 2 + (i + 0.5) * (chord / ribs)]));
  B.add('rad', rbox(0.3, 0.3, chord * 1.02, 0.08), T([side * 0.15, 0, 0]));
  return B.geometries()[0][1];
}
const DESIGNS = {
  // A Belter salvage tug: a rounded crew module with a lit window band, two manipulator arms
  // under the nose with the cutting laser between them, strapped tanks either side of a box
  // spine, and a finned reactor in front of the drive.
  cutter(B) {
    const L = B.lod;
    const crew = new Hull([{ z: 1.8, a: 1.7, b: 1.35, e: 5.5, crease: true }, { z: 2.3, a: 1.95, b: 1.5, e: 5.5 }, { z: 6.8, a: 1.95, b: 1.5, e: 5.5 },
      { z: 8.5, a: 1.6, b: 1.15, y: -0.15, e: 4.5 }, { z: 9.5, a: 1.0, b: 0.7, y: -0.3, e: 3.6 }, { z: 9.8, a: 0.5, b: 0.36, y: -0.35, e: 3 }], 48);
    const roof = new Hull([{ z: 2.6, a: 1.1, b: 0.12, y: 1.45, e: 6 }, { z: 3.0, a: 1.35, b: 0.32, y: 1.5, e: 6 }, { z: 6.4, a: 1.35, b: 0.32, y: 1.5, e: 6 }, { z: 7.4, a: 1.0, b: 0.1, y: 1.38, e: 5 }], 32);
    const spine = new Hull([{ z: -5.6, a: 0.95, b: 0.85, e: 6 }, { z: 2.4, a: 0.95, b: 0.85, e: 6 }], 24);
    const drive = new Hull([{ z: -9.7, a: 1.15, b: 1.15, e: 2.2 }, { z: -8.9, a: 1.6, b: 1.6, e: 2.4 }, { z: -6.0, a: 1.6, b: 1.6, e: 2.4 }, { z: -5.3, a: 1.3, b: 1.3, e: 2.2 }], 40);
    B.add('paint', crew.raw(L)); B.add('paint', roof.raw(L)); B.add('dark', spine.raw(L)); B.add('paint', drive.raw(L));
    for (const z of [3.4, 7.2]) B.add('accent', loftRaw([{ z, a: 1.98, b: 1.53, e: 5.5, y: z > 7 ? -0.05 : 0 }, { z: z + 0.35, a: 1.98, b: 1.53, e: 5.5, y: z > 7 ? -0.06 : 0 }], L ? 12 : 48));
    // reactor cooling fins and the spine's ventral keel plate
    for (let k = 0; k < (L ? 6 : 12); k++) { const a = (k / (L ? 6 : 12)) * Math.PI * 2 + 0.26; B.add('metal', rbox(0.08, 0.5, 2.2, 0.03, L), T([Math.cos(a) * 1.82, Math.sin(a) * 1.82, -7.4], [0, 0, a - Math.PI / 2])); }
    // equipment sponsons either side of the spine, propellant tanks nested beneath them
    const spons = [1, -1].map((sx) => new Hull([{ z: -5.0, a: 0.45, b: 0.6, x: 1.75 * sx, y: 0.1, e: 5 }, { z: -4.4, a: 0.72, b: 0.95, x: 1.75 * sx, y: 0.1, e: 5.5 },
      { z: 1.0, a: 0.72, b: 0.95, x: 1.75 * sx, y: 0.1, e: 5.5 }, { z: 1.9, a: 0.5, b: 0.7, x: 1.75 * sx, y: 0.1, e: 5 }], 28));
    for (const [i, sx] of [[0, 1], [1, -1]]) {
      B.add('paint', spons[i].raw(L));
      B.add('accent', loftRaw([{ z: -2.0, a: 0.74, b: 0.97, x: 1.75 * sx, y: 0.1, e: 5.5 }, { z: -1.6, a: 0.74, b: 0.97, x: 1.75 * sx, y: 0.1, e: 5.5 }], L ? 8 : 28));
      DETAIL.tank(B, [0.62 * sx, -1.32, -1.8], 0.42, 4.4, 'metal');
      DETAIL.vent(B, spons[i].frame(-3.2, sx > 0 ? 0 : Math.PI), 0.9, 1.1);
      DETAIL.hatch(B, spons[i].frame(-0.2, sx > 0 ? 0 : Math.PI), 0.9, 1.1);
      if (!L) B.add('metal', pipeRaw([[0.62 * sx, -1.1, 0.6], [0.6 * sx, -0.9, 1.6], [0.5 * sx, -0.7, 2.4]], 0.07, 6));
    }
    // manipulator arms: shoulder, upper arm, elbow, forearm, three-finger claw
    for (const sx of [1, -1]) {
      const sh = [1.25 * sx, -1.05, 7.0], el = [1.2 * sx, -1.45, 9.3], wr = [0.82 * sx, -1.05, 11.0];
      B.add('dark', cyl(0.34, 0.34, 0.5, 14), T(sh, [0, 0, Math.PI / 2]));
      const seg = (a, b, w) => { const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A); B.add('accent', rbox(w, w, d.length(), w * 0.25, L), T(A.add(Bv).multiplyScalar(0.5).toArray(), new THREE.Quaternion().setFromUnitVectors(AX_Z, d.normalize()))); };
      seg(sh, el, 0.42); seg(el, wr, 0.34);
      B.add('dark', cyl(0.27, 0.27, 0.46, 12), T(el, [0, 0, Math.PI / 2]));
      B.add('dark', cyl(0.2, 0.24, 0.4, 10), T(wr, Q90X));
      if (!L) for (let f = 0; f < 3; f++) {
        const a = (f / 3) * Math.PI * 2;
        B.add('metal', pipeRaw([[wr[0], wr[1], wr[2] + 0.15], [wr[0] + Math.cos(a) * 0.32, wr[1] + Math.sin(a) * 0.32, wr[2] + 0.55], [wr[0] + Math.cos(a) * 0.14, wr[1] + Math.sin(a) * 0.14, wr[2] + 0.95]], 0.06, 6));
      }
    }
    // cutting laser: chin turret with a finned barrel
    B.add('dark', rbox(1.0, 0.6, 1.6, 0.15, L), T([0, -1.0, 8.8]));
    B.add('metal', cyl(0.2, 0.26, 2.0, 12), T([0, -1.0, 10.0], Q90X));
    if (!L) for (let k = 0; k < 4; k++) B.add('dark', cyl(0.34, 0.34, 0.08, 14), T([0, -1.0, 9.3 + k * 0.28], Q90X));
    // harpoon launcher under the crew module
    B.add('dark', rbox(0.7, 0.5, 2.4, 0.12, L), T([0, -1.75, 5.4]));
    B.add('metal', cyl(0.18, 0.2, 1.2, 10), T([0, -1.75, 7.0], Q90X));
    // windows, brow, hatches, lights, RCS
    DETAIL.windows(B, crew.frame(8.0, Math.PI / 2 - 0.15), 5, 0.3, 0.26, 0.1);
    DETAIL.panel(B, crew.frame(7.5, Math.PI / 2), 2.4, 0.5, 0.1, 'dark');
    DETAIL.hatch(B, crew.frame(4.6, Math.PI), 1.0, 1.5);
    DETAIL.windows(B, crew.frame(5.6, 0.12), 3, 0.32, 0.24, 0.16, true); DETAIL.windows(B, crew.frame(5.6, Math.PI - 0.12), 3, 0.32, 0.24, 0.16, true);
    DETAIL.antenna(B, crew.frame(3.0, 1.15), 2.6);
    DETAIL.vent(B, drive.frame(-7.4, Math.PI / 2), 1.0, 0.7);
    for (const a of [0.78, Math.PI - 0.78, -0.78, Math.PI + 0.78]) { DETAIL.rcs(B, crew.frame(6.0, a), 0.9); DETAIL.rcs(B, drive.frame(-8.4, a), 0.9); }
    DETAIL.bell(B, [0, 0, -9.7], 1.5, 3.2);
    DETAIL.rungs(B, crew.frame(3.0, Math.PI + 0.35), 4);
    // dorsal pylon carrying the auxiliary engine pad, facing aft
    const pylonC = new Hull([{ z: -9.0, a: 0.5, b: 0.42, y: 2.4, e: 5 }, { z: -6.6, a: 0.5, b: 0.42, y: 2.2, e: 5 }, { z: -5.6, a: 0.3, b: 0.3, y: 1.75, e: 4 }], 20);
    B.add('dark', pylonC.raw(L));
    return {
      slots: {
        eng: fr([0, 2.5, -9.05], [0, 0, -1]), hp: roof.frame(3.9, Math.PI / 2), ar: crew.slot(5.6, 0.62),
        ut1: fr([1.75, -0.86, -1.7], [0, -1, 0], Math.PI / 2), ut2: fr([-1.75, -0.86, -1.7], [0, -1, 0], Math.PI / 2),
      },
      nozzles: [{ pos: [0, 0, -9.7], r: 1.5, len: 3.2 }],
      radiators: [1, -1].map((side) => ({ side, pos: [1.6 * side, 1.12, -1.6], fold: 1.5, geo: radiatorGeo(side, 7.2, 4.6) })),
      laser: [0, -1.0, 11.0], harpoon: [0, -1.75, 7.6], nav: [crew.frame(4.6, 0.05).o.toArray(), crew.frame(4.6, Math.PI - 0.05).o.toArray()],
      strobe: crew.frame(2.8, Math.PI / 2).o.toArray(), flood: [0, -0.6, 9.5],
      rcs: [crew.frame(6, 0.78).o.toArray(), crew.frame(6, Math.PI - 0.78).o.toArray(), drive.frame(-8.4, -0.78).o.toArray(), drive.frame(-8.4, Math.PI + 0.78).o.toArray()],
      cam: 1, seat: [crew, roof, spine, drive, ...spons, pylonC],
    };
  },
  // A racing pinnace: a long needle fuselage, two drive nacelles on swept pylons, canards,
  // a raked fin and a bubble canopy.
  racer(B) {
    const L = B.lod;
    const body = new Hull([{ z: -8.4, a: 0.75, b: 0.7, e: 2.6 }, { z: -7.6, a: 1.05, b: 0.98, e: 2.7 }, { z: -2.0, a: 1.25, b: 1.05, e: 2.8 }, { z: 4.0, a: 1.05, b: 0.86, y: -0.05, e: 2.6 },
      { z: 9.0, a: 0.55, b: 0.45, y: -0.15, e: 2.4 }, { z: 12.6, a: 0.12, b: 0.1, y: -0.2, e: 2.2 }, { z: 13.3, a: 0.02, b: 0.02, y: -0.2, e: 2 }], 40);
    B.add('paint', body.raw(L));
    const nac = [1, -1].map((sx) => new Hull([{ z: -8.2, a: 0.7, b: 0.7, x: 2.35 * sx, e: 2.2 }, { z: -7.4, a: 0.86, b: 0.86, x: 2.35 * sx, e: 2.3 }, { z: -1.6, a: 0.82, b: 0.82, x: 2.35 * sx, e: 2.3 },
      { z: 0.3, a: 0.42, b: 0.42, x: 2.35 * sx, e: 2.2 }, { z: 0.8, a: 0.15, b: 0.15, x: 2.35 * sx, e: 2 }], 32));
    for (const h of nac) B.add('accent', h.raw(L));
    const pylon = [[0.9, -1.4], [0.9, -5.8], [1.9, -6.6], [1.9, -2.6]];
    const canard = [[0.85, 6.6], [0.85, 4.8], [2.6, 3.9], [2.7, 4.4]];
    for (const sx of [1, -1]) {
      const pl = sx > 0 ? pylon : mirrorX(pylon), cn = sx > 0 ? canard : mirrorX(canard);
      B.add('paint', plateRaw(pl, 0.24, 0.05), T([0, -0.12, 0])); B.add('paint', plateRaw(cn, 0.12, 0.03), T([0, -0.1, 0]));
      if (!L) DETAIL.vent(B, nac[sx > 0 ? 0 : 1].frame(-4.6, Math.PI / 2), 0.6, 1.4);
    }
    const fin = finG([[0.6, -7.6], [0.6, -3.6], [2.4, -6.6], [2.5, -8.0]], 0.16);
    B.add('accent', rawOf(fin));
    B.add('glass', loftRaw([{ z: 2.3, a: 0.25, b: 0.08, y: 0.86, e: 2.4 }, { z: 3.5, a: 0.62, b: 0.32, y: 0.92, e: 2.4 }, { z: 5.5, a: 0.5, b: 0.25, y: 0.78, e: 2.4 }, { z: 6.6, a: 0.16, b: 0.06, y: 0.66, e: 2.2 }], L ? 10 : 28));
    B.add('metal', cyl(0.06, 0.12, 1.6, 8), T([0, -0.2, 13.4], Q90X));
    B.add('dark', rbox(0.5, 0.36, 2.0, 0.1, L), T([0, -0.82, 7.0]));
    for (const a of [Math.PI / 2 - 0.6, Math.PI / 2 + 0.6]) DETAIL.rcs(B, body.frame(6.4, a), 0.7);
    for (const a of [-Math.PI / 2 + 0.6, -Math.PI / 2 - 0.6]) DETAIL.rcs(B, body.frame(-5.8, a), 0.7);
    DETAIL.hatch(B, body.frame(-0.6, Math.PI / 2 + 0.55), 0.8, 1.1);
    DETAIL.antenna(B, body.frame(-4.8, Math.PI / 2), 1.6);
    for (const h of nac) { const x = h.st[0].x; DETAIL.bell(B, [x, 0, -8.2], 0.82, 2.1); }
    // outboard pylons for auxiliary engines, pads facing aft
    const outb = [1, -1].map((sx) => new Hull([{ z: -6.6, a: 0.75, b: 0.28, x: 3.3 * sx, e: 5 }, { z: -4.0, a: 0.75, b: 0.28, x: 3.3 * sx, e: 5 }, { z: -2.8, a: 0.4, b: 0.12, x: 3.1 * sx, e: 4 }], 20));
    for (const h of outb) B.add('accent', h.raw(L));
    return {
      slots: {
        'eng-p': fr([3.75, 0, -6.6], [0, 0, -1]), 'eng-s': fr([-3.75, 0, -6.6], [0, 0, -1]),
        hp: body.frame(1.4, Math.PI / 2), ut: body.frame(-1.8, -Math.PI / 2),
      },
      nozzles: [{ pos: [2.35, 0, -8.2], r: 0.82, len: 2.1 }, { pos: [-2.35, 0, -8.2], r: 0.82, len: 2.1 }],
      radiators: [1, -1].map((side) => ({ side, pos: [1.05 * side, 0, 0.6], fold: 1.2, geo: (() => { const g = radiatorGeo(side, 5.0, 3.0, 0.07); g.rotateY(side * 0.45); return g; })() })),
      laser: [0, -0.2, 14.3], harpoon: [0, -0.82, 8.1], nav: [nac[0].frame(-1.6, 0).o.toArray(), nac[1].frame(-1.6, Math.PI).o.toArray()],
      strobe: [0, 3.0, -7.6], flood: [0, -0.6, 11], rcs: [body.frame(6.4, 1).o.toArray(), body.frame(6.4, 2.1).o.toArray(), body.frame(-5.8, -1).o.toArray(), body.frame(-5.8, -2.1).o.toArray()],
      cam: 0.95, seat: [body, ...nac, ...outb],
    };
  },
  // A Belter long-hauler: an armoured cab with a plough, a lattice spine carrying six framed
  // containers, two strapped propellant tanks and an engine block with three bells.
  hauler(B) {
    const L = B.lod;
    const cab = new Hull([{ z: 13.0, a: 2.7, b: 2.3, e: 5, crease: true }, { z: 13.6, a: 2.9, b: 2.5, e: 5 }, { z: 18.2, a: 2.9, b: 2.5, e: 5 },
      { z: 20.2, a: 2.4, b: 2.0, y: -0.1, e: 4.4 }, { z: 21.8, a: 1.5, b: 1.2, y: -0.35, e: 4 }, { z: 22.3, a: 0.8, b: 0.6, y: -0.4, e: 3.5 }], 48);
    const block = new Hull([{ z: -19.8, a: 3.2, b: 2.6, e: 5 }, { z: -15.6, a: 3.2, b: 2.6, e: 5 }, { z: -14.6, a: 1.9, b: 1.7, e: 4 }], 40);
    B.add('paint', cab.raw(L)); B.add('paint', block.raw(L));
    B.add('dark', loftRaw([{ z: 17.0, a: 3.0, b: 0.5, y: -2.4, e: 5 }, { z: 21.2, a: 2.2, b: 0.38, y: -2.05, e: 5 }, { z: 23.4, a: 0.7, b: 0.1, y: -1.55, e: 4 }], L ? 10 : 28));
    DETAIL.truss(B, [0, 0, -14.8], [0, 0, 13.2], 2.2, 'metal');
    for (const x of [2.9, -2.9]) for (const z of [-8, 0, 8]) {
      B.add('accent', rbox(3.0, 3.0, 7.2, 0.12, L), T([x, 0, z]));
      if (!L) for (let k = 0; k < 10; k++) B.add('accent', rbox(0.08, 2.7, 0.18, 0.03), T([x + Math.sign(x) * 1.52, 0, z - 3.3 + k * 0.73]));
    }
    for (const z of [-12, -4, 4, 12]) {
      B.add('dark', rbox(9.6, 0.4, 0.6, 0.1, L), T([0, 1.75, z])); B.add('dark', rbox(9.6, 0.4, 0.6, 0.1, L), T([0, -1.75, z]));
      B.add('dark', rbox(0.4, 3.9, 0.6, 0.1, L), T([4.6, 0, z])); B.add('dark', rbox(0.4, 3.9, 0.6, 0.1, L), T([-4.6, 0, z]));
    }
    for (const sx of [1, -1]) {
      DETAIL.tank(B, [3.0 * sx, 0, -12.6], 2.2, 2.4, 'metal');
      B.add('dark', rbox(1.4, 1.2, 2.4, 0.2, L), T([3.4 * sx, -1.7, -18.2]));
      B.add('dark', rbox(1.6, 1.6, 0.4, 0.1, L), T([3.6 * sx, -1.8, -19.5]));
    }
    B.add('dark', rbox(0.9, 0.7, 2.6, 0.15, L), T([0, -1.5, 20.6]));
    B.add('metal', cyl(0.22, 0.3, 1.8, 10), T([0, 0.05, 22.6], Q90X));
    DETAIL.windows(B, cab.frame(19.4, Math.PI / 2 - 0.25), 7, 0.36, 0.3, 0.1);
    DETAIL.panel(B, cab.frame(18.6, Math.PI / 2), 3.6, 0.55, 0.1, 'dark');
    DETAIL.hatch(B, cab.frame(15.0, 0), 1.1, 1.6); DETAIL.hatch(B, cab.frame(15.0, Math.PI), 1.1, 1.6);
    DETAIL.dish(B, cab.frame(14.6, Math.PI / 2 + 0.7), 0.9);
    DETAIL.antenna(B, cab.frame(14.2, Math.PI / 2 - 0.7), 3);
    for (const a of [0.7, Math.PI - 0.7, -0.7, Math.PI + 0.7]) { DETAIL.rcs(B, cab.frame(17.2, a), 1.1); DETAIL.rcs(B, block.frame(-17.4, a), 1.1); }
    DETAIL.vent(B, block.frame(-17.6, Math.PI / 2), 2.2, 1.4);
    DETAIL.bell(B, [0, 0, -19.8], 1.7, 3.4); DETAIL.bell(B, [2.4, 0.8, -19.8], 1.1, 2.4); DETAIL.bell(B, [-2.4, 0.8, -19.8], 1.1, 2.4);
    return {
      slots: {
        'eng-p': fr([3.6, -1.8, -19.7], [0, 0, -1]), 'eng-s': fr([-3.6, -1.8, -19.7], [0, 0, -1]),
        hp: cab.frame(14.2, Math.PI / 2),
        ut1: fr([4.4, 0, 7], [1, 0, 0]), ut2: fr([-4.4, 0, 7], [-1, 0, 0]), ut3: fr([4.4, 0, -7], [1, 0, 0]), ut4: fr([-4.4, 0, -7], [-1, 0, 0]),
        st1: cab.slot(16.6, 0), st2: cab.slot(16.6, Math.PI),
      },
      nozzles: [{ pos: [0, 0, -19.8], r: 1.7, len: 3.4 }, { pos: [2.4, 0.8, -19.8], r: 1.1, len: 2.4 }, { pos: [-2.4, 0.8, -19.8], r: 1.1, len: 2.4 }],
      radiators: [1, -1].map((side) => ({ side, pos: [1.2 * side, 2.1, -3], fold: 1.45, geo: radiatorGeo(side, 9.0, 7.4, 0.1) })),
      laser: [0, 0.05, 23.6], harpoon: [0, -1.5, 22.0], nav: [cab.frame(17, 0.02).o.toArray(), cab.frame(17, Math.PI - 0.02).o.toArray()],
      strobe: cab.frame(13.4, Math.PI / 2).o.toArray(), flood: [0, -0.8, 21.4],
      rcs: [cab.frame(17.2, 0.7).o.toArray(), cab.frame(17.2, Math.PI - 0.7).o.toArray(), block.frame(-17.4, -0.7).o.toArray(), block.frame(-17.4, Math.PI + 0.7).o.toArray()],
      cam: 1.7, seat: [cab, block],
    };
  },
  // A corvette in the Expanse mould: a long armoured hull with a stepped command deck, big
  // armour panels, torpedo doors in the bow, one heavy drive with an armoured skirt and two
  // engine sponsons.
  gunship(B) {
    const L = B.lod;
    const hull = new Hull([{ z: -11.6, a: 3.0, b: 2.6, e: 4.5, crease: true }, { z: -10.6, a: 3.45, b: 2.9, e: 5 }, { z: 3.0, a: 3.5, b: 2.9, e: 5 }, { z: 8.0, a: 3.1, b: 2.5, y: -0.1, e: 4.8 },
      { z: 12.5, a: 2.0, b: 1.6, y: -0.35, e: 4.2 }, { z: 15.4, a: 0.9, b: 0.75, y: -0.5, e: 3.6 }, { z: 16.2, a: 0.4, b: 0.35, y: -0.55, e: 3 }], 56);
    const deck = new Hull([{ z: -7.0, a: 1.6, b: 0.4, y: 2.75, e: 6 }, { z: -6.0, a: 2.05, b: 0.75, y: 2.75, e: 6 }, { z: 6.0, a: 2.05, b: 0.75, y: 2.75, e: 6 }, { z: 9.6, a: 1.4, b: 0.45, y: 2.45, e: 5 }, { z: 10.4, a: 0.8, b: 0.15, y: 2.3, e: 4 }], 40);
    B.add('paint', hull.raw(L)); B.add('paint', deck.raw(L));
    const spons = [1, -1].map((sx) => new Hull([{ z: -10.8, a: 0.9, b: 0.8, x: 4.0 * sx, y: -1.4, e: 3 }, { z: -9.8, a: 1.0, b: 0.9, x: 4.0 * sx, y: -1.4, e: 3 }, { z: -4.2, a: 0.95, b: 0.85, x: 3.75 * sx, y: -1.4, e: 3 }, { z: -2.8, a: 0.3, b: 0.3, x: 3.6 * sx, y: -1.4, e: 2.5 }], 28));
    for (const sp of spons) B.add('dark', sp.raw(L));
    // armour skirt round the drive
    B.add('dark', loftRaw([{ z: -13.0, a: 2.7, b: 2.7, e: 2.4 }, { z: -12.2, a: 3.0, b: 2.85, e: 3 }, { z: -11.2, a: 3.05, b: 2.75, e: 4 }], L ? 12 : 40));
    // armour panels on the flanks and shoulders, clear of the mounts
    if (!L) {
      const keep = [[-1, 0], [-1, Math.PI], [7.6, 0], [7.6, Math.PI], [5, -Math.PI / 2]];
      for (let z = -8.6; z <= 6.2; z += 2.95) for (const a of [0.12, -0.42, Math.PI - 0.12, Math.PI + 0.42, -1.05, Math.PI + 1.05]) {
        if (keep.some(([kz, ka]) => Math.abs(kz - z) < 2.3 && Math.abs(Math.atan2(Math.sin(ka - a), Math.cos(ka - a))) < 0.4)) continue;
        DETAIL.panel(B, hull.frame(z + 1.4, a), 1.9, 2.7, 0.1, 'paint');
      }
    }
    // command deck windows and brow, bow torpedo doors, sensor blisters, comms
    DETAIL.windows(B, deck.frame(8.6, Math.PI / 2 - 0.35), 4, 0.42, 0.26, 0.12);
    DETAIL.panel(B, deck.frame(7.6, Math.PI / 2), 2.8, 0.6, 0.12, 'dark');
    for (const a of [0.35, Math.PI - 0.35]) { DETAIL.hatch(B, hull.frame(11.4, a), 0.8, 0.8); DETAIL.hatch(B, hull.frame(12.6, a), 0.7, 0.7); }
    DETAIL.blister(B, hull.frame(13.4, -Math.PI / 2), 0.55);
    DETAIL.dish(B, deck.frame(-4.6, Math.PI / 2), 0.7);
    DETAIL.antenna(B, deck.frame(-5.4, Math.PI / 2 + 0.6), 2.4);
    DETAIL.hatch(B, hull.frame(-6.8, Math.PI), 1.1, 1.6); DETAIL.rungs(B, hull.frame(-8.6, Math.PI), 4);
    for (const a of [0.75, Math.PI - 0.75, -0.75, Math.PI + 0.75]) { DETAIL.rcs(B, hull.frame(9.6, a), 1.1); DETAIL.rcs(B, hull.frame(-9.6, a), 1.1); }
    DETAIL.vent(B, hull.frame(-9.0, -Math.PI / 2), 2.0, 1.0);
    B.add('dark', rbox(0.9, 0.7, 2.6, 0.15, L), T([0, -1.85, 12.4]));
    B.add('metal', cyl(0.24, 0.3, 2.2, 10), T([0, -0.55, 16.4], Q90X));
    DETAIL.bell(B, [0, 0, -13.0], 2.3, 4.4);
    return {
      slots: {
        'eng-p': fr([4.0, -1.4, -10.85], [0, 0, -1]), 'eng-s': fr([-4.0, -1.4, -10.85], [0, 0, -1]),
        hp1: deck.frame(3.6, Math.PI / 2), hp2: hull.frame(5.0, -Math.PI / 2), hp3: hull.frame(-1.0, 0), hp4: hull.frame(-1.0, Math.PI),
        ut1: hull.frame(-3.4, 0.62), ut2: hull.frame(-3.4, Math.PI - 0.62), st1: hull.slot(7.6, 0.02), st2: hull.slot(7.6, Math.PI - 0.02),
      },
      nozzles: [{ pos: [0, 0, -13.0], r: 2.3, len: 4.4 }],
      radiators: [1, -1].map((side) => ({ side, pos: [1.6 * side, 3.45, -1.0], fold: 1.4, geo: radiatorGeo(side, 6.4, 4.0) })),
      laser: [0, -0.55, 17.6], harpoon: [0, -1.85, 13.8], nav: [hull.frame(2.4, 0.02).o.toArray(), hull.frame(2.4, Math.PI - 0.02).o.toArray()],
      strobe: deck.frame(-2.0, Math.PI / 2).o.toArray(), flood: [0, -1.0, 15.2],
      rcs: [hull.frame(9.6, 0.75).o.toArray(), hull.frame(9.6, Math.PI - 0.75).o.toArray(), hull.frame(-9.6, -0.75).o.toArray(), hull.frame(-9.6, Math.PI + 0.75).o.toArray()],
      cam: 1.45, seat: [hull, deck, ...spons],
    };
  },
  // A 170 m battlecruiser: armoured main hull with belts, a long dorsal deck, a stepped bridge
  // tower, three main-battery turrets, a spinal gun out of the prow, rows of lit ports, PDC
  // blisters along the spine, hangar doors and engine outriggers.
  battlecruiser(B) {
    const L = B.lod;
    const hull = new Hull([{ z: -76, a: 9.4, b: 8.4, e: 4.5, crease: true }, { z: -72, a: 11.0, b: 10.0, e: 5 }, { z: -40, a: 11.4, b: 10.4, e: 5 }, { z: 46, a: 11.4, b: 10.4, e: 5 },
      { z: 60, a: 9.6, b: 8.6, y: -0.6, e: 4.8 }, { z: 74, a: 6.0, b: 5.0, y: -1.4, e: 4.2 }, { z: 84, a: 2.8, b: 2.2, y: -2.0, e: 3.6 }, { z: 88, a: 1.0, b: 0.9, y: -2.2, e: 3 }], 72);
    const deck = new Hull([{ z: -34, a: 3.0, b: 0.6, y: 10.7, e: 6 }, { z: -30, a: 5.0, b: 1.6, y: 11.2, e: 6 }, { z: 36, a: 5.0, b: 1.6, y: 11.2, e: 6 }, { z: 42, a: 3.0, b: 0.6, y: 10.7, e: 6 }], 40);
    const tower = new Hull([{ z: 4, a: 2.6, b: 1.2, y: 13.6, e: 6 }, { z: 6, a: 3.6, b: 2.4, y: 14.4, e: 6 }, { z: 24, a: 3.6, b: 2.4, y: 14.4, e: 6 }, { z: 27, a: 2.2, b: 1.4, y: 13.8, e: 5 }], 40);
    const bridge = new Hull([{ z: 11, a: 2.2, b: 0.6, y: 17.2, e: 6 }, { z: 12, a: 3.0, b: 1.05, y: 17.4, e: 6 }, { z: 21, a: 3.0, b: 1.05, y: 17.4, e: 6 }, { z: 23, a: 2.2, b: 0.5, y: 17.2, e: 5 }], 36);
    B.add('paint', hull.raw(L)); B.add('paint', deck.raw(L)); B.add('paint', tower.raw(L)); B.add('dark', bridge.raw(L));
    for (const z of [-46, -10, 30]) B.add('dark', loftRaw([{ z, a: 11.7, b: 10.7, e: 5 }, { z: z + 2, a: 11.7, b: 10.7, e: 5 }], L ? 16 : 72));
    B.add('dark', loftRaw([{ z: -78.5, a: 8.2, b: 7.4, e: 2.6 }, { z: -77, a: 9.0, b: 8.2, e: 3.5 }, { z: -75.6, a: 9.4, b: 8.4, e: 4.5 }], L ? 16 : 56));
    // main battery
    for (const [z, sy] of [[56, 1], [53, -1], [-38, 1]]) {
      const top = hull.point(z, sy > 0 ? Math.PI / 2 : -Math.PI / 2).y;
      B.add('dark', cyl(3.9, 3.5, 1.2, 28), T([0, top + sy * 0.4, z]));
      const house = loftRaw([{ z: z - 4, a: 3.2, b: 1.25, e: 6 }, { z: z + 3, a: 3.2, b: 1.25, e: 6 }, { z: z + 5.2, a: 2.0, b: 0.8, e: 5 }], L ? 10 : 32);
      B.add('paint', house, T([0, top + sy * 2.2, 0]));
      for (const bx of [-1.1, 0, 1.1]) B.add('metal', cyl(0.42, 0.5, 14, 12), T([bx, top + sy * 2.2, z + 11.6], Q90X));
    }
    // spinal gun through the prow
    B.add('metal', cyl(1.5, 1.5, 34, 24), T([0, -3.4, 79], Q90X));
    for (let k = 0; k < 5; k++) B.add('dark', cyl(2.0, 2.0, 1.4, 24), T([0, -3.4, 66 + k * 6], Q90X));
    // engine outriggers and the dorsal engine housing
    const outr = [1, -1].map((sx) => new Hull([{ z: -51.6, a: 2.4, b: 2.8, x: 12.6 * sx, e: 4 }, { z: -38, a: 2.4, b: 2.8, x: 12.6 * sx, e: 4 }, { z: -33, a: 1.0, b: 1.2, x: 12.2 * sx, e: 3 }], 28));
    const dorsalE = new Hull([{ z: -49.6, a: 3.0, b: 1.5, y: 11.6, e: 6 }, { z: -38, a: 3.0, b: 1.5, y: 11.6, e: 6 }, { z: -34, a: 1.6, b: 0.6, y: 10.8, e: 5 }], 28);
    for (const h of [...outr, dorsalE]) B.add('dark', h.raw(L));
    // lit ports along both flanks, PDC blisters along the shoulders, hangar doors
    if (!L) {
      for (const a of [0.05, Math.PI - 0.05]) for (let z = -30; z <= 40; z += 7) DETAIL.windows(B, hull.frame(z, a), 6, 0.45, 0.3, 0.5, true);
      for (const a of [0.95, Math.PI - 0.95, -0.95, Math.PI + 0.95]) for (let z = -60; z <= 50; z += 16) {
        const f = hull.frame(z, a); const m = frameM(f, 0);
        B.add('dark', sph(0.9, 14, 6, Math.PI / 2), m);
        for (const bx of [-0.2, 0.2]) B.add('metal', cyl(0.07, 0.08, 1.8, 6), T([bx, 0.55, 0.9], [Math.PI / 2 - 0.3, 0, 0]).premultiply(m));
      }
      for (const a of [-0.3, Math.PI + 0.3]) { const f = hull.frame(-18, a); B.add('dark', rbox(0.3, 0.4, 14, 0.1), frameM(f)); DETAIL.panel(B, f, 6.5, 12, 0.08, 'dark'); }
    }
    DETAIL.windows(B, bridge.frame(21.6, Math.PI / 2 - 0.5), 9, 0.5, 0.36, 0.12);
    DETAIL.dish(B, tower.frame(9, Math.PI / 2 + 0.6), 1.8); DETAIL.dish(B, tower.frame(9, Math.PI / 2 - 0.6), 1.4);
    DETAIL.antenna(B, bridge.frame(15, Math.PI / 2), 7); DETAIL.antenna(B, tower.frame(24, Math.PI / 2), 5);
    for (const a of [0.8, Math.PI - 0.8, -0.8, Math.PI + 0.8]) { DETAIL.rcs(B, hull.frame(64, a), 3); DETAIL.rcs(B, hull.frame(-68, a), 3); }
    for (const [p, r, l] of [[[0, 0, -78.5], 6.5, 12], [[6.2, 4, -78.5], 3.6, 8], [[-6.2, 4, -78.5], 3.6, 8], [[0, -5, -78.5], 3.6, 8]]) DETAIL.bell(B, p, r, l);
    return {
      slots: {
        core: deck.frame(-4, Math.PI / 2), eng1: fr([12.6, 0, -51.7], [0, 0, -1]), eng2: fr([-12.6, 0, -51.7], [0, 0, -1]), eng3: fr([0, 11.6, -49.7], [0, 0, -1]),
        hp1: deck.frame(33, Math.PI / 2), hp2: hull.frame(40, -Math.PI / 2), hp3: hull.frame(20, 0), hp4: hull.frame(20, Math.PI),
        ut1: hull.frame(-24, 0.08), ut2: hull.frame(-24, Math.PI - 0.08), st1: hull.slot(48, 0.08), st2: hull.slot(48, Math.PI - 0.08),
      },
      nozzles: [{ pos: [0, 0, -78.5], r: 6.5, len: 12 }, { pos: [6.2, 4, -78.5], r: 3.6, len: 8 }, { pos: [-6.2, 4, -78.5], r: 3.6, len: 8 }, { pos: [0, -5, -78.5], r: 3.6, len: 8 }],
      radiators: [[1, -30], [-1, -30], [1, -12], [-1, -12]].map(([side, z]) => ({ side, pos: [hull.point(z, 0.42).x * side * 0.98, hull.point(z, 0.42).y, z], fold: 1.35, geo: radiatorGeo(side, 28, 14, 0.4) })),
      laser: [0, -3.4, 96.4], harpoon: [0, -6.4, 74], nav: [hull.frame(30, 0.02).o.toArray(), hull.frame(30, Math.PI - 0.02).o.toArray()],
      strobe: [0, 25.4, 15], flood: [0, -4, 84],
      rcs: [hull.frame(64, 0.8).o.toArray(), hull.frame(64, Math.PI - 0.8).o.toArray(), hull.frame(-68, -0.8).o.toArray(), hull.frame(-68, Math.PI + 0.8).o.toArray()],
      cam: 6.5, seat: [hull, deck, tower, bridge, ...outr, dorsalE],
    };
  },
};

// mount hardware in slot-local space (Y = out of the hull): what an empty mount looks like,
// and the seat a fitted part stands on
const MOUNT_LIFT = { hardpoint: 0.42, engine: 0.3, utility: 0.28, structure: 0.12, core: 0.5 };
function mountHardware(B, cls, fitted, m) {
  const L = B.lod;
  switch (cls) {
    case 'hardpoint':
      B.add('dark', cyl(1.75, 1.6, 0.42, 28), T([0, 0.21, 0]).premultiply(m));
      if (!L) for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; B.add('metal', cyl(0.07, 0.07, 0.08, 6), T([Math.cos(a) * 1.5, 0.46, Math.sin(a) * 1.5]).premultiply(m)); }
      if (!fitted) B.add('paint', cyl(1.2, 1.25, 0.18, 28), T([0, 0.5, 0]).premultiply(m));
      break;
    case 'engine': // a thrust plate with feed couplings; compact until something is bolted to it
      B.add('dark', rbox(fitted ? 2.4 : 1.5, 0.22, fitted ? 2.4 : 1.5, 0.08, L), T([0, 0.11, 0]).premultiply(m));
      if (fitted) B.add('metal', cyl(0.9, 1.0, 0.1, 20), T([0, 0.27, 0]).premultiply(m));
      else if (!L) for (const x of [-0.4, 0.4]) B.add('metal', cyl(0.12, 0.12, 0.16, 8), T([x, 0.28, 0]).premultiply(m));
      break;
    case 'utility':
      for (const x of [-0.8, 0.8]) B.add('dark', rbox(0.26, 0.26, 2.9, 0.06, L), T([x, 0.13, 0]).premultiply(m));
      for (const z of [-1.1, 1.1]) B.add('metal', rbox(2.1, 0.12, 0.3, 0.04, L), T([0, 0.2, z]).premultiply(m));
      break;
    case 'structure':
      if (!L) for (const [x, z] of [[-1.2, -2.0], [1.2, -2.0], [-1.2, 2.0], [1.2, 2.0], [0, -2.2], [0, 2.2]]) B.add('metal', cyl(0.09, 0.09, 0.14, 6), T([x, 0.07, z]).premultiply(m));
      break;
    case 'core':
      B.add('dark', cyl(2.95, 2.7, 0.5, 32), T([0, 0.25, 0]).premultiply(m));
      for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; B.add('dark', rbox(0.7, 1.4, 0.9, 0.12, L), T([Math.cos(a) * 2.5, 0.7, Math.sin(a) * 2.5], [0, -a, 0]).premultiply(m)); }
      break;
  }
}
// a fitted part's model, placed on its mount
function partVisual(type, frm, lift) {
  if (!PROTOS[type]) PROTOS[type] = partPrototype(type);
  const g = PROTOS[type].clone();
  slotM(frm, lift).decompose(g.position, g.quaternion, g.scale);
  g.updateMatrixWorld(true);
  return g;
}
// the access bay of an internal fitting: a low armoured cover, vents, a status strip
function internalBay(B, type, cls, m, fkey) {
  const big = cls === 'core';
  if (type === 5) {
    const R = big ? 2.4 : 1.35;
    B.add('dark', cyl(R + 0.2, R + 0.3, 0.3, 32), T([0, 0.15, 0]).premultiply(m));
    B.add(fkey, cyl(R, R + 0.1, 0.35, 32), T([0, 0.42, 0]).premultiply(m));
    B.add('dark', sph(R * 0.6, 24, 8, Math.PI / 2), T([0, 0.58, 0], null, [1, 0.28, 1]).premultiply(m));
    if (!B.lod) for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; B.add('reactorGlow', rbox(0.08, 0.05, R * 0.32, 0.02), T([Math.cos(a) * R * 0.78, 0.61, Math.sin(a) * R * 0.78], [0, -a + Math.PI / 2, 0]).premultiply(m)); }
  } else {
    B.add('dark', rbox(2.1, 0.22, 1.7, 0.08, B.lod), T([0, 0.11, 0]).premultiply(m));
    B.add(fkey, rbox(1.8, 0.16, 1.4, 0.06, B.lod), T([0, 0.28, 0]).premultiply(m));
    if (!B.lod) { B.add('cellGlow', rbox(1.2, 0.04, 0.06, 0.02), T([0, 0.37, 0.5]).premultiply(m)); for (const x of [-0.6, 0, 0.6]) B.add('metal', rbox(0.08, 0.06, 1.0, 0.02), T([x, 0.37, -0.1]).premultiply(m)); }
  }
}
// welded armour following the hull: a two-layer patch with a bolt row
function armourPlate(B, frm, fkey) {
  const h = frm.hull, L = B.lod;
  B.add(fkey, conformRaw(h, frm.z, frm.ang, 2.5, 1.7, 0.0, 0.22, L ? 2 : 8, L ? 2 : 8));
  B.add(fkey, conformRaw(h, frm.z - 0.2, frm.ang, 2.0, 1.3, 0.22, 0.4, L ? 2 : 6, L ? 2 : 6));
  if (!L) for (let k = -2; k <= 2; k++) { const f = h.frame(frm.z + k * 1.0, frm.ang); B.add('metal', cyl(0.06, 0.06, 0.08, 6), frameM(f, 0.44)); }
}
// Clearance check: every part each mount can take, placed as the builder places it, against the
// hull, its other solids and the drive bells; and every pair of fitted parts against each other.
function shipClearance(cls, tol = 0.12) {
  const A = designOf(cls, 0).A, C = SHIP_CLASSES[cls];
  const solids = A.seat.map((h) => (p) => h.depth(p));
  for (const nz of A.nozzles) solids.push((p) => {
    const t = (nz.pos[2] - p.z) / nz.len; if (t < 0 || t > 1) return -1;
    return nz.r * (0.3 + 0.7 * Math.pow(t, 1.7)) + 0.1 - Math.hypot(p.x - nz.pos[0], p.y - nz.pos[1]);
  });
  // radiators, deployed
  for (const r of A.radiators) {
    r.geo.computeBoundingBox();
    const bb = r.geo.boundingBox.clone().translate(new THREE.Vector3(...r.pos));
    solids.push((p) => (bb.containsPoint(p) ? Math.min(p.x - bb.min.x, bb.max.x - p.x, p.y - bb.min.y, bb.max.y - p.y, p.z - bb.min.z, bb.max.z - p.z) : -1));
  }
  const issues = [], biggest = [];
  const v = new THREE.Vector3();
  const sample = (g, fn) => g.traverse((o) => {
    if (!o.isMesh) return; const P = o.geometry.attributes.position, st = Math.max(1, Math.floor(P.count / 600));
    for (let i = 0; i < P.count; i += st) { v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); fn(v); }
  });
  for (const s of C.slots) {
    const frm = A.slots[s.id];
    if (!frm) { issues.push({ slot: s.id, why: 'no mount frame' }); continue; }
    let best = null;
    for (let t = 0; t <= 9; t++) {
      if (t === 7 || !fitsMount(t, s.cls) || t === 5 || t === 8 || (t === 0 && frm.hull)) continue;
      const g = partVisual(t, frm, MOUNT_LIFT[s.cls] || 0.3);  // placed exactly as the builder does
      let worst = 0;
      sample(g, (p) => { for (const f of solids) worst = Math.max(worst, f(p)); });
      if (worst > tol) issues.push({ slot: s.id, type: t, why: `inside the hull by ${worst.toFixed(2)} m` });
      const bb = new THREE.Box3().setFromObject(g);
      if (!best || bb.getSize(v).length() > best.size) best = { g, size: bb.getSize(new THREE.Vector3()).length(), type: t };
    }
    if (best) biggest.push({ slot: s.id, ...best });
  }
  // fitted parts against each other: vertices of one inside the other's own bounding box
  for (const a of biggest) {
    const inv = a.g.matrixWorld.clone().invert(), box = new THREE.Box3();
    a.g.traverse((o) => { if (o.isMesh) { o.geometry.computeBoundingBox(); box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrix)); } });
    box.expandByScalar(-0.08);
    for (const b of biggest) {
      if (a === b) continue;
      let hits = 0;
      sample(b.g, (p) => { if (box.containsPoint(p.clone().applyMatrix4(inv))) hits++; });
      if (hits > 2) issues.push({ slot: `${a.slot}+${b.slot}`, type: `${a.type}/${b.type}`, why: `${hits} points of one inside the other` });
    }
  }
  return issues;
}

// A salvaged part goes on with whatever is to hand: welded brackets in bare steel, a scorched
// weld bead, and a power/coolant line run across the hull to the nearest hatch.
function salvageFit(B, slot, m, seed) {
  if (B.lod) return;
  const rnd = mulberry(seed);
  const k = 2 + Math.floor(rnd() * 2);
  for (let i = 0; i < k; i++) {
    const a = rnd() * Math.PI * 2, d = 1.5 + rnd() * 0.5;
    const mb = T([Math.cos(a) * d, 0.1, Math.sin(a) * d], [0, -a + (rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.12]).premultiply(m);
    B.add('metal', rbox(0.9 + rnd() * 0.6, 0.12, 0.42, 0.04), mb);
    B.add('weld', rbox(0.95, 0.06, 0.08, 0.03), T([0, 0.04, 0.24]).premultiply(mb));
  }
  const a = rnd() * Math.PI * 2, L = 2.2 + rnd() * 1.4;
  B.add('dark', pipeRaw([[0.6 * Math.cos(a), 0.35, 0.6 * Math.sin(a)], [1.4 * Math.cos(a), 0.12, 1.4 * Math.sin(a)], [L * Math.cos(a + 0.3), 0.08, L * Math.sin(a + 0.3)]], 0.07, 6), m);
}

// ---------------------------------------------------------------------
//  Ship models
// ---------------------------------------------------------------------
const PAINT_OF = { cutter: 'starter', racer: 'racer', hauler: 'hauler', gunship: 'gunship', battlecruiser: 'capital' };
const ACCENT_OF = {
  cutter: { base: '#c46a2b', base2: '#a9a493', panel: 1.4 }, racer: { base: '#2f7f8f', base2: '#b1b5b2', panel: 1.6 },
  hauler: { base: '#6e7d52', base2: '#a5492f', panel: 1.2 }, gunship: { base: '#3b4045', base2: '#2c3034', panel: 2.0 },
  battlecruiser: { base: '#596066', base2: '#474d52', panel: 4.0 },
};
function ensureShipMats() {
  if (MAT.racer) return;
  MAT.racer = surf('racer', () => pbr(hullMaps({ seed: 111, base: '#d9dcd8', base2: '#2f8fa0', stripe: '#2f8fa0', rust: 0.08, scorch: 0.08, panel: 88, bare: 0.12, rough: 0.38 })));
  MAT.hauler = surf('hauler', () => pbr(hullMaps({ seed: 121, base: '#c98a2b', base2: '#59605d', stripe: '#161512', rust: 0.35, scorch: 0.15, panel: 64, bare: 0.3, rough: 0.62 })));
  MAT.container = surf('container', () => pbr(hullMaps({ seed: 125, base: '#6e7d52', base2: '#a5492f', stripe: '#d9d4c4', rust: 0.4, scorch: 0.1, panel: 40, bare: 0.25, rough: 0.7 })));
  MAT.gunship = surf('gunship', () => pbr(hullMaps({ seed: 131, base: '#4b5157', base2: '#373c41', stripe: '#d0a03a', rust: 0.1, scorch: 0.2, panel: 72, bare: 0.18, rough: 0.5 })));
  MAT.capital = surf('capital', () => pbr(hullMaps({ seed: 141, base: '#7b8186', base2: '#5c6267', stripe: '#d0a03a', rust: 0.12, scorch: 0.12, panel: 96, bare: 0.15, rough: 0.52 })));
  const shader = (world.gfxBoot ? world.gfxBoot.surfaces : GFX.surfaces) !== 'texture';
  MAT.accent = {};
  for (const [cls, a] of Object.entries(ACCENT_OF)) {
    MAT.accent[cls] = shader ? hullSurface({ base: a.base, base2: a.base2, panel: a.panel, rough: 0.55, metal: 0.35, wear: 0.35, grime: 0.45, scorch: 0.15 })
      : new THREE.MeshStandardMaterial({ color: a.base, roughness: 0.6, metalness: 0.35 });
  }
  MAT.glow = new THREE.MeshStandardMaterial({ color: '#120d07', roughness: 0.3, metalness: 0.1, emissive: new THREE.Color(2.2, 1.6, 0.95) });
  MAT.weld = new THREE.MeshStandardMaterial({ color: '#3b2f27', roughness: 0.85, metalness: 0.45 });
  MAT.ember = MAT.ember || new THREE.MeshStandardMaterial({ color: '#120804', emissive: new THREE.Color(1.6, 0.42, 0.08), roughness: 0.9 });
  IRM.ember = IRM.ember || irMaterial(0.55).mat;
}
function shipMat(cls, key) {
  switch (key) {
    case 'paint': return MAT[PAINT_OF[cls]];
    case 'accent': return cls === 'hauler' ? MAT.container : MAT.accent[cls];
    default: return MAT[key] || MAT.dark;
  }
}
// hull geometry is shared by every ship of a class; only mounts and fittings are per ship
const DESIGN_CACHE = new Map();
function designOf(cls, lod) {
  const key = `${cls}|${lod}`;
  let d = DESIGN_CACHE.get(key);
  if (!d) {
    const B = new Batch(lod);
    const A = DESIGNS[cls](B);
    d = { geos: B.geometries(), A, tris: B.triangles() };
    DESIGN_CACHE.set(key, d);
  }
  return d;
}

// A ship's destroyed state: the same design with blast holes through the hull (blackened
// cavities, peeled plating, embers), dark windows, cold drives, snapped radiators, and some of
// its fittings blown away. seed makes the damage repeatable.
function destroyedDesign(clsId, seed) {
  const A0 = designOf(clsId, 0).A, rnd = mulberry(seed);
  const holes = [];
  const n = clsId === 'battlecruiser' ? 6 : 3;
  for (let k = 0; k < n * 4 && holes.length < n; k++) {
    const h = A0.seat[Math.floor(rnd() * Math.min(A0.seat.length, 3))];
    const z0 = h.st[0].z, z1 = h.st[h.st.length - 1].z;
    const f = h.frame(z0 + (z1 - z0) * (0.15 + rnd() * 0.7), rnd() * Math.PI * 2);
    const r = A0.cam * (0.9 + rnd() * 1.1);
    if (holes.some((o) => o.c.distanceTo(f.o) < o.r + r)) continue;
    holes.push({ c: f.o.clone(), n: f.n.clone(), r });
  }
  const make = (lod) => {
    const B = new Batch(lod); B.holes = holes;
    const A = DESIGNS[clsId](B);
    B.holes = null;
    for (const h of holes) {
      // a scorched cavity behind the hole, plating peeled back round it, the odd ember
      // the cavity is a cup sunk into the hull (dome pointing inward), never proud of the skin
      const fr0 = frameAtN(h.c, h.n);
      B.add('dark', sph(h.r * 0.98, lod ? 8 : 18, lod ? 4 : 8, Math.PI / 2), frameM(fr0, -0.05).multiply(T([0, 0, 0], [Math.PI, 0, 0], [1, 0.7, 1])));
      if (lod) continue;
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2 + rnd() * 0.5;
        const m = frameM(fr0, 0).multiply(T([Math.cos(a) * h.r * 0.9, 0.05, Math.sin(a) * h.r * 0.9], [0, -a + Math.PI / 2, 0.5 + rnd() * 0.7]));
        B.add(rnd() < 0.6 ? 'paint' : 'dark', rbox(h.r * (0.35 + rnd() * 0.35), 0.06 * A0.cam, h.r * (0.25 + rnd() * 0.3), 0.02), m);
      }
      for (let k = 0; k < 4; k++) B.add('ember', rbox(0.25 * A0.cam, 0.12 * A0.cam, 0.2 * A0.cam, 0.02), T(h.c.clone().addScaledVector(h.n, -h.r * 0.25).add(new THREE.Vector3((rnd() - 0.5) * h.r, (rnd() - 0.5) * h.r, (rnd() - 0.5) * h.r)).toArray()));
    }
    return { geos: B.geometries(), A, tris: B.triangles() };
  };
  return [make(0), make(1), rnd];
}

// Build a ship model: hull (two levels of detail), deployable radiators, drives with plumes,
// lights, and the fitted parts on their mounts. fitted: [{ slot, type, prov, id }]
// opts.destroyed (a seed) builds the ship's destroyed state instead of the working one.
function buildShipModel(clsId, fitted, sc = scene, opts = {}) {
  ensureShipMats();
  const C = SHIP_CLASSES[clsId];
  const dead = opts.destroyed != null;
  const [D0, D1, drnd] = dead ? destroyedDesign(clsId, opts.destroyed) : [designOf(clsId, 0), designOf(clsId, 1), null];
  const A = D0.A;
  if (dead) fitted = fitted.filter(() => drnd() > 0.35);   // some fittings were blown away
  const grp = new THREE.Group();
  const ir = { hull: irMaterial(0.2), rad: irMaterial(0.25), bell: irMaterial(0.2) };
  const mesh = (geo, mat, irm, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; m.userData.ir = irm; return m; };
  // mounts and salvage fittings, per ship, at both levels of detail
  const Bm = [new Batch(0), new Batch(1)];
  const slotMarkers = {};
  const markerMat = opts.markers ? new THREE.MeshStandardMaterial({ color: '#000', emissive: new THREE.Color(2.6, 1.5, 0.35) }) : null;
  const partsGrp = new THREE.Group();
  C.slots.forEach((s, si) => {
    const f = fitted.find((x) => x.slot === s.id);
    const frm = A.slots[s.id];
    if (!frm) return;
    const m = slotM(frm, 0);
    for (const B of Bm) mountHardware(B, s.cls, !!f, m);
    const lift = MOUNT_LIFT[s.cls] || 0.3;
    if (f) {
      const fi = factionIndex(f.prov);
      const fkey = fi >= 0 ? ['tcn', 'ard', 'bfc'][fi] : 'accent';
      if (f.type === 5 || f.type === 8) {
        // reactors and capacitor banks are installed inside the hull: what shows is their bay
        for (const B of Bm) internalBay(B, f.type, s.cls, m, fkey);
      } else if (f.type === 0 && frm.hull) {
        // armour is cut to the hull and welded on, following its curvature
        for (const B of Bm) armourPlate(B, frm, fkey);
      } else {
        const g = partVisual(f.type, frm, lift);
        paintPart(g, fi);
        g.traverse((o) => { if (o.isMesh) o.userData.ir = ir.hull.mat; });
        partsGrp.add(g);
      }
      if (fi >= 0) salvageFit(Bm[0], s, m, (f.id || si + 1) * 7919 + si * 31);
    } else if (markerMat) {
      const mk = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.08, 6, 36), markerMat);
      mk.position.copy(frm.o).addScaledVector(frm.n, lift + 0.05); mk.quaternion.copy(alignQ(new THREE.Vector3(0, 0, 1), frm.n));
      grp.add(mk); slotMarkers[s.id] = mk;
    }
  });
  const lodObj = new THREE.LOD();
  [D0, D1].forEach((D, lv) => {
    const lg = new THREE.Group();
    for (const [key, geo] of D.geos) lg.add(mesh(geo, dead && key === 'glow' ? MAT.glass : key === 'ember' ? MAT.ember : shipMat(clsId, key), key === 'ember' ? IRM.ember : ir.hull.mat, key !== 'glow' && key !== 'red' && key !== 'green' && key !== 'white' && key !== 'ember'));
    for (const [key, geo] of Bm[lv].geometries()) lg.add(mesh(geo, shipMat(clsId, key), ir.hull.mat));
    lodObj.addLevel(lg, lv === 0 ? 0 : 260 * A.cam);
  });
  grp.add(lodObj, partsGrp);
  // radiators
  const radMat = MAT.radiator.clone();
  const radiators = [];
  for (const r of A.radiators) {
    const pivot = new THREE.Group(); pivot.position.set(...r.pos);
    const panel = mesh(r.geo, radMat, ir.rad.mat);
    pivot.add(panel); grp.add(pivot);
    // a dead ship's radiators hang where the blast left them, if they are there at all
    if (dead) { if (drnd() < 0.3) pivot.visible = false; pivot.rotation.set((drnd() - 0.5) * 0.6, (drnd() - 0.5) * 0.4, r.side * (drnd() - 0.2) * r.fold); }
    else radiators.push({ pivot, side: r.side, panel, fold: r.fold });
  }
  // drives: the hot inner bell and the exhaust plume (the outer bell is part of the hull)
  const bellInMat = MAT.bellIn.clone();
  const plumeMat = new THREE.MeshBasicNodeMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const plumeU = uniform(0);
  const yv = uv().y;
  const flick = sin(time.mul(53.0)).mul(0.06).add(1);
  plumeMat.colorNode = mix(vec3(0.05, 0.12, 0.7), vec3(1.9, 1.35, 0.95), yv.pow(3.0)).mul(yv.pow(1.8)).mul(plumeU).mul(flick).mul(abs(normalView.z).pow(1.2));
  const nozzles = A.nozzles.map((nz) => {
    const [x, y, z] = nz.pos;
    const inn = new THREE.Mesh(place(bellG(nz.r * 0.95, nz.len * 0.97), [x, y, z - 0.05], [Math.PI / 2, 0, 0]), bellInMat); inn.userData.ir = ir.bell.mat;
    const plume = new THREE.Mesh(place(new THREE.CylinderGeometry(nz.r * 0.8, nz.r * 0.33, 1, 24, 1, true), [0, 0, -0.5], [Math.PI / 2, 0, 0]), plumeMat);
    plume.position.set(x, y, z - nz.len - 0.15); plume.frustumCulled = false;
    const core2 = new THREE.Mesh(place(new THREE.CylinderGeometry(nz.r * 0.37, nz.r * 0.1, 1, 16, 1, true), [0, 0, -0.5], [Math.PI / 2, 0, 0]), plumeMat);
    core2.position.copy(plume.position); core2.frustumCulled = false;
    grp.add(inn, plume, core2);
    return { plume, core2, r: nz.r, len: nz.len };
  });
  const tailZ = Math.min(...A.nozzles.map((n) => n.pos[2] - n.len));
  let engineLight = null;
  if (!opts.noLights) { engineLight = new THREE.PointLight(new THREE.Color(1.0, 0.75, 0.55), 0, 90 * A.cam, 1.6); engineLight.position.set(0, 0, tailZ - 3 * A.cam); grp.add(engineLight); }
  // navigation lights and the strobe (animated in code)
  const ls = 0.16 * Math.max(1, A.cam * 0.6);
  const navR = new THREE.Mesh(new THREE.SphereGeometry(ls, 8, 6), MAT.red); navR.position.set(...A.nav[0]);
  const navG = new THREE.Mesh(new THREE.SphereGeometry(ls, 8, 6), MAT.green); navG.position.set(...A.nav[1]);
  const strobe = new THREE.Mesh(new THREE.SphereGeometry(ls * 0.9, 8, 6), MAT.white.clone()); strobe.position.set(...A.strobe);
  grp.add(navR, navG, strobe);
  if (dead) { navR.visible = navG.visible = strobe.visible = false; }
  let flood = null;
  if (!opts.noLights) {
    flood = new THREE.SpotLight(new THREE.Color(1, 0.96, 0.88), 9000, 320 * A.cam, 0.36, 0.55, 1.8);
    flood.position.set(...A.flood);
    const ft = new THREE.Object3D(); ft.position.set(A.flood[0], A.flood[1] - 2, A.flood[2] + 60); grp.add(ft); flood.target = ft;
    grp.add(flood);
  }
  sc.add(grp);
  return {
    grp, cls: clsId, radiators, radMat, nozzles, plume: nozzles[0].plume, core2: nozzles[0].core2, plumeU, engineLight, flood, strobe,
    bellInMat, ir, laserLocal: new THREE.Vector3(...A.laser), harpLocal: new THREE.Vector3(...A.harpoon), camScale: A.cam,
    rcsPts: A.rcs.map((p) => new THREE.Vector3(...p)), slotMarkers, lod: lodObj, fitted, dead,
  };
}
function disposeShipModel(m) {
  if (!m) return;
  m.grp.parent && m.grp.parent.remove(m.grp);
}
