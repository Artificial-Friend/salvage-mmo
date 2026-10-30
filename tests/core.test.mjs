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
const P = { TYPE: 0, STATE: 1, WRECK: 2, POS: 6, VEL: 9, QUAT: 12, CUT: 21, MASS: 19, N: 32 };
const W = { POS: 0, VEL: 3, N: 96 };
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
// a part's outward direction: its local +Y rotated by its world quaternion
function partUp(parts, o) {
  const [x, y, z, w] = [parts[o + P.QUAT], parts[o + P.QUAT + 1], parts[o + P.QUAT + 2], parts[o + P.QUAT + 3]];
  return [2 * (x * y - w * z), 1 - 2 * (x * x + z * z), 2 * (y * z + w * x)];
}
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
  // line up along the part's outward normal, the way you would approach a fitting to cut it
  const pp = vec(v.parts, o + P.POS);
  faceFrom(pp, partUp(v.parts, o), 35, vec(v.wrecks, W.VEL));
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
  const evs = run(10, () => { views().inp[IN.THRUST] = 1; });
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

// Hull sections — mirror of core/core.cpp SEC_A/SEC_B/SEC_L (and client/shipkit.js HULL_SECTION)
const SEC_A = [0.92, 0.74, 0.84], SEC_B = [0.62, 0.86, 0.78], SEC_L = [0.85, 0.65];
const W_SPH = 16, W_NS = 14, W_STYLE = 65, W_CLASS = 66, W_QUAT = 6, W_NBR = 68, W_BRS = 69, BR_N = 6;
const qinv = (q, v) => { // rotate v by the inverse of quaternion q
  const [x, y, z, w] = [-q[0], -q[1], -q[2], q[3]];
  const ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
};
function boxDist(p, h) {
  const q = p.map((v, i) => Math.abs(v) - h[i]);
  return Math.hypot(...q.map((v) => Math.max(v, 0))) + Math.min(Math.max(...q), 0);
}
// a section's breaches as [u, v, w] box tests (mirrors breachDist in the core)
function breachesOf(wr, w, s) {
  const o = w * W.N, out = [];
  for (let i = 0; i < wr[o + W_NBR]; i++) {
    const B = wr.slice(o + W_BRS + i * BR_N, o + W_BRS + (i + 1) * BR_N);
    if ((B[0] | 0) === s) out.push({ ang: B[1], z: B[2], hl: B[3], hw: B[4], fl: B[5] });
  }
  return out;
}
function localOf(wr, w, p) {
  const o = w * W.N;
  return qinv([wr[o + W_QUAT], wr[o + W_QUAT + 1], wr[o + W_QUAT + 2], wr[o + W_QUAT + 3]], [p[0] - wr[o], p[1] - wr[o + 1], p[2] - wr[o + 2]]);
}
function hullDist(wr, w, p) {
  const o = w * W.N, st = wr[o + W_STYLE] | 0, cl = wr[o + W_CLASS] > 0.5 ? 1 : 0;
  const lp = localOf(wr, w, p);
  let best = 1e9;
  for (let s = 0; s < wr[o + W_NS]; s++) {
    const c = [wr[o + W_SPH + s * 4], wr[o + W_SPH + s * 4 + 1], wr[o + W_SPH + s * 4 + 2]], r = wr[o + W_SPH + s * 4 + 3];
    const a = r * SEC_A[st], b = r * SEC_B[st], h = r * SEC_L[cl];
    const q = [lp[0] - c[0], lp[1] - c[1], lp[2] - c[2]];
    const rho = Math.hypot(q[0], q[1]), k = Math.pow((q[0] / a) ** 4 + (q[1] / b) ** 4, 0.25);
    const dr = rho < 1e-4 ? -Math.min(a, b) : rho * (1 - 1 / k), dz = Math.abs(q[2]) - h;
    let d = dr > 0 && dz > 0 ? Math.hypot(dr, dz) : Math.max(dr, dz);
    for (const B of breachesOf(wr, w, s)) {
      const u = q[0] * Math.cos(B.ang) + q[1] * Math.sin(B.ang), v = -q[0] * Math.sin(B.ang) + q[1] * Math.cos(B.ang), U = 2 * Math.max(a, b);
      d = Math.max(d, -boxDist([u - (B.fl + U / 2), v, lp[2] - B.z], [U / 2, B.hw, B.hl]));
    }
    best = Math.min(best, d);
  }
  return best;
}

test('bolted parts sit flush on the hull surface, in both zones', () => {
  for (const zone of [0, 1]) {
    e.initZone(11, zone);
    const v = views();
    let n = 0;
    for (let i = 0; i < e.partCount(); i++) {
      const o = i * P.N; if (v.parts[o + P.STATE] !== 0 || v.parts[o + P.WRECK] < 0) continue;
      const d = hullDist(v.wrecks, v.parts[o + P.WRECK] | 0, vec(v.parts, o + P.POS));
      assert.ok(Math.abs(d) < 0.05, `part ${i} (zone ${zone}) is ${d.toFixed(2)} m off the hull`);
      n++;
    }
    assert.ok(n > 20);
  }
});

