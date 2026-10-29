import * as THREE from 'three/webgpu';
import {
  uniform, vec2, vec3, vec4, float, mix, smoothstep, abs, normalView, uv, pass, time, sin, renderOutput,
  mrt, output, directionToColor, colorToDirection, sample, screenUV,
} from 'three/tsl';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { lensflare } from 'three/addons/tsl/display/LensflareNode.js';
import { film } from 'three/addons/tsl/display/FilmNode.js';
import { chromaticAberration } from 'three/addons/tsl/display/ChromaticAberrationNode.js';
import { CSMShadowNode } from 'three/addons/csm/CSMShadowNode.js';
import { fxaa } from 'three/addons/tsl/display/FXAANode.js';
import { smaa } from 'three/addons/tsl/display/SMAANode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// =====================================================================
//  Layout constants mirrored from core.cpp
// =====================================================================
const S = { POS: 0, VEL: 3, QUAT: 6, ANG: 10, DRY: 13, PROP: 14, CARGO: 15, HULL: 16, BUS_T: 17, LASER_T: 18,
  RAD_HEALTH: 19, RAD_DEPLOY: 20, COLD: 21, JF: 22, JCOST: 23, SPOOL: 24, SIG: 25, LASER_ON: 26, LASER_DIST: 27,
  LASER_TYPE: 28, LASER_IDX: 29, CUT: 30, HARP_STATE: 31, HARP_POS: 32, TETH_TYPE: 38, TETH_IDX: 39, TETH_REST: 43,
  TETH_TENSION: 44, THROTTLE: 45, RCS: 46, DOSE: 49, CREW: 50, SHADOW: 51, STATE: 52, LASER_LOCK: 53, CARGO_N: 54,
  HIT_T: 55, DEATH: 56, FLARE: 57, FLARE_T: 58, TIME: 59, RAD_TARGET: 60, PRAD: 61, PIN: 62, MASS: 63, TETH_LEN: 64,
  SPOOLING: 65, TRACKED: 66, DETECT_R: 67, TRACK_R: 68, AP_STATE: 72, AP_GOAL: 73, AP_VREL: 74, STIR: 75, STIR_IDX: 76, AP_BURN: 77,
  SCRAP: 78, PD_ON: 79, PDC_N: 80, COIL_N: 81, COIL_CD: 82, PD_TGT: 83, PD_FIRING: 84, HULL_MAX: 85, ARMOR: 86, INTERCEPTS: 87, COIL_FLASH: 88, CARGO_LIMIT: 89, N: 96 };
const P = { TYPE: 0, STATE: 1, WRECK: 2, POS: 6, VEL: 9, QUAT: 12, MASS: 19, RAD: 20, CUT: 21, CUTTIME: 22, VALUE: 23, HEAT: 28, N: 32 };
const W = { POS: 0, VEL: 3, QUAT: 6, MASS: 13, NS: 14, SEED: 15, SPH: 16, BR: 64, STYLE: 65, CLASS: 66, TORN: 67, N: 68 };
const LIM = { parts: 400, wrecks: 24, rocks: 900, drones: 12, scavs: 4 };
const R = { POS: 0, RAD: 6, N: 8 };
const D = { POS: 0, VEL: 3, STATE: 6, HP: 7, ALERT: 17, FLASH: 18, QUAT: 24, SUSP: 28, AMMO: 29, N: 32 };
const G = { POS: 0, VEL: 3, ACTIVE: 7, OWNER: 8, DMG: 9, KIND: 10, N: 12 };
const C = { POS: 0, VEL: 3, QUAT: 6, WORK: 12, SIG: 13, N: 16 };
const IN = { THRUST: 0, SX: 1, SY: 2, PITCH: 3, YAW: 4, ROLL: 5, LASER: 6, HARPOON: 7, REEL: 8, KILLV: 9, RAD: 10,
  COLD: 11, JUMP: 12, EJECT: 13, ASSIST: 14, PAYOUT: 15, AP_MODE: 16, AP_TYPE: 17, AP_IDX: 18, AP_QUIET: 19, AP_SERIAL: 20, FIRE: 21, PD: 22, N: 24 };
const PS = { ATTACHED: 0, FREE: 1, TETHERED: 2, CARGO: 3, GONE: 4 };
const DS = { DORMANT: 0, WAKING: 1, HUNTING: 2, SEARCHING: 3, DEAD: 4, RETURNING: 5 };
const E = { DETACH: 1, STOW: 2, IMPACT: 3, DRONE_WAKE: 4, DRONE_LOST: 5, SLUG_FIRED: 6, SLUG_HIT: 7, HARPOON_HIT: 8,
  JUMPCELL: 9, FLARE_WARN: 10, FLARE_START: 11, FLARE_END: 12, OVERHEAT: 13, DIED: 14, EXTRACTED: 15, DRONE_DEAD: 16,
  TETHER_SNAP: 17, SPOOL_ABORT: 18, NO_FUEL: 19, RAD_DAMAGE: 20, EJECT: 21, SPOOL_START: 22, CARGO_FULL: 23,
  HARPOON_MISS: 24, COLD_ON: 25, COLD_OFF: 26, RAD_TOGGLE: 27, SPARK: 28, DRONE_REACQ: 29, AP_ARRIVED: 31, AP_CANCEL: 32, DRONE_DRY: 33, DRONE_STIR: 34, UPSET: 35, PD_FIRE: 36, COIL_FIRE: 37, INTERCEPT: 38, DRONE_HIT: 39, SCRAP: 40, PD_TOGGLE: 41 };
const WAKE_K = 3.0e3; // mirrors core: dormant drones hear you within sqrt(WAKE_K * signature) metres

const PART_INFO = [
  { name: 'Armor slab', tag: 'ARMOR', color: '#c9cfcb' },
  { name: 'Radiator panel', tag: 'RADIATOR', color: '#d98c4a' },
  { name: 'Aux thruster', tag: 'THRUSTER', color: '#c9cfcb' },
  { name: 'Point-defense turret', tag: 'WEAPON', color: '#ff7a5c', weapon: true },
  { name: 'Coilgun spine', tag: 'WEAPON', color: '#ff7a5c', weapon: true },
  { name: 'Fusion reactor core', tag: 'REACTOR', color: '#d7e36a' },
  { name: 'Sensor mast', tag: 'SENSOR', color: '#71d3c6' },
  { name: 'Jump cell', tag: 'FUEL', color: '#8fb2ff' },
  { name: 'Capacitor bank', tag: 'POWER', color: '#c9cfcb' },
  { name: 'Structural truss', tag: 'SCRAP', color: '#8d9692' },
];

// Fictional factions & hulls for provenance
const FACTIONS = [
  { code: 'TCN', name: 'Terran Compact Navy' },
  { code: 'ARD', name: 'Ares Directorate' },
  { code: 'BFC', name: 'Belt Free Collective' },
];
const HULL_CLASSES = ['frigate', 'corvette', 'fleet tender', 'destroyer', 'ore hauler', 'picket', 'gunship'];
const HULL_NAMES = ['Varuna', 'Long Quiet', 'Saint Hesper', 'Ironwood', 'Tamsin Ray', 'Ninth Lantern', 'Coldharbor', 'Anselm', 'Quiet Tithe', 'Morrow', 'Vesta Gale', 'Pilgrim Ash', 'Hollis', 'Second Dawn', 'Carrow', 'Iron Psalm', 'Lumen', 'Westerly', 'Fenwick', 'Stillwater',
  'Meridian Ask', 'Halcyon Debt', 'Kestrel Due', 'Orison', 'Brightwater'];

// =====================================================================
//  Boot
// =====================================================================
const $ = (id) => document.getElementById(id);
const DBG = new URLSearchParams(location.search);
const bootStatus = (t) => { $('bootstatus').textContent = t; };

function b64ToBytes(b64) {
  const bin = atob(b64); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

let core, mem, ship, parts, wrecks, rocks, drones, slugs, scavs, input, events;
async function loadCore() {
  try {
    if (DBG.has('jscore')) throw new Error('forced JS core');
    const bytes = b64ToBytes(window.__CORE_WASM__);
    const { instance } = await WebAssembly.instantiate(bytes, {});
    core = instance.exports;
    world.coreKind = 'WebAssembly';
  } catch (err) {
    // Same C++ core, compiled to plain JavaScript, for pages where WebAssembly is unavailable
    core = window.__coreFallback();
    world.coreKind = 'JavaScript (WebAssembly unavailable)';
  }
  if (core.layoutS() !== S.N || core.layoutP() !== P.N || core.layoutW() !== W.N || core.layoutD() !== D.N) throw new Error('core layout mismatch');
}
function bindViews() {
  mem = core.memory.buffer;
  ship = new Float32Array(mem, core.shipPtr(), S.N);
  parts = new Float32Array(mem, core.partsPtr(), LIM.parts * P.N);
  wrecks = new Float32Array(mem, core.wrecksPtr(), LIM.wrecks * W.N);
  rocks = new Float32Array(mem, core.rocksPtr(), LIM.rocks * R.N);
  drones = new Float32Array(mem, core.dronesPtr(), LIM.drones * D.N);
  slugs = new Float32Array(mem, core.slugsPtr(), core.slugCap() * G.N);
  scavs = new Float32Array(mem, core.scavsPtr(), LIM.scavs * C.N);
  input = new Float32Array(mem, core.inputPtr(), IN.N);
  events = new Float32Array(mem, core.eventsPtr(), 128 * 6);
}

// =====================================================================
//  Small utilities
// =====================================================================
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpM = new THREE.Matrix4();
const getV = (a, o, v = new THREE.Vector3()) => v.set(a[o], a[o + 1], a[o + 2]);
const getQ = (a, o, q = new THREE.Quaternion()) => q.set(a[o], a[o + 1], a[o + 2], a[o + 3]);
const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : '—');
const fmtDist = (m) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`);

// value noise for textures
function makeNoise(seed) {
  const rnd = mulberry(seed); const N = 256; const perm = new Uint8Array(N * 2); const vals = new Float32Array(N);
  for (let i = 0; i < N; i++) { perm[i] = i; vals[i] = rnd(); }
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < N; i++) perm[N + i] = perm[i];
  const h = (x, y) => vals[perm[(perm[x & 255] + y) & 511]];
  const sm = (t) => t * t * (3 - 2 * t);
  const n2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    const u = sm(xf), v = sm(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  return (x, y, oct = 4) => { let s = 0, amp = 0.5, f = 1; for (let o = 0; o < oct; o++) { s += amp * n2(x * f, y * f); f *= 2.03; amp *= 0.5; } return s; };
}

// =====================================================================
//  Procedural surface materials (canvas-generated PBR maps)
// =====================================================================
const TEX = 1024;
function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function hullMaps({ seed, base, base2, stripe, rust = 0.25, scorch = 0.2, panel = 64, bare = 0.15, rough = 0.55, decals = true }) {
  const rnd = mulberry(seed); const noise = makeNoise(seed);
  const col = canvas(TEX), orm = canvas(TEX), bump = canvas(TEX);
  const cc = col.getContext('2d'), oc = orm.getContext('2d'), bc = bump.getContext('2d');
  cc.fillStyle = base; cc.fillRect(0, 0, TEX, TEX);
  oc.fillStyle = `rgb(255,${Math.round(rough * 255)},${Math.round(0.35 * 255)})`; oc.fillRect(0, 0, TEX, TEX);
  bc.fillStyle = '#808080'; bc.fillRect(0, 0, TEX, TEX);
  // panels: rows of plates with irregular widths
  let y = 0;
  while (y < TEX) {
    const ph = panel * (rnd() < 0.3 ? 0.5 : rnd() < 0.15 ? 2 : 1);
    let x = 0;
    while (x < TEX) {
      const pw = panel * (0.6 + rnd() * 2.2);
      const tone = (rnd() - 0.5) * 0.12;
      cc.fillStyle = tone > 0 ? `rgba(255,255,255,${tone})` : `rgba(0,0,0,${-tone})`;
      cc.fillRect(x, y, pw, ph);
      if (base2 && rnd() < 0.12) { cc.fillStyle = base2; cc.globalAlpha = 0.85; cc.fillRect(x + 1, y + 1, pw - 2, ph - 2); cc.globalAlpha = 1; }
      const rv = Math.round((rough + (rnd() - 0.5) * 0.2) * 255);
      oc.fillStyle = `rgb(255,${rv},90)`; oc.fillRect(x, y, pw, ph);
      // seams
      bc.fillStyle = '#3a3a3a'; bc.fillRect(x, y, pw, 2); bc.fillRect(x, y, 2, ph);
      cc.fillStyle = 'rgba(0,0,0,.45)'; cc.fillRect(x, y, pw, 1.5); cc.fillRect(x, y, 1.5, ph);
      // rivets
      if (rnd() < 0.55) {
        bc.fillStyle = '#b0b0b0';
        for (let k = 6; k < pw - 4; k += 11) { bc.fillRect(x + k, y + 4, 2, 2); bc.fillRect(x + k, y + ph - 6, 2, 2); }
      }
      // access hatches
      if (rnd() < 0.06) {
        const hw = pw * 0.5, hh = ph * 0.5;
        bc.strokeStyle = '#4a4a4a'; bc.lineWidth = 2; bc.strokeRect(x + pw * 0.25, y + ph * 0.25, hw, hh);
        cc.strokeStyle = 'rgba(0,0,0,.35)'; cc.strokeRect(x + pw * 0.25, y + ph * 0.25, hw, hh);
      }
      x += pw;
    }
    y += ph;
  }
  // hazard stripes & stencils
  if (stripe && decals) {
    for (let k = 0; k < 3; k++) {
      const sx = rnd() * TEX, sy = rnd() * TEX, sw = 90 + rnd() * 140, sh = 18 + rnd() * 10;
      cc.save(); cc.beginPath(); cc.rect(sx, sy, sw, sh); cc.clip();
      cc.fillStyle = '#1a1712'; cc.fillRect(sx, sy, sw, sh);
      cc.fillStyle = stripe; for (let t = -sh; t < sw; t += 16) { cc.beginPath(); cc.moveTo(sx + t, sy + sh); cc.lineTo(sx + t + 8, sy + sh); cc.lineTo(sx + t + 8 + sh, sy); cc.lineTo(sx + t + sh, sy); cc.fill(); }
      cc.restore();
    }
    cc.fillStyle = 'rgba(20,18,14,.75)'; cc.font = '600 22px "Saira Condensed", Arial Narrow, sans-serif';
    const codes = ['NO STEP', 'SECT 4-C', 'PURGE', 'LOAD 12t', 'CRYO', 'VENT ⟶'];
    for (let k = 0; k < 4; k++) cc.fillText(codes[Math.floor(rnd() * codes.length)], rnd() * (TEX - 120), rnd() * TEX);
  }
  // grime, rust, chipped paint, scorch via per-pixel noise
  const img = cc.getImageData(0, 0, TEX, TEX), om = oc.getImageData(0, 0, TEX, TEX), bm = bc.getImageData(0, 0, TEX, TEX);
  const d = img.data, o = om.data, b = bm.data;
  const ox = rnd() * 50, oy = rnd() * 50;
  for (let j = 0; j < TEX; j++) {
    for (let i = 0; i < TEX; i++) {
      const k = (j * TEX + i) * 4;
      const u = i / TEX * 6 + ox, v = j / TEX * 6 + oy;
      const g = noise(u, v, 5);
      const streak = noise(u * 0.4, v * 6.0, 3);
      const fine = noise(u * 9, v * 9, 2);
      // grime darkening
      let m = 1 - (g * 0.35 + streak * 0.18);
      // chipped paint → bare metal
      const chip = fine > 1 - bare * 0.55 ? 1 : 0;
      // scorch blooms
      const sc = Math.max(0, noise(u * 0.7 + 9, v * 0.7, 4) - (1 - scorch)) / scorch;
      // rust in low-lying grime
      const rs = Math.max(0, g - (1 - rust)) / Math.max(rust, 1e-3);
      let r = d[k], gg = d[k + 1], bb = d[k + 2];
      if (chip) { r = 150 + fine * 40; gg = 152 + fine * 40; bb = 156 + fine * 40; o[k + 2] = 235; o[k + 1] = 95; b[k] = b[k + 1] = b[k + 2] = 105; }
      r = r * m; gg = gg * m; bb = bb * m;
      if (rs > 0) { r = r * (1 - rs) + 110 * rs; gg = gg * (1 - rs) + 58 * rs; bb = bb * (1 - rs) + 30 * rs; o[k + 1] = Math.min(255, o[k + 1] + rs * 80); }
      if (sc > 0) { const s = Math.min(1, sc * 1.4); r *= 1 - s * 0.85; gg *= 1 - s * 0.87; bb *= 1 - s * 0.9; o[k + 1] = Math.min(255, o[k + 1] + s * 50); }
      d[k] = r; d[k + 1] = gg; d[k + 2] = bb;
      b[k] = b[k + 1] = b[k + 2] = Math.min(255, b[k] * 0.9 + fine * 30);
    }
  }
  cc.putImageData(img, 0, 0); oc.putImageData(om, 0, 0); bc.putImageData(bm, 0, 0);
  return { col, orm, bump };
}

function texFrom(c, srgb) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return t;
}
function pbr(maps, opts = {}) {
  const orm = texFrom(maps.orm, false);
  return new THREE.MeshStandardMaterial({
    map: texFrom(maps.col, true), roughnessMap: orm, metalnessMap: orm, bumpMap: texFrom(maps.bump, false),
    bumpScale: opts.bumpScale ?? 1.4, roughness: 1, metalness: opts.metalness ?? 1, side: opts.side ?? THREE.FrontSide,
    envMapIntensity: opts.env ?? 1,
  });
}

// =====================================================================
//  Geometry helpers with world-scale UVs (consistent texel density)
// =====================================================================
const UVS = 11; // metres per texture repeat
function scaleUV(g, su, sv) { const uvA = g.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) * su, uvA.getY(i) * sv); return g; }
function boxG(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uvA = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uvA.setXY(i, uvA.getX(i) * dims[f][0] / UVS, uvA.getY(i) * dims[f][1] / UVS); }
  return g;
}
function cylG(r1, r2, h, seg = 12, open = false, t0 = 0, tl = Math.PI * 2) {
  const g = new THREE.CylinderGeometry(r1, r2, h, seg, 1, open, t0, tl);
  return scaleUV(g, (Math.max(r1, r2) * tl) / UVS, h / UVS);
}
function place(g, pos, rot, scl) {
  const m = new THREE.Matrix4();
  const q = rot instanceof THREE.Quaternion ? rot : new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0])));
  m.compose(new THREE.Vector3(...pos), q, new THREE.Vector3(...(scl || [1, 1, 1])));
  return g.applyMatrix4(m);
}
function bellG(r, len, seg = 20) {
  const pts = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(r * (0.32 + 0.68 * Math.pow(t, 1.6)), -t * len)); }
  const g = new THREE.LatheGeometry(pts, seg);
  return scaleUV(g, (r * Math.PI * 2) / UVS, len / UVS);
}
function merge(list) {
  const mixed = list.some((x) => !x.index);
  const norm = mixed ? list.map((x) => (x.index ? x.toNonIndexed() : x)) : list;
  const g = mergeGeometries(norm, false);
  if (!g) throw new Error('geometry merge failed');
  list.forEach((x) => x.dispose());
  return g;
}
function alignQ(from, to) { return new THREE.Quaternion().setFromUnitVectors(from.clone().normalize(), to.clone().normalize()); }

// =====================================================================
//  Black-body-ish emission ramp (K → linear RGB, game-exaggerated)
// =====================================================================
function heatColor(T, out = new THREE.Color()) {
  const t = THREE.MathUtils.clamp((T - 380) / 700, 0, 1);
  const r = Math.min(1, t * 2.2), g = Math.max(0, Math.min(1, (t - 0.35) * 1.8)), b = Math.max(0, (t - 0.75) * 2.5);
  const k = Math.pow(t, 1.6) * 4.2;
  return out.setRGB(r * k, g * k * 0.55, b * k * 0.35);
}

// IR false-colour material: ironbow palette driven by a heat uniform, shaded by view-angle
function irMaterial(h0 = 0.05) {
  const u = uniform(h0);
  const mat = new THREE.MeshBasicNodeMaterial();
  const h = u.clamp(0, 1);
  const c0 = vec3(0.012, 0.012, 0.045), c1 = vec3(0.2, 0.03, 0.42), c2 = vec3(0.75, 0.05, 0.16), c3 = vec3(1.0, 0.42, 0.04), c4 = vec3(1.0, 0.95, 0.72);
  let col = mix(c0, c1, smoothstep(0.08, 0.3, h));
  col = mix(col, c2, smoothstep(0.25, 0.5, h));
  col = mix(col, c3, smoothstep(0.5, 0.75, h));
  col = mix(col, c4, smoothstep(0.75, 1.0, h));
  const rim = abs(normalView.z);
  mat.colorNode = col.mul(float(0.45).add(rim.mul(0.55))).mul(float(1).add(h.mul(1.6)));
  return { mat, u };
}

// Why WebGPU is or isn't available here, in words a player can act on
async function gpuDiagnose() {
  const framed = (() => { try { return window.top !== window.self; } catch { return true; } })();
  if (!('gpu' in navigator) || !navigator.gpu) {
    return { ok: false, why: `WebGPU isn't exposed to this page${window.isSecureContext ? '' : ' (insecure context)'}${framed ? ' — it runs inside an embedded frame, which may not be allowed WebGPU' : ''}` };
  }
  try {
    // Linux browsers that run WebGPU on OpenGL only offer a "compatibility" adapter
    let adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    let mode = 'core';
    if (!adapter) { adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance', featureLevel: 'compatibility' }); mode = 'compatibility'; }
    if (!adapter) return { ok: false, why: `the browser returned no WebGPU adapter${framed ? ' to this embedded frame' : ''}, not even in compatibility mode` };
    // an adapter without core features is compatibility-only, however it was requested
    if (adapter.featureLevel === 'compatibility' || (/Chrome\//.test(navigator.userAgent) && adapter.features && !adapter.features.has('core-features-and-limits'))) mode = 'compatibility';
    const info = adapter.info || {};
    const name = [info.vendor, info.architecture || info.description].filter(Boolean).join(' ');
    try { const dev = await adapter.requestDevice(); dev.destroy(); } catch (e) { return { ok: false, why: `WebGPU device creation failed (${mode} adapter): ${e.message}`, name, mode }; }
    return { ok: true, name: name || 'GPU adapter', mode };
  } catch (e) { return { ok: false, why: `WebGPU adapter request failed: ${e.message}` }; }
}

// =====================================================================
//  Scene setup
// =====================================================================
let renderer, scene, camera, pipeline, sunLight, hemi;
const world = {};

async function initRenderer() {
  world.gpuDiag = await gpuDiagnose();
  let pref = 'auto';
  try { pref = localStorage.getItem('salvage.renderer') || 'auto'; } catch { /* storage unavailable */ }
  world.rendererPref = pref;
  // compatibility-only WebGPU is translated onto the same OpenGL driver WebGL 2 uses: no gain, more risk
  const compatOnly = world.gpuDiag.ok && world.gpuDiag.mode === 'compatibility';
  const forceWebGL = /webgl/.test(location.search) || pref === 'webgl' || (pref === 'auto' && compatOnly);
  world.renderReason = pref === 'webgl' ? 'chosen in settings' : (pref === 'auto' && compatOnly ? 'your browser offers WebGPU only in compatibility mode (on OpenGL), so WebGL 2 is used — same driver, more stable' : '');
  renderer = new THREE.WebGPURenderer({ antialias: !DBG.has('noaa'), powerPreference: 'high-performance', forceWebGL });
  // Three.js swallows the reason it falls back; keep it so the player can see it
  if (typeof renderer._getFallback === 'function') {
    const fb = renderer._getFallback;
    renderer._getFallback = (err) => { world.gpuError = err; console.warn('[salvage] WebGPU backend failed, falling back:', err); return fb(err); };
  }
  await renderer.init();
  renderer.setPixelRatio(THREE.MathUtils.clamp(window.devicePixelRatio * GFX.renderScale, 0.5, 2.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !DBG.has('noshadow');
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  $('stage').appendChild(renderer.domElement);
  const backend = renderer.backend && renderer.backend.isWebGPUBackend ? 'WebGPU' : (world.renderReason ? 'WebGL 2' : 'WebGL 2 fallback');
  world.backend = backend;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.3, 90000);
  scene.add(camera);

  // WebGPU compatibility mode (OpenGL-backed, common on Linux) can't resolve multisampled passes here
  world.compat = !!(renderer.backend && renderer.backend.compatibilityMode);
  world.passOpts = world.compat || DBG.has('pass0') ? { samples: 0 } : undefined;
  const built = buildPipeline(scene, camera);
  pipeline = built.pipe; world.bloom = built.bloom;

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  });
}

// --- equirect sky ------------------------------------------------------
function dirToEquirectXY(dir, w, h) {
  const u = Math.atan2(dir.z, dir.x) / (2 * Math.PI) + 0.5;
  const v = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1)) / Math.PI + 0.5;
  return [u * w, (1 - v) * h];
}
function buildSky(sunDir, planetDir) {
  const Wd = 4096, Ht = 2048;
  const c = canvas(Wd, Ht), g = c.getContext('2d');
  g.fillStyle = '#010204'; g.fillRect(0, 0, Wd, Ht);
  const rnd = mulberry(77), noise = makeNoise(91);
  // galactic band: a tilted sinusoid across the sky
  const band = (x) => Ht * 0.5 + Math.sin(x / Wd * Math.PI * 2 + 0.8) * Ht * 0.22;
  const img = g.getImageData(0, 0, Wd, Ht), d = img.data;
  for (let y = 0; y < Ht; y += 1) {
    for (let x = 0; x < Wd; x += 1) {
      const dy = (y - band(x)) / (Ht * 0.11);
      const dens = Math.exp(-dy * dy);
      if (dens < 0.02) continue;
      const n = noise(x / 340, y / 340, 5), dust = noise(x / 120 + 7, y / 120, 4);
      const lum = dens * Math.max(0, n - 0.32) * 55 * (1 - Math.max(0, dust - 0.52) * 2.5);
      const k = (y * Wd + x) * 4;
      d[k] += lum * 0.78; d[k + 1] += lum * 0.78; d[k + 2] += lum * 0.95;
    }
  }
  g.putImageData(img, 0, 0);
  // stars: dense faint field + band concentration + few bright with halo
  for (let i = 0; i < 26000; i++) {
    let x = rnd() * Wd, y;
    if (rnd() < 0.45) { y = band(x) + (rnd() + rnd() + rnd() - 1.5) * Ht * 0.12; } else y = rnd() * Ht;
    const m = Math.pow(rnd(), 5);
    const a = 0.25 + m * 0.75;
    const temp = rnd();
    g.fillStyle = temp < 0.15 ? `rgba(255,205,170,${a})` : temp > 0.85 ? `rgba(180,205,255,${a})` : `rgba(240,240,248,${a})`;
    const s = 0.7 + m * 1.1;
    g.fillRect(x, y, s, s);
  }
  for (let i = 0; i < 40; i++) {
    const x = rnd() * Wd, y = rnd() * Ht, r = 1.2 + rnd() * 2.2;
    const gr = g.createRadialGradient(x, y, 0, x, y, r * 3);
    gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.2, 'rgba(220,230,255,.25)'); gr.addColorStop(1, 'rgba(200,210,255,0)');
    g.fillStyle = gr; g.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  }
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;

  // environment map for reflections: dark, with a sun lobe and the planet's warm bounce
  const ew = 512, eh = 256; const ec = canvas(ew, eh), eg = ec.getContext('2d');
  const vg = eg.createLinearGradient(0, 0, 0, eh); vg.addColorStop(0, '#07090d'); vg.addColorStop(1, '#020203');
  eg.fillStyle = vg; eg.fillRect(0, 0, ew, eh);
  const [px, py] = dirToEquirectXY(planetDir, ew, eh);
  let gr = eg.createRadialGradient(px, py, 0, px, py, 120); gr.addColorStop(0, 'rgba(190,120,70,.9)'); gr.addColorStop(1, 'rgba(120,70,40,0)');
  eg.fillStyle = gr; eg.fillRect(0, 0, ew, eh); eg.fillRect(px - ew - 0, 0, ew, eh);
  const [sx, sy] = dirToEquirectXY(sunDir, ew, eh);
  gr = eg.createRadialGradient(sx, sy, 0, sx, sy, 60); gr.addColorStop(0, 'rgba(255,250,235,1)'); gr.addColorStop(1, 'rgba(255,240,220,0)');
  eg.fillStyle = gr; eg.fillRect(0, 0, ew, eh);
  const et = new THREE.CanvasTexture(ec); et.mapping = THREE.EquirectangularReflectionMapping; et.colorSpace = THREE.SRGBColorSpace;
  return { sky: t, env: et };
}

