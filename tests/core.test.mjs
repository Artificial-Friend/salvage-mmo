// Physics-core regression tests. Run with `npm test` after `npm run build:core`.
// Each test drives the WebAssembly core directly, the way the client and a future server do.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { instance } = await WebAssembly.instantiate(readFileSync(path.join(root, 'build/core.wasm')), {});
const e = instance.exports;
const DT = 1 / 120;

// layouts — keep in sync with core/core.cpp
const S = { POS: 0, VEL: 3, QUAT: 6, PROP: 14, CARGO: 15, HULL: 16, BUS_T: 17, JF: 22, JCOST: 23, SIG: 25, HARP: 31,
  TETH_TYPE: 38, CARGO_N: 54, STATE: 52, AP_STATE: 72, AP_GOAL: 73, AP_VREL: 74, SCRAP: 78, PDC_N: 80, COIL_CD: 82,
  HULL_MAX: 85, ARMOR: 86, N: 96 };
const P = { TYPE: 0, STATE: 1, WRECK: 2, POS: 6, VEL: 9, CUT: 21, N: 32 };
const W = { POS: 0, VEL: 3, N: 68 };
const D = { POS: 0, STATE: 6, WAKE: 22, AMMO: 29, N: 32 };
const R = { POS: 0, VEL: 3, RAD: 6, MASS: 7, N: 8 };
const IN = { THRUST: 0, LASER: 6, HARPOON: 7, REEL: 8, KILLV: 9, JUMP: 12, AP_MODE: 16, AP_TYPE: 17, AP_IDX: 18, AP_QUIET: 19, AP_SERIAL: 20, FIRE: 21 };
const EV = { WAKE: 4, EXTRACTED: 15, DRONE_DEAD: 16, AP_ARRIVED: 31, STIR: 34, SCRAP: 40 };

const views = () => {
  const m = e.memory.buffer;
  return {
    s: new Float32Array(m, e.shipPtr(), S.N), inp: new Float32Array(m, e.inputPtr(), 24),
    parts: new Float32Array(m, e.partsPtr(), 400 * P.N), wrecks: new Float32Array(m, e.wrecksPtr(), 24 * W.N),
    drones: new Float32Array(m, e.dronesPtr(), 12 * D.N), rocks: new Float32Array(m, e.rocksPtr(), 900 * R.N),
    cfg: new Float32Array(m, e.configPtr(), 32),
  };
};
// step for `sec` seconds, calling `each(t)` before every step; returns the event types emitted
function run(sec, each) {
  const evs = [];
  for (let k = 0; k < sec / DT; k++) {
    if (each) each(k * DT);
    e.step(DT);
    const n = e.eventCount(); const E = new Float32Array(e.memory.buffer, e.eventsPtr(), n * 6);
    for (let j = 0; j < n; j++) evs.push(E[j * 6] | 0);
    e.clearEvents();
  }
  return evs;
}
const pulse = (i) => { const v = views(); v.inp[i] = 1; e.step(DT); views().inp[i] = 0; };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const vec = (arr, o) => [arr[o], arr[o + 1], arr[o + 2]];
// put the ship `d` metres from point p, nose on it, at rest relative to velocity v
function faceFrom(p, dir, d, v = [0, 0, 0]) {
  const { s } = views();
  const l = Math.hypot(...dir); const n = dir.map((x) => x / l);
  s[0] = p[0] + n[0] * d; s[1] = p[1] + n[1] * d; s[2] = p[2] + n[2] * d;
  s[3] = v[0]; s[4] = v[1]; s[5] = v[2];
  const f = [-n[0], -n[1], -n[2]]; // forward = toward p; quaternion rotating +Z onto f
  let qw = 1 + f[2], qx = -f[1], qy = f[0]; const q = Math.hypot(qx, qy, qw) || 1;
  s[6] = qx / q; s[7] = qy / q; s[8] = 0; s[9] = qw / q; s[10] = s[11] = s[12] = 0;
}

