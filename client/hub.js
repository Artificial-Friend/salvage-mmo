// =====================================================================
//  HUB — Ostrava Yard. Save data, hangar bays, fitting, shipyard, missions.
//  (Concatenated after main.js and ships.js; shares their module scope.)
// =====================================================================

// ---------------------------------------------------------------------
//  Save data (per-browser; a server account replaces this later)
// ---------------------------------------------------------------------
const SAVE_KEY = 'salvage.save.v3';
const SHIP_NAMES = {
  cutter: ['Mule', 'Tern', 'Grebe', 'Wren', 'Crake', 'Dunlin', 'Pipit', 'Shrike', 'Merle', 'Snipe'],
  racer: ['Kite', 'Swift', 'Needle', 'Dart'], hauler: ['Ox', 'Dray', 'Barge', 'Packhorse'],
  gunship: ['Hound', 'Warden', 'Bastion', 'Lancer'], battlecruiser: ['Leviathan', 'Sovereign', 'Bulwark'],
};
const BAY_NAMES = ['Pad 1', 'Pad 2', 'Pad 3', 'Dry dock'];
const CONTRACT_POOL = [
  { id: 'armor2', text: 'Bring back 2 armor slabs', kind: 'type', type: 0, count: 2, reward: 260 },
  { id: 'reactor', text: 'Recover a fusion reactor core', kind: 'type', type: 5, count: 1, reward: 950 },
  { id: 'weapon', text: 'Recover any weapon', kind: 'weapon', count: 1, reward: 520 },
  { id: 'mass15', text: 'Extract with at least 15 t of salvage', kind: 'mass', t: 15, reward: 340 },
  { id: 'sensor', text: 'Recover a sensor mast', kind: 'type', type: 6, count: 1, reward: 380 },
  { id: 'quiet', text: 'Extract without waking a single drone', kind: 'quiet', reward: 420 },
  { id: 'thrust', text: 'Recover an aux thruster', kind: 'type', type: 2, count: 1, reward: 330 },
  { id: 'radiator2', text: 'Bring back 2 radiator panels', kind: 'type', type: 1, count: 2, reward: 400 },
];
const MARKET = [
  { id: 'drones', kind: 'intel', name: 'Drone survey', price: 220, text: 'Marks every dormant drone in your next zone on the tactical map and contact list.' },
  { id: 'manifest', kind: 'intel', name: 'Wreck manifest', price: 160, text: 'Marks every bolted weapon and reactor core in your next zone, at any range.' },
  { id: 'cell', kind: 'supply', name: 'Jump cell', price: 180, max: 2, text: '+0.38 jump fuel for the next run. Lets you haul roughly 8 t more home.' },
];
const ZONES = [
  { id: 'thule', name: 'Thule Gap', tier: 'Newcomer · old battlefield', open: true,
    text: 'Seven hulks from a battle nineteen years ago. Crude parts, a few weapons, five dormant drones deeper in. Particle storm risk is low.' },
  { id: 'halvard', name: "Halvard's Wake", tier: 'Open · capital-ship graveyard', open: true,
    text: 'A 700 m ARD battlecruiser broken in two, and twenty escorts and attackers around it, spread over 5 km. Its heavy guns are far too big to move, but its hull bristles with point-defense turrets. Eleven drones, most of them sleeping around the big wreck.' },
  { id: 'kessler', name: 'Kessler Drift', tier: 'Contested · debris belt', open: false, req: 'Requires an armed gunship or heavier' },
  { id: 'callisto', name: 'Callisto Picket Line', tier: 'Lethal · active warzone', open: false, req: 'Requires a warship-class hull' },
];

function newShip(cls) {
  SAVE.shipSeq = (SAVE.shipSeq || 0) + 1;
  const pool = SHIP_NAMES[cls];
  const used = new Set(SAVE.bays.filter(Boolean).map((b) => b.name));
  let name = pool.find((n) => !used.has(n));
  if (!name) name = `${pool[SAVE.shipSeq % pool.length]} ${['II', 'III', 'IV', 'V'][SAVE.shipSeq % 4]}`;
  return { cls, name, mounts: {}, built: SAVE.runs };
}
function freshSave() {
  const s = { v: 3, credits: 250, scrap: 0, runs: 0, dose: 0, nextId: 1, parts: [], bays: [null, null, null, null], active: 0,
    intel: {}, supplies: { cell: 0 }, contracts: [], contract: null, zone: 'thule', history: [], shipSeq: 0 };
  SAVE = s;
  s.bays = [newShip('cutter'), newShip('cutter'), newShip('cutter'), null];
  return s;
}
let SAVE = null;
function loadSave() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { s = null; }
  if (s && s.v === 3) { SAVE = s; }
  else {
    s = freshSave();
    // carry everything over from the v2 save: parts go back to storage, the project hull's fittings included
    try {
      const old = JSON.parse(localStorage.getItem('salvage.save.v2') || 'null');
      if (old && old.v === 2) {
        s.credits = old.credits; s.runs = old.runs; s.dose = old.dose; s.nextId = old.nextId; s.parts = old.parts || [];
        s.active = Math.min(2, old.cutter || 0); s.zone = old.zone || 'thule';
      }
    } catch { /* nothing to migrate */ }
  }
  if (!s.contracts || !s.contracts.length) s.contracts = offerContracts(s.runs);
  return s;
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch { /* storage unavailable */ } }
function offerContracts(seed) {
  const r = mulberry(seed * 7919 + 13);
  const pool = CONTRACT_POOL.slice();
  const out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0].id);
  return out;
}
SAVE = loadSave();
const contractById = (id) => CONTRACT_POOL.find((c) => c.id === id);
const partById = (id) => SAVE.parts.find((p) => p.id === id);
// where a part is fitted, if anywhere
function fittedWhere(pid) {
  for (let i = 0; i < SAVE.bays.length; i++) {
    const b = SAVE.bays[i]; if (!b) continue;
    for (const k of Object.keys(b.mounts)) if (b.mounts[k] === pid) return { bay: i, slot: k };
  }
  return null;
}
const fittedOf = (bay) => (bay ? Object.entries(bay.mounts).map(([slot, pid]) => { const p = partById(pid); return p ? { slot, type: p.type, mass: p.mass, id: p.id } : null; }).filter(Boolean) : []);
const activeBay = () => SAVE.bays[SAVE.active];
const fmtT = (kg) => `${(kg / 1000).toFixed(1)} t`;