function buildPlanet() {
  const Wd = 2048, Ht = 1024; const c = canvas(Wd, Ht), g = c.getContext('2d');
  const noise = makeNoise(4242), rnd = mulberry(4243);
  const img = g.createImageData(Wd, Ht), d = img.data;
  const palette = [[196, 160, 118], [168, 120, 84], [222, 196, 156], [140, 98, 70], [205, 176, 132], [120, 86, 64], [230, 212, 180]];
  for (let y = 0; y < Ht; y++) {
    const lat = y / Ht;
    for (let x = 0; x < Wd; x++) {
      const warp = noise(x / 180, y / 60, 4) * 0.08 + noise(x / 40, y / 20, 3) * 0.015;
      const bandF = (lat + warp) * 22;
      const i0 = Math.floor(bandF) % palette.length, i1 = (i0 + 1) % palette.length;
      const f = bandF - Math.floor(bandF); const s = f * f * (3 - 2 * f);
      const k = (y * Wd + x) * 4;
      const n = 0.88 + noise(x / 25, y / 25, 3) * 0.22;
      d[k] = (palette[i0][0] * (1 - s) + palette[i1][0] * s) * n;
      d[k + 1] = (palette[i0][1] * (1 - s) + palette[i1][1] * s) * n;
      d[k + 2] = (palette[i0][2] * (1 - s) + palette[i1][2] * s) * n;
      d[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // storms
  for (let i = 0; i < 9; i++) {
    const x = rnd() * Wd, y = Ht * (0.25 + rnd() * 0.5), rx = 20 + rnd() * 70, ry = rx * 0.45;
    const gr = g.createRadialGradient(x, y, 0, x, y, rx);
    gr.addColorStop(0, i === 0 ? 'rgba(170,80,50,.85)' : 'rgba(240,225,200,.6)'); gr.addColorStop(1, 'rgba(240,225,200,0)');
    g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rx, 0, Math.PI * 2); g.fill(); g.restore();
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const planet = new THREE.Mesh(new THREE.SphereGeometry(1, 160, 96), new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 }));
  // atmosphere rim
  const atmo = new THREE.MeshBasicNodeMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide });
  const fres = float(1).sub(abs(normalView.z)).pow(3.0);
  atmo.colorNode = vec3(0.95, 0.62, 0.36).mul(fres.mul(1.6));
  const atmoMesh = new THREE.Mesh(new THREE.SphereGeometry(1.025, 128, 64), atmo);
  // rings
  const rc = canvas(2048, 8), rg = rc.getContext('2d');
  for (let x = 0; x < 2048; x++) {
    const t = x / 2048; const n = noise(x / 9, 0.5, 4);
    const gap = (t > 0.42 && t < 0.47) || (t > 0.78 && t < 0.8) ? 0.05 : 1;
    const a = Math.max(0, (n - 0.25)) * 1.2 * gap * Math.min(1, t * 6) * Math.min(1, (1 - t) * 5);
    rg.fillStyle = `rgba(${200 + n * 40},${170 + n * 40},${140 + n * 30},${Math.min(1, a)})`; rg.fillRect(x, 0, 1, 8);
  }
  const rtex = new THREE.CanvasTexture(rc); rtex.colorSpace = THREE.SRGBColorSpace;
  const ringGeo = new THREE.RingGeometry(1.35, 2.35, 256, 1);
  const pos = ringGeo.attributes.position, ruv = ringGeo.attributes.uv;
  for (let i = 0; i < pos.count; i++) { const r = Math.hypot(pos.getX(i), pos.getY(i)); ruv.setXY(i, (r - 1.35) / 1.0, 0.5); }
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({ map: rtex, transparent: true, side: THREE.DoubleSide, roughness: 1, metalness: 0, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2 + 0.32; ring.rotation.y = 0.18;
  const grp = new THREE.Group(); grp.add(planet, atmoMesh, ring);
  grp.rotation.z = 0.28;
  return { grp, planet, ring, atmo: atmoMesh };
}

function radialTex(stops, size = 256) {
  const c = canvas(size), g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// =====================================================================
//  Materials library
// =====================================================================
const MAT = {};
const IRM = {};
function buildMaterials() {
  bootStatus('Painting hull plating…');
  MAT.starter = pbr(hullMaps({ seed: 11, base: '#c8c4b6', base2: '#c46a2b', stripe: '#d8a22a', rust: 0.18, scorch: 0.12, panel: 72, bare: 0.25, rough: 0.5 }));
  MAT.tcn = pbr(hullMaps({ seed: 21, base: '#59626a', base2: '#3e464d', stripe: '#c9c3b0', rust: 0.25, scorch: 0.42, panel: 80, bare: 0.2, rough: 0.58 }), { side: THREE.DoubleSide });
  MAT.ard = pbr(hullMaps({ seed: 31, base: '#7a3e2e', base2: '#4f2a22', stripe: '#d0c8b6', rust: 0.3, scorch: 0.45, panel: 64, bare: 0.3, rough: 0.62 }), { side: THREE.DoubleSide });
  MAT.bfc = pbr(hullMaps({ seed: 41, base: '#8a8458', base2: '#c88a2a', stripe: '#1c1a14', rust: 0.45, scorch: 0.35, panel: 56, bare: 0.35, rough: 0.68 }), { side: THREE.DoubleSide });
  MAT.metal = pbr(hullMaps({ seed: 51, base: '#9a9fa3', rust: 0.1, scorch: 0.1, panel: 160, bare: 0.9, rough: 0.35, decals: false }));
  MAT.dark = pbr(hullMaps({ seed: 61, base: '#2a2e31', rust: 0.15, scorch: 0.3, panel: 48, bare: 0.12, rough: 0.7, decals: false }), { side: THREE.DoubleSide });
  MAT.scav = pbr(hullMaps({ seed: 71, base: '#c27b26', base2: '#3b3f3a', stripe: '#111', rust: 0.3, scorch: 0.2, panel: 60, bare: 0.25, rough: 0.6 }));
  MAT.drone = new THREE.MeshStandardMaterial({ color: '#2b2f33', roughness: 0.42, metalness: 0.85 });
  MAT.glass = new THREE.MeshStandardMaterial({ color: '#0b1216', roughness: 0.08, metalness: 0.2, emissive: new THREE.Color(0.05, 0.25, 0.28) });
  MAT.rock = new THREE.MeshStandardMaterial({ color: '#544c45', roughness: 0.92, metalness: 0.25, flatShading: true });
  MAT.radiator = new THREE.MeshStandardMaterial({ color: '#a89a7c', roughness: 0.32, metalness: 0.95, emissive: new THREE.Color(0, 0, 0) });
  MAT.partRad = new THREE.MeshStandardMaterial({ color: '#9b8f74', roughness: 0.38, metalness: 0.9 });
  MAT.bellIn = new THREE.MeshStandardMaterial({ color: '#191919', roughness: 0.3, metalness: 1, side: THREE.DoubleSide, emissive: new THREE.Color(0, 0, 0) });
  MAT.cell = new THREE.MeshStandardMaterial({ color: '#cfd8ee', roughness: 0.25, metalness: 0.6 });
  MAT.cellGlow = new THREE.MeshStandardMaterial({ color: '#000', emissive: new THREE.Color(0.9, 1.6, 5.5) });
  MAT.reactorGlow = new THREE.MeshStandardMaterial({ color: '#000', emissive: new THREE.Color(1.4, 2.4, 0.5) });
  MAT.red = new THREE.MeshStandardMaterial({ color: '#000', emissive: new THREE.Color(6, 0.3, 0.2) });
  MAT.green = new THREE.MeshStandardMaterial({ color: '#000', emissive: new THREE.Color(0.2, 5, 0.6) });
  MAT.white = new THREE.MeshStandardMaterial({ color: '#000', emissive: new THREE.Color(4, 4, 4) });
  MAT.cable = new THREE.MeshStandardMaterial({ color: '#b8b2a0', roughness: 0.6, metalness: 0.5 });

  IRM.cold = irMaterial(0.06).mat;
  IRM.rock = irMaterial(0.03).mat;
  IRM.planet = irMaterial(0.24).mat;
}

// =====================================================================
//  Player ship (starter cutter) — kitbashed procedurally
// =====================================================================
// =====================================================================
//  Salvage parts — one distinct silhouette per function
// =====================================================================
function partPrototype(type) {
  const g = new THREE.Group();
  const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  switch (type) {
    case 0: // armor slab
      add(merge([place(boxG(5.2, 0.9, 4.2), [0, 0.2, 0]), place(boxG(4.6, 0.5, 3.6), [0, 0.85, 0]), place(boxG(5.4, 0.25, 0.5), [0, 1.15, -1.2]), place(boxG(5.4, 0.25, 0.5), [0, 1.15, 1.2])]), MAT.tcn);
      break;
    case 1: // radiator panel on a boom
      add(merge([place(boxG(0.4, 2.0, 0.4), [0, 0.9, 0]), place(boxG(0.5, 0.5, 0.5), [0, 0, 0])]), MAT.metal);
      add(merge([place(boxG(6.8, 0.1, 3.4), [0, 2.0, 0]), ...[-1.3, -0.45, 0.45, 1.3].map((z) => place(boxG(6.8, 0.2, 0.1), [0, 2.02, z]))]), MAT.partRad);
      break;
    case 2: // aux thruster
      add(merge([place(boxG(2.4, 1.5, 2.4), [0, 0.6, 0]), place(cylG(0.8, 0.8, 0.8, 12), [0, 1.6, 0])]), MAT.metal);
      add(place(bellG(1.2, 2.2), [0, 2.0, 0], [Math.PI, 0, 0]), MAT.bellIn);
      break;
    case 3: // point-defense turret
      add(merge([place(cylG(1.5, 1.8, 0.9, 16), [0, 0.4, 0]), place(new THREE.SphereGeometry(1.25, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), [0, 0.85, 0])]), MAT.ard);
      add(merge([-0.32, 0, 0.32].map((x) => place(cylG(0.13, 0.15, 3.2, 8), [x, 1.5, 1.4], [Math.PI / 2 - 0.25, 0, 0]))), MAT.metal);
      add(place(boxG(0.5, 0.35, 0.3), [0, 1.9, -0.5]), MAT.glass);
      break;
    case 4: // coilgun spine — long, unmistakable
      add(merge([place(boxG(0.5, 0.5, 11), [0.55, 1.0, 0]), place(boxG(0.5, 0.5, 11), [-0.55, 1.0, 0]), place(boxG(2.2, 1.1, 2.2), [0, 0.5, -4.6])]), MAT.tcn);
      add(merge([-3.5, -1.8, 0, 1.8, 3.6].map((z) => place(new THREE.TorusGeometry(1.0, 0.24, 8, 18), [0, 1.0, z])) ), MAT.metal);
      break;
    case 5: // fusion reactor core
      add(merge([place(new THREE.SphereGeometry(2.2, 24, 16), [0, 2.0, 0]), place(cylG(0.6, 0.6, 5.4, 12), [2.0, 2.0, 0], [0, 0, Math.PI / 2]), place(cylG(0.6, 0.6, 5.4, 12), [0, 2.0, 2.0], [Math.PI / 2, 0, 0])]), MAT.dark);
      add(merge([0, 1, 2, 3].map((k) => place(new THREE.TorusGeometry(2.24, 0.06, 6, 40), [0, 2.0, 0], [Math.PI / 2, k * Math.PI / 4, 0]))), MAT.reactorGlow);
      break;
    case 6: // sensor mast
      add(merge([place(cylG(0.18, 0.25, 4.2, 8), [0, 2.1, 0]), place(boxG(1.0, 0.6, 1.0), [0, 0.3, 0]), place(cylG(0.04, 0.04, 2.4, 4), [0.6, 4.8, 0])]), MAT.metal);
      add(place(new THREE.SphereGeometry(1.5, 20, 8, 0, Math.PI * 2, 0, 0.9), [0, 4.0, 0.2], [Math.PI / 2 + 0.4, 0, 0]), MAT.cell);
      break;
    case 7: // jump cell canister — glowing, small
      add(merge([place(cylG(0.62, 0.62, 2.2, 16), [0, 1.1, 0]), place(cylG(0.75, 0.75, 0.25, 16), [0, 0.1, 0]), place(cylG(0.75, 0.75, 0.25, 16), [0, 2.1, 0])]), MAT.cell);
      add(merge([0.6, 1.1, 1.6].map((y) => place(cylG(0.64, 0.64, 0.12, 16), [0, y, 0]))), MAT.cellGlow);
      break;
    case 8: // capacitor bank
      add(place(boxG(2.6, 1.8, 2.0), [0, 0.9, 0]), MAT.dark);
      add(merge([-1, -0.5, 0, 0.5, 1].map((x) => place(boxG(0.12, 1.6, 2.2), [x, 1.0, 0]))), MAT.metal);
      break;
    default: // truss
      add(merge([
        ...[[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]].map(([x, z]) => place(boxG(0.22, 3.8, 0.22), [x, 1.9, z])),
        ...[0.2, 1.9, 3.6].flatMap((y) => [place(boxG(2.6, 0.2, 0.2), [0, y, -1.2]), place(boxG(2.6, 0.2, 0.2), [0, y, 1.2]), place(boxG(0.2, 0.2, 2.6), [-1.2, y, 0]), place(boxG(0.2, 0.2, 2.6), [1.2, y, 0])]),
      ]), MAT.metal);
  }
  return g;
}

// =====================================================================
//  Wrecks: hull sections built around the core's collision spheres
// =====================================================================
function hullProfile(style, r) {
  const pts = [];
  if (style === 1) { // ARD: round hull, 20 facets
    for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r * 0.92)); }
  } else { // TCN chamfered octagon (wide, low); BFC boxy with small chamfer
    const w = style === 0 ? r : r * 0.9, h = style === 0 ? r * 0.7 : r * 0.82, ch = style === 0 ? r * 0.3 : r * 0.12;
    pts.push(new THREE.Vector2(w, -h + ch), new THREE.Vector2(w, h - ch), new THREE.Vector2(w - ch, h), new THREE.Vector2(-w + ch, h),
      new THREE.Vector2(-w, h - ch), new THREE.Vector2(-w, -h + ch), new THREE.Vector2(-w + ch, -h), new THREE.Vector2(w - ch, -h));
  }
  return pts;
}
function prismG(pts, depth, z0, inner = 0, torn = 0, seed = 1, tornBack = false, uvs = UVS) {
  const shape = new THREE.Shape(pts);
  if (inner > 0) shape.holes.push(new THREE.Path(pts.map((p) => p.clone().multiplyScalar(inner)).reverse()));
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.35, bevelSegments: 1, steps: Math.max(1, Math.round(depth / 6)) });
  const pos = g.attributes.position;
  if (torn) {
    const n = makeNoise(seed);
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      const x = pos.getX(i), y = pos.getY(i);
      if (!tornBack && z < 0.5) pos.setZ(i, z + (n(x * 0.25 + 3, y * 0.25, 2) - 0.25) * torn * 2.2);
      if (tornBack && z > depth - 0.5) pos.setZ(i, z - (n(x * 0.25 + 3, y * 0.25, 2) - 0.25) * torn * 2.2);
    }
    g.computeVertexNormals();
  }
  for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getZ(i) + z0);
  return scaleUV(g, 1 / uvs, 1 / uvs);
}
function perimeterSample(pts, t) {
  const segs = []; let total = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; const l = a.distanceTo(b); segs.push([a, b, l]); total += l; }
  let d = t * total;
  for (const [a, b, l] of segs) {
    if (d <= l) { const p = a.clone().lerp(b, d / l); const tang = b.clone().sub(a).normalize(); return { p, n: new THREE.Vector2(tang.y, -tang.x) }; }
    d -= l;
  }
  return { p: pts[0].clone(), n: new THREE.Vector2(1, 0) };
}
function decalTexture(text, sub, tint) {
  const c = canvas(1024, 256), g = c.getContext('2d');
  g.fillStyle = tint; g.font = '700 150px "Saira Condensed", "Arial Narrow", Impact, sans-serif'; g.textBaseline = 'middle';
  g.fillText(text, 24, 112);
  g.font = '600 46px "Saira Condensed", "Arial Narrow", sans-serif'; g.fillText(sub, 30, 214);
  // weather: erase specks
  const n = makeNoise(text.length * 31 + 7);
  const img = g.getImageData(0, 0, 1024, 256), d = img.data;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 1024; x++) { const k = (y * 1024 + x) * 4; const v = n(x / 18, y / 18, 4); if (v > 0.6) d[k + 3] *= Math.max(0, 1 - (v - 0.6) * 5); }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

