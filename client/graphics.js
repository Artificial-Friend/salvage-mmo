// =====================================================================
//  GRAPHICS — quality settings, the post-processing pipeline, the
//  frame-time meter and the benchmark flight.
//  Concatenated after main.js (shares its module scope).
// =====================================================================

const GFX_KEY = 'salvage.graphics.v1';

// Every option a preset sets. Later steps add their effects here and in GFX_OPTIONS.
const GFX_PRESETS = {
  low: { surfaces: 'texture', renderScale: 0.75, dynamicRes: true, aa: 'fxaa', shadows: 0, shadowRange: 'near', bloom: true, bloomStrength: 0.45,
    ao: false, aoStrength: 0.85, aoFull: false, flare: false, cinematic: false, reflections: 'basic', haze: false },
  medium: { surfaces: 'shader', renderScale: 1, dynamicRes: true, aa: 'fxaa', shadows: 2048, shadowRange: 'near', bloom: true, bloomStrength: 0.55,
    ao: true, aoStrength: 0.85, aoFull: false, flare: false, cinematic: true, reflections: 'scene', haze: true },
  high: { surfaces: 'shader', renderScale: 1, dynamicRes: false, aa: 'smaa', shadows: 2048, shadowRange: 'far', bloom: true, bloomStrength: 0.55,
    ao: true, aoStrength: 0.9, aoFull: false, flare: true, cinematic: true, reflections: 'scene', haze: true },
  ultra: { surfaces: 'shader', renderScale: 1.25, dynamicRes: false, aa: 'msaa', shadows: 4096, shadowRange: 'far', bloom: true, bloomStrength: 0.6,
    ao: true, aoStrength: 1, aoFull: true, flare: true, cinematic: true, reflections: 'scene', haze: true },
};