// ---------------------------------------------------------------------
//  The hangar bay (3D)
// ---------------------------------------------------------------------
const PAD_Y = { cutter: 3.4, racer: 2.3, hauler: 4.4, gunship: 4.3 };
const DOCK_Y = { cutter: 14.5, racer: 13.4, hauler: 15.5, gunship: 15.3, battlecruiser: 23 };
function bayPose(i, cls) {
  if (i < 3) { const p = HUB.pads[i]; return { pos: new THREE.Vector3(p[0], PAD_Y[cls] || 3.5, p[1]), rotY: Math.PI * 0.5 }; }
  return { pos: new THREE.Vector3(0, DOCK_Y[cls] || 14, 0), rotY: 0 };
}
function syncBays() {
  if (!HUB) return;
  for (let i = 0; i < 4; i++) {
    const b = SAVE.bays[i];
    const key = b ? `${b.cls}|${b.name}|${JSON.stringify(b.mounts)}` : '';
    if (HUB.built[i] === key) continue;
    disposeShipModel(HUB.models[i]); HUB.models[i] = null;
    if (b) {
      const m = buildShipModel(b.cls, fittedOf(b), HUB.scene, { noLights: true, markers: true });
      m.nozzles.forEach((nz) => { nz.plume.visible = nz.core2.visible = false; });
      const pose = bayPose(i, b.cls);
      m.grp.position.copy(pose.pos); m.grp.rotation.y = pose.rotY;
      HUB.models[i] = m;
    }
    HUB.built[i] = key;
  }
}
let HUB = null;
function buildHub() {
  const hs = new THREE.Scene();
  hs.background = world.sky; hs.backgroundIntensity = 0.9;
  hs.environment = world.env; hs.environmentIntensity = 0.18;
  const cam = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.3, 90000);
  hs.add(cam);
  MAT.deck = MAT.deck || surf('deck', () => pbr(hullMaps({ seed: 81, base: '#3c4143', base2: '#2c3133', stripe: '#c9a23a', rust: 0.2, scorch: 0.15, panel: 96, bare: 0.25, rough: 0.6 })));
  MAT.wall = MAT.wall || surf('wall', () => pbr(hullMaps({ seed: 91, base: '#4a4f50', base2: '#3a3f40', stripe: '#c9a23a', rust: 0.25, scorch: 0.1, panel: 72, bare: 0.18, rough: 0.66 }), { side: THREE.DoubleSide }));
  // big surfaces get larger plating
  for (const mt of [MAT.deck, MAT.wall]) for (const k of ['map', 'roughnessMap', 'bumpMap']) if (mt[k]) mt[k].repeat.set(0.32, 0.32);
  const lampMat = new THREE.MeshStandardMaterial({ color: '#000', emissive: new THREE.Color(6.5, 5.9, 5.0) });
  const warnMat = new THREE.MeshStandardMaterial({ color: '#000', emissive: new THREE.Color(4, 1.6, 0.3) });
  // bay: 150 wide, 64 high, 190 deep; the far wall is a pressure door open to space
  const BW = 150, BH = 64, BD = 190, DOOR_W = 104, DOOR_H = 46;
  const bay = [], ribs = [], lamps = [];
  bay.push(place(boxG(BW, 2, BD), [0, -1, 0]));                       // deck
  bay.push(place(boxG(BW, 2, BD), [0, BH + 1, 0]));                   // ceiling
  bay.push(place(boxG(2, BH, BD), [BW / 2 + 1, BH / 2, 0]));          // port wall
  bay.push(place(boxG(2, BH, BD), [-BW / 2 - 1, BH / 2, 0]));         // starboard wall
  bay.push(place(boxG(BW, BH, 2), [0, BH / 2, -BD / 2 - 1]));         // back wall
  // door frame (front, +Z): wall around an opening
  const sideW = (BW - DOOR_W) / 2;
  bay.push(place(boxG(sideW, BH, 3), [DOOR_W / 2 + sideW / 2, BH / 2, BD / 2]));
  bay.push(place(boxG(sideW, BH, 3), [-DOOR_W / 2 - sideW / 2, BH / 2, BD / 2]));
  bay.push(place(boxG(DOOR_W, BH - DOOR_H, 3), [0, DOOR_H + (BH - DOOR_H) / 2, BD / 2]));
  // structural ribs on walls and ceiling
  for (let z = -BD / 2 + 12; z < BD / 2 - 6; z += 16) {
    ribs.push(place(boxG(2.4, BH, 2.4), [BW / 2 - 1.2, BH / 2, z]), place(boxG(2.4, BH, 2.4), [-BW / 2 + 1.2, BH / 2, z]));
    ribs.push(place(boxG(BW, 2.4, 2.4), [0, BH - 1.2, z]));
    lamps.push(place(boxG(1.2, 0.4, 6), [BW / 2 - 3, BH - 3, z + 8]), place(boxG(1.2, 0.4, 6), [-BW / 2 + 3, BH - 3, z + 8]));
    lamps.push(place(boxG(0.6, 0.3, 10), [0, BH - 2.6, z]), place(boxG(0.6, 0.3, 10), [30, BH - 2.6, z]), place(boxG(0.6, 0.3, 10), [-30, BH - 2.6, z]));
  }
  // gantry crane over the cradle
  ribs.push(place(boxG(BW - 6, 3, 3), [0, BH - 8, 18]), place(boxG(BW - 6, 3, 3), [0, BH - 8, -18]));
  ribs.push(place(boxG(8, 4, 40), [12, BH - 10.5, 0]));
  ribs.push(place(boxG(0.4, 26, 0.4), [12, BH - 25, 0]));
  // cradle arms for the project hull
  const cradle = [];
  for (const z of [-12, 10]) {
    cradle.push(place(boxG(1.6, 10, 1.6), [5.5, 5, z]), place(boxG(1.6, 10, 1.6), [-5.5, 5, z]));
    cradle.push(place(boxG(13, 1.2, 1.8), [0, 10.4, z]), place(boxG(1.2, 1.2, 8), [5.5, 1, z]), place(boxG(1.2, 1.2, 8), [-5.5, 1, z]));
  }
  // landing pads for the starter cutters
  const pads = [[-46, -30], [-46, 10], [-46, 50]];
  for (const [x, z] of pads) { ribs.push(place(cylG(11, 11, 0.6, 32), [x, 0.3, z])); lamps.push(place(cylG(1.6, 1.6, 0.4, 24), [x, BH - 2.6, z])); }
  const deck = new THREE.Mesh(merge([bay[0]]), MAT.deck);
  const walls = new THREE.Mesh(merge(bay.slice(1)), MAT.wall);
  const frame = new THREE.Mesh(merge(ribs), MAT.metal);
  const lampMesh = new THREE.Mesh(merge(lamps), lampMat);
  MAT.girder = MAT.girder || new THREE.MeshStandardMaterial({ color: '#6f757a', roughness: 0.48, metalness: 0.85 });
  const cradleMesh = new THREE.Mesh(merge(cradle), MAT.dark); cradleMesh.castShadow = cradleMesh.receiveShadow = true;
  frame.material = MAT.girder;
  // hazard light strip along the door sill
  const sill = new THREE.Mesh(place(boxG(DOOR_W, 0.5, 0.6), [0, 0.6, BD / 2 - 2]), warnMat);
  [deck, walls, frame].forEach((m) => { m.receiveShadow = true; m.castShadow = m !== deck; });
  hs.add(deck, walls, frame, lampMesh, sill, cradleMesh);
  // deck markings: painted guide lines
  const lineMat = new THREE.MeshStandardMaterial({ color: '#b7922f', roughness: 0.8, metalness: 0.1 });
  const lines = [];
  for (const x of [-22, 22]) lines.push(place(boxG(0.5, 0.05, 120), [x, 0.03, 20]));
  for (const [x, z] of pads) { lines.push(place(new THREE.TorusGeometry(9.5, 0.25, 4, 48), [x, 0.62, z], [Math.PI / 2, 0, 0])); }
  hs.add(new THREE.Mesh(merge(lines), lineMat));

  // lighting: work lights on the cradle, cool spill from the door
  // Lighting rig: a shadow-casting key over the dry dock, a soft overhead light per pad,
  // cool spill through the door and bounce from the deck.
  const hemiL = new THREE.HemisphereLight(new THREE.Color(0.62, 0.58, 0.52), new THREE.Color(0.16, 0.15, 0.14), 0.22);
  hs.add(hemiL);
  const key = new THREE.SpotLight(new THREE.Color(1, 0.93, 0.82), 9500, 300, 0.62, 0.6, 1.5);
  key.position.set(30, BH - 4, -24); key.target.position.set(0, 12, 0); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.4;
  const dock2 = new THREE.SpotLight(new THREE.Color(1, 0.95, 0.88), 9000, 300, 0.7, 0.7, 1.5);
  dock2.position.set(-22, BH - 4, 30); dock2.target.position.set(0, 8, 0);
  const fill = new THREE.SpotLight(new THREE.Color(0.7, 0.82, 1.0), 4500, 300, 0.8, 0.8, 1.5);
  fill.position.set(0, BH - 10, 90); fill.target.position.set(0, 4, 0);
  hs.add(key, key.target, dock2, dock2.target, fill, fill.target);
  const beams = [];
  for (const [x, z] of [[-46, -30], [-46, 10], [-46, 50]]) {
    const s = new THREE.SpotLight(new THREE.Color(1, 0.92, 0.8), 9000, 120, 0.42, 0.65, 1.5);
    s.position.set(x, BH - 3, z); s.target.position.set(x, 0, z);
    hs.add(s, s.target);
    beams.push([x, z, 14]);
  }
  beams.push([16, -2, 22], [-10, 22, 22]);
  const doorSun = new THREE.DirectionalLight(new THREE.Color(1, 0.95, 0.88), 0.6);
  doorSun.position.set(10, 30, 300); doorSun.target.position.set(0, 0, 0);
  hs.add(doorSun, doorSun.target);
  // light shafts: soft additive cones under each lamp, brightest near the source
  const shaftMat = new THREE.MeshBasicNodeMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const shaftU = uniform(1);
  const yy = uv().y;   // 1 at the lamp, 0 at the deck
  shaftMat.colorNode = vec3(1.0, 0.86, 0.66).mul(yy.pow(1.6).mul(0.05).add(0.006)).mul(abs(normalView.z).pow(2.2)).mul(shaftU);
  const shafts = new THREE.Group();
  for (const [x, z, r] of beams) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(1.2, r, BH - 4, 40, 1, true), shaftMat);
    c.position.set(x, (BH - 4) / 2, z);
    shafts.add(c);
  }
  hs.add(shafts);

  // selection marker ring under the chosen cutter
  const selRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 4, 96), new THREE.MeshStandardMaterial({ color: '#000', emissive: new THREE.Color(0.4, 2.6, 2.2) }));
  selRing.rotation.x = Math.PI / 2; hs.add(selRing);

  const pipe = buildPipeline(hs, cam).pipe;
  window.addEventListener('resize', () => { cam.aspect = window.innerWidth / window.innerHeight; cam.updateProjectionMatrix(); });
  HUB = { scene: hs, cam, pipe, key, shafts, shaftU, models: [null, null, null, null], built: ['', '', '', ''], selRing, yaw: 0.85, pitch: 0.28, dist: 70, focus: new THREE.Vector3(0, 13, 0), want: new THREE.Vector3(0, 13, 0), wantDist: 64, drag: null, auto: true, idle: 0, pads };
  bindHubInput();
  syncBays();
}