function buildWreck(wi, names) {
  const o = wi * W.N;
  const seed = wrecks[o + W.SEED] | 0;
  const rnd = mulberry(seed);
  const style = wrecks[o + W.STYLE] | 0;
  const paint = [MAT.tcn, MAT.ard, MAT.bfc][style];
  const ns = wrecks[o + W.NS] | 0;
  const sph = [];
  for (let s = 0; s < ns; s++) sph.push({ c: new THREE.Vector3(wrecks[o + W.SPH + s * 4], wrecks[o + W.SPH + s * 4 + 1], wrecks[o + W.SPH + s * 4 + 2]), r: wrecks[o + W.SPH + s * 4 + 3] });
  const paintG = [], darkG = [], metalG = [], beltG = [];
  const Y = new THREE.Vector3(0, 1, 0);
  let decalSpot = null;
  const cap = (wrecks[o + W.CLASS] | 0) === 1;
  const tornBits = wrecks[o + W.TORN] | 0;
  const bowTorn = cap ? (tornBits & 1) !== 0 : rnd() < 0.55;
  const sternTorn = cap && (tornBits & 2) !== 0;
  const emberG = [];
  for (let s = 0; s < ns; s++) {
    const { c, r } = sph[s];
    const R0 = r * 0.86;
    const L = cap ? r * 1.3 : r * 1.7;
    const z0 = c.z - L / 2;
    const pts = hullProfile(style, R0).map((p) => p.add(new THREE.Vector2(c.x, c.y)));
    const centred = hullProfile(style, R0);
    const breached = s > 0 && s < ns - 1 && rnd() < (cap ? 0.35 : 0.5);
    const torn = s === 0 && bowTorn ? R0 * 0.6 : 0;
    const tornB = s === ns - 1 && sternTorn ? R0 * 0.6 : 0;
    if (!breached) {
      const uv = cap ? UVS * 2.6 : UVS;
      if (tornB) paintG.push(prismG(pts, L, z0, 0, tornB, seed + s, true, uv)); else paintG.push(prismG(pts, L, z0, 0, torn, seed + s, false, uv));
      if (tornB || torn) for (let k = 0; k < 5; k++) emberG.push(place(boxG(2 + rnd() * 5, 1 + rnd() * 3, 0.6), [c.x + (rnd() - 0.5) * R0 * 1.4, c.y + (rnd() - 0.5) * R0 * 1.0, tornB ? z0 + L - R0 * 0.2 : z0 + R0 * 0.2]));
      if (!decalSpot || r > decalSpot.r) decalSpot = { c, r, R0, L, s };
      // armor belts
      for (let k = 0; k < 2; k++) {
        const bz = z0 + L * (0.22 + k * 0.5);
        beltG.push(prismG(hullProfile(style, R0 * 1.035).map((p) => p.add(new THREE.Vector2(c.x, c.y))), L * 0.08, bz, 0.9));
      }
    } else {
      // breached: shell broken into bands with gaps, frames exposed, decks visible
      let z = z0;
      while (z < z0 + L - 1) {
        const band = L * (0.15 + rnd() * 0.3);
        const gap = L * (0.06 + rnd() * 0.14);
        if (z + band > z0 + L) break;
        paintG.push(prismG(pts, band, z, 0.93, rnd() < 0.5 ? R0 * 0.25 : 0, seed + s * 7 + Math.floor(z)));
        z += band;
        for (let f = 0; f < 2; f++) metalG.push(prismG(pts, 0.5, z + gap * (0.25 + f * 0.5), 0.9));
        z += gap;
      }
      darkG.push(place(boxG(R0 * 1.55, 0.35, L * 0.96), [c.x, c.y - R0 * 0.22, c.z]));
      darkG.push(place(boxG(R0 * 1.3, 0.35, L * 0.9), [c.x, c.y + R0 * 0.3, c.z]));
      darkG.push(place(boxG(0.4, R0 * 1.0, L * 0.85), [c.x + R0 * 0.3, c.y, c.z]));
      if (cap) for (let k = 0; k < 4; k++) emberG.push(place(boxG(1.5 + rnd() * 4, 0.8 + rnd() * 2, 1.5 + rnd() * 4), [c.x + (rnd() - 0.5) * R0, c.y + (rnd() - 0.5) * R0 * 0.8, c.z + (rnd() - 0.5) * L * 0.8]));
      for (let k = 0; k < 6; k++) {
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3));
        metalG.push(place(boxG(0.3, 0.3, R0 * (0.5 + rnd())), [c.x + (rnd() - 0.5) * R0, c.y + (rnd() - 0.5) * R0, c.z + (rnd() - 0.5) * L], q));
      }
    }
    // greebles along the skin
    const gk = cap ? 70 : 16, gs = cap ? 2.4 : 1;
    for (let k = 0; k < gk; k++) {
      const { p, n } = perimeterSample(centred, rnd());
      const z = z0 + L * (0.08 + rnd() * 0.84);
      const q = alignQ(Y, new THREE.Vector3(n.x, n.y, 0));
      const w = (0.8 + rnd() * 3.5) * gs, h = (0.25 + rnd() * 1.1) * gs, d = (1 + rnd() * 5) * gs;
      (rnd() < 0.55 ? darkG : metalG).push(place(boxG(w, h, d), [c.x + p.x + n.x * h * 0.4, c.y + p.y + n.y * h * 0.4, z], q));
    }
    // dead turret barbettes (decor) on top
    if (!cap && rnd() < 0.5 && !breached) {
      const top = style === 1 ? R0 * 0.92 : (style === 0 ? R0 * 0.7 : R0 * 0.82);
      const tz = z0 + L * (0.3 + rnd() * 0.4);
      darkG.push(place(cylG(R0 * 0.22, R0 * 0.26, 1.4, 18), [c.x, c.y + top + 0.6, tz]));
      const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 - 0.15 - rnd() * 0.3, (rnd() - 0.5) * 1.2, 0));
      metalG.push(place(cylG(0.32, 0.4, R0 * 0.9, 10), [c.x, c.y + top + 1.6, tz + R0 * 0.4], tilt));
    }
    // connector to the next section
    if (s < ns - 1) {
      const nx = sph[s + 1];
      const a = new THREE.Vector3(c.x, c.y, c.z + L / 2), b = new THREE.Vector3(nx.c.x, nx.c.y, nx.c.z - nx.r * 0.85);
      const dir = b.clone().sub(a); const dl = dir.length();
      if (dl > 0.5) {
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const rr = Math.min(r, nx.r) * 0.45;
        metalG.push(place(cylG(rr, rr, dl + 2, 14), [mid.x, mid.y, mid.z], alignQ(Y, dir)));
        for (const sx of [-1, 1]) metalG.push(place(boxG(rr * 0.25, rr * 0.25, dl + 2), [mid.x + sx * rr * 1.2, mid.y, mid.z], alignQ(new THREE.Vector3(0, 0, 1), dir)));
      }
    }
  }
  const first = sph[0], last = sph[ns - 1];
  // bridge tower on the second section
  if (ns > 2 && !cap) {
    const s1 = sph[1]; const top = style === 1 ? s1.r * 0.8 : s1.r * 0.62;
    paintG.push(place(boxG(s1.r * 0.5, s1.r * 0.35, s1.r * 0.7), [s1.c.x, s1.c.y + top + s1.r * 0.17, s1.c.z]));
    darkG.push(place(boxG(s1.r * 0.52, s1.r * 0.08, s1.r * 0.2), [s1.c.x, s1.c.y + top + s1.r * 0.25, s1.c.z - s1.r * 0.3]));
  }
  // bow: sensor mast & dish when intact
  if (!bowTorn) {
    metalG.push(place(cylG(0.4, 0.6, first.r * 0.9, 10), [first.c.x, first.c.y, first.c.z - first.r * 1.25], [Math.PI / 2, 0, 0]));
    metalG.push(place(new THREE.SphereGeometry(first.r * 0.22, 20, 8, 0, Math.PI * 2, 0, 1.0), [first.c.x, first.c.y + first.r * 0.4, first.c.z - first.r * 0.9], [-0.6, 0, 0]));
  }
  // stern: engine block
  const eng = sternTorn ? 0 : (cap ? 4 : 2 + Math.floor(rnd() * 3));
  const sternZ = last.c.z + last.r * 0.85;
  if (!sternTorn) darkG.push(prismG(hullProfile(style, last.r * 0.7).map((p) => p.add(new THREE.Vector2(last.c.x, last.c.y))), last.r * 0.35, sternZ));
  for (let k = 0; k < eng; k++) {
    if (!cap && rnd() < 0.25) continue;
    const a = (k / eng) * Math.PI * 2 + 0.4;
    const off = eng === 1 ? [0, 0] : [Math.cos(a) * last.r * 0.38, Math.sin(a) * last.r * 0.3];
    metalG.push(place(bellG(last.r * 0.26, last.r * 0.7), [last.c.x + off[0], last.c.y + off[1], sternZ + last.r * 0.35], [-Math.PI / 2, 0, 0]));
  }
  // broken radiator wings
  for (let k = 0; k < 2; k++) {
    if (rnd() < 0.35) continue;
    const s = sph[Math.min(ns - 1, 1 + Math.floor(rnd() * (ns - 1)))];
    const side = k === 0 ? 1 : -1;
    const span = s.r * (1.2 + rnd() * 1.4);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.5, 0, side * (rnd() - 0.3) * 0.8));
    const g = merge([place(boxG(span, 0.18, s.r * 0.9), [side * span / 2, 0, 0]), ...[0.3, 0.6, 0.9].map((f) => place(boxG(0.4, 0.4, s.r * 0.95), [side * span * f, 0.1, 0]))]);
    g.applyQuaternion(q); g.translate(s.c.x + side * s.r * 0.8, s.c.y, s.c.z);
    metalG.push(g);
  }
  if (cap) {
    const top = (sp) => sp.r * 0.86 * 0.92;
    // main battery: heavy turrets far too big to move — scenery, and a reminder of scale
    for (let s = 0; s < ns; s++) {
      const sp = sph[s]; if (s === 0 && bowTorn) continue; if (s === ns - 1 && sternTorn) continue;
      if (s % 2 === 1 || ns < 4) {
        for (const side of [1, -1]) {
          const y = sp.c.y + side * top(sp);
          const R1 = sp.r * 0.2;
          darkG.push(place(cylG(R1, R1 * 1.15, 4, 24), [sp.c.x, y + side * 2, sp.c.z]));
          paintG.push(place(boxG(R1 * 1.4, R1 * 0.6, R1 * 1.8), [sp.c.x, y + side * (4 + R1 * 0.3), sp.c.z]));
          const ry = (rnd() - 0.5) * 1.6, el = side * (0.05 + rnd() * 0.25);
          for (const bx of [-0.35, 0, 0.35]) {
            const bq = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 - el, ry, 0));
            metalG.push(place(cylG(R1 * 0.09, R1 * 0.12, sp.r * 1.1, 12), [sp.c.x + bx * R1 + Math.sin(ry) * sp.r * 0.5, y + side * (4 + R1 * 0.3), sp.c.z + Math.cos(ry) * sp.r * 0.55], bq));
          }
        }
      }
    }
    // spinal gun along the keel of the bow section, muzzle out past the bow
    if (sternTorn) {
      const zA = first.c.z - first.r * 2.2, zB = last.c.z;
      const rr = first.r * 0.11;
      metalG.push(place(cylG(rr, rr, zB - zA, 18), [first.c.x, first.c.y - first.r * 0.15, (zA + zB) / 2], [Math.PI / 2, 0, 0]));
      for (let k = 0; k < 6; k++) metalG.push(place(new THREE.TorusGeometry(rr * 1.35, rr * 0.3, 8, 24), [first.c.x, first.c.y - first.r * 0.15, zA + 8 + k * 14]));
      // command superstructure
      const s1 = sph[Math.min(1, ns - 1)];
      paintG.push(place(boxG(s1.r * 0.45, s1.r * 0.55, s1.r * 0.9), [s1.c.x, s1.c.y + top(s1) + s1.r * 0.27, s1.c.z]));
      darkG.push(place(boxG(s1.r * 0.47, s1.r * 0.07, s1.r * 0.3), [s1.c.x, s1.c.y + top(s1) + s1.r * 0.42, s1.c.z - s1.r * 0.38]));
      metalG.push(place(cylG(0.8, 1.2, s1.r * 0.9, 8), [s1.c.x, s1.c.y + top(s1) + s1.r * 0.95, s1.c.z]));
    }
    // great radiator wings, some snapped and hanging
    for (let k = 0; k < 4; k++) {
      const sp = sph[Math.min(ns - 1, 1 + Math.floor(rnd() * (ns - 1)))];
      const side = k % 2 === 0 ? 1 : -1;
      const span = sp.r * (2.0 + rnd() * 1.6);
      const snapped = rnd() < 0.5;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.3, 0, side * (snapped ? -0.6 - rnd() * 0.6 : (rnd() - 0.5) * 0.2)));
      const g = merge([place(boxG(span, 0.5, sp.r * 0.9), [side * span / 2, 0, 0]), ...[0.25, 0.5, 0.75, 1.0].map((f) => place(boxG(1.2, 1.2, sp.r * 0.95), [side * span * f, 0.3, 0]))]);
      g.applyQuaternion(q); g.translate(sp.c.x + side * sp.r * 0.85, sp.c.y, sp.c.z + (rnd() - 0.5) * sp.r);
      metalG.push(g);
    }
  }
  const beaconG = [];
  if (cap) {
    for (let k = 0; k < 18; k++) {
      const sp = sph[Math.floor(rnd() * ns)];
      const { p, n } = perimeterSample(hullProfile(style, sp.r * 0.86), rnd());
      beaconG.push(place(new THREE.SphereGeometry(0.9, 8, 6), [sp.c.x + p.x + n.x * 1.2, sp.c.y + p.y + n.y * 1.2, sp.c.z + (rnd() - 0.5) * sp.r * 1.2]));
    }
  }
  const grp = new THREE.Group();
  if (beaconG.length) {
    MAT.beacon = MAT.beacon || new THREE.MeshStandardMaterial({ color: '#000', emissive: new THREE.Color(0, 0, 0) });
    const bm = new THREE.Mesh(merge(beaconG), MAT.beacon); bm.userData.ir = IRM.cold; grp.add(bm);
  }
  if (emberG.length) {
    MAT.ember = MAT.ember || new THREE.MeshStandardMaterial({ color: '#120804', emissive: new THREE.Color(1.6, 0.42, 0.08), roughness: 0.9 });
    IRM.ember = IRM.ember || irMaterial(0.55).mat;
    const em = new THREE.Mesh(merge(emberG), MAT.ember); em.userData.ir = IRM.ember; grp.add(em);
  }
  for (const [list, mat] of [[paintG, paint], [darkG, MAT.dark], [metalG, MAT.metal], [beltG, MAT.dark]]) {
    if (!list.length) continue;
    const m = new THREE.Mesh(merge(list), mat); m.castShadow = true; m.receiveShadow = true; m.userData.ir = IRM.cold; grp.add(m);
  }
  const fac = FACTIONS[style];
  const cls = HULL_CLASSES[Math.floor(rnd() * HULL_CLASSES.length)];
  const hullName = names[wi % names.length];
  const name = cap ? `${fac.code} battlecruiser Halvard · ${sternTorn ? 'bow' : 'stern'} section` : `${fac.code} ${cls} ${hullName}`;
  const number = `${fac.code}-${1000 + Math.floor(rnd() * 8999)}`;
  // painted hull markings on the biggest intact section
  if (decalSpot) {
    const tint = style === 2 ? '#e9c25a' : '#d9d4c4';
    const tex = decalTexture(cap ? 'ARD-0001' : number, cap ? 'HALVARD' : hullName.toUpperCase(), tint);
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.75, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -4, depthWrite: false });
    const { c, R0, L } = decalSpot;
    const halfW = style === 1 ? R0 : (style === 0 ? R0 : R0 * 0.9);
    const hgt = style === 0 ? R0 * 0.75 : R0 * 0.7;
    for (const side of [1, -1]) {
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.8, L * 0.2), mat);
      pl.position.set(c.x + side * (halfW + 0.42), c.y + (style === 1 ? 0 : hgt * 0.1), c.z);
      pl.rotation.y = side * Math.PI / 2;
      pl.userData.ir = IRM.cold;
      grp.add(pl);
    }
  }
  scene.add(grp);
  return { grp, name, faction: fac };
}