test('zones generate at their intended scale', () => {
  e.initZone(4242, 0);
  assert.equal(e.wreckCount(), 7); assert.ok(e.partCount() > 40); assert.equal(e.droneCount(), 5);
  e.initZone(4242, 1);
  assert.equal(e.wreckCount(), 22); assert.ok(e.partCount() > 200); assert.equal(e.rockCount(), 900);
  assert.equal(e.droneCount(), 11);
});

test('main drive: 3 s burn reaches the expected speed (F/m·t)', () => {
  e.initZone(1337, 0);
  run(3, () => { views().inp[IN.THRUST] = 1; });
  const { s } = views();
  assert.ok(Math.abs(s[S.VEL + 2] - 24.2) < 0.5, `vz ${s[S.VEL + 2]}`);
  assert.ok(s[S.PROP] < 14000, 'propellant was spent');
});

test('flip-and-burn brings the ship nearly to rest', () => {
  e.initZone(1337, 0);
  run(3, () => { views().inp[IN.THRUST] = 1; });
  views().inp[IN.THRUST] = 0;
  run(14, () => { views().inp[IN.KILLV] = 1; });
  const { s } = views();
  assert.ok(Math.hypot(s[3], s[4], s[5]) < 2.5);
});

test('autopilot: a quiet approach parks alongside a hulk without ever burning the main drive', () => {
  e.initZone(7, 0);
  const v = views();
  Object.assign(v.inp, { [IN.AP_MODE]: 1, [IN.AP_TYPE]: 2, [IN.AP_IDX]: 0, [IN.AP_QUIET]: 1, [IN.AP_SERIAL]: 1 });
  let peak = 0;
  const evs = run(70, () => { peak = Math.max(peak, views().s[S.SIG]); });
  assert.ok(evs.includes(EV.AP_ARRIVED), 'arrived');
  assert.ok(Math.abs(views().s[S.AP_GOAL]) < 6);
  assert.ok(peak < 4, `signature stayed low (${peak.toFixed(1)} MW)`);
});

test('salvage: harpoon a bolted part, cut it free, winch it into the hold', () => {
  e.initZone(7, 0);
  let v = views();
  let best = -1, bd = 1e9;
  for (let i = 0; i < e.partCount(); i++) {
    const o = i * P.N; if (v.parts[o + P.STATE] !== 0 || v.parts[o] === 7 || v.parts[o + P.WRECK] !== 0) continue;
    const d = dist(vec(v.parts, o + P.POS), vec(v.s, 0)); if (d < bd) { bd = d; best = i; }
  }
  const o = best * P.N;
  const pp = vec(v.parts, o + P.POS), wc = vec(v.wrecks, 0);
  faceFrom(pp, [pp[0] - wc[0], pp[1] - wc[1], pp[2] - wc[2]], 35, vec(v.wrecks, W.VEL));
  pulse(IN.HARPOON); run(1);
  assert.equal(views().s[S.HARP], 2, 'harpoon set');
  run(15, () => { views().inp[IN.LASER] = 1; });
  views().inp[IN.LASER] = 0;
  assert.notEqual(views().parts[o + P.STATE], 0, 'cut free');
  run(25, () => { views().inp[IN.REEL] = 1; });
  v = views();
  assert.equal(v.s[S.CARGO_N], 1, 'stowed');
  assert.equal(v.s[S.HULL], 100, 'no damage taken');
});

test('stealth: drifting quietly 260 m from a dormant drone never wakes it', () => {
  e.initZone(7, 0);
  const v = views();
  const dp = vec(v.drones, 0);
  v.s[0] = dp[0]; v.s[1] = dp[1] + 260; v.s[2] = dp[2]; v.s[3] = v.s[4] = v.s[5] = 0;
  const evs = run(40);
  assert.ok(!evs.includes(EV.WAKE));
  assert.equal(views().drones[D.STATE], 0);
});

test('a main-drive burn near a dormant drone makes it stir, then wake', () => {
  e.initZone(7, 0);
  const v = views();
  const dp = vec(v.drones, 0);
  v.s[0] = dp[0]; v.s[1] = dp[1] + 260; v.s[2] = dp[2]; v.s[3] = v.s[4] = v.s[5] = 0;
  const evs = run(6, () => { views().inp[IN.THRUST] = 1; });
  const stir = evs.indexOf(EV.STIR), wake = evs.indexOf(EV.WAKE);
  assert.ok(stir >= 0 && wake > stir, 'warning comes before the wake');
});