function bindHubInput() {
  const el = renderer.domElement;
  el.addEventListener('mousedown', (e) => { if (game.mode !== 'hub') return; HUB.drag = { x: e.clientX, y: e.clientY, yaw: HUB.yaw, pitch: HUB.pitch }; HUB.auto = false; HUB.idle = 0; });
  window.addEventListener('mousemove', (e) => {
    if (game.mode !== 'hub' || !HUB.drag) return;
    HUB.yaw = HUB.drag.yaw - (e.clientX - HUB.drag.x) * 0.005;
    HUB.pitch = THREE.MathUtils.clamp(HUB.drag.pitch + (e.clientY - HUB.drag.y) * 0.004, -0.15, 0.9);
  });
  window.addEventListener('mouseup', () => { if (HUB) HUB.drag = null; });
  el.addEventListener('wheel', (e) => { if (game.mode === 'hub') HUB.wantDist = THREE.MathUtils.clamp(HUB.wantDist * (1 + Math.sign(e.deltaY) * 0.1), 16, 160); }, { passive: true });
}

function focusBay() {
  if (!HUB) return;
  const i = SAVE.active, b = SAVE.bays[i];
  const pose = bayPose(i, b ? b.cls : 'cutter');
  const s = b ? HULLS_CAM[b.cls] : 1;
  HUB.want.copy(pose.pos);
  HUB.wantDist = (i < 3 ? 30 : 52) * Math.max(1, s * (i < 3 ? 0.9 : 0.55));
  // a capital hull needs a wider lens and a higher vantage inside the bay
  const capital = b && b.cls === 'battlecruiser';
  HUB.cam.fov = capital ? 66 : 48; HUB.cam.updateProjectionMatrix();
  if (capital) { HUB.pitch = Math.max(HUB.pitch, 0.42); HUB.want.set(0, 20, -10); }
}
const HULLS_CAM = { cutter: 1, racer: 0.95, hauler: 1.7, gunship: 1.45, battlecruiser: 6.5 };