// =====================================================================
//  Drones and scavengers
// =====================================================================
function buildDrone() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(merge([
    place(new THREE.OctahedronGeometry(2.0, 0), [0, 0, 0], [0, 0, 0], [1, 0.75, 1.4]),
    place(boxG(4.8, 0.3, 0.8), [0, 0, -0.5]), place(boxG(0.3, 3.8, 0.8), [0, 0, -0.5]),
  ]), MAT.drone);
  const gun = new THREE.Mesh(place(cylG(0.18, 0.22, 3.6, 8), [0, -0.5, 2.6], [Math.PI / 2, 0, 0]), MAT.metal);
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#000', emissive: new THREE.Color(0.3, 0.01, 0.01) });
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), eyeMat); eye.position.set(0, 0.35, 2.55);
  const jetMat = new THREE.MeshBasicNodeMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const jetU = uniform(0);
  jetMat.colorNode = vec3(1.2, 0.45, 3.0).mul(jetU).mul(abs(normalView.z));
  const jets = [];
  for (const [x, y] of [[2.4, 0], [-2.4, 0], [0, 1.9], [0, -1.9]]) {
    const j = new THREE.Mesh(place(new THREE.CylinderGeometry(0.35, 0.05, 1.6, 8, 1, true), [0, 0, -0.8], [Math.PI / 2, 0, 0]), jetMat);
    j.position.set(x, y, -1.0); g.add(j); jets.push(j);
  }
  const light = new THREE.PointLight(new THREE.Color(1, 0.1, 0.05), 0, 60, 2); light.position.set(0, 0.4, 3.2);
  g.add(body, gun, eye, light);
  [body, gun].forEach((m) => { m.castShadow = true; });
  const ir = irMaterial(0.15);
  body.userData.ir = ir.mat; gun.userData.ir = ir.mat; eye.userData.ir = ir.mat;
  scene.add(g);
  return { g, eyeMat, light, jetU, ir };
}

function buildScav() {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(merge([
    place(boxG(5.5, 3.2, 12), [0, 0, 0]), place(boxG(3.5, 2.0, 4), [0, 1.8, 4]), place(cylG(1.6, 1.6, 6, 12), [0, -2.4, -1], [Math.PI / 2, 0, 0]),
    place(boxG(9.0, 0.5, 2.5), [0, 0, -4]),
  ]), MAT.scav);
  const metal = new THREE.Mesh(merge([
    place(bellG(1.4, 2.6), [2.8, 0, -6.0], [Math.PI / 2, 0, 0]), place(bellG(1.4, 2.6), [-2.8, 0, -6.0], [Math.PI / 2, 0, 0]),
    place(boxG(0.4, 0.4, 7), [0, 2.6, 7]), place(boxG(0.6, 0.6, 3.0), [4.3, 0, 5]), place(boxG(0.6, 0.6, 3.0), [-4.3, 0, 5]),
  ]), MAT.metal);
  const lamp = new THREE.SpotLight(new THREE.Color(1, 0.9, 0.75), 6000, 200, 0.4, 0.6, 1.8); lamp.position.set(0, 1, 8);
  const tgt = new THREE.Object3D(); tgt.position.set(0, -2, 40); g.add(tgt); lamp.target = tgt;
  const beamMat = new THREE.MeshBasicNodeMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const beamU = uniform(0);
  beamMat.colorNode = vec3(5.0, 2.2, 1.0).mul(beamU);
  const beam = new THREE.Mesh(place(new THREE.CylinderGeometry(0.1, 0.1, 1, 6, 1, true), [0, 0.5, 0], [0, 0, 0]), beamMat);
  beam.rotation.x = Math.PI / 2; beam.position.set(0, 2.6, 10.5); beam.scale.set(1, 26, 1);
  const red = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), MAT.red); red.position.set(4.6, 0, 0);
  const grn = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), MAT.green); grn.position.set(-4.6, 0, 0);
  g.add(hull, metal, lamp, beam, red, grn);
  [hull, metal].forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
  const ir = irMaterial(0.3);
  hull.userData.ir = ir.mat; metal.userData.ir = ir.mat;
  scene.add(g);
  return { g, beamU, ir };
}

// =====================================================================
//  Debris, dust, sparks, tracers
// =====================================================================
function rockGeo(seed) {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const n = makeNoise(seed), pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    tmpV.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
    const k = 0.62 + n(tmpV.x * 2 + 5, tmpV.y * 2 + tmpV.z * 1.3, 3) * 0.9;
    pos.setXYZ(i, tmpV.x * k * (1 + (seed % 3) * 0.15), tmpV.y * k * 0.8, tmpV.z * k);
  }
  g.computeVertexNormals();
  return g;
}

function buildDebris() {
  const n = LIM.rocks;
  const variants = [rockGeo(3), rockGeo(8), rockGeo(13)];
  const meshes = variants.map((geo) => {
    const m = new THREE.InstancedMesh(geo, MAT.rock, Math.ceil(n / 3) + 1);
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; m.userData.ir = IRM.rock;
    scene.add(m); return m;
  });
  const spin = [];
  const rnd = mulberry(5);
  for (let i = 0; i < n; i++) spin.push({ axis: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), rate: (rnd() - 0.5) * 0.6, ph: rnd() * 6 });
  return { meshes, spin, n };
}

function buildDust() {
  const N = 900;
  const geo = new THREE.OctahedronGeometry(0.035, 0);
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.52, 0.55) });
  const m = new THREE.InstancedMesh(geo, mat, N); m.frustumCulled = false;
  const rnd = mulberry(9); const pts = [];
  for (let i = 0; i < N; i++) pts.push(new THREE.Vector3(rnd() * 120, rnd() * 120, rnd() * 120));
  scene.add(m);
  return { m, pts, N, L: 120 };
}

function buildSparks() {
  const N = 700;
  const geo = new THREE.BoxGeometry(0.06, 0.06, 1);
  const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const m = new THREE.InstancedMesh(geo, mat, N); m.frustumCulled = false;
  m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  const list = [];
  for (let i = 0; i < N; i++) { list.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, max: 1, c: new THREE.Color() }); m.setMatrixAt(i, tmpM.makeScale(0, 0, 0)); }
  scene.add(m);
  return { m, list, next: 0, N };
}
function spawnSpark(sp, p, v, life, col) {
  const s = sp.list[sp.next]; sp.next = (sp.next + 1) % sp.N;
  s.p.copy(p); s.v.copy(v); s.life = life; s.max = life; s.c.copy(col);
}

function buildTracers(cap, color = null) {
  const geo = new THREE.BoxGeometry(0.12, 0.12, 9);
  const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  mat.colorNode = color || vec3(7.0, 2.6, 0.9);
  const m = new THREE.InstancedMesh(geo, mat, cap); m.frustumCulled = false;
  scene.add(m);
  return m;
}

// =====================================================================
//  Lights pool for impact flashes
// =====================================================================
function buildFlashes() {
  const list = [];
  for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(new THREE.Color(1, 0.6, 0.35), 0, 120, 2); scene.add(l); list.push({ l, t: 0, peak: 0 }); }
  return { list, next: 0 };
}
function flash(fl, p, peak, col) {
  const f = fl.list[fl.next]; fl.next = (fl.next + 1) % fl.list.length;
  f.l.position.copy(p); f.t = 0.25; f.peak = peak; if (col) f.l.color.copy(col);
}

// =====================================================================
//  Audio — cockpit sounds carried through the hull
// =====================================================================
const audio = { ctx: null };
function initAudio() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const loopNoise = () => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(); return s; };
    // engine rumble
    const eng = loopNoise(); const engF = ctx.createBiquadFilter(); engF.type = 'lowpass'; engF.frequency.value = 160;
    const engG = ctx.createGain(); engG.gain.value = 0; eng.connect(engF).connect(engG).connect(master);
    // RCS hiss
    const rcs = loopNoise(); const rcsF = ctx.createBiquadFilter(); rcsF.type = 'bandpass'; rcsF.frequency.value = 2400; rcsF.Q.value = 0.7;
    const rcsG = ctx.createGain(); rcsG.gain.value = 0; rcs.connect(rcsF).connect(rcsG).connect(master);
    // laser hum
    const las = ctx.createOscillator(); las.type = 'sawtooth'; las.frequency.value = 96;
    const lasF = ctx.createBiquadFilter(); lasF.type = 'lowpass'; lasF.frequency.value = 900;
    const lasG = ctx.createGain(); lasG.gain.value = 0; las.connect(lasF).connect(lasG).connect(master); las.start();
    const crk = loopNoise(); const crkF = ctx.createBiquadFilter(); crkF.type = 'highpass'; crkF.frequency.value = 3500;
    const crkG = ctx.createGain(); crkG.gain.value = 0; crk.connect(crkF).connect(crkG).connect(master);
    // ambient life support hum
    const hum = ctx.createOscillator(); hum.type = 'sine'; hum.frequency.value = 58; const humG = ctx.createGain(); humG.gain.value = 0.035; hum.connect(humG).connect(master); hum.start();
    // tether creak
    const teth = ctx.createOscillator(); teth.type = 'triangle'; teth.frequency.value = 40; const tethG = ctx.createGain(); tethG.gain.value = 0; teth.connect(tethG).connect(master); teth.start();
    // spool whine
    const spool = ctx.createOscillator(); spool.type = 'sine'; spool.frequency.value = 200; const spoolG = ctx.createGain(); spoolG.gain.value = 0; spool.connect(spoolG).connect(master); spool.start();
    Object.assign(audio, { ctx, master, noiseBuf, engG, engF, rcsG, lasG, crkG, tethG, teth, spoolG, spool, humG });
  } catch { audio.ctx = null; }
}
function thud(gain = 0.6, freq = 180) {
  if (!audio.ctx) return;
  const { ctx, master, noiseBuf } = audio;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.setValueAtTime(gain, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  s.connect(f).connect(g).connect(master); s.start(); s.stop(ctx.currentTime + 0.6);
}
function beep(freq = 880, dur = 0.08, gain = 0.12, type = 'square') {
  if (!audio.ctx) return;
  const { ctx, master } = audio;
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
  const g = ctx.createGain(); g.gain.setValueAtTime(gain, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  o.connect(g).connect(master); o.start(); o.stop(ctx.currentTime + dur + 0.02);
}
function setA(param, v, k = 0.06) { if (audio.ctx) param.setTargetAtTime(v, audio.ctx.currentTime, k); }

// =====================================================================
//  Input
// =====================================================================
const keys = new Set();
const mouse = { lmb: false, rmbEdge: false, stickX: 0, stickY: 0, locked: false, fallback: false, mx: 0, my: 0 };
const toggles = { ir: false, flood: true, assist: true, help: false, tac: false };
const tac = { yaw: 0.6, pitch: 0.95, dist: 650, sel: null, drag: null, serial: 0, mode: 0, quiet: 0, label: '' };
let camDist = 24;

function bindInput() {
  const el = renderer.domElement;
  window.addEventListener('keydown', (e) => {
    if (!game.running) return;
    if (e.code === 'Escape') { e.preventDefault(); if (game.paused) resumeGame(); else pauseGame(); return; }
    if (game.paused) return;
    if (['Space', 'Tab'].includes(e.code)) e.preventDefault();
    if (e.repeat && e.code === 'Tab') return;
    keys.add(e.code);
    if (e.code === 'Tab') setTactical(!toggles.tac);
    if (toggles.tac && !e.repeat) {
      if (e.code === 'Digit1') issueOrder(1, 0);
      if (e.code === 'Digit2') issueOrder(1, 1);
      if (e.code === 'Digit3') issueOrder(2, 0);
      if (e.code === 'Digit4') issueOrder(3, 0);
    }
    if (e.code === 'KeyV') setIR(!toggles.ir);
    if (e.code === 'KeyL') { toggles.flood = !toggles.flood; msg(toggles.flood ? 'Floodlight on' : 'Floodlight off'); }
    if (e.code === 'KeyZ') { toggles.assist = !toggles.assist; msg(toggles.assist ? 'Flight assist ON — mouse sets rotation rate' : 'Flight assist OFF — mouse fires RCS torque directly', 'a'); }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); mouse.lmb = false; });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('mousedown', (e) => {
    if (!game.running || game.paused) return;
    if (toggles.tac) { tac.drag = { x: e.clientX, y: e.clientY, yaw: tac.yaw, pitch: tac.pitch, moved: false, button: e.button }; return; }
    if (!mouse.locked && !mouse.fallback && !DBG.has('nolock')) { requestLock(); }
    if (e.button === 0) mouse.lmb = true;
    if (e.button === 2) mouse.rmbEdge = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.lmb = false;
    if (toggles.tac && tac.drag) { if (!tac.drag.moved && tac.drag.button === 0) tacPick(e.clientX, e.clientY); tac.drag = null; }
  });
  window.addEventListener('mousemove', (e) => {
    if (toggles.tac) {
      mouse.mx = e.clientX; mouse.my = e.clientY;
      if (tac.drag) {
        const dx = e.clientX - tac.drag.x, dy = e.clientY - tac.drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 5) tac.drag.moved = true;
        if (tac.drag.moved) { tac.yaw = tac.drag.yaw - dx * 0.006; tac.pitch = THREE.MathUtils.clamp(tac.drag.pitch + dy * 0.005, 0.15, 1.5); }
      }
      return;
    }
    if (mouse.locked) {
      mouse.stickX = THREE.MathUtils.clamp(mouse.stickX + e.movementX * 0.0032, -1, 1);
      mouse.stickY = THREE.MathUtils.clamp(mouse.stickY + e.movementY * 0.0032, -1, 1);
      const l = Math.hypot(mouse.stickX, mouse.stickY); if (l > 1) { mouse.stickX /= l; mouse.stickY /= l; }
    } else { mouse.mx = e.clientX; mouse.my = e.clientY; }
  });
  el.addEventListener('wheel', (e) => {
    if (toggles.tac) tac.dist = THREE.MathUtils.clamp(tac.dist * (1 + Math.sign(e.deltaY) * 0.12), 120, 4000);
    else camDist = THREE.MathUtils.clamp(camDist * (1 + Math.sign(e.deltaY) * 0.1), 12, 80);
  }, { passive: true });
  document.querySelectorAll('#tacpanel button[data-o]').forEach((b) => b.addEventListener('click', () => {
    const o = b.dataset.o; if (o === 'fast') issueOrder(1, 0); else if (o === 'quiet') issueOrder(1, 1); else if (o === 'match') issueOrder(2, 0); else if (o === 'stop') issueOrder(3, 0); else if (o === 'manual') setTactical(false);
  }));
  document.addEventListener('pointerlockchange', () => {
    mouse.locked = document.pointerLockElement === el;
    // the browser spends the first Esc on releasing the mouse; treat that as a pause request
    if (!mouse.locked && game.running && !game.paused && !game.over && !toggles.tac && performance.now() > (game.ignoreUnlockUntil || 0)) pauseGame();
  });
  $('resume').addEventListener('click', () => resumeGame());
  $('abandon').addEventListener('click', () => { $('pause').hidden = true; game.paused = false; game.running = false; game.over = false; $('hud').hidden = true; if (audio.ctx) audio.ctx.resume?.(); SAVE.runs++; persist(); showHub('missions'); });
}
function requestLock() {
  const el = renderer.domElement;
  try {
    const p = el.requestPointerLock && el.requestPointerLock();
    if (p && p.catch) p.catch(() => { mouse.fallback = true; msg('Pointer capture unavailable — steering follows the cursor offset from centre', 'a'); });
  } catch { mouse.fallback = true; }
}