// gunship-like configuration: [dry, prop, thrust, rcs, rcsArm, isp, krDep, krRet, reactor, hull, armor, cargo,
//   jf, jumpRated, radius, nose, inertia, sig, pdc, coil, laserMul, laserCap, coilReload, busC]
const gunship = (pdc, coil) => [64000, 20000, 640000, 110000, 7, 1500, 2.4e-4, 2.4e-5, 2.0e6, 200, 0.25, 40000,
  1.3, 85000, 8, 10, 1.6, 1.3, pdc, coil, 1, 1, 4, 2.4e6];

test('fitted configuration is applied to the ship', () => {
  e.initZone(9, 0);
  views().cfg.set(gunship(2, 1)); e.applyConfig();
  const { s } = views();
  assert.equal(s[S.HULL], 200); assert.equal(s[S.HULL_MAX], 200);
  assert.ok(Math.abs(s[S.ARMOR] - 0.25) < 1e-6); assert.equal(s[S.PDC_N], 2);
});

test('point defense kills an awake drone at 400 m', () => {
  e.initZone(9, 0);
  views().cfg.set(gunship(2, 0)); e.applyConfig();
  const v = views();
  const dp = vec(v.drones, 0);
  v.s[0] = dp[0]; v.s[1] = dp[1] + 400; v.s[2] = dp[2]; v.s[3] = v.s[4] = v.s[5] = 0;
  v.drones[D.STATE] = 1; v.drones[D.WAKE] = 0.5;
  const evs = run(30);
  assert.ok(evs.includes(EV.DRONE_DEAD));
  assert.ok(views().s[S.HULL] > 100, 'survived with most of the hull');
});

test('coilgun: one shot kills a drone 600 m ahead, with recoil and a reload', () => {
  e.initZone(9, 0);
  views().cfg.set(gunship(0, 1)); e.applyConfig();
  const v = views();
  const dp = vec(v.drones, 0);
  faceFrom(dp, [0, 0, -1], 600);
  const vz0 = views().s[S.VEL + 2];
  pulse(IN.FIRE);
  const evs = run(1);
  assert.ok(evs.includes(EV.DRONE_DEAD));
  assert.ok(views().s[S.VEL + 2] < vz0, 'recoil pushed the ship back');
  assert.ok(views().s[S.COIL_CD] > 2, 'reloading');
});

test('scrap: a small fragment can be harpooned and winched aboard as tonnage', () => {
  e.initZone(9, 0);
  const v = views();
  let ri = -1;
  for (let i = 0; i < e.rockCount(); i++) { const r = v.rocks[i * R.N + R.RAD]; if (r > 0.6 && r < 1.0) { ri = i; break; } }
  const o = ri * R.N;
  v.rocks[o + 3] = v.rocks[o + 4] = v.rocks[o + 5] = 0;
  faceFrom(vec(v.rocks, o), [0, 0, -1], 45);
  pulse(IN.HARPOON); run(1);
  assert.equal(views().s[S.TETH_TYPE], 4, 'fragment on the line');
  const evs = run(25, () => { views().inp[IN.REEL] = 1; });
  assert.ok(evs.includes(EV.SCRAP));
  assert.ok(views().s[S.SCRAP] > 500);
});

test('jump: spooling with enough fuel extracts; cargo raises the cost', () => {
  e.initZone(3, 0);
  const light = e.jumpCostFor(52000), heavy = e.jumpCostFor(70000);
  assert.ok(heavy > light * 1.3, 'cost grows faster than mass');
  pulse(IN.JUMP);
  const evs = run(10);
  assert.ok(evs.includes(EV.EXTRACTED));
  assert.equal(views().s[S.STATE], 2);
});

test('performance: a large zone steps in well under a millisecond', () => {
  e.initZone(4242, 1);
  const t0 = performance.now();
  run(10);
  const ms = (performance.now() - t0) / (10 / DT);
  assert.ok(ms < 0.5, `${ms.toFixed(3)} ms per step`);
});