// UI description: one row per option, rendered by renderGfxPanel()
const GFX_OPTIONS = [
  { key: 'surfaces', label: 'Hull detail', kind: 'select', choices: [['shader', 'Procedural · computed per pixel'], ['texture', 'Painted textures · cheaper']],
    hint: 'Procedural plating stays sharp up close: seams, rivets, chipped paint, grime and scorch follow each hull. Applies after a reload.',
    reload: (a, b) => a !== b },
  { key: 'renderScale', label: 'Render scale', kind: 'range', min: 0.5, max: 1.5, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%`,
    hint: 'Pixels rendered relative to your screen. Below 100% is blurrier and faster.' },
  { key: 'dynamicRes', label: 'Dynamic resolution', kind: 'toggle', hint: 'Lowers render scale on its own when frames take longer than 24 ms.' },
  { key: 'aa', label: 'Anti-aliasing', kind: 'select', choices: [['off', 'Off'], ['fxaa', 'FXAA · cheap'], ['smaa', 'SMAA · sharper'], ['msaa', 'MSAA 4× · best edges']],
    hint: 'MSAA is the cleanest on thin trusses and radiator fins and the most expensive.' },
  { key: 'shadows', label: 'Sun shadows', kind: 'select', choices: [[0, 'Off'], [1024, '1024'], [2048, '2048'], [4096, '4096']],
    hint: 'Shadow map resolution. Higher keeps shadow edges crisp on big wrecks. Turning shadows on or off applies after a reload.',
    reload: (a, b) => (a > 0) !== (b > 0) },
  { key: 'shadowRange', label: 'Shadow distance', kind: 'select', choices: [['near', 'Near · around your ship'], ['far', 'Far · cascaded, whole field']],
    hint: 'Far splits the sun shadow into cascades so distant hulks and the battlecruiser cast shadows too. Applies after a reload.', dep: 'shadows',
    reload: (a, b) => a !== b },
  { key: 'ao', label: 'Ambient occlusion', kind: 'toggle', hint: 'Contact shadow in every seam, crevice and overhang (GTAO). The biggest single step away from a flat look.' },
  { key: 'aoStrength', label: 'Occlusion strength', kind: 'range', min: 0.3, max: 1, step: 0.05, fmt: (v) => v.toFixed(2), dep: 'ao' },
  { key: 'aoFull', label: 'Full-resolution occlusion', kind: 'toggle', hint: 'Sharper occlusion on thin parts; costs about twice as much.', dep: 'ao' },
  { key: 'reflections', label: 'Reflections', kind: 'select', choices: [['basic', 'Basic · sky only'], ['scene', 'Scene · hangar captured']],
    hint: 'Scene captures the hangar into the reflection map so metal reflects its lamps and walls.' },
  { key: 'haze', label: 'Light shafts', kind: 'toggle', hint: 'Visible beams in the hangar air under each lamp.' },
  { key: 'bloom', label: 'Bloom', kind: 'toggle', hint: 'Glow around the sun, drive plumes, cut seams and the laser.' },
  { key: 'bloomStrength', label: 'Bloom strength', kind: 'range', min: 0.1, max: 1.2, step: 0.05, fmt: (v) => v.toFixed(2), dep: 'bloom' },
  { key: 'flare', label: 'Lens flare', kind: 'toggle', hint: 'Ghosts and glare from the sun and other very bright light.', dep: 'bloom' },
  { key: 'cinematic', label: 'Camera finish', kind: 'toggle', hint: 'Subtle vignette, film grain and lens fringing at the edges of the frame.' },
];

function loadGfx() {
  let g = null;
  try { g = JSON.parse(localStorage.getItem(GFX_KEY) || 'null'); } catch { g = null; }
  const preset = g && GFX_PRESETS[g.preset] ? g.preset : 'high';
  return { preset, meter: false, ...GFX_PRESETS[preset], ...(g || {}) };
}
let GFX = loadGfx();
function saveGfx() { try { localStorage.setItem(GFX_KEY, JSON.stringify(GFX)); } catch { /* storage unavailable */ } }
const GFX_PRESET_KEYS = Object.keys(GFX_PRESETS.ultra);
function currentPresetName() {
  for (const [name, p] of Object.entries(GFX_PRESETS)) if (GFX_PRESET_KEYS.every((k) => GFX[k] === p[k])) return name;
  return 'custom';
}

// ---------------------------------------------------------------------
//  Pipeline: scene pass → bloom → tone map → FXAA/SMAA
// ---------------------------------------------------------------------
function msaaSamples() { return GFX.aa === 'msaa' && !world.compat ? 4 : 0; }
function buildPipeline(sc, cam, opts = {}) {
  const p = pass(sc, cam, { samples: msaaSamples() });
  if (GFX.ao) p.setMRT(mrt({ output, normal: directionToColor(normalView) }));
  const col = p.getTextureNode('output');
  let out = col;
  if (GFX.ao) {
    const nTex = p.getTextureNode('normal');
    const aoNode = ao(p.getTextureNode('depth'), sample((u) => colorToDirection(nTex.sample(u))), cam);
    aoNode.resolutionScale = GFX.aoFull ? 1 : 0.5;
    aoNode.radius.value = opts.aoRadius || 3;
    aoNode.distanceExponent.value = 1.4;
    aoNode.thickness.value = opts.aoThickness || 2;
    const occ = aoNode.getTextureNode().r;
    out = vec4(col.rgb.mul(mix(float(1), occ, GFX.aoStrength)), col.a);
  }
  let bloomNode = null;
  if (GFX.bloom) {
    bloomNode = bloom(out, GFX.bloomStrength, 0.45, 1.25);
    out = out.add(bloomNode);
    if (GFX.flare) {
      const fl = lensflare(bloomNode, { threshold: float(opts.flareThreshold || 0.85), ghostSamples: float(4), ghostSpacing: float(0.22), ghostAttenuationFactor: float(28), downSampleRatio: 4 });
      out = out.add(fl.mul(opts.flareGain || 0.35));
    }
  }
  const pipe = new THREE.RenderPipeline(renderer);
  if (GFX.aa === 'fxaa' || GFX.aa === 'smaa' || GFX.cinematic) {
    // edge filters and the camera finish work on the final, tone-mapped image
    pipe.outputColorTransform = false;
    out = renderOutput(out);
    if (GFX.cinematic) out = chromaticAberration(out, float(0.04), vec2(0.5, 0.5), float(1.0));
    if (GFX.aa === 'fxaa') out = fxaa(out);
    else if (GFX.aa === 'smaa') out = smaa(out);
    if (GFX.cinematic) {
      const d = screenUV.sub(0.5).mul(vec2(1.0, 0.82)).length();
      const vig = float(1).sub(smoothstep(0.45, 0.95, d).mul(0.32));
      out = film(vec4(out.rgb.mul(vig), 1), float(0.12));
    }
  }
  pipe.outputNode = out;
  return { pipe, bloom: bloomNode };
}

function basePixelRatio() { return THREE.MathUtils.clamp(window.devicePixelRatio * GFX.renderScale, 0.5, 2.5); }

// cascaded sun shadows cover the whole field; the near map follows the ship
let csm = null;
function setShadowRange(far) {
  if (far && !csm) {
    csm = new CSMShadowNode(sunLight, { cascades: 3, maxFar: 2400, mode: 'practical', lightMargin: 600 });
    csm.fade = true;
    sunLight.shadow.shadowNode = csm;
  } else if (!far && csm) {
    sunLight.shadow.shadowNode = null; csm.dispose?.(); csm = null;
  }
  world.csm = !!csm;
}
// the hangar reflects itself: capture it once into a prefiltered environment map
let hubEnvRT = null;
function setHubReflections(on) {
  if (on && !hubEnvRT) {
    const keep = HUB.scene.environment;
    HUB.scene.environment = null;
    for (const m of HUB.models) if (m) m.grp.visible = false;
    HUB.shafts.visible = false;
    const pm = new THREE.PMREMGenerator(renderer);
    hubEnvRT = pm.fromScene(HUB.scene, 0.03, 0.5, 400, { size: 256, position: new THREE.Vector3(0, 18, 0) });
    pm.dispose();
    for (const m of HUB.models) if (m) m.grp.visible = true;
    HUB.shafts.visible = !!GFX.haze;
    HUB.scene.environment = hubEnvRT.texture; HUB.scene.environmentIntensity = 0.7;
    HUB.envKeep = keep;
  } else if (!on && hubEnvRT) {
    HUB.scene.environment = HUB.envKeep || world.env; HUB.scene.environmentIntensity = 0.18;
    hubEnvRT.dispose(); hubEnvRT = null;
  }
}

// apply everything; rebuilds both pipelines (flight and hangar)
function applyGraphics() {
  if (!world.gfxBoot) world.gfxBoot = { ...GFX };
  const pr = basePixelRatio();
  renderer.setPixelRatio(pr);
  world.q = { avg: 16, t: 0, pr, base: pr };
  // shadows: caster state and map size (the renderer resizes the map on its next shadow pass)
  // switching casting on/off at runtime trips an ordering bug in three r186, so that part is fixed at start-up
  const size = GFX.shadows | 0;
  if (world.shadowsOn === undefined) world.shadowsOn = size > 0 && !DBG.has('noshadow');
  for (const light of [sunLight, HUB && HUB.key].filter(Boolean)) {
    light.castShadow = world.shadowsOn;
    if (size > 0) light.shadow.mapSize.set(size, size);
  }
  // cascades are also chosen once at start-up (swapping the shadow node live has the same ordering problem)
  if (!world.csmInit) { world.csmInit = true; setShadowRange(world.shadowsOn && GFX.shadowRange === 'far'); }
  if (HUB) { HUB.shafts.visible = !!GFX.haze; setHubReflections(GFX.reflections === 'scene'); }
  if (pipeline) pipeline.dispose?.();
  const main = buildPipeline(scene, camera, { aoRadius: 4.5, aoThickness: 3 });
  pipeline = main.pipe; world.bloom = main.bloom;
  if (world.bloom && toggles.ir) world.bloom.strength.value = 0.9;
  if (HUB) { HUB.pipe.dispose?.(); HUB.pipe = buildPipeline(HUB.scene, HUB.cam, { aoRadius: 2.2, aoThickness: 1.5, flareThreshold: 1.6, flareGain: 0.15 }).pipe; }
  $('perf').hidden = !GFX.meter;
}

// dynamic resolution, called once per frame
function updateDynamicRes(dt) {
  const q = world.q; if (!q) return;
  q.avg += (dt * 1000 - q.avg) * 0.05; q.t += dt;
  if (!GFX.dynamicRes || q.t < 1.5) return;
  q.t = 0;
  if (q.avg > 24 && q.pr > q.base * 0.6) { q.pr = Math.max(q.base * 0.6, q.pr - 0.12); renderer.setPixelRatio(q.pr); }
  else if (q.avg < 13 && q.pr < q.base) { q.pr = Math.min(q.base, q.pr + 0.08); renderer.setPixelRatio(q.pr); }
}

// ---------------------------------------------------------------------
//  Frame-time meter (F3)
// ---------------------------------------------------------------------
const perf = { frames: new Float32Array(240), i: 0, n: 0, t: 0 };
function updatePerf(dt) {
  perf.frames[perf.i] = dt * 1000; perf.i = (perf.i + 1) % perf.frames.length; perf.n = Math.min(perf.n + 1, perf.frames.length);
  // counters accumulate over every pass of the frame; read and reset them once per frame
  const info = renderer.info;
  info.autoReset = false;
  perf.draws = info.render.drawCalls; perf.tris = info.render.triangles;
  info.reset();
  perf.t -= dt;
  if (!GFX.meter || perf.t > 0) return;
  perf.t = 0.25;
  const arr = Array.from(perf.frames.slice(0, perf.n)).sort((a, b) => a - b);
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  const p99 = arr[Math.min(arr.length - 1, Math.floor(arr.length * 0.99))];
  const res = renderer.getDrawingBufferSize ? renderer.getDrawingBufferSize(new THREE.Vector2()) : { x: 0, y: 0 };
  $('perf').innerHTML = `<b>${(1000 / avg).toFixed(0)} fps</b> · ${avg.toFixed(1)} ms · worst ${p99.toFixed(1)} ms<br>` +
    `<span>${world.backend} · ${res.x}×${res.y} (${Math.round((world.q?.pr || 1) / window.devicePixelRatio * 100)}%) · ${perf.draws} draws · ${(perf.tris / 1000).toFixed(0)}k tris</span>`;
}
window.addEventListener('keydown', (e) => {
  if (e.code === 'F3') { e.preventDefault(); GFX.meter = !GFX.meter; saveGfx(); $('perf').hidden = !GFX.meter; if ($('gfx') && !$('gfx').hidden) renderGfxPanel(); }
});

// ---------------------------------------------------------------------
//  Settings panel
// ---------------------------------------------------------------------
function renderGfxPanel() {
  const cur = currentPresetName();
  const presets = ['low', 'medium', 'high', 'ultra'].map((p) => `<button type="button" class="card ${cur === p ? 'sel' : ''}" data-gfx-preset="${p}"><b>${p}</b></button>`).join('');
  const rows = GFX_OPTIONS.map((o) => {
    const v = GFX[o.key];
    const off = o.dep && !GFX[o.dep];
    let ctl = '';
    if (o.kind === 'toggle') ctl = `<button type="button" class="tog ${v ? 'on' : ''}" data-gfx-key="${o.key}" aria-pressed="${v ? 'true' : 'false'}">${v ? 'On' : 'Off'}</button>`;
    else if (o.kind === 'select') ctl = `<select data-gfx-key="${o.key}" id="gfx-${o.key}">${o.choices.map(([val, lbl]) => `<option value="${val}" ${String(val) === String(v) ? 'selected' : ''}>${lbl}</option>`).join('')}</select>`;
    else ctl = `<input type="range" id="gfx-${o.key}" data-gfx-key="${o.key}" min="${o.min}" max="${o.max}" step="${o.step}" value="${v}"><output>${o.fmt(v)}</output>`;
    const note = o.key === 'aa' && GFX.aa === 'msaa' && world.compat ? 'Not available in WebGPU compatibility mode; edges are unfiltered.' : o.hint || '';
    return `<div class="grow ${off ? 'dim' : ''}"><div class="gl"><b>${o.label}</b>${note ? `<span>${note}</span>` : ''}</div><div class="gc">${ctl}</div></div>`;
  }).join('');
  $('gfxbody').innerHTML = `
    <div class="cards4">${presets}</div>
    <p class="m">${cur === 'custom' ? 'Custom settings.' : `Preset: ${cur}.`} Changes apply immediately${needsReload() ? '' : '.'}${needsReload() ? ', except one that needs a reload. <button type="button" class="mini" id="gfxreload">Reload now</button>' : ''}</p>
    <div class="grows">${rows}
      <div class="grow"><div class="gl"><b>Frame-time meter</b><span>Also F3. Shows fps, frame time, the slowest 1% of frames, resolution and draw calls.</span></div>
        <div class="gc"><button type="button" class="tog ${GFX.meter ? 'on' : ''}" data-gfx-key="meter" aria-pressed="${GFX.meter}">${GFX.meter ? 'On' : 'Off'}</button></div></div>
      <div class="grow"><div class="gl"><b>Renderer</b><span id="gfxrend"></span></div><div class="gc" id="gfxrendc"></div></div>
    </div>
    <div class="actions">
      <button type="button" class="go" id="benchgo">Run benchmark</button>
      <span class="status" id="benchres">${world.lastBench ? world.lastBench : '20 s scripted flight through Halvard’s Wake with your current settings.'}</span>
    </div>`;
  // the renderer choice lives in the hub's tech line; mirror it here
  $('gfxrend').textContent = $('techtext').textContent;
  $('gfxrendc').appendChild($('rendpref').cloneNode(true)).id = 'rendpref2';
  const r2 = $('rendpref2'); r2.value = world.rendererPref;
  r2.addEventListener('change', () => { try { localStorage.setItem('salvage.renderer', r2.value); } catch { /* storage unavailable */ } $('rendpref').value = r2.value; $('rendnote').hidden = false; $('gfxrend').textContent = 'Applies after reload.'; });
}
function needsReload() {
  return GFX_OPTIONS.some((o) => o.reload && world.gfxBoot && o.reload(world.gfxBoot[o.key], GFX[o.key]));
}
function setGfx(key, val) {
  GFX[key] = val; GFX.preset = currentPresetName();
  saveGfx(); applyGraphics(); renderGfxPanel();
}
function openGfx() { $('gfx').hidden = false; renderGfxPanel(); }
function closeGfx() { $('gfx').hidden = true; }
function bindGfxPanel() {
  $('gfxbody').addEventListener('click', (e) => {
    const p = e.target.closest('[data-gfx-preset]');
    if (p) { Object.assign(GFX, GFX_PRESETS[p.dataset.gfxPreset]); GFX.preset = p.dataset.gfxPreset; saveGfx(); applyGraphics(); renderGfxPanel(); return; }
    const t = e.target.closest('button.tog[data-gfx-key]');
    if (t) { setGfx(t.dataset.gfxKey, !GFX[t.dataset.gfxKey]); return; }
    if (e.target.id === 'benchgo') runBenchmark();
    if (e.target.id === 'gfxreload') location.reload();
  });
  $('gfxbody').addEventListener('change', (e) => {
    const k = e.target.dataset?.gfxKey; if (!k) return;
    const o = GFX_OPTIONS.find((x) => x.key === k);
    const raw = e.target.value;
    setGfx(k, o.kind === 'range' ? parseFloat(raw) : (o.choices && typeof o.choices[0][0] === 'number' ? parseInt(raw, 10) : raw));
  });
  $('gfxbody').addEventListener('input', (e) => {
    if (e.target.type === 'range') { const o = GFX_OPTIONS.find((x) => x.key === e.target.dataset.gfxKey); e.target.nextElementSibling.textContent = o.fmt(parseFloat(e.target.value)); }
  });
  $('gfxclose').addEventListener('click', closeGfx);
  $('hubgfx').addEventListener('click', openGfx);
  $('pausegfx').addEventListener('click', openGfx);
  window.addEventListener('keydown', (e) => { if (e.code === 'Escape' && !$('gfx').hidden) { e.stopImmediatePropagation(); closeGfx(); } }, true);
}

// ---------------------------------------------------------------------
//  Benchmark: a fixed camera flight through Halvard's Wake
// ---------------------------------------------------------------------
const bench = { on: false, t: 0, frames: [], dur: 20 };
async function runBenchmark() {
  if (bench.on) return;
  closeGfx();
  $('hub').hidden = true;
  game.mode = 'bench';
  await newRun(1);
  writeConfig(shipConfig('cutter', []));
  disposeShipModel(SHIP); SHIP = buildShipModel('cutter', [], scene);
  game.loadout = null;
  // the path: start at the entry, sweep past escorts, run the length of the broken battlecruiser
  const w = (i) => new THREE.Vector3(wrecks[i * W.N], wrecks[i * W.N + 1], wrecks[i * W.N + 2]);
  const a = w(0), b = w(1), e1 = w(2), e2 = w(3);
  const pts = [
    new THREE.Vector3(0, 40, 600), e1.clone().add(new THREE.Vector3(60, 30, -80)), e2.clone().add(new THREE.Vector3(-70, 40, 60)),
    a.clone().add(new THREE.Vector3(-140, 120, -260)), a.clone().add(new THREE.Vector3(160, 60, 40)),
    b.clone().add(new THREE.Vector3(170, 40, -60)), b.clone().add(new THREE.Vector3(60, -80, 220)),
  ];
  bench.curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  bench.look = [e1, e2, a, a, b, b, b];
  bench.dur = parseFloat(DBG.get('benchdur')) || 20;   // automated tests use a short flight
  bench.on = true; bench.t = 0; bench.frames = []; bench.warm = 1.5;
  $('benchhud').hidden = false;
}
function updateBench(dt, t) {
  if (dt > 0) core.step(Math.min(dt, 1 / 30));
  core.clearEvents();
  syncVisuals(dt, t);
  if (bench.warm > 0) { bench.warm -= dt; } else { bench.t += dt; bench.frames.push(dt * 1000); }
  const u = THREE.MathUtils.clamp(bench.t / bench.dur, 0, 1);
  const p = bench.curve.getPointAt(u);
  const li = Math.min(bench.look.length - 1, Math.floor(u * (bench.look.length - 1) + 0.5));
  camLook.lerp(bench.look[li], 1 - Math.exp(-dt * 1.5));
  camera.position.copy(p); camera.up.set(0, 1, 0); camera.lookAt(camLook);
  pShip.copy(p);
  PLANET.grp.position.copy(camera.position).addScaledVector(planetDir, 26000);
  SUN.position.copy(camera.position).addScaledVector(sunDir, 30000);
  sunLight.position.copy(p).addScaledVector(sunDir, 600); sunLight.target.position.copy(p);
  $('benchhud').textContent = bench.warm > 0 ? 'Benchmark · warming up' : `Benchmark · ${Math.ceil(bench.dur - bench.t)} s`;
  if (bench.t >= bench.dur) finishBench();
}
function finishBench() {
  bench.on = false;
  $('benchhud').hidden = true;
  const f = bench.frames.slice().sort((a, b) => a - b);
  const avg = f.reduce((a, b) => a + b, 0) / f.length;
  const worst1 = f.slice(Math.floor(f.length * 0.99)).reduce((a, b) => a + b, 0) / Math.max(1, f.length - Math.floor(f.length * 0.99));
  const res = renderer.getDrawingBufferSize(new THREE.Vector2());
  world.lastBench = `Last run: ${(1000 / avg).toFixed(0)} fps average · slowest 1%: ${(1000 / worst1).toFixed(0)} fps · ${res.x}×${res.y} · preset ${currentPresetName()}`;
  console.info('[salvage] benchmark', world.lastBench);
  showHub(hubTab);
  openGfx();
}