function updateHub(dt) {
  if (!HUB) return;
  HUB.idle += dt;
  if (!HUB.drag && HUB.idle > 6) HUB.auto = true;
  if (HUB.auto) HUB.yaw += dt * 0.05;
  HUB.focus.lerp(HUB.want, 1 - Math.exp(-dt * 3));
  HUB.dist += (HUB.wantDist - HUB.dist) * (1 - Math.exp(-dt * 4));
  const cp = Math.cos(HUB.pitch);
  const off = new THREE.Vector3(Math.sin(HUB.yaw) * cp, Math.sin(HUB.pitch), Math.cos(HUB.yaw) * cp).multiplyScalar(HUB.dist);
  const p = HUB.focus.clone().add(off);
  p.x = THREE.MathUtils.clamp(p.x, -72, 72); p.y = THREE.MathUtils.clamp(p.y, 2.5, 60); p.z = THREE.MathUtils.clamp(p.z, -92, 92);
  HUB.cam.position.copy(p); HUB.cam.lookAt(HUB.focus);
  const W = window.innerWidth, H = window.innerHeight;
  const shift = W > 820 ? Math.min(520, W * 0.38) / 2 : 0;
  HUB.cam.setViewOffset(W, H, shift, W > 820 ? 0 : H * 0.18, W, H);
  // selection ring under the active bay
  const i = SAVE.active;
  const b = SAVE.bays[i];
  if (i < 3) { HUB.selRing.position.set(HUB.pads[i][0], 0.7, HUB.pads[i][1]); HUB.selRing.scale.setScalar(10.5); }
  else { HUB.selRing.position.set(0, 0.7, 0); HUB.selRing.scale.setScalar(b && b.cls === 'battlecruiser' ? 40 : 18); }
  HUB.selRing.material.emissive.setRGB(0.4, 2.6 * (0.75 + 0.25 * Math.sin(performance.now() / 400)), 2.2);
}

// ---------------------------------------------------------------------
//  Hub screens
// ---------------------------------------------------------------------
let hubTab = 'hangar';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (n) => `¢${Math.round(n).toLocaleString('en-US')}`;
const tag = (type) => { const i = PART_INFO[type]; return `<span class="ptag" style="color:${i.color}">${i.tag}</span>`; };

function showHub(tab) {
  game.mode = 'hub';
  $('boot').hidden = true; $('result').hidden = true; $('hud').hidden = true; $('pause').hidden = true;
  $('hub').hidden = false;
  if (tab) hubTab = tab;
  syncBays();
  renderHub();
}
function renderHub() {
  $('h-cred').textContent = money(SAVE.credits);
  $('h-scrap').textContent = `${SAVE.scrap.toFixed(1)} t`;
  $('h-parts').textContent = String(SAVE.parts.length);
  $('h-dose').textContent = `${Math.round(SAVE.dose)} mSv`;
  $('h-runs').textContent = String(SAVE.runs);
  document.querySelectorAll('.hubnav button').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === hubTab ? 'page' : 'false'));
  const views = { hangar: viewHangar, storage: viewStorage, market: viewMarket, missions: viewMissions, research: viewResearch };
  $('hubpanel').innerHTML = views[hubTab]();
  if (HUB) {
    if (hubTab === 'hangar' || hubTab === 'missions' || hubTab === 'storage') focusBay();
    else { HUB.want.set(0, 16, 30); HUB.wantDist = 80; }
  }
  const z = ZONES.find((x) => x.id === SAVE.zone);
  const b = activeBay();
  const cfg = b ? shipConfig(b.cls, fittedOf(b)) : null;
  const can = b && cfg.ready;
  $('launch').disabled = !can;
  $('launch').textContent = b ? `Launch ${b.name} · ${z.name}` : 'Launch';
  $('hubstatus').textContent = !b ? `${BAY_NAMES[SAVE.active]} is empty — pick a bay with a ship` : !cfg.ready ? `${b.name} needs a fusion reactor core in its reactor bay to fly` :
    `${SAVE.contract ? contractById(SAVE.contract).text : 'no contract'}${SAVE.supplies.cell ? ` · +${SAVE.supplies.cell} jump cell${SAVE.supplies.cell > 1 ? 's' : ''}` : ''}${Object.keys(SAVE.intel).filter((k) => SAVE.intel[k]).length ? ' · intel loaded' : ''}`;
}