function readInput(dt) {
  const k = (c) => (keys.has(c) ? 1 : 0);
  input[IN.THRUST] = k('KeyW') - k('KeyS');
  input[IN.SX] = k('KeyD') - k('KeyA');
  input[IN.SY] = k('KeyR') - k('KeyF');
  input[IN.ROLL] = k('KeyE') - k('KeyQ');
  let sx = mouse.stickX, sy = mouse.stickY;
  // any manual flight input takes the ship back from the autopilot
  const manualKeys = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyR', 'KeyF', 'KeyQ', 'KeyE', 'KeyX'].some((c) => keys.has(c));
  const manualStick = !toggles.tac && mouse.locked && Math.hypot(mouse.stickX, mouse.stickY) > 0.3;
  if ((manualKeys || manualStick) && input[IN.AP_MODE] > 0) cancelOrder('Manual control — autopilot off');
  if (toggles.tac) {
    input[IN.YAW] = 0; input[IN.PITCH] = 0; input[IN.LASER] = 0; input[IN.HARPOON] = 0; mouse.rmbEdge = false;
    input[IN.REEL] = k('Space'); input[IN.PAYOUT] = k('ShiftLeft') || k('ShiftRight') ? 1 : 0;
    input[IN.KILLV] = k('KeyX'); input[IN.RAD] = k('KeyT'); input[IN.COLD] = k('KeyC'); input[IN.JUMP] = k('KeyJ'); input[IN.EJECT] = k('KeyG');
    input[IN.FIRE] = k('KeyB'); input[IN.PD] = k('KeyP');
    input[IN.ASSIST] = toggles.assist ? 1 : 0;
    return { sx: 0, sy: 0 };
  }
  if (!mouse.locked) {
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    sx = mouse.fallback ? THREE.MathUtils.clamp((mouse.mx - cx) / (cx * 0.6), -1, 1) : 0;
    sy = mouse.fallback ? THREE.MathUtils.clamp((mouse.my - cy) / (cy * 0.6), -1, 1) : 0;
  } else {
    // soft re-centre so the stick doesn't stay pegged
    const decay = Math.exp(-dt * 1.4); mouse.stickX *= decay; mouse.stickY *= decay;
  }
  const dz = (v) => (Math.abs(v) < 0.04 ? 0 : v);
  input[IN.YAW] = dz(sx);
  input[IN.PITCH] = -dz(sy);
  input[IN.LASER] = mouse.lmb ? 1 : 0;
  input[IN.HARPOON] = mouse.rmbEdge ? 1 : 0; mouse.rmbEdge = false;
  input[IN.REEL] = k('Space');
  input[IN.PAYOUT] = k('ShiftLeft') || k('ShiftRight') ? 1 : 0;
  input[IN.KILLV] = k('KeyX');
  input[IN.RAD] = k('KeyT');
  input[IN.COLD] = k('KeyC');
  input[IN.JUMP] = k('KeyJ');
  input[IN.EJECT] = k('KeyG');
  input[IN.FIRE] = k('KeyB');
  input[IN.PD] = k('KeyP');
  input[IN.ASSIST] = toggles.assist ? 1 : 0;
  return { sx, sy };
}

// =====================================================================
//  HUD
// =====================================================================
const msgs = [];
function msg(text, cls = '') {
  const el = document.createElement('div'); el.className = `msg ${cls}`; el.textContent = text;
  $('msgs').prepend(el); msgs.push({ el, t: 6 });
  while ($('msgs').children.length > 4) $('msgs').lastChild.remove();
}
const labelPool = [];
function getLabel(i) {
  while (labelPool.length <= i) { const el = document.createElement('div'); el.className = 'lbl'; $('labels').appendChild(el); labelPool.push({ el, html: '' }); }
  return labelPool[i];
}
function project(p) {
  tmpV2.copy(p).project(camera);
  if (tmpV2.z > 1) return null;
  return [(tmpV2.x * 0.5 + 0.5) * window.innerWidth, (-tmpV2.y * 0.5 + 0.5) * window.innerHeight];
}

// =====================================================================
//  Game state
// =====================================================================
const game = { running: false, over: false, acc: 0, last: 0, shake: 0, runSeed: 0, mode: 'boot' };
let TRACERS_OURS;
let SHIP, WRECKS = [], PARTS = [], DRONES = [], SCAVS = [], DEBRIS, DUST, SPARKS, TRACERS, FLASH, LASER, TETHER, HARPOON, PLANET, SUN;
let sunDir, planetDir;

function buildLaser() {
  const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const u = uniform(0);
  mat.colorNode = vec3(1.2, 2.6, 4.2).mul(u).mul(abs(normalView.z).pow(0.5));
  const beam = new THREE.Mesh(place(new THREE.CylinderGeometry(0.09, 0.09, 1, 8, 1, true), [0, 0.5, 0]), mat);
  beam.frustumCulled = false;
  const glow = new THREE.Mesh(place(new THREE.CylinderGeometry(0.35, 0.35, 1, 10, 1, true), [0, 0.5, 0]), mat);
  glow.frustumCulled = false;
  const hit = new THREE.PointLight(new THREE.Color(0.9, 0.95, 1), 0, 45, 2);
  const hot = new THREE.PointLight(new THREE.Color(1, 0.5, 0.2), 0, 30, 2);
  scene.add(beam, glow, hit, hot);
  return { beam, glow, u, hit, hot };
}
function buildTether() {
  const cable = new THREE.Mesh(place(new THREE.CylinderGeometry(0.07, 0.07, 1, 6, 1, true), [0, 0.5, 0]), MAT.cable);
  cable.frustumCulled = false;
  const head = new THREE.Mesh(place(new THREE.ConeGeometry(0.35, 1.4, 8), [0, 0.7, 0]), MAT.metal);
  scene.add(cable, head);
  return { cable, head };
}

function setIR(on) {
  toggles.ir = on;
  scene.traverse((o) => {
    if (!o.isMesh || !o.userData.ir) return;
    if (on) { if (!o.userData.vis) o.userData.vis = o.material; o.material = o.userData.ir; }
    else if (o.userData.vis) o.material = o.userData.vis;
  });
  scene.backgroundIntensity = on ? 0.0 : 1.0;
  scene.environmentIntensity = on ? 0.0 : 0.55;
  SUN.visible = !on;
  $('irlegend').hidden = !on;
  $('scan').style.opacity = on ? 1 : 0;
  if (world.bloom) world.bloom.strength.value = on ? 0.9 : GFX.bloomStrength;
  msg(on ? 'Passive IR view — colour is temperature' : 'Visual', on ? 's' : '');
}

async function newRun(zone = 0) {
  game.runSeed = (Date.now() & 0x7fffffff) || 1;
  // Fixed battlefield layout for this prototype; the seed varies the parts.
  core.initZone(game.runSeed, zone);
  game.zone = zone;
  game.field = { c: new THREE.Vector3(core.fieldX(), core.fieldY(), core.fieldZ()), r: core.fieldRadius() };
  $('zone').textContent = zone === 1 ? "HALVARD'S WAKE" : 'THULE GAP';
  bindViews();
  clearWorld();
  WRECKS = [];
  const nr = mulberry(game.runSeed); const names = HULL_NAMES.slice().sort(() => nr() - 0.5);
  for (let w = 0; w < core.wreckCount(); w++) WRECKS.push(buildWreck(w, names));
  rebuildParts();
  DRONES = []; for (let d = 0; d < core.droneCount(); d++) DRONES.push(buildDrone());
  SCAVS = []; for (let c = 0; c < core.scavCount(); c++) SCAVS.push(buildScav());
  game.over = false; game.acc = 0;
  tac.serial = 0; tac.mode = 0; tac.sel = null;
  game.stats = { detached: 0, stowed: [], cells: 0, hits: 0, wakes: 0 };
  if (toggles.ir) setIR(true);
}
const PROTOS = [];
function rebuildParts() {
  for (const p of PARTS) scene.remove(p.g);
  PARTS = [];
  for (let i = 0; i < core.partCount(); i++) addPartVisual(i);
}
function addPartVisual(i) {
  const type = parts[i * P.N + P.TYPE] | 0;
  if (!PROTOS[type]) PROTOS[type] = partPrototype(type);
  const g = PROTOS[type].clone();
  // glowing cut seam at the base
  const seamMat = new THREE.MeshStandardMaterial({ color: '#111', emissive: new THREE.Color(0, 0, 0), roughness: 0.5 });
  const pr = parts[i * P.N + P.RAD];
  const seam = new THREE.Mesh(new THREE.TorusGeometry(pr * 0.75, 0.12, 6, 28), seamMat); seam.rotation.x = Math.PI / 2; seam.position.y = 0.1;
  g.add(seam);
  const ir = irMaterial(0.06);
  g.traverse((o) => { if (o.isMesh) o.userData.ir = ir.mat; });
  if (toggles.ir) g.traverse((o) => { if (o.isMesh) { o.userData.vis = o.material; o.material = ir.mat; } });
  scene.add(g);
  const wi = parts[i * P.N + P.WRECK] | 0;
  PARTS[i] = { g, seamMat, ir, type, prov: wi >= 0 ? (WRECKS[wi]?.name ?? 'unknown hulk') : 'a drone carcass', wreck: wi };
}
function clearWorld() {
  for (const w of WRECKS) scene.remove(w.grp);
  for (const p of PARTS) scene.remove(p.g);
  for (const d of DRONES) scene.remove(d.g);
  for (const c of SCAVS) scene.remove(c.g);
}

// =====================================================================
//  Event handling (from the core's ring buffer)
// =====================================================================
function handleEvents() {
  const n = core.eventCount();
  for (let i = 0; i < n; i++) {
    const t = events[i * 6] | 0;
    const p = tmpV.set(events[i * 6 + 1], events[i * 6 + 2], events[i * 6 + 3]).clone();
    const a = events[i * 6 + 4], b = events[i * 6 + 5];
    switch (t) {
      case E.DETACH: {
        const info = PART_INFO[a | 0];
        msg(`${info.name} cut free — harpoon it (RMB) and reel in (Space)`, info.weapon ? 'r' : 'a');
        game.stats.detached++; thud(0.5, 260);
        for (let k = 0; k < 40; k++) spawnSpark(SPARKS, p, new THREE.Vector3().randomDirection().multiplyScalar(6 + Math.random() * 14), 0.6 + Math.random(), new THREE.Color(4, 1.6, 0.5));
        break;
      }
      case E.STOW: {
        const info = PART_INFO[parts[(b | 0) * P.N + P.TYPE] | 0];
        msg(`${info.name} stowed · +${(a / 1000).toFixed(1)} t`, 's'); thud(0.7, 140); beep(660, 0.06, 0.06, 'sine');
        game.stats.stowed.push(b | 0);
        break;
      }
      case E.JUMPCELL: msg(`Jump cell transferred · fuel ${a.toFixed(2)}`, 'c'); beep(990, 0.12, 0.08, 'sine'); game.stats.cells++; break;
      case E.IMPACT: {
        game.shake = Math.min(1.2, game.shake + a * 0.06); thud(Math.min(1, 0.3 + a * 0.05), 220);
        $('hitflash').style.opacity = Math.min(1, a * 0.08); game.stats.hits++;
        for (let k = 0; k < 18; k++) spawnSpark(SPARKS, p, new THREE.Vector3().randomDirection().multiplyScalar(4 + Math.random() * 10), 0.5 + Math.random() * 0.6, new THREE.Color(3, 1.4, 0.6));
        flash(FLASH, p, 2500);
        break;
      }
      case E.DRONE_WAKE: game.stats.wakes++; msg('Drone awake — it will hunt your heat. Burn away hard to dodge, or go cold behind a hulk.', 'r'); beep(440, 0.25, 0.15, 'sawtooth'); break;
      case E.DRONE_STIR: msg(`A dormant drone ${fmtDist(b)} away is picking up your heat — throttle down`, 'a'); beep(620, 0.12, 0.08, 'triangle'); break;
      case E.DRONE_DRY: msg('Drone magazine empty — it is withdrawing', 's'); break;
      case E.AP_ARRIVED: msg(b < 0 ? 'All stop — holding position' : 'Arrived — holding station. Tab for manual control.', 's'); beep(880, 0.08, 0.06, 'sine'); break;
      case E.AP_CANCEL: msg('Target lost — autopilot off', 'a'); tac.mode = 0; break;
      case E.DRONE_REACQ: msg('Drone reacquired your heat', 'r'); beep(520, 0.15, 0.12, 'sawtooth'); break;
      case E.DRONE_LOST: msg('Drone lost your track — it is searching your last position', 's'); break;
      case E.DRONE_DEAD: msg('Drone disabled — its turret is loose salvage', 's'); thud(0.9, 120); flash(FLASH, p, 6000);
        for (let k = 0; k < 80; k++) spawnSpark(SPARKS, p, new THREE.Vector3().randomDirection().multiplyScalar(5 + Math.random() * 25), 0.8 + Math.random() * 1.2, new THREE.Color(5, 2, 0.6));
        addPartVisual(core.partCount() - 1);
        break;
      case E.SLUG_FIRED: flash(FLASH, p, 1500, new THREE.Color(1, 0.4, 0.2)); break;
      case E.SLUG_HIT: msg('Kinetic hit', 'r'); break;
      case E.HARPOON_HIT: msg(a === 1 ? 'Harpoon set in salvage' : a === 2 ? 'Harpoon anchored to hull — reel to pull yourself in' : 'Harpoon in the drone', 'a'); thud(0.35, 400); break;
      case E.HARPOON_MISS: msg('Harpoon missed — line reeled back'); break;
      case E.TETHER_SNAP: msg('Tether snapped under load', 'r'); thud(0.6, 600); break;
      case E.FLARE_WARN: msg('Solar particle event forecast — protons arrive in 90 s. Shelter behind a hulk.', 'a'); beep(700, 0.3, 0.1, 'triangle'); break;
      case E.FLARE_START: msg('Particle storm — unshielded crew dose ~2.5 mSv/s, electronics may upset', 'r'); beep(300, 0.5, 0.14, 'sawtooth'); break;
      case E.FLARE_END: msg('Particle storm has passed', 's'); break;
      case E.UPSET:
        if ((a | 0) === 1) { game.sensorBlank = 3; msg('Radiation upset — passive sensors rebooting', 'r'); }
        else msg('Radiation upset tripped the laser controller', 'r');
        beep(240, 0.15, 0.1, 'square'); break;
      case E.OVERHEAT: msg('Laser head overheated — cooling to 720 K', 'r'); beep(330, 0.2, 0.12); break;
      case E.SPOOL_START: msg('Jump drive spooling — 9 s. Damage will abort it.', 'c'); break;
      case E.SPOOL_ABORT: msg(a === 1 ? 'Cannot spool while running cold' : 'Jump spool aborted', 'r'); break;
      case E.NO_FUEL: msg(`Not enough jump fuel: ${a.toFixed(2)} of ${b.toFixed(2)} needed. Shed mass or find cells.`, 'r'); beep(220, 0.3, 0.12); break;
      case E.RAD_DAMAGE: msg(`Radiator hit — capacity ${(a * 100).toFixed(0)}%`, 'r'); break;
      case E.EJECT: msg(`Cargo jettisoned · −${(a / 1000).toFixed(1)} t`); break;
      case E.CARGO_FULL: msg(b < 0 ? 'Hold full — no room for that scrap' : 'Cargo hold full — jettison something (G)', 'r'); break;
      case E.COLD_ON: msg('Running cold: reactor idle, laser and drive offline', 'c'); break;
      case E.COLD_OFF: msg('Reactor back to normal output'); break;
      case E.RAD_TOGGLE: msg(a > 0.5 ? 'Radiators deploying' : 'Radiators folding — protected, but heat will climb', a > 0.5 ? '' : 'a'); break;
      case E.SPARK: {
        const eff = b;
        for (let k = 0; k < 3; k++) spawnSpark(SPARKS, p, new THREE.Vector3().randomDirection().multiplyScalar(3 + Math.random() * 9 * eff), 0.25 + Math.random() * 0.5, new THREE.Color(4 * eff + 1, 1.8, 0.6));
        break;
      }
      case E.PD_FIRE: game.pdBeat = (game.pdBeat || 0) + 1; if (game.pdBeat % 6 === 0) beep(180 + Math.random() * 60, 0.03, 0.05, 'square'); break;
      case E.COIL_FIRE:
        if (a > 0) { thud(1, 70); game.shake = Math.min(1.5, game.shake + 0.8); flash(FLASH, p, 9000, new THREE.Color(0.6, 0.8, 1)); for (let k = 0; k < 30; k++) spawnSpark(SPARKS, p, new THREE.Vector3().randomDirection().multiplyScalar(4 + Math.random() * 12), 0.4, new THREE.Color(2, 3, 6)); }
        else if (a === -1) msg('Coilgun offline while running cold', 'a');
        else if (a === -2) msg(`Coilgun charging · ${b.toFixed(1)} s`, 'a');
        else msg('No coilgun fitted — install one in the hangar', 'a');
        break;
      case E.INTERCEPT: for (let k = 0; k < 14; k++) spawnSpark(SPARKS, p, new THREE.Vector3().randomDirection().multiplyScalar(6 + Math.random() * 18), 0.4, new THREE.Color(4, 3.4, 1.4)); flash(FLASH, p, 1200, new THREE.Color(1, 0.9, 0.6)); break;
      case E.DRONE_HIT: for (let k = 0; k < (b === 2 ? 40 : 4); k++) spawnSpark(SPARKS, p, new THREE.Vector3().randomDirection().multiplyScalar(5 + Math.random() * 14), 0.35, new THREE.Color(5, 2, 0.7)); break;
      case E.SCRAP: msg(`Scrap aboard · +${(a / 1000).toFixed(1)} t (${(b / 1000).toFixed(1)} t total)`, 's'); thud(0.6, 150); break;
      case E.PD_TOGGLE: msg(a > 0.5 ? 'Point defense: AUTO' : 'Point defense: OFF — holding fire', a > 0.5 ? 's' : 'a'); break;
      case E.EXTRACTED: endRun(true); break;
      case E.DIED: endRun(false, a | 0); break;
      default: break;
    }
  }
  core.clearEvents();
}