test('a jump cell cut free and left in the beam only drifts', () => {
  e.initZone(7, 0);
  let v = views();
  let best = -1, bd = 1e9;
  for (let i = 0; i < e.partCount(); i++) {
    const o = i * P.N; if (v.parts[o + P.STATE] !== 0 || v.parts[o] !== 7) continue;
    const d = dist(vec(v.parts, o + P.POS), vec(v.s, 0)); if (d < bd) { bd = d; best = i; }
  }
  const o = best * P.N;
  const wv = vec(v.wrecks, (v.parts[o + P.WRECK] | 0) * W.N + W.VEL);
  faceFrom(vec(v.parts, o + P.POS), partUp(v.parts, o), 30, wv);
  run(12, () => { views().inp[IN.LASER] = 1; });
  views().inp[IN.LASER] = 0;
  v = views();
  assert.notEqual(v.parts[o + P.STATE], 0, 'cut free');
  const rel = dist(vec(v.parts, o + P.VEL), wv);
  assert.ok(rel < 3, `a 400 kg cell under the beam leaves at ${rel.toFixed(1)} m/s`);
});

test('the ship meets a hulk where its hull is, not at an invisible sphere', () => {
  e.initZone(7, 0);
  const v = views();
  const o = 0, st = v.wrecks[o + W_STYLE] | 0, r = v.wrecks[o + W_SPH + 3];
  // drop straight onto the first section along its local +Y (the top of the hull)
  const q = [v.wrecks[o + W_QUAT], v.wrecks[o + W_QUAT + 1], v.wrecks[o + W_QUAT + 2], v.wrecks[o + W_QUAT + 3]];
  const up = (() => { const [x, y, z, w] = q; return [2 * (x * y - w * z), 1 - 2 * (x * x + z * z), 2 * (y * z + w * x)]; })();
  const c = [v.wrecks[o + W_SPH], v.wrecks[o + W_SPH + 1], v.wrecks[o + W_SPH + 2]];
  const cw = qinv([-q[0], -q[1], -q[2], q[3]], c); // rotate by q (inverse of inverse)
  const top = r * SEC_B[st];
  const wp = vec(v.wrecks, 0), wv = vec(v.wrecks, W.VEL);
  for (let k = 0; k < 3; k++) { v.s[k] = wp[k] + cw[k] + up[k] * (top + 25); v.s[3 + k] = wv[k] - up[k] * 4; }
  let closest = 1e9;
  run(12, () => { closest = Math.min(closest, hullDist(views().wrecks, 0, vec(views().s, 0))); });
  // contact happens at the ship's collision radius (6 m · 0.8) from the drawn hull
  assert.ok(closest > 6 * 0.8 - 0.6 && closest < 6 * 0.8 + 0.6, `closest approach ${closest.toFixed(2)} m from the hull`);
});

test('every hulk is breached, and the breaches are open space', () => {
  for (const zone of [0, 1]) {
    e.initZone(13, zone);
    const v = views();
    for (let w = 0; w < e.wreckCount(); w++) {
      const o = w * W.N;
      assert.ok(v.wrecks[o + W_NBR] >= 1, `wreck ${w} has a breach`);
      // the middle of the first breach, halfway up from its floor, is outside the hull
      const s = v.wrecks[o + W_BRS] | 0, B = breachesOf(v.wrecks, w, s)[0];
      const c = [v.wrecks[o + W_SPH + s * 4], v.wrecks[o + W_SPH + s * 4 + 1], v.wrecks[o + W_SPH + s * 4 + 2]];
      const lp = [c[0] + Math.cos(B.ang) * (B.fl + 0.6), c[1] + Math.sin(B.ang) * (B.fl + 0.6), B.z];
      const q = [v.wrecks[o + W_QUAT], v.wrecks[o + W_QUAT + 1], v.wrecks[o + W_QUAT + 2], v.wrecks[o + W_QUAT + 3]];
      const wp = qinv([-q[0], -q[1], -q[2], q[3]], lp).map((x, i) => x + v.wrecks[o + i]);
      assert.ok(hullDist(v.wrecks, w, wp) > 0.3, `breach ${w} is carved`);
    }
  }
});

test('reactors, jump cells and capacitors are inside the hull, on breach floors', () => {
  let n = 0;
  for (const zone of [0, 1]) {
    e.initZone(17, zone);
    const v = views();
    for (let i = 0; i < e.partCount(); i++) {
      const o = i * P.N, t = v.parts[o], w = v.parts[o + P.WRECK] | 0;
      if (v.parts[o + P.STATE] !== 0 || w < 0 || ![5, 7, 8].includes(t)) continue;
      // on a floor: a metre further out along its normal is open space, half a metre back is hull
      const p = vec(v.parts, o + P.POS), up = partUp(v.parts, o);
      assert.ok(hullDist(v.wrecks, w, p.map((x, k) => x + up[k])) > 0.5, `internal part ${i} has space above it`);
      assert.ok(hullDist(v.wrecks, w, p.map((x, k) => x - up[k] * 0.5)) < -0.2, `internal part ${i} rests on structure`);
      n++;
    }
  }
  assert.ok(n > 10, `found ${n} internal fittings`);
});

test('no two fittings on a hulk overlap', () => {
  e.initZone(19, 1);
  const v = views();
  const R = { 0: 3.2, 1: 2.6, 2: 1.9, 3: 1.8, 4: 4.3, 5: 3.0, 6: 2.0, 7: 1.2, 8: 1.7, 9: 3.0 };
  for (let i = 0; i < e.partCount(); i++) for (let j = i + 1; j < e.partCount(); j++) {
    const a = i * P.N, b = j * P.N;
    if (v.parts[a + P.WRECK] !== v.parts[b + P.WRECK] || v.parts[a + P.STATE] !== 0 || v.parts[b + P.STATE] !== 0) continue;
    const d = dist(vec(v.parts, a + P.POS), vec(v.parts, b + P.POS));
    assert.ok(d >= (R[v.parts[a]] + R[v.parts[b]]) * 0.8 - 0.01, `parts ${i} and ${j} overlap (${d.toFixed(2)} m)`);
  }
});