function statGrid(c, C) {
  const w = [c.pdc ? `${c.pdc} PDC` : '', c.coil ? `${c.coil} coilgun` : ''].filter(Boolean).join(' · ') || '—';
  return `<div class="stats">
      <div><i>Mass, fuelled</i><b>${fmtT(c.dry + c.prop)}</b></div>
      <div><i>Acceleration</i><b>${c.accel.toFixed(1)} m/s²</b></div>
      <div><i>Δv</i><b>${Math.round(c.dv)} m/s</b></div>
      <div><i>Hull · armor</i><b>${Math.round(c.hull)} · ${Math.round(c.armor * 100)}%</b></div>
      <div><i>Hold</i><b>${fmtT(c.cargo)}</b></div>
      <div><i>Can haul home</i><b>${fmtT(c.haul)}</b></div>
      <div><i>Heat rejection</i><b>${c.heatAt500.toFixed(1)} MW</b></div>
      <div><i>Signature</i><b>×${C.sig.toFixed(2)}</b></div>
      <div><i>Weapons</i><b>${w}</b></div>
    </div>`;
}

function viewHangar() {
  const bays = SAVE.bays.map((b, i) => `<button class="card ${SAVE.active === i ? 'sel' : ''}" data-act="bay" data-i="${i}">
      <span class="zt">${BAY_NAMES[i]}</span><b>${b ? esc(b.name) : 'Empty'}</b><span>${b ? SHIP_CLASSES[b.cls].name : (i === 3 ? 'Any hull, up to capital' : 'Build a hull here')}</span></button>`).join('');
  const b = activeBay();
  let ship = '';
  if (!b) ship = `<p class="lede2">${BAY_NAMES[SAVE.active]} is empty. Build a hull here from the shipyard below.</p>`;
  else {
    const C = SHIP_CLASSES[b.cls];
    const fitted = fittedOf(b);
    const c = shipConfig(b.cls, fitted);
    const rows = C.slots.map((s) => {
      const pid = b.mounts[s.id]; const p = pid ? partById(pid) : null;
      const free = SAVE.parts.filter((x) => fitsMount(x.type, s.cls) && !fittedWhere(x.id));
      return `<div class="slot ${p ? 'full' : ''}">
        <div class="sn"><span class="cls">${MOUNT_LABEL[s.cls]}</span>${esc(s.name)}</div>
        <div class="sp">${p ? `${tag(p.type)} ${esc(PART_INFO[p.type].name)}<br><span class="m">${esc(PART_EFFECT[p.type] || '')} · ${fmtT(p.mass)}</span>` : `<span class="m">empty${free.length ? ` · ${free.length} in storage fit` : ''}</span>`}</div>
        <div class="sa">${p ? `<button class="mini ghost" data-act="unmount" data-slot="${s.id}">Remove</button>` : (free.length ? `<button class="mini" data-act="mountbest" data-slot="${s.id}">Install</button>` : '')}</div>
      </div>`;
    }).join('');
    ship = `<h3 class="sec">${esc(b.name)} <span>${C.name} · ${Object.keys(b.mounts).length}/${C.slots.length} mounts</span></h3>
      <p class="lede2">${esc(C.blurb)}</p>
      ${statGrid(c, C)}
      ${c.ready ? '' : '<div class="ready">Needs a fusion reactor core in its reactor bay before it can fly.</div>'}
      <div class="slots">${rows}</div>
      <p class="m">If this ship is lost, its fittings are lost with it and the bay gets a fresh cutter.</p>`;
  }
  const yard = CLASS_ORDER.filter((k) => k !== 'cutter').map((k) => {
    const C = SHIP_CLASSES[k];
    const c = shipConfig(k, []);
    const okBay = C.bay !== 'dock' || SAVE.active === 3;
    const afford = SAVE.scrap >= C.scrap;
    const cur = activeBay();
    const label = !okBay ? 'Dry dock only' : !afford ? `Needs ${C.scrap} t scrap` : cur ? `Replace ${cur.name}` : `Build in ${BAY_NAMES[SAVE.active]}`;
    return `<div class="mcard">
      <div class="mh"><b>${C.name}</b><span>${C.scrap} t scrap</span></div>
      <p>${esc(C.blurb)}</p>
      <div class="mf"><span class="m">${c.accel.toFixed(1)} m/s² · hold ${fmtT(c.cargo)} · hull ${c.hull} · ${C.slots.length} mounts</span>
      <button class="mini" data-act="build" data-cls="${k}" ${okBay && afford ? '' : 'disabled'}>${label}</button></div>
    </div>`;
  }).join('');
  const cutterCard = activeBay() && activeBay().cls !== 'cutter' ? '' : (activeBay() ? '' : `<button class="mini" data-act="build" data-cls="cutter">Roll out a starter cutter here (free)</button>`);
  return `
    <h2>Hangar</h2>
    <div class="cards4">${bays}</div>
    ${ship}
    <h3 class="sec">Shipyard <span>${SAVE.scrap.toFixed(1)} t scrap in the yard</span></h3>
    <p class="lede2">Harpoon loose hull fragments and winch them aboard, or break down parts in Storage. Replacing a ship returns its fittings to storage and half the scrap it cost.</p>
    ${cutterCard}
    <div class="mgrid">${yard}</div>`;
}