// =====================================================================
//  Per-frame visual sync
// =====================================================================
const qShip = new THREE.Quaternion(), pShip = new THREE.Vector3(), vShip = new THREE.Vector3();
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), camUp = new THREE.Vector3(0, 1, 0);
const _c = new THREE.Color();

function syncVisuals(dt, t) {
  getV(ship, S.POS, pShip); getQ(ship, S.QUAT, qShip); getV(ship, S.VEL, vShip);
  const alive = (ship[S.STATE] | 0) === 0;
  SHIP.grp.position.copy(pShip); SHIP.grp.quaternion.copy(qShip);
  SHIP.grp.visible = (ship[S.STATE] | 0) !== 1;

  // radiators fold: deploy 0 → panel rotated up flat against the hull
  const dep = ship[S.RAD_DEPLOY];
  for (const r of SHIP.radiators) r.pivot.rotation.z = r.side * (1 - dep) * r.fold;
  heatColor(ship[S.BUS_T] + 60, _c); SHIP.radMat.emissive.copy(_c).multiplyScalar(0.8 + dep * 0.4);
  const thr = ship[S.THROTTLE];
  SHIP.plumeU.value += ((thr > 0.01 ? 0.6 + thr * 0.8 : 0) - SHIP.plumeU.value) * Math.min(1, dt * 10);
  for (const nz of SHIP.nozzles) {
    const pl = (3 + thr * 22) * (nz.r / 1.5);
    nz.plume.scale.set(1, 1, pl); nz.core2.scale.set(1, 1, pl * 0.6);
    nz.plume.visible = nz.core2.visible = SHIP.plumeU.value > 0.02;
  }
  SHIP.engineLight.intensity = SHIP.plumeU.value * 1600 * SHIP.camScale;
  heatColor(300 + thr * 900 + (ship[S.BUS_T] - 300), _c); SHIP.bellInMat.emissive.copy(_c);
  if (SHIP.flood) SHIP.flood.intensity = toggles.flood && alive && ship[S.COLD] < 0.5 ? 9000 * SHIP.camScale : 0;
  SHIP.strobe.material.emissive.setScalar(((t * 1.2) % 1) < 0.06 && ship[S.COLD] < 0.5 ? 12 : 0);
  // IR heat values
  const hb = THREE.MathUtils.clamp((ship[S.BUS_T] - 200) / 900, 0, 1);
  SHIP.ir.hull.u.value = 0.18 + hb * 0.9;
  SHIP.ir.rad.u.value = (0.15 + hb * 1.1) * (0.35 + dep * 0.65);
  SHIP.ir.bell.u.value = 0.2 + hb * 0.8 + thr * 0.9;

  // RCS puffs
  const rcs = getV(ship, S.RCS, tmpV2);
  if (alive && rcs.lengthSq() > 0.01 && Math.random() < 0.7) {
    const dirB = rcs.clone().negate().normalize();
    const origin = SHIP.rcsPts[Math.floor(Math.random() * SHIP.rcsPts.length)].clone();
    const wp = origin.applyQuaternion(qShip).add(pShip);
    const wv = dirB.applyQuaternion(qShip).multiplyScalar(14 * Math.sqrt(SHIP.camScale)).add(vShip);
    spawnSpark(SPARKS, wp, wv, 0.25 * Math.sqrt(SHIP.camScale), new THREE.Color(0.7, 0.75, 0.8));
  }

  if (MAT.beacon) { const ph = (t * 0.7) % 1; MAT.beacon.emissive.setRGB(ph < 0.08 ? 9 : 0.15, 0.05, 0.02); }
  // wrecks
  for (let w = 0; w < WRECKS.length; w++) {
    WRECKS[w].grp.position.set(wrecks[w * W.N], wrecks[w * W.N + 1], wrecks[w * W.N + 2]);
    WRECKS[w].grp.quaternion.set(wrecks[w * W.N + 6], wrecks[w * W.N + 7], wrecks[w * W.N + 8], wrecks[w * W.N + 9]);
  }
  // parts
  for (let i = 0; i < PARTS.length; i++) {
    const vis = PARTS[i]; if (!vis) continue;
    const o = i * P.N; const st = parts[o + P.STATE] | 0;
    vis.g.visible = st !== PS.CARGO && st !== PS.GONE && (parts[o + P.POS] - camera.position.x) ** 2 + (parts[o + P.POS + 1] - camera.position.y) ** 2 + (parts[o + P.POS + 2] - camera.position.z) ** 2 < 1.6e6;
    if (!vis.g.visible) continue;
    vis.g.position.set(parts[o + P.POS], parts[o + P.POS + 1], parts[o + P.POS + 2]);
    vis.g.quaternion.set(parts[o + P.QUAT], parts[o + P.QUAT + 1], parts[o + P.QUAT + 2], parts[o + P.QUAT + 3]);
    const cut = parts[o + P.CUT], heat = parts[o + P.HEAT];
    const seamGlow = st === PS.ATTACHED ? cut * 6 + heat * 1.5 : Math.max(0, heat * 2.0);
    vis.seamMat.emissive.setRGB(seamGlow * 1.0, seamGlow * 0.35, seamGlow * 0.08);
    vis.ir.u.value = 0.06 + heat * 0.7 + (st === PS.ATTACHED ? cut * 0.5 : 0) + (vis.type === 5 ? 0.25 : 0) + (vis.type === 7 ? 0.12 : 0);
  }
  // drones
  for (let d = 0; d < DRONES.length; d++) {
    const o = d * D.N; const v = DRONES[d]; const st = drones[o + D.STATE] | 0;
    v.g.position.set(drones[o], drones[o + 1], drones[o + 2]);
    v.g.quaternion.set(drones[o + D.QUAT], drones[o + D.QUAT + 1], drones[o + D.QUAT + 2], drones[o + D.QUAT + 3]);
    const alert = drones[o + D.ALERT];
    const pulse = st === DS.HUNTING ? 0.7 + 0.3 * Math.sin(t * 9) : 1;
    const eye = st === DS.DEAD ? 0 : (st === DS.DORMANT ? 0.25 + 0.15 * Math.sin(t * 0.8 + d) : 2 + alert * 10 * pulse);
    v.eyeMat.emissive.setRGB(eye, eye * 0.05, eye * 0.03);
    v.light.intensity = st === DS.DEAD ? 0 : (drones[o + D.FLASH] > 0 ? 6000 : alert * 400);
    const sp = Math.hypot(drones[o + 3], drones[o + 4], drones[o + 5]);
    v.jetU.value = st === DS.DEAD || st === DS.DORMANT ? 0 : Math.min(1.5, 0.3 + sp * 0.03);
    v.ir.u.value = st === DS.DEAD ? 0.15 : 0.12 + alert * 0.65;
  }
  // scavengers
  for (let c = 0; c < SCAVS.length; c++) {
    const o = c * C.N, v = SCAVS[c];
    v.g.position.set(scavs[o], scavs[o + 1], scavs[o + 2]);
    v.g.quaternion.set(scavs[o + C.QUAT], scavs[o + C.QUAT + 1], scavs[o + C.QUAT + 2], scavs[o + C.QUAT + 3]);
    v.beamU.value = scavs[o + C.WORK] > 0.5 && Math.sin(t * 2 + c) > -0.2 ? 1 + Math.random() * 0.3 : 0;
    v.ir.u.value = 0.2 + Math.min(0.6, scavs[o + C.SIG] * 0.06);
  }
  // debris
  const n = core.rockCount();
  const counts = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const o = i * R.N; const s = DEBRIS.spin[i]; const vi = i % 3;
    tmpQ.setFromAxisAngle(s.axis, s.ph + t * s.rate);
    const r = rocks[o + R.RAD];
    tmpM.compose(tmpV.set(rocks[o], rocks[o + 1], rocks[o + 2]), tmpQ, tmpV2.set(r, r, r));
    DEBRIS.meshes[vi].setMatrixAt(counts[vi]++, tmpM);
  }
  DEBRIS.meshes.forEach((m, i) => { m.count = counts[i]; m.instanceMatrix.needsUpdate = true; });

  // slugs
  let sc = 0, oc = 0;
  for (let i = 0; i < core.slugCap(); i++) {
    const o = i * G.N; if (slugs[o + G.ACTIVE] < 0.5) continue;
    tmpV.set(slugs[o], slugs[o + 1], slugs[o + 2]);
    tmpV2.set(slugs[o + 3], slugs[o + 4], slugs[o + 5]).normalize();
    tmpQ.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tmpV2);
    const ours = slugs[o + G.OWNER] > 0.5;
    const kind = slugs[o + G.KIND] | 0;
    tmpM.compose(tmpV, tmpQ, ours ? (kind === 2 ? new THREE.Vector3(2.2, 2.2, 6) : new THREE.Vector3(0.45, 0.45, 1.4)) : new THREE.Vector3(1, 1, 1));
    if (ours) TRACERS_OURS.setMatrixAt(oc++, tmpM); else TRACERS.setMatrixAt(sc++, tmpM);
  }
  TRACERS.count = sc; TRACERS.instanceMatrix.needsUpdate = true;
  TRACERS_OURS.count = oc; TRACERS_OURS.instanceMatrix.needsUpdate = true;

  // laser beam
  const lon = ship[S.LASER_ON] > 0.5 && alive;
  LASER.beam.visible = LASER.glow.visible = lon;
  if (lon) {
    const nose = SHIP.laserLocal.clone().applyQuaternion(qShip).add(pShip);
    const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(qShip);
    const L = ship[S.LASER_DIST];
    const end = nose.clone().addScaledVector(dir, L);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    for (const m of [LASER.beam, LASER.glow]) { m.position.copy(nose); m.quaternion.copy(q); m.scale.set(1, L, 1); }
    LASER.u.value = 1.6 + Math.random() * 0.5;
    const hitType = ship[S.LASER_TYPE] | 0;
    LASER.hit.position.copy(end).addScaledVector(dir, -1.5); LASER.hit.intensity = hitType ? 260 : 0;
    LASER.hot.position.copy(end); LASER.hot.intensity = hitType ? 160 : 0;
  } else { LASER.hit.intensity = 0; LASER.hot.intensity = 0; }

  // harpoon & tether
  const hs = ship[S.HARP_STATE] | 0;
  TETHER.cable.visible = TETHER.head.visible = hs !== 0 && alive;
  if (hs !== 0) {
    const nose = SHIP.harpLocal.clone().applyQuaternion(qShip).add(pShip);
    const hp = getV(ship, S.HARP_POS);
    const d = hp.clone().sub(nose); const L = Math.max(0.01, d.length());
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    TETHER.cable.position.copy(nose); TETHER.cable.quaternion.copy(q); TETHER.cable.scale.set(1, L, 1);
    TETHER.head.position.copy(hp); TETHER.head.quaternion.copy(q);
    const tension = ship[S.TETH_TENSION];
    TETHER.cable.material.emissive?.setRGB(tension > 3e5 ? 0.6 : 0, 0, 0);
  }

  // sparks
  for (let i = 0; i < SPARKS.N; i++) {
    const s = SPARKS.list[i];
    if (s.life <= 0) { SPARKS.m.setMatrixAt(i, tmpM.makeScale(0, 0, 0)); continue; }
    s.life -= dt; s.p.addScaledVector(s.v, dt);
    const k = Math.max(0, s.life / s.max);
    const sp = s.v.length();
    tmpQ.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tmpV.copy(s.v).normalize());
    tmpM.compose(s.p, tmpQ, tmpV2.set(1, 1, Math.max(0.2, sp * 0.04)));
    SPARKS.m.setMatrixAt(i, tmpM);
    SPARKS.m.setColorAt(i, _c.copy(s.c).multiplyScalar(k));
  }
  SPARKS.m.instanceMatrix.needsUpdate = true; SPARKS.m.instanceColor.needsUpdate = true;

  // impact flashes
  for (const f of FLASH.list) { f.t = Math.max(0, f.t - dt); f.l.intensity = f.peak * (f.t / 0.25) ** 2; }
}

const camRel = new THREE.Vector3(), lookRel = new THREE.Vector3();
function updateCamera(dt) {
  // offsets are smoothed relative to the ship, so the camera never lags behind at speed
  let wantPos, wantLook, wantUp;
  if (toggles.tac) {
    const cp = Math.cos(tac.pitch);
    wantPos = new THREE.Vector3(Math.sin(tac.yaw) * cp, Math.sin(tac.pitch), -Math.cos(tac.yaw) * cp).multiplyScalar(tac.dist);
    wantLook = new THREE.Vector3(0, 0, 0);
    wantUp = new THREE.Vector3(0, 1, 0);
  } else {
    const cs = SHIP ? SHIP.camScale : 1;
    wantPos = new THREE.Vector3(0, 6.5 * cs, -camDist * cs).applyQuaternion(qShip);
    wantLook = new THREE.Vector3(0, 2.2 * cs, 26 * cs).applyQuaternion(qShip);
    wantUp = new THREE.Vector3(0, 1, 0).applyQuaternion(qShip);
  }
  const k = 1 - Math.exp(-dt * (toggles.tac || game.camBlend > 0 ? 4 : 7));
  if (game.camBlend > 0) game.camBlend -= dt;
  if (!game.camInit) { camRel.copy(wantPos); lookRel.copy(wantLook); camUp.copy(wantUp); game.camInit = true; }
  camRel.lerp(wantPos, k); lookRel.lerp(wantLook, 1 - Math.exp(-dt * 10)); camUp.lerp(wantUp, k).normalize();
  camPos.copy(pShip).add(camRel); camLook.copy(pShip).add(lookRel);
  camera.position.copy(camPos);
  if (game.shake > 0.001) {
    camera.position.add(new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(game.shake * 0.9));
    game.shake *= Math.exp(-dt * 5);
  }
  camera.up.copy(camUp); camera.lookAt(camLook);
  // sky objects ride with the camera (effectively at infinity)
  PLANET.grp.position.copy(camera.position).addScaledVector(planetDir, 26000);
  SUN.position.copy(camera.position).addScaledVector(sunDir, 30000);
  // sun shadow frustum follows the ship
  sunLight.position.copy(pShip).addScaledVector(sunDir, 600);
  sunLight.target.position.copy(pShip);
  // dust: wrap motes in a box around the camera
  const L = DUST.L, h = L / 2;
  for (let i = 0; i < DUST.N; i++) {
    const p = DUST.pts[i];
    const x = ((p.x - camera.position.x) % L + L) % L - h + camera.position.x;
    const y = ((p.y - camera.position.y) % L + L) % L - h + camera.position.y;
    const z = ((p.z - camera.position.z) % L + L) % L - h + camera.position.z;
    tmpM.makeTranslation(x, y, z); DUST.m.setMatrixAt(i, tmpM);
  }
  DUST.m.instanceMatrix.needsUpdate = true;
}