function viewStorage() {
  const b = activeBay();
  if (!SAVE.parts.length) return `<h2>Storage</h2><p class="lede2">Nothing in storage yet. Parts you extract with land here, tagged with the hulk they were torn from.</p><button class="mini" data-act="tab" data-tab="missions">Plan a run</button>`;
  const total = SAVE.parts.reduce((a, p) => a + (fittedWhere(p.id) ? 0 : p.value), 0);
  const rows = SAVE.parts.slice().sort((a, x) => x.value - a.value).map((p) => {
    const where = fittedWhere(p.id);
    const canMount = b && !where && SHIP_CLASSES[b.cls].slots.some((s) => fitsMount(p.type, s.cls) && !b.mounts[s.id]);
    return `<tr>
      <td>${tag(p.type)}<br>${esc(PART_INFO[p.type].name)}<br><span class="m">${esc(PART_EFFECT[p.type] || '')}</span></td>
      <td class="prov">${esc(p.prov)}</td>
      <td class="num">${fmtT(p.mass)}</td>
      <td class="num">${money(p.value)}</td>
      <td class="act">${where ? `<span class="m">on ${esc(SAVE.bays[where.bay].name)}</span>` : `${canMount ? `<button class="mini" data-act="mount" data-id="${p.id}">Fit to ${esc(b.name)}</button>` : ''}<button class="mini ghost" data-act="sell" data-id="${p.id}">Sell</button><button class="mini ghost" data-act="scrap" data-id="${p.id}">Scrap ${(p.mass * 0.6 / 1000).toFixed(1)} t</button>`}</td>
    </tr>`;
  }).join('');
  return `<h2>Storage</h2>
    <p class="lede2">${SAVE.parts.length} parts · ${money(total)} if you sold everything not fitted. Breaking a part down yields 60% of its mass as scrap.</p>
    <div class="wrapx"><table class="loot"><tr><th>Part</th><th>Torn from</th><th class="num">Mass</th><th class="num">Value</th><th></th></tr>${rows}</table></div>`;
}

function viewMarket() {
  const cards = MARKET.map((m) => {
    const owned = m.kind === 'intel' ? !!SAVE.intel[m.id] : (SAVE.supplies[m.id] || 0);
    const max = m.kind === 'intel' ? 1 : m.max;
    const full = m.kind === 'intel' ? owned : owned >= max;
    const afford = SAVE.credits >= m.price;
    return `<div class="mcard">
      <div class="mh"><b>${esc(m.name)}</b><span>${money(m.price)}</span></div>
      <p>${esc(m.text)}</p>
      <div class="mf">${m.kind === 'intel' ? (owned ? '<span class="chip ok">Loaded for next run</span>' : '<span class="m">One run only · reports age fast</span>') : `<span class="m">${owned}/${max} loaded</span>`}
      ${full ? '' : `<button class="mini" data-act="buy" data-id="${m.id}" ${afford ? '' : 'disabled'}>${afford ? 'Buy' : 'Not enough credits'}</button>`}</div>
    </div>`;
  }).join('');
  const scrapSell = SAVE.scrap >= 1 ? `<div class="mcard"><div class="mh"><b>Sell scrap</b><span>¢12 / t</span></div><p>The yard buys raw scrap at a poor rate. Keep it if you are saving for a hull.</p><div class="mf"><span class="m">${SAVE.scrap.toFixed(1)} t in the yard</span><button class="mini ghost" data-act="sellscrap">Sell 10 t</button></div></div>` : '';
  return `<h2>Market</h2>
    <p class="lede2">Sell salvage from Storage. Intel and supplies are spent on your next run, whether you come back or not.</p>
    <div class="mgrid">${cards}${scrapSell}</div>`;
}

function viewMissions() {
  const zones = ZONES.map((z) => `<button class="zone ${SAVE.zone === z.id ? 'sel' : ''}" data-act="zone" data-id="${z.id}" ${z.open ? '' : 'disabled'}>
      <span class="zt">${esc(z.tier)}</span><b>${esc(z.name)}</b><span class="m">${esc(z.open ? z.text : z.req)}</span></button>`).join('');
  const offers = SAVE.contracts.map((id) => { const c = contractById(id); return `<button class="contract ${SAVE.contract === id ? 'sel' : ''}" data-act="contract" data-id="${id}"><span>${esc(c.text)}</span><b>+${money(c.reward)}</b></button>`; }).join('');
  const b = activeBay();
  const c = b ? shipConfig(b.cls, fittedOf(b)) : null;
  const jf = c ? c.jf + (SAVE.supplies.cell || 0) * 0.38 : 0;
  return `<h2>Missions</h2>
    <h3 class="sec">Zone</h3>
    <div class="zones">${zones}</div>
    <h3 class="sec">Contract <span>optional · one per run</span></h3>
    <div class="contracts">${offers}<button class="contract ${!SAVE.contract ? 'sel' : ''}" data-act="contract" data-id=""><span>Free salvage, no contract</span><b></b></button></div>
    <h3 class="sec">Ship <span>change it in the Hangar</span></h3>
    ${b ? `<div class="stats">
      <div><i>Ship</i><b>${esc(b.name)} · ${SHIP_CLASSES[b.cls].name}</b></div>
      <div><i>Jump fuel</i><b>${jf.toFixed(2)}</b></div>
      <div><i>Can haul home</i><b>${fmtT(c.haul)}</b></div>
      <div><i>Drone survey</i><b>${SAVE.intel.drones ? 'loaded' : '—'}</b></div>
      <div><i>Wreck manifest</i><b>${SAVE.intel.manifest ? 'loaded' : '—'}</b></div>
      <div><i>Weapons</i><b>${[c.pdc ? `${c.pdc} PDC` : '', c.coil ? `${c.coil} coilgun` : ''].filter(Boolean).join(' · ') || '—'}</b></div>
    </div>` : '<p class="lede2">The selected bay is empty.</p>'}
    <p class="m">Controls are listed in the pause menu (Esc) during a run.</p>`;
}

function viewResearch() {
  const tree = [
    { b: 'Thermal', n: ['Heat pump loop', 'Droplet radiators', 'Cryo heat sink'] },
    { b: 'Propulsion', n: ['Quiet thruster nozzles', 'High-Isp drive tuning', 'Gimballed main drive'] },
    { b: 'Salvage', n: ['Fast cutter head', 'Twin winch', 'Magnetic cargo clamps'] },
    { b: 'Systems', n: ['Faction adapters', 'Rad-hardened electronics', 'Passive sensor array'] },
  ];
  return `<h2>Research</h2>
    <p class="lede2">Research opens in a later build. It will cost credits and salvaged parts, and each branch changes how you play rather than just adding numbers.</p>
    <div class="tree">${tree.map((t) => `<div class="branch"><h4>${t.b}</h4>${t.n.map((n, i) => `<div class="node"><span class="lvl">${i + 1}</span>${n}</div>`).join('')}</div>`).join('')}</div>`;
}

function hubAction(e) {
  const btn = e.target.closest('[data-act]'); if (!btn || btn.disabled) return;
  const act = btn.dataset.act;
  const b = activeBay();
  if (act === 'tab') hubTab = btn.dataset.tab;
  else if (act === 'bay') SAVE.active = +btn.dataset.i;
  else if (act === 'zone') SAVE.zone = btn.dataset.id;
  else if (act === 'contract') SAVE.contract = btn.dataset.id || null;
  else if (act === 'sell' || act === 'scrap') {
    const p = partById(+btn.dataset.id); if (!p || fittedWhere(p.id)) return;
    if (act === 'sell') SAVE.credits += p.value; else SAVE.scrap += (p.mass * 0.6) / 1000;
    SAVE.parts = SAVE.parts.filter((x) => x !== p);
    beep(1100, 0.05, 0.05, 'sine');
  } else if (act === 'sellscrap') { const t = Math.min(10, SAVE.scrap); SAVE.scrap -= t; SAVE.credits += t * 12; }
  else if (act === 'mount' && b) {
    const p = partById(+btn.dataset.id);
    const slot = SHIP_CLASSES[b.cls].slots.find((s) => fitsMount(p.type, s.cls) && !b.mounts[s.id]);
    if (slot) b.mounts[slot.id] = p.id;
  } else if (act === 'mountbest' && b) {
    const slot = SHIP_CLASSES[b.cls].slots.find((s) => s.id === btn.dataset.slot);
    const best = SAVE.parts.filter((x) => fitsMount(x.type, slot.cls) && !fittedWhere(x.id)).sort((a, x) => x.value - a.value)[0];
    if (best) b.mounts[slot.id] = best.id;
  } else if (act === 'unmount' && b) delete b.mounts[btn.dataset.slot];
  else if (act === 'build') {
    const k = btn.dataset.cls; const C = SHIP_CLASSES[k];
    if (SAVE.scrap < C.scrap) return;
    if (C.bay === 'dock' && SAVE.active !== 3) return;
    if (b && b.cls !== 'cutter') SAVE.scrap += SHIP_CLASSES[b.cls].scrap * 0.5;   // fittings return to storage automatically
    SAVE.scrap -= C.scrap;
    SAVE.bays[SAVE.active] = newShip(k);
    beep(520, 0.2, 0.08, 'triangle');
  } else if (act === 'buy') {
    const m = MARKET.find((x) => x.id === btn.dataset.id);
    if (SAVE.credits < m.price) return;
    SAVE.credits -= m.price;
    if (m.kind === 'intel') SAVE.intel[m.id] = true; else SAVE.supplies[m.id] = (SAVE.supplies[m.id] || 0) + 1;
    beep(1100, 0.05, 0.05, 'sine');
  }
  persist(); syncBays(); renderHub();
}

// ---------------------------------------------------------------------
//  Run start / end bookkeeping
// ---------------------------------------------------------------------
function applyLoadout() {
  const b = activeBay();
  const fitted = fittedOf(b);
  const c = shipConfig(b.cls, fitted);
  writeConfig(c);
  ship[S.JF] += (SAVE.supplies.cell || 0) * 0.38;
  // the flight model carries the same fittings the hangar shows
  disposeShipModel(SHIP);
  SHIP = buildShipModel(b.cls, fitted, scene);
  if (toggles.ir) SHIP.grp.traverse((o) => { if (o.isMesh && o.userData.ir) { o.userData.vis = o.material; o.material = o.userData.ir; } });
  game.loadout = { intel: { ...SAVE.intel }, contract: SAVE.contract, bay: SAVE.active, ship: b.name, cls: b.cls, cells: SAVE.supplies.cell || 0, sensors: c.sensors };
  SAVE.supplies.cell = 0; SAVE.intel = {};
  persist();
  $('shipname').textContent = `${b.name} · ${SHIP_CLASSES[b.cls].name}`;
  camDist = 24;
}
function evalContract(id, cargoTypes, cargoMass) {
  const c = contractById(id); if (!c) return null;
  let done = false, prog = '';
  if (c.kind === 'type') { const n = cargoTypes.filter((t) => t === c.type).length; done = n >= c.count; prog = `${Math.min(n, c.count)}/${c.count}`; }
  else if (c.kind === 'weapon') { const n = cargoTypes.filter((t) => PART_INFO[t].weapon).length; done = n >= 1; prog = `${Math.min(n, 1)}/1`; }
  else if (c.kind === 'mass') { done = cargoMass >= c.t * 1000; prog = `${(cargoMass / 1000).toFixed(1)}/${c.t} t`; }
  else if (c.kind === 'quiet') { done = (game.stats.wakes || 0) === 0; prog = done ? 'no drone awake' : `${game.stats.wakes} woke`; }
  return { c, done, prog };
}
function cargoNow() {
  const cp = new Int32Array(mem, core.cargoPtr(), 16);
  const idx = []; for (let i = 0; i < (ship[S.CARGO_N] | 0); i++) idx.push(cp[i]);
  return idx;
}