// =====================================================================
//  HUD update
// =====================================================================
const CONTACT_COLORS = { wreck: '#8d9692', drone: '#ff5a47', dormant: '#9a6b62', scav: '#e9a440', part: '#c9cfcb', cell: '#8fb2ff' };
let hudTick = 0;
function updateHUD(dt, stick) {
  const alive = (ship[S.STATE] | 0) === 0;
  // ship block
  const hullAbs = Math.max(0, ship[S.HULL]), hull = hullAbs / Math.max(1, ship[S.HULL_MAX]) * 100;
  $('hullv').textContent = `${hull.toFixed(0)}% · ${hullAbs.toFixed(0)}${ship[S.ARMOR] > 0 ? ` · armor ${Math.round(ship[S.ARMOR] * 100)}%` : ''}`; $('hullb').style.width = `${hull}%`;
  $('hullv').className = hull < 35 ? 'bad' : '';
  {
    const pdn = ship[S.PDC_N] | 0, cn = ship[S.COIL_N] | 0;
    $('pdv').textContent = pdn ? `${pdn} × PDC · ${ship[S.PD_ON] < 0.5 ? 'OFF (P)' : ship[S.PD_FIRING] > 0.5 ? 'ENGAGING' : 'AUTO'}` : 'not fitted';
    $('pdv').className = pdn && ship[S.PD_FIRING] > 0.5 ? 'warn' : '';
    $('coilv').textContent = cn ? (ship[S.COIL_CD] > 0 ? `charging ${ship[S.COIL_CD].toFixed(1)} s` : `${cn > 1 ? `${cn} × ` : ''}ready · B`) : 'not fitted';
    $('coilv').className = cn && ship[S.COIL_CD] <= 0 ? 'ok' : '';
  }
  const crew = Math.max(0, ship[S.CREW]); $('crewv').textContent = `${crew.toFixed(0)}%`; $('crewv').className = crew < 50 ? 'bad' : '';
  $('dosev').textContent = `${ship[S.DOSE].toFixed(0)} mSv`; $('dosev').className = ship[S.DOSE] > 40 ? 'bad' : ship[S.DOSE] > 15 ? 'warn' : '';
  const m = ship[S.MASS], prop = ship[S.PROP];
  $('propv').textContent = `${(prop / 1000).toFixed(2)} t`;
  const dv = 1500 * 9.81 * Math.log(m / Math.max(1, m - prop));
  $('dvv').textContent = `${dv.toFixed(0)} m/s`;
  const spd = vShip.length();
  $('spdv').textContent = `${spd.toFixed(1)} m/s`;
  const hs = ship[S.HARP_STATE] | 0;
  $('tethv').textContent = hs === 0 ? 'stowed' : hs === 1 ? 'in flight' : `${ship[S.TETH_LEN].toFixed(0)} m · ${(ship[S.TETH_TENSION] / 1000).toFixed(0)} kN`;
  $('assist').textContent = toggles.assist ? 'ASSIST ON' : 'ASSIST OFF';
  $('assist').style.color = toggles.assist ? '' : 'var(--amber)';

  // thermal
  const Tb = ship[S.BUS_T];
  $('busv').textContent = `${Tb.toFixed(0)} K`; $('busv').className = Tb > 640 ? 'bad blink' : Tb > 520 ? 'warn' : '';
  $('busn').style.left = `${THREE.MathUtils.clamp((Tb - 250) / (790 - 250), 0, 1) * 100}%`;
  const Tl = ship[S.LASER_T];
  $('lasv').textContent = ship[S.LASER_LOCK] > 0.5 ? `${Tl.toFixed(0)} K · LOCKOUT` : `${Tl.toFixed(0)} K`;
  $('lasv').className = ship[S.LASER_LOCK] > 0.5 ? 'bad' : Tl > 950 ? 'warn' : '';
  $('lasb').style.width = `${THREE.MathUtils.clamp((Tl - 300) / (1150 - 300), 0, 1) * 100}%`;
  $('lasb').style.background = ship[S.LASER_LOCK] > 0.5 ? 'var(--danger)' : 'var(--amber)';
  const dep = ship[S.RAD_DEPLOY], rh = ship[S.RAD_HEALTH];
  $('radv').textContent = `${dep > 0.95 ? 'DEPLOYED' : dep < 0.05 ? 'FOLDED' : 'MOVING'} · ${(rh * 100).toFixed(0)}%`;
  $('radv').className = rh < 0.6 ? 'bad' : dep < 0.05 ? 'warn' : '';
  $('flowv').textContent = `${(ship[S.PIN] / 1e6).toFixed(1)} / ${(ship[S.PRAD] / 1e6).toFixed(1)} MW`;
  $('sunv').textContent = ship[S.SHADOW] > 0.5 ? 'in wreck shadow' : 'exposed';
  $('sunv').className = ship[S.SHADOW] > 0.5 ? 'ok' : (ship[S.FLARE] | 0) === 2 ? 'bad' : '';
  $('coldchip').innerHTML = ship[S.COLD] > 0.5 ? '<span class="chip coldc">RUNNING COLD</span>' : '';

  // signature
  const sig = ship[S.SIG];
  $('sigval').textContent = `${sig.toFixed(1)} MW`;
  $('sigval').style.color = sig > 20 ? 'var(--danger)' : sig > 4 ? 'var(--amber)' : 'var(--sensor)';
  $('sigsub').textContent = `dormant sensors wake at ~${fmtDist(ship[S.DETECT_R])} · trackers hold you to ~${fmtDist(ship[S.TRACK_R])}`;
  {
    const stir = ship[S.STIR], si = ship[S.STIR_IDX] | 0;
    let html = '';
    if (ship[S.TRACKED] > 0.5 && alive) html = '<span class="chip bad blink">Fire-control track on you — break line of sight or go cold</span>';
    else if (stir > 0.05 && si >= 0 && alive) {
      const dd = tmpV.set(drones[si * D.N], drones[si * D.N + 1], drones[si * D.N + 2]).distanceTo(pShip);
      html = `<span class="chip warn">Drone stirring ${Math.round(stir * 100)}% at ${fmtDist(dd)} — cut your heat</span>`;
    }
    if (game.trackHtml !== html) { $('tracked').innerHTML = html; game.trackHtml = html; }
  }

  // jump
  const jf = ship[S.JF], jc = ship[S.JCOST];
  $('massv').textContent = `${(m / 1000).toFixed(1)} t`;
  $('cargov').textContent = `${ship[S.CARGO_N] | 0} parts${ship[S.SCRAP] > 0 ? ` + ${(ship[S.SCRAP] / 1000).toFixed(1)} t scrap` : ''} · ${(ship[S.CARGO] / 1000).toFixed(1)}/${(ship[S.CARGO_LIMIT] / 1000).toFixed(0)} t`;
  $('jfv').textContent = `${jf.toFixed(2)} / ${jc.toFixed(2)}`;
  const scaleMax = Math.max(2, jf, jc) * 1.05;
  $('jfb').style.width = `${(jf / scaleMax) * 100}%`; $('jfb').style.background = jf >= jc ? 'var(--sensor)' : 'var(--danger)';
  $('jcm').style.left = `${(jc / scaleMax) * 100}%`;
  // invert jump cost to find the mass the remaining fuel can carry (bisection)
  let lo = 20000, hi = 400000; for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2; if (core.jumpCostFor(mid) > jf) hi = mid; else lo = mid; }
  const margin = (lo - m) / 1000;
  $('marginv').textContent = `${margin >= 0 ? '+' : '−'}${Math.abs(margin).toFixed(1)} t`;
  $('marginv').className = margin < 0 ? 'bad' : margin < 3 ? 'warn' : 'ok';
  $('jumpchip').innerHTML = ship[S.SPOOLING] > 0.5 ? '<span class="chip ok blink">SPOOLING</span>' : jf >= jc ? '<span class="chip ok">READY · J</span>' : '<span class="chip bad">OVER BUDGET</span>';
  $('spoolwrap').hidden = ship[S.SPOOLING] < 0.5; $('spoolb').style.width = `${ship[S.SPOOL] * 100}%`;

  // objective guidance
  {
    let obj = '';
    const anyFree = PARTS.some((_, i) => (parts[i * P.N + P.STATE] | 0) === PS.FREE && tmpV.set(parts[i * P.N + P.POS], parts[i * P.N + P.POS + 1], parts[i * P.N + P.POS + 2]).distanceTo(pShip) < 200);
    const weaponAboard = (() => { const cp = new Int32Array(mem, core.cargoPtr(), 16); for (let i = 0; i < (ship[S.CARGO_N] | 0); i++) if (PART_INFO[parts[cp[i] * P.N + P.TYPE] | 0].weapon) return true; return false; })();
    if (game.field && game.field.c.distanceTo(pShip) > game.field.r) obj = 'Outside the field — nothing out here · head back or jump home with <b>J</b>';
    else if (ship[S.SPOOLING] > 0.5) obj = 'Hold still — <b>jump spooling</b>';
    else if (hs === 2 && (ship[S.TETH_TYPE] | 0) === 1) obj = 'Hold <b>Space</b> to reel the part in';
    else if (anyFree && hs === 0) obj = 'Aim at the loose part · <b>RMB</b> harpoon · then hold <b>Space</b>';
    else if (toggles.tac) obj = tac.sel ? 'Order: <b>1</b> fast · <b>2</b> quiet · <b>3</b> match · <b>4</b> stop · <b>Tab</b> manual' : 'Click a hulk or part marker to select it';
    else if ((ship[S.CARGO_N] | 0) === 0 && !anyFree && input[IN.AP_MODE] === 0 && tmpV.set(wrecks[0], wrecks[1], wrecks[2]).distanceTo(pShip) > 150) obj = 'Press <b>Tab</b> for tactical · order a <b>quiet approach</b> to a hulk';
    else if ((ship[S.CARGO_N] | 0) === 0 && !anyFree) obj = 'Aim at a bolted part · <b>RMB</b> harpoon it · hold <b>LMB</b> to cut';
    else if (!weaponAboard) obj = 'Find a <b>weapon</b> (red tags) · or jump home with <b>J</b>';
    else obj = 'Weapon aboard · jump home with <b>J</b> before your luck runs out';
    if (game.objHtml !== obj) { $('objective').innerHTML = obj; game.objHtml = obj; }
  }
  // flare
  const fs = ship[S.FLARE] | 0;
  $('flare').innerHTML = fs === 1 ? `<span class="warn">Particle storm in ${ship[S.FLARE_T].toFixed(0)} s — put a hulk between you and the sun</span>`
    : fs === 2 ? `<span class="bad">Particle storm · ${ship[S.FLARE_T].toFixed(0)} s · ${ship[S.SHADOW] > 0.5 ? 'SHIELDED' : 'EXPOSED +2.5 mSv/s'}</span>` : '';

  // messages fade
  for (let i = msgs.length - 1; i >= 0; i--) { msgs[i].t -= dt; if (msgs[i].t < 1) msgs[i].el.style.opacity = Math.max(0, msgs[i].t); if (msgs[i].t <= 0) { msgs[i].el.remove(); msgs.splice(i, 1); } }
  const hf = $('hitflash'); hf.style.opacity = Math.max(0, parseFloat(hf.style.opacity || 0) - dt * 2.5);

  // reticle at the nose ray, 60 m out
  const aim = new THREE.Vector3(0, 0.2, 70 + SHIP.laserLocal.z).applyQuaternion(qShip).add(pShip);
  const ap = project(aim);
  const ret = $('reticle');
  if (ap && !toggles.tac) { ret.style.transform = `translate(${ap[0]}px, ${ap[1]}px)`; ret.style.display = ''; } else ret.style.display = 'none';
  $('stick').style.transform = ap && !toggles.tac ? `translate(${ap[0] + stick.sx * 60}px, ${ap[1] + stick.sy * 60}px)` : 'translate(-99px,-99px)';
  const cut = ship[S.CUT];
  $('cutring').setAttribute('stroke-dasharray', `${(cut * 150.8).toFixed(1)} 151`);
  $('heatring').setAttribute('stroke-dasharray', `${(THREE.MathUtils.clamp((Tl - 300) / 850, 0, 1) * 182.2).toFixed(1)} 183`);
  $('heatring').setAttribute('stroke', ship[S.LASER_LOCK] > 0.5 ? 'var(--danger)' : 'var(--amber)');
  // target readout: what the nose ray points at (cheap JS raycast against parts)
  const tgtEl = $('tgt');
  const lt = ship[S.LASER_TYPE] | 0, li = ship[S.LASER_IDX] | 0;
  if (lt === 1 && li >= 0) {
    const info = PART_INFO[parts[li * P.N + P.TYPE] | 0];
    const st = parts[li * P.N + P.STATE] | 0;
    tgtEl.innerHTML = `<span class="k" style="color:${info.color}">${info.tag}</span> ${info.name}<br><span class="m">${(parts[li * P.N + P.MASS] / 1000).toFixed(1)} t · ${st === PS.ATTACHED ? `cutting ${(cut * 100).toFixed(0)}%` : 'free'}</span>`;
  } else if (lt === 2) tgtEl.innerHTML = `<span class="k">HULL</span> ${WRECKS[li]?.name ?? ''}<br><span class="m">structural — cut the bolted-on parts</span>`;
  else if (lt === 4) tgtEl.innerHTML = '<span class="k bad">DRONE</span> burning it<br><span class="m">close range only</span>';
  else {
    // not cutting: is the nose on a loose fragment worth harpooning?
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(qShip);
    let bi = -1, bd = 170;
    const nr = core.rockCount();
    for (let i = 0; i < nr; i++) {
      const o = i * R.N; if (rocks[o + R.RAD] <= 0) continue;
      tmpV.set(rocks[o] - pShip.x, rocks[o + 1] - pShip.y, rocks[o + 2] - pShip.z);
      const d = tmpV.length(); if (d > bd || d < 1) continue;
      if (tmpV.dot(fwd) / d > 1 - (rocks[o + R.RAD] + 2) / (d * 6)) { bd = d; bi = i; }
    }
    if (bi >= 0) {
      const mt = rocks[bi * R.N + 7] / 1000;
      tgtEl.innerHTML = mt <= 12 ? `<span class="k" style="color:#c9b98a">SCRAP</span> hull fragment<br><span class="m">${mt.toFixed(1)} t · ${Math.round(bd)} m · RMB harpoon, Space winch</span>` : `<span class="k m">FRAGMENT</span> ${mt.toFixed(0)} t<br><span class="m">too heavy to haul — anchor only</span>`;
    } else tgtEl.innerHTML = '';
  }

  // velocity markers
  const vecs = $('vecs');
  if (!vecs.childElementCount) vecs.innerHTML = '<div class="v" id="pro" style="color:var(--sensor)">⊕</div><div class="v" id="retro" style="color:var(--sensor)">⊗</div>';
  const pro = spd > 0.3 ? project(pShip.clone().addScaledVector(vShip.clone().normalize(), 400)) : null;
  const rpro = spd > 0.3 ? project(pShip.clone().addScaledVector(vShip.clone().normalize(), -400)) : null;
  $('pro').style.transform = pro ? `translate(${pro[0]}px, ${pro[1]}px)` : 'translate(-99px,-99px)';
  $('retro').style.transform = rpro ? `translate(${rpro[0]}px, ${rpro[1]}px)` : 'translate(-99px,-99px)';

  // world labels: wrecks, free parts nearby, drones, scavengers
  let li2 = 0;
  const prevPicks = game.picks || [];
  game.hover = null;
  if (toggles.tac) { let bd = 22; for (const p of prevPicks) { const d = Math.hypot(p.sx - mouse.mx, p.sy - mouse.my); if (d < bd) { bd = d; game.hover = p; } } }
  game.picks = [];
  const isHover = (pick) => pick && game.hover && game.hover.type === pick.type && game.hover.idx === pick.idx;
  const isSel = (pick) => pick && tac.sel && tac.sel.type === pick.type && tac.sel.idx === pick.idx;
  const label = (pos, html, color, pick) => {
    const sp = project(pos); if (!sp) return;
    if (sp[0] < -50 || sp[1] < -50 || sp[0] > window.innerWidth + 50 || sp[1] > window.innerHeight + 50) return;
    const L = getLabel(li2++);
    const sel = isSel(pick);
    const h = toggles.tac ? `<span class="pip"></span>${sel ? '<span class="selbox"></span>' : ''}${html}` : html;
    if (L.html !== h) { L.el.innerHTML = h; L.html = h; }
    L.el.style.color = sel ? 'var(--sensor)' : color; L.el.style.display = '';
    L.el.style.transform = toggles.tac ? `translate(${sp[0] - 4}px, ${sp[1] - 7}px)` : `translate(${sp[0] + 10}px, ${sp[1] - 8}px)`;
    if (pick) game.picks.push({ ...pick, sx: sp[0], sy: sp[1] });
  };
  const contacts = [];
  let attachedLabels = 0;
  { const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(qShip); let best = -1, bd = 0.985;
    for (let w = 0; w < WRECKS.length; w++) { const d = tmpV.set(wrecks[w * W.N], wrecks[w * W.N + 1], wrecks[w * W.N + 2]).sub(pShip).normalize().dot(fwd); if (d > bd) { bd = d; best = w; } }
    game.nearestAim = best; }
  for (let w = 0; w < WRECKS.length; w++) {
    const wp = tmpV.set(wrecks[w * W.N], wrecks[w * W.N + 1], wrecks[w * W.N + 2]);
    const dist = wp.distanceTo(pShip);
    contacts.push({ kind: 'wreck', name: WRECKS[w].name, dist, color: CONTACT_COLORS.wreck });
    const wpick = { type: 2, idx: w, name: WRECKS[w].name };
    const capW = (wrecks[w * W.N + W.CLASS] | 0) === 1;
    const named = !toggles.tac || dist < 1100 || capW || isSel(wpick) || isHover(wpick);
    if (toggles.tac || dist < 700 || w === game.nearestAim) label(toggles.tac ? wp.clone() : wp.clone().add(new THREE.Vector3(0, wrecks[w * W.N + W.BR] * 0.6, 0)), named ? `<span class="k">${WRECKS[w].name}</span> <span class="m">${fmtDist(dist)}</span>` : '', capW ? '#d7b98a' : CONTACT_COLORS.wreck, wpick);
  }
  for (let i = 0; i < PARTS.length; i++) {
    const o = i * P.N; const st = parts[o + P.STATE] | 0;
    if (st === PS.CARGO || st === PS.GONE) continue;
    const pp = tmpV.set(parts[o + P.POS], parts[o + P.POS + 1], parts[o + P.POS + 2]);
    const dist = pp.distanceTo(pShip);
    const type = parts[o + P.TYPE] | 0; const info = PART_INFO[type];
    const pick = { type: 1, idx: i, name: `${info.name}${st === PS.ATTACHED ? ' (bolted)' : ' (loose)'}` };
    if (toggles.tac) {
      if (dist > 900 && !(game.loadout?.intel?.manifest && (info.weapon || type === 5))) continue;
      const col = type === 7 ? CONTACT_COLORS.cell : info.weapon ? '#ff7a5c' : (st === PS.ATTACHED ? '#7f8985' : CONTACT_COLORS.part);
      const showText = st !== PS.ATTACHED || isSel(pick) || info.weapon || type === 7;
      label(pp.clone(), showText ? `<span class="k">${info.tag}</span>` : '', col, pick);
      continue;
    }
    if (dist > (st === PS.ATTACHED ? 140 : 420)) continue;
    if (st === PS.ATTACHED) {
      // bolted parts: only label the ones near the crosshair, so the view stays readable
      const fwd = tmpV2.set(0, 0, 1).applyQuaternion(qShip);
      const dot = pp.clone().sub(pShip).normalize().dot(fwd);
      if (dot < 0.975 || attachedLabels >= 4) continue;
      attachedLabels++;
    }
    const col = type === 7 ? CONTACT_COLORS.cell : info.weapon ? '#ff7a5c' : (st === PS.ATTACHED ? '#9aa39f' : CONTACT_COLORS.part);
    label(pp.clone(), `<span class="k">${info.tag}</span> <span class="m">${(parts[o + P.MASS] / 1000).toFixed(1)}t${st === PS.ATTACHED ? '' : ' · loose'} · ${Math.round(dist)}m</span>`, col, pick);
  }
  for (let d = 0; d < DRONES.length; d++) {
    const o = d * D.N; const st = drones[o + D.STATE] | 0;
    if (st === DS.DEAD) continue;
    const dp = tmpV.set(drones[o], drones[o + 1], drones[o + 2]);
    const dist = dp.distanceTo(pShip);
    const awake = st !== DS.DORMANT;
    const susp = drones[o + D.SUSP];
    let stName = ['dormant', 'waking', 'hunting', 'searching', '', 'returning'][st];
    if (st === DS.DORMANT && susp > 0.05) stName = `stirring ${Math.round(susp * 100)}%`;
    if (drones[o + D.AMMO] < 0.5) stName += ' · empty';
    const stirring = st === DS.DORMANT && susp > 0.05;
    const col = awake ? CONTACT_COLORS.drone : stirring ? '#e9a440' : CONTACT_COLORS.dormant;
    const surveyed = !!game.loadout?.intel?.drones;
    const sens = game.loadout?.sensors || 1;
    if (awake || stirring || surveyed || dist < 600 * sens) contacts.push({ kind: 'drone', name: `Drone · ${stName}`, dist, color: col });
    if (awake || stirring || (surveyed && toggles.tac) || dist < (toggles.tac ? 600 : 350) * sens) label(dp.clone(), `<span class="k">${awake ? '◆ DRONE' : 'drone'}</span> <span class="m">${stName} · ${fmtDist(dist)}</span>`, col, { type: 3, idx: d, name: 'Drone' });
  }
  for (let c = 0; c < SCAVS.length; c++) {
    const o = c * C.N; const cp = tmpV.set(scavs[o], scavs[o + 1], scavs[o + 2]);
    const dist = cp.distanceTo(pShip);
    contacts.push({ kind: 'scav', name: `Unknown IR contact ${String.fromCharCode(65 + c)}`, dist, color: CONTACT_COLORS.scav, sig: scavs[o + C.SIG] });
    label(cp.clone(), `<span class="k">IR-${String.fromCharCode(65 + c)}</span> <span class="m">${scavs[o + C.SIG].toFixed(1)} MW · ${fmtDist(dist)}</span>`, CONTACT_COLORS.scav, { type: 4, idx: c, name: `Unknown IR contact ${String.fromCharCode(65 + c)}` });
  }
  if (game.sensorBlank > 0) { game.sensorBlank -= dt; li2 = 0; contacts.length = 0; contacts.push({ kind: 'x', name: '— sensors rebooting —', dist: 0, color: '#ff5a47' }); }
  for (let i = li2; i < labelPool.length; i++) labelPool[i].el.style.display = 'none';

  hudTick -= dt;
  if (hudTick <= 0) {
    hudTick = 0.25;
    contacts.sort((a, b) => (a.kind === 'drone' && b.kind !== 'drone' ? -1 : b.kind === 'drone' && a.kind !== 'drone' ? 1 : a.dist - b.dist));
    $('contacts').innerHTML = contacts.slice(0, 9).map((c) => `<div class="c"><span class="dot" style="background:${c.color}"></span><span class="n">${c.name}</span><span class="d">${fmtDist(c.dist)}</span></div>`).join('');
  }
}