// results screen
function showResult(extracted, cause) {
  game.running = false;
  toggles.tac = false; setTacVisible(false);
  game.ignoreUnlockUntil = performance.now() + 500;
  if (document.pointerLockElement) document.exitPointerLock();
  $('hud').hidden = true;
  const idx = cargoNow();
  const types = idx.map((i) => parts[i * P.N + P.TYPE] | 0);
  const cargoMass = ship[S.CARGO];
  const scrapKg = ship[S.SCRAP];
  let rows = '', total = 0, weapons = 0;
  for (const i of idx) {
    const o = i * P.N; const type = parts[o + P.TYPE] | 0; const info = PART_INFO[type];
    const val = Math.round(parts[o + P.VALUE]); total += val; if (info.weapon) weapons++;
    const prov = PARTS[i]?.prov ?? 'unknown hulk';
    rows += `<tr><td>${tag(type)}<br>${info.name}</td><td>torn from ${esc(prov)}</td><td class="num">${fmtT(parts[o + P.MASS])}</td><td class="num">${money(val)}</td></tr>`;
    if (extracted) SAVE.parts.push({ id: SAVE.nextId++, type, prov, mass: Math.round(parts[o + P.MASS]), value: val });
  }
  if (scrapKg > 0) rows += `<tr><td><span class="ptag" style="color:#c9b98a">SCRAP</span><br>Hull fragments</td><td>loose debris</td><td class="num">${fmtT(scrapKg)}</td><td class="num">—</td></tr>`;
  const ce = game.loadout?.contract ? evalContract(game.loadout.contract, types, cargoMass) : null;
  let contractLine = '';
  if (ce) {
    const paid = extracted && ce.done;
    if (paid) SAVE.credits += ce.c.reward;
    contractLine = paid ? `Contract complete: ${ce.c.text} — ${money(ce.c.reward)} paid.` : `Contract failed: ${ce.c.text} (${extracted ? ce.prog : 'ship lost'}).`;
  }
  // the ship itself
  const bayIdx = game.loadout ? game.loadout.bay : SAVE.active;
  const flown = SAVE.bays[bayIdx];
  let shipLine = '';
  if (extracted) {
    SAVE.scrap += scrapKg / 1000;
    SAVE.dose += ship[S.DOSE];
  } else if (flown) {
    const lost = fittedOf(flown);
    const lostIds = new Set(lost.map((f) => f.id));
    SAVE.parts = SAVE.parts.filter((p) => !lostIds.has(p.id));
    SAVE.bays[bayIdx] = null;
    const fresh = newShip('cutter');
    SAVE.bays[bayIdx] = fresh;
    shipLine = ` ${flown.name} is gone${lost.length ? `, and its ${lost.length} fitting${lost.length > 1 ? 's' : ''} with it` : ''}. The yard rolled out a fresh cutter, ${fresh.name}, in ${BAY_NAMES[bayIdx]}.`;
  }
  SAVE.runs++;
  SAVE.contract = null;
  SAVE.contracts = offerContracts(SAVE.runs);
  SAVE.history.unshift({ run: SAVE.runs, extracted, parts: idx.length, value: total, ship: flown ? flown.name : '' });
  SAVE.history = SAVE.history.slice(0, 20);
  persist();
  const zn = game.zone === 1 ? "Halvard's Wake" : 'Thule Gap';
  $('reseye').textContent = extracted ? `Extraction · ${zn} → Ostrava Yard` : `Ship lost · ${zn}`;
  $('restitle').textContent = extracted ? (idx.length || scrapKg ? 'Jumped home' : 'Home empty-handed') : ['Ship lost', 'Hull breached', 'Crew lost'][cause] || 'Ship lost';
  const causes = ['', 'The hull gave out.', 'Radiation and heat killed the crew.'];
  const body = extracted
    ? (idx.length || scrapKg ? `${idx.length} part${idx.length === 1 ? '' : 's'} went into storage worth ${money(total)}${scrapKg ? `, and ${fmtT(scrapKg)} of scrap into the yard` : ''}.${weapons ? ` That includes ${weapons > 1 ? `${weapons} weapons` : 'a weapon'} to fit.` : ''}` : 'You jumped out with an empty hold. The parts are still out there.')
    : `${causes[cause] || ''} The cargo stays out there as salvage for someone else.${shipLine}`;
  $('reslede').textContent = `${body}${contractLine ? ` ${contractLine}` : ''}`;
  $('loot').innerHTML = rows ? `<tr><th>Item</th><th>Provenance</th><th class="num">Mass</th><th class="num">Value</th></tr>${rows}` : '';
  $('stashline2').innerHTML = `<span>Credits <b>${money(SAVE.credits)}</b></span><span>Scrap <b>${SAVE.scrap.toFixed(1)} t</b></span><span>Parts in storage <b>${SAVE.parts.length}</b></span><span>Crew lifetime dose <b>${Math.round(SAVE.dose)} mSv</b></span>`;
  $('result').hidden = false;
}

// contract progress line in the flight HUD
function updateContractHud() {
  const id = game.loadout?.contract;
  if (!id) { if (game.ctHtml !== '') { $('contract').innerHTML = ''; game.ctHtml = ''; } return; }
  const idx = cargoNow();
  const ce = evalContract(id, idx.map((i) => parts[i * P.N + P.TYPE] | 0), ship[S.CARGO]);
  const html = `<span class="${ce.done ? 'ok' : ''}">Contract · ${esc(ce.c.text)} · ${ce.prog}${ce.done ? ' ✓' : ''}</span>`;
  if (game.ctHtml !== html) { $('contract').innerHTML = html; game.ctHtml = html; }
}

// ---------------------------------------------------------------------
//  Wire-up
// ---------------------------------------------------------------------
document.querySelectorAll('.hubnav button').forEach((b) => b.addEventListener('click', () => { hubTab = b.dataset.tab; renderHub(); }));
$('hubpanel').addEventListener('click', hubAction);
$('launch').addEventListener('click', async () => {
  if (!world.ready || !activeBay()) return;
  $('hub').hidden = true;
  game.mode = 'flight';
  await newRun(SAVE.zone === 'halvard' ? 1 : 0);
  applyLoadout();
  launch();
});
$('tohub').addEventListener('click', () => { showHub('hangar'); });

start();