// =====================================================================
//  Audio per frame
// =====================================================================
function updateAudio() {
  if (!audio.ctx) return;
  const alive = (ship[S.STATE] | 0) === 0;
  setA(audio.engG.gain, alive ? ship[S.THROTTLE] * 0.9 : 0, 0.08);
  setA(audio.engF.frequency, 90 + ship[S.THROTTLE] * 200, 0.1);
  const rcs = Math.abs(ship[S.RCS]) + Math.abs(ship[S.RCS + 1]) + Math.abs(ship[S.RCS + 2]);
  setA(audio.rcsG.gain, alive ? Math.min(0.12, rcs * 0.06) : 0, 0.03);
  const lon = ship[S.LASER_ON] > 0.5 && alive;
  setA(audio.lasG.gain, lon ? 0.07 : 0, 0.03);
  setA(audio.crkG.gain, lon && (ship[S.LASER_TYPE] | 0) ? 0.05 + Math.random() * 0.04 : 0, 0.02);
  setA(audio.tethG.gain, ship[S.TETH_TENSION] > 1000 ? Math.min(0.12, ship[S.TETH_TENSION] / 4e6) : 0, 0.05);
  setA(audio.teth.frequency, 30 + Math.min(80, ship[S.TETH_TENSION] / 8000), 0.1);
  setA(audio.spoolG.gain, ship[S.SPOOLING] > 0.5 ? 0.05 : 0, 0.1);
  setA(audio.spool.frequency, 200 + ship[S.SPOOL] * 900, 0.1);
  setA(audio.humG.gain, ship[S.COLD] > 0.5 ? 0.008 : 0.035, 0.4);
  if (ship[S.TRACKED] > 0.5 && alive) { game.trackBeep = (game.trackBeep || 0) - 1; if (game.trackBeep <= 0) { beep(1250, 0.05, 0.05); game.trackBeep = 30; } }
}


// =====================================================================
//  Tactical layer — give orders, the crew flies them
// =====================================================================
let TAC;
function buildTactical() {
  const grid = new THREE.PolarGridHelper(1000, 12, 10, 96, new THREE.Color(0x2f6f69), new THREE.Color(0x1b3d3a));
  grid.material.transparent = true; grid.material.opacity = 0.45; grid.material.depthWrite = false;
  const ringMat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, side: THREE.DoubleSide, depthWrite: false });
  const wakeRing = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 128), ringMat(0xe9a440, 0.85)); wakeRing.rotation.x = -Math.PI / 2;
  const trackRing = new THREE.Mesh(new THREE.RingGeometry(0.992, 1, 128), ringMat(0xff5a47, 0.5)); trackRing.rotation.x = -Math.PI / 2;
  const bubbleMat = new THREE.MeshBasicNodeMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  bubbleMat.colorNode = vec3(0.9, 0.55, 0.15).mul(float(1).sub(abs(normalView.z)).pow(6.0).mul(0.12));
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), bubbleMat);
  const lineGeo = () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3)); return g; };
  const velLine = new THREE.Line(lineGeo(), new THREE.LineBasicMaterial({ color: 0x71d3c6, transparent: true, opacity: 0.9 }));
  const orderLine = new THREE.Line(lineGeo(), new THREE.LineBasicMaterial({ color: 0xe9a440, transparent: true, opacity: 0.9 }));
  const drop = new THREE.Line(lineGeo(), new THREE.LineBasicMaterial({ color: 0x71d3c6, transparent: true, opacity: 0.35 }));
  [grid, wakeRing, trackRing, bubble, velLine, orderLine, drop].forEach((o) => { o.frustumCulled = false; o.visible = false; o.renderOrder = 5; scene.add(o); });
  return { grid, wakeRing, trackRing, bubble, velLine, orderLine, drop };
}
function setTacVisible(on) {
  if (!TAC) return;
  Object.values(TAC).forEach((o) => { o.visible = on; });
  $('tacpanel').hidden = !on; $('sigbox').hidden = on;
  document.body.classList.toggle('tac', on);
}
function setTactical(on) {
  toggles.tac = on;
  game.camBlend = 1.2;
  setTacVisible(on);
  mouse.lmb = false;
  if (on) {
    game.ignoreUnlockUntil = performance.now() + 500;
    if (document.pointerLockElement) document.exitPointerLock();
    tac.yaw = Math.atan2(camRel.x, -camRel.z);
  } else {
    mouse.stickX = mouse.stickY = 0;
    if (!DBG.has('nolock')) requestLock();
  }
}
function tacPick(x, y) {
  let best = null, bd = 26;
  for (const p of game.picks || []) { const d = Math.hypot(p.sx - x, p.sy - y); if (d < bd) { bd = d; best = p; } }
  tac.sel = best ? { type: best.type, idx: best.idx, name: best.name } : null;
  if (best) beep(1200, 0.03, 0.04, 'sine');
}
function issueOrder(mode, quiet) {
  if ((ship[S.STATE] | 0) !== 0) return;
  if ((mode === 1 || mode === 2) && !tac.sel) { msg('Select a contact first — click its marker', 'a'); return; }
  tac.serial++; tac.mode = mode; tac.quiet = quiet;
  input[IN.AP_MODE] = mode; input[IN.AP_QUIET] = quiet;
  input[IN.AP_TYPE] = tac.sel ? tac.sel.type : 0; input[IN.AP_IDX] = tac.sel ? tac.sel.idx : -1;
  input[IN.AP_SERIAL] = tac.serial;
  tac.label = mode === 3 ? 'all stop' : `${mode === 2 ? 'match velocity' : quiet ? 'quiet approach' : 'fast approach'} · ${tac.sel.name}`;
  msg(mode === 3 ? 'Crew: all stop' : `Crew: ${tac.label}`, 's');
  beep(700, 0.05, 0.05, 'sine');
}
function cancelOrder(text) {
  tac.serial++; tac.mode = 0;
  input[IN.AP_MODE] = 0; input[IN.AP_SERIAL] = tac.serial;
  if (text) msg(text, 'a');
}
function setLine(line, a, b) {
  const p = line.geometry.attributes.position;
  p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, b.x, b.y, b.z); p.needsUpdate = true;
  line.geometry.computeBoundingSphere();
}
function selTargetPos(sel, out) {
  if (!sel) return null;
  if (sel.type === 1) { const o = sel.idx * P.N; const st = parts[o + P.STATE] | 0; if (st === PS.CARGO || st === PS.GONE) return null; return out.set(parts[o + P.POS], parts[o + P.POS + 1], parts[o + P.POS + 2]); }
  if (sel.type === 2) return out.set(wrecks[sel.idx * W.N], wrecks[sel.idx * W.N + 1], wrecks[sel.idx * W.N + 2]);
  if (sel.type === 3) { const o = sel.idx * D.N; if ((drones[o + D.STATE] | 0) === DS.DEAD) return null; return out.set(drones[o], drones[o + 1], drones[o + 2]); }
  if (sel.type === 4) return out.set(scavs[sel.idx * C.N], scavs[sel.idx * C.N + 1], scavs[sel.idx * C.N + 2]);
  return null;
}
const _tp = new THREE.Vector3();
function updateTactical() {
  // autopilot status, both views
  const aps = ship[S.AP_STATE] | 0;
  if (aps === 0 && tac.mode !== 0 && input[IN.AP_MODE] === 0) tac.mode = 0;
  const chip = aps === 0 ? '' : `<span class="chip ${aps === 2 ? 'ok' : 'warn'}">Autopilot · ${tac.label}${aps === 2 ? ' · holding' : ` · ${ship[S.AP_BURN] > 0.5 ? 'burning' : tac.quiet ? 'thrusters' : 'coasting'}`}${tac.mode === 1 && aps === 1 ? ` · ${fmtDist(Math.max(0, ship[S.AP_GOAL]))} to go` : ''} · ${ship[S.AP_VREL].toFixed(1)} m/s</span>`;
  if (game.apHtml !== chip) { $('apchip').innerHTML = chip; game.apHtml = chip; }
  if (!toggles.tac || !TAC) return;
  // a selection that vanished (stowed, destroyed) is cleared
  if (tac.sel && !selTargetPos(tac.sel, _tp)) tac.sel = null;
  const wake = Math.max(1, ship[S.DETECT_R]), track = Math.max(1, ship[S.TRACK_R]);
  TAC.grid.position.copy(pShip);
  const gs = THREE.MathUtils.clamp(tac.dist / 650, 0.4, 4); TAC.grid.scale.setScalar(gs);
  TAC.wakeRing.position.copy(pShip); TAC.wakeRing.scale.setScalar(wake);
  TAC.trackRing.position.copy(pShip); TAC.trackRing.scale.setScalar(track);
  TAC.bubble.position.copy(pShip); TAC.bubble.scale.setScalar(wake);
  setLine(TAC.velLine, pShip, tmpV.copy(pShip).addScaledVector(vShip, 30));
  const tp = selTargetPos(tac.sel, _tp);
  TAC.orderLine.visible = !!tp;
  if (tp) setLine(TAC.orderLine, pShip, tp);
  // panel
  const m = ship[S.MASS];
  let sel = '<span class="m">No target — click a contact marker</span>';
  let note = '';
  if (tp) {
    const d = tp.distanceTo(pShip);
    const sig0 = ship[S.PRAD] / 1e6;
    const aMain = 420000 / m * 0.5, aRcs = 70000 / m * 0.6;
    const vF = Math.min(45, Math.sqrt(aMain * d)), vQ = Math.min(10, Math.sqrt(aRcs * d));
    const etaF = d / Math.max(1, vF) + 2 * vF / aMain + 8, etaQ = d / Math.max(0.5, vQ) + 2 * vQ / aRcs + 4;
    const hearF = Math.sqrt(WAKE_K * (sig0 + 30)), hearQ = Math.sqrt(WAKE_K * (sig0 + 0.6));
    sel = `<b>${tac.sel.name}</b> <span class="m">· ${fmtDist(d)}</span>`;
    note = `<div class="row"><i>1 · Fast</i><b>~${Math.round(etaF)} s · heard within ${fmtDist(hearF)}</b></div>` +
      `<div class="row"><i>2 · Quiet</i><b>~${Math.round(etaQ)} s · heard within ${fmtDist(hearQ)}</b></div>`;
  }
  const html = sel + note;
  if (game.tacHtml !== html) { $('tacsel').innerHTML = html; game.tacHtml = html; }
}

function pauseGame() {
  if (!game.running || game.over) return;
  game.paused = true; keys.clear(); mouse.lmb = false;
  $('pause').hidden = false;
  if (audio.ctx) audio.ctx.suspend?.();
}
function resumeGame() {
  game.paused = false; $('pause').hidden = true; game.last = 0;
  if (audio.ctx) audio.ctx.resume?.();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  if (!toggles.tac && !DBG.has('nolock')) requestLock();
}

// =====================================================================
//  Run end
// =====================================================================
function endRun(extracted, cause = 0) {
  if (game.over) return;
  game.over = true;
  setTimeout(() => showResult(extracted, cause), extracted ? 900 : 2200);
  if (extracted) {
    for (let k = 0; k < 160; k++) spawnSpark(SPARKS, pShip, new THREE.Vector3().randomDirection().multiplyScalar(10 + Math.random() * 60), 1 + Math.random(), new THREE.Color(1.5, 2.5, 6));
    flash(FLASH, pShip, 20000, new THREE.Color(0.6, 0.8, 1));
  } else {
    for (let k = 0; k < 220; k++) spawnSpark(SPARKS, pShip, new THREE.Vector3().randomDirection().multiplyScalar(5 + Math.random() * 40), 1 + Math.random() * 2, new THREE.Color(6, 2.4, 0.7));
    flash(FLASH, pShip, 30000); thud(1, 90);
  }
}
// =====================================================================
//  Main loop
// =====================================================================
const DT = 1 / 120;
function frame(now) {
  requestAnimationFrame(frame);
  const t = now / 1000;
  let dt = Math.min(0.1, t - (game.last || t)); game.last = t;
  if (game.mode === 'bench' && bench.on) {
    updateBench(dt, t);
  } else if ((game.running || game.over) && game.paused) {
    syncVisuals(0, t); updateCamera(0);
  } else if (game.running || game.over) {
    const stick = readInput(dt);
    game.acc += dt;
    let steps = 0;
    while (game.acc >= DT && steps < 10) { if (!DBG.has('nostep')) core.step(DT); game.acc -= DT; steps++; }
    if (steps === 10) game.acc = 0;
    handleEvents();
    syncVisuals(dt, t);
    if (!DBG.has('nocam')) updateCamera(dt);
    if (game.running) { if (!DBG.has('nohud')) updateHUD(dt, stick); updateTactical(); updateContractHud(); updateAudio(); }
  } else if (world.ready && game.mode !== 'hub' && game.mode !== 'bench') {
    // idle orbit behind the boot screen
    syncVisuals(dt, t);
    const a = t * 0.05;
    camera.position.set(Math.sin(a) * 90, 30, 300 + Math.cos(a) * 90);
    camera.up.set(0, 1, 0); camera.lookAt(0, 0, 420);
    PLANET.grp.position.copy(camera.position).addScaledVector(planetDir, 26000);
    SUN.position.copy(camera.position).addScaledVector(sunDir, 30000);
    sunLight.position.set(0, 0, 420).addScaledVector(sunDir, 600); sunLight.target.position.set(0, 0, 420);
  }
  if (world.ready) {
    updateDynamicRes(dt);
    updatePerf(dt);
    PLANET.planet.rotation.y += dt * 0.002;
    if (game.mode === 'hub' && HUB) { updateHub(dt); if (world.direct) renderer.render(HUB.scene, HUB.cam); else HUB.pipe.render(); }
    else if (world.direct) renderer.render(scene, camera); else pipeline.render();
  }
}

// =====================================================================
//  Start-up
// =====================================================================
async function start() {
  try {
    bootStatus('Loading simulation core…');
    await loadCore();
    core.init(1); bindViews();
    bootStatus('Starting renderer…');
    await initRenderer();
    sunDir = new THREE.Vector3(core.sunX(), core.sunY(), core.sunZ()).normalize();
    planetDir = new THREE.Vector3(0.72, -0.12, 0.68).normalize();
    buildMaterials();
    bootStatus('Building the sky…');
    const { sky, env } = buildSky(sunDir, planetDir);
    world.sky = sky; world.env = env;
    scene.background = sky; scene.backgroundIntensity = 1.0;
    scene.environment = env; scene.environmentIntensity = 0.55;

    sunLight = new THREE.DirectionalLight(new THREE.Color(1, 0.96, 0.9), 3.2);
    sunLight.castShadow = !DBG.has('noshadow');
    sunLight.shadow.mapSize.set(GFX.shadows || 2048, GFX.shadows || 2048);
    const sc = sunLight.shadow.camera; sc.left = -170; sc.right = 170; sc.top = 170; sc.bottom = -170; sc.near = 1; sc.far = 1500;
    sunLight.shadow.bias = -0.0004; sunLight.shadow.normalBias = 0.6;
    scene.add(sunLight, sunLight.target);
    // reflected light from the gas giant fills the side away from the sun
    hemi = new THREE.HemisphereLight(new THREE.Color(0.85, 0.55, 0.32), new THREE.Color(0.03, 0.04, 0.07), 0.32);
    hemi.position.copy(planetDir); scene.add(hemi);

    PLANET = buildPlanet(); PLANET.grp.scale.setScalar(7200); scene.add(PLANET.grp);
    PLANET.planet.userData.ir = IRM.planet; PLANET.ring.userData.ir = IRM.rock;
    const sunTex = radialTex([[0, 'rgba(255,255,255,1)'], [0.06, 'rgba(255,250,235,1)'], [0.2, 'rgba(255,220,170,.35)'], [1, 'rgba(255,200,150,0)']]);
    SUN = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    SUN.material.color.setRGB(14, 13, 11); SUN.scale.setScalar(9000); scene.add(SUN);

    bootStatus('Kitbashing the cutter…');
    SHIP = buildShipModel('cutter', [], scene);
    DEBRIS = buildDebris();
    DUST = buildDust();
    SPARKS = buildSparks();
    TRACERS = buildTracers(core.slugCap());
    TRACERS_OURS = buildTracers(core.slugCap(), vec3(3.5, 3.2, 1.6));
    FLASH = buildFlashes();
    LASER = buildLaser();
    TETHER = buildTether();
    TAC = buildTactical();
    bootStatus('Seeding the battlefield…');
    await newRun();
    bindInput();
    // warm up shaders (avoid first-frame hitch)
    if (renderer.compileAsync) { try { await renderer.compileAsync(scene, camera); } catch { /* optional */ } }
    world.ready = true;
    world.direct = /direct/.test(location.search);
    window.__dbg = { renderer, scene, camera, pipeline, THREE, core, get ship() { return ship; }, get parts() { return parts; }, get wrecks() { return wrecks; }, setIR, tac, get picks() { return game.picks; }, issueOrder, setTactical, toggles };
    window.addEventListener('error', (e) => console.error('UNCAUGHT', e.error && e.error.stack));
    window.addEventListener('unhandledrejection', (e) => console.error('REJECT', e.reason && e.reason.stack));
    bootStatus('Pressurising the hangar…');
    buildHub();
    if (renderer.compileAsync) { try { await renderer.compileAsync(HUB.scene, HUB.cam); } catch { /* optional */ } }
    requestAnimationFrame(frame);
    const gd = world.gpuDiag || {};
    const bk = renderer.backend || {};
    const why = world.backend === 'WebGPU' ? ` (${[gd.name, bk.compatibilityMode ? 'compatibility mode' : gd.mode].filter(Boolean).join(', ')})` : ` — ${world.renderReason ? world.renderReason : world.gpuError ? `WebGPU start-up failed: ${world.gpuError.message || world.gpuError}` : gd.ok ? `WebGPU adapter found${gd.name ? ` (${gd.name})` : ''} but the renderer did not use it` : gd.why || 'WebGPU unavailable'}`;
    $('techtext').textContent = `Renderer: ${world.backend}${why} · physics core: ${world.coreKind}`;
    const sel = $('rendpref'); sel.value = world.rendererPref;
    sel.addEventListener('change', () => { try { localStorage.setItem('salvage.renderer', sel.value); } catch { /* storage unavailable */ } $('rendnote').hidden = false; });
    $('rendreload').addEventListener('click', () => location.reload());
    console.info('[salvage] renderer', world.backend, gd);
    bindGfxPanel();
    applyGraphics();
    showHub('hangar');
  } catch (err) {
    console.error(err);
    bootStatus(`Could not start: ${err.message}. This prototype needs a desktop browser with WebGPU or WebGL 2.`);
  }
}

function launch() {
  if (!world.ready) return;
  if (!DBG.has('noaudio')) { if (!audio.ctx) initAudio(); else audio.ctx.resume?.(); }
  $('result').hidden = true; $('hud').hidden = false;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  toggles.tac = false; tac.sel = null; tac.mode = 0; setTacVisible(false);
  game.running = true; game.camInit = false; game.paused = false; game.sensorBlank = 0;
  mouse.stickX = mouse.stickY = 0;
  if (!DBG.has('nolock')) requestLock();
  setTimeout(() => msg('The nearest hulks are unguarded. Drones sleep further in — they stir when they feel your drive.', ''), 3000);
}

