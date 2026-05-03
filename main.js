//  Solarpunk Core


const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04090f);
scene.fog = new THREE.FogExp2(0x04090f, 0.018);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 1.7, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
document.body.appendChild(renderer.domElement);

// ── State ─────
const keys = {};
let yaw = 0, pitch = 0;
let collected = 0;
let restored = false;
let restoreProgress = 0; // 0→1 transition blend
const WORLD_HALF = 38;

// ── Lights ────
const ambient = new THREE.AmbientLight(0x1a2a3a, 0.6);
scene.add(ambient);

const moonLight = new THREE.DirectionalLight(0x4a70a0, 0.5);
moonLight.position.set(-8, 14, 6);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
moonLight.shadow.camera.far = 120;
moonLight.shadow.camera.left = -60;
moonLight.shadow.camera.right = 60;
moonLight.shadow.camera.top = 60;
moonLight.shadow.camera.bottom = -60;
scene.add(moonLight);

const coreLight = new THREE.PointLight(0x40c8ff, 1.6, 22);
coreLight.position.set(0, 2.5, 0);
scene.add(coreLight);

// ── Helpers ───
function mesh(geo, mat, x, y, z, rx, ry, rz) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (rx !== undefined) m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

function group() {
  const g = new THREE.Group();
  scene.add(g);
  return g;
}

// ── Materials ───
const groundMat = new THREE.MeshStandardMaterial({ color: 0x0d1f18, roughness: 0.92, metalness: 0.0 });
const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1a2e38, roughness: 0.5, metalness: 0.4 });
const rustMetal = new THREE.MeshStandardMaterial({ color: 0x2a1f15, roughness: 0.8, metalness: 0.2 });
const greenGlow = new THREE.MeshStandardMaterial({ color: 0x1a5c3a, emissive: 0x04200e, emissiveIntensity: 0.8 });
const mossyStone = new THREE.MeshStandardMaterial({ color: 0x243d2a, roughness: 0.95 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0x20404a, emissive: 0x061418, roughness: 0.3, metalness: 0.6, transparent: true, opacity: 0.82 });

const coreMat = new THREE.MeshStandardMaterial({
  color: 0x0d3b4b, emissive: 0x0b7ea0, emissiveIntensity: 0.7, metalness: 0.3, roughness: 0.2
});

// ── Ground ────
const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120, 40, 40), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Subtle ground grid overlay
const gridHelper = new THREE.GridHelper(120, 60, 0x0d2a20, 0x0d2a20);
gridHelper.position.y = 0.01;
gridHelper.material.transparent = true;
gridHelper.material.opacity = 0.18;
scene.add(gridHelper);

// ── Central Core ───
const core = mesh(new THREE.SphereGeometry(1.3, 40, 28), coreMat, 0, 1.6, 0);
// Outer ring
const ringGeo = new THREE.TorusGeometry(2.0, 0.08, 12, 80);
const ringMat = new THREE.MeshStandardMaterial({ color: 0x40d8ff, emissive: 0x20a8d0, emissiveIntensity: 1.2, metalness: 0.7, roughness: 0.2 });
const ring1 = mesh(ringGeo, ringMat, 0, 1.6, 0);
const ring2 = mesh(new THREE.TorusGeometry(2.5, 0.05, 10, 80), ringMat, 0, 1.6, 0);
mesh(new THREE.CylinderGeometry(1.6, 2.0, 0.5, 40), darkMetal, 0, 0.25, 0);
mesh(new THREE.CylinderGeometry(0.6, 1.6, 0.2, 32), glassMat, 0, 0.52, 0);

// Core pedestal pillars
for (let i = 0; i < 6; i++) {
  const a = (i / 6) * Math.PI * 2;
  mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.2, 8), darkMetal, Math.cos(a) * 1.7, 0.6, Math.sin(a) * 1.7);
}

// ── Energy Shards ───
// Crystal shard shape: tall narrow octahedron + elongated tip
function makeShardMesh() {
  const g = new THREE.Group();

  // Main crystal body — elongated octahedron approximation
  const bodyGeo = new THREE.OctahedronGeometry(0.28, 0);
  bodyGeo.scale(0.55, 1.9, 0.55);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x80faff,
    emissive: 0x28e8ff,
    emissiveIntensity: 2.2,
    transparent: true,
    opacity: 0.88,
    roughness: 0.05,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = false;
  g.add(body);

  // Secondary smaller shard offset sideways
  const shard2Geo = new THREE.OctahedronGeometry(0.16, 0);
  shard2Geo.scale(0.5, 1.4, 0.5);
  const shard2 = new THREE.Mesh(shard2Geo, bodyMat.clone());
  shard2.position.set(0.22, -0.12, 0.1);
  shard2.rotation.z = 0.3;
  g.add(shard2);

  // Inner glow sphere
  const glowGeo = new THREE.SphereGeometry(0.18, 10, 8);
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xaaffff,
    emissive: 0x80ffff,
    emissiveIntensity: 3.5,
    transparent: true,
    opacity: 0.6,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.y = 0.08;
  g.add(glow);

  // Point light at shard
  const light = new THREE.PointLight(0x50f0ff, 1.4, 6);
  light.position.set(0, 0.3, 0);
  g.add(light);

  scene.add(g);
  return g;
}

const shardPositions = [
  [-14, 0, -10],
  [16, 0, -8],
  [2, 0, 18],
  [-18, 0, 14],
  [20, 0, 10],
  [-8, 0, -22],
  [12, 0, 22],
];

const shards = shardPositions.map(([x, , z]) => {
  const g = makeShardMesh();
  g.position.set(x, 1.0, z);
  g.rotation.y = Math.random() * Math.PI * 2;
  return g;
});

// ── Renewable Energy Sources ──

const renewableGroups = [];


function makeWindTurbine(x, z) {
  const g = new THREE.Group();
  scene.add(g);
  g.position.set(x, 0, z);


  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 8, 10), darkMetal);
  tower.position.y = 4;
  tower.castShadow = true;
  g.add(tower);


  const nacelle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.9), darkMetal);
  nacelle.position.y = 8.18;
  g.add(nacelle);


  const hub = new THREE.Group();
  hub.position.set(0, 8.18, 0.5);
  g.add(hub);

  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x1e3f2a, roughness: 0.6, metalness: 0.15 });
  const blades = [];
  for (let i = 0; i < 3; i++) {
    const bGeo = new THREE.BoxGeometry(0.08, 2.8, 0.12);
    const b = new THREE.Mesh(bGeo, bladeMat);
    b.position.y = 1.4;
    const wrapper = new THREE.Group();
    wrapper.rotation.z = (i / 3) * Math.PI * 2;
    wrapper.add(b);
    hub.add(wrapper);
    blades.push(wrapper);
  }

  // Status LED on nacelle
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x220000, emissiveIntensity: 1 });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), ledMat);
  led.position.set(0, 8.38, 0.55);
  g.add(led);

  const beamMat = new THREE.LineBasicMaterial({ color: 0x40ffaa, transparent: true, opacity: 0 });
  const beamGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(x, 8.2, z),
    new THREE.Vector3(0, 1.6, 0),
  ]);
  const beam = new THREE.Line(beamGeo, beamMat);
  scene.add(beam);

  renewableGroups.push({ group: g, type: 'wind', powered: false, hub, ledMat, beam, beamMat });
}


function makeSolarArray(x, z, angle) {
  const g = new THREE.Group();
  scene.add(g);
  g.position.set(x, 0, z);
  g.rotation.y = angle || 0;

  // Posts
  for (let i = -1; i <= 1; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.4, 8), darkMetal);
    post.position.set(i * 0.9, 0.7, 0);
    post.castShadow = true;
    g.add(post);
  }

  // Panel frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 1.2), darkMetal);
  frame.position.set(0, 1.5, 0);
  frame.rotation.x = -0.4;
  g.add(frame);

  // Panel cells
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x0a1a3a,
    emissive: 0x020c20,
    emissiveIntensity: 0.4,
    roughness: 0.25,
    metalness: 0.6,
  });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.04, 1.05), panelMat);
  panel.position.set(0, 1.52, 0);
  panel.rotation.x = -0.4;
  g.add(panel);

  // Cell grid lines (emissive)
  const cellMat = new THREE.MeshStandardMaterial({ color: 0x102060, emissive: 0x061230, emissiveIntensity: 0.5, roughness: 0.3 });
  for (let ci = 0; ci < 3; ci++) {
    for (let ri = 0; ri < 2; ri++) {
      const cell = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.03, 0.48), cellMat.clone());
      cell.position.set(-0.73 + ci * 0.73, 1.535, -0.24 + ri * 0.5);
      cell.rotation.x = -0.4;
      g.add(cell);
    }
  }

  // Status LED
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x220000, emissiveIntensity: 1 });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), ledMat);
  led.position.set(1.1, 1.6, 0);
  g.add(led);

  // Beam
  const wp = new THREE.Vector3();
  g.getWorldPosition(wp);
  const beamMat = new THREE.LineBasicMaterial({ color: 0xffdd40, transparent: true, opacity: 0 });
  const beamGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(x, 1.6, z),
    new THREE.Vector3(0, 1.6, 0),
  ]);
  const beam = new THREE.Line(beamGeo, beamMat);
  scene.add(beam);

  renewableGroups.push({ group: g, type: 'solar', powered: false, ledMat, panel, beam, beamMat, cellMat: panelMat });
}

// — Bio-Domes (glowing greenhouse) —
function makeBioDome(x, z) {
  const g = new THREE.Group();
  scene.add(g);
  g.position.set(x, 0, z);


  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 0.3, 24), mossyStone);
  base.position.y = 0.15;
  g.add(base);


  const domeMat = new THREE.MeshStandardMaterial({
    color: 0x103820,
    emissive: 0x021408,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.55,
    roughness: 0.15,
    metalness: 0.3,
    side: THREE.DoubleSide,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.85, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), domeMat);
  dome.position.y = 0.28;
  g.add(dome);

  const ribMat = new THREE.MeshStandardMaterial({ color: 0x1a3025, metalness: 0.5, roughness: 0.6 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.9, 0.04), ribMat);
    rib.position.set(Math.cos(a) * 1.0, 1.15, Math.sin(a) * 1.0);
    rib.rotation.z = Math.cos(a) * 0.9;
    rib.rotation.x = -Math.sin(a) * 0.9;
    g.add(rib);
  }

  // Interior glow plant
  const plantMat = new THREE.MeshStandardMaterial({ color: 0x2a6a3a, emissive: 0x062010, emissiveIntensity: 0.5 });
  const plant = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), plantMat);
  plant.position.y = 0.9;
  g.add(plant);

  const ledMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x220000, emissiveIntensity: 1 });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), ledMat);
  led.position.set(1.6, 0.5, 0);
  g.add(led);

  const beamMat = new THREE.LineBasicMaterial({ color: 0x50ff80, transparent: true, opacity: 0 });
  const beamGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(x, 1.0, z),
    new THREE.Vector3(0, 1.6, 0),
  ]);
  const beam = new THREE.Line(beamGeo, beamMat);
  scene.add(beam);

  renewableGroups.push({ group: g, type: 'biodome', powered: false, ledMat, dome, domeMat, plant, plantMat, beam, beamMat });
}

// Place renewable sources
makeWindTurbine(-22, -12);
makeWindTurbine(26, -6);
makeWindTurbine(-10, -28);
makeWindTurbine(24, 20);

makeSolarArray(-18, 8, 0.3);
makeSolarArray(18, -18, -0.5);
makeSolarArray(8, 28, 0.1);
makeSolarArray(-28, -22, 0.8);

makeBioDome(14, 12);
makeBioDome(-20, 18);
makeBioDome(6, -26);

// ── Terrain Details ───────────────────────────────────────────

// Rock clusters
function makeRock(x, y, z, s) {
  const geo = new THREE.DodecahedronGeometry(s, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0x1a2820, roughness: 0.9, metalness: 0.05 });
  const r = mesh(geo, mat, x, y, z);
  r.rotation.set(Math.random() * 2, Math.random() * 6, Math.random() * 2);
}

const rockSpots = [
  [-12, 0.4, 8], [15, 0.3, 14], [-20, 0.5, -8], [8, 0.35, -14],
  [-6, 0.28, 22], [28, 0.4, -14], [-28, 0.4, 8], [20, 0.32, -28],
  [10, 0.3, -20], [-14, 0.4, -20], [30, 0.4, 4], [-30, 0.4, -4],
];
rockSpots.forEach(([x, y, z]) => makeRock(x, y, z, 0.3 + Math.random() * 0.5));


const ruinPositions = [
  [-10, 0, 14], [12, 0, -16], [-24, 0, 4], [22, 0, -22],
  [-16, 0, -16], [18, 0, 24], [-8, 0, -30], [30, 0, 14],
];
ruinPositions.forEach(([x, , z]) => {
  const h = 1.5 + Math.random() * 3;
  mesh(new THREE.CylinderGeometry(0.3, 0.4, h, 8), mossyStone, x, h / 2, z,
    0, Math.random() * Math.PI, 0);


  // Glowing moss cap
  const capMat = new THREE.MeshStandardMaterial({ color: 0x1a4a28, emissive: 0x041808, emissiveIntensity: 0.6 });
  mesh(new THREE.SphereGeometry(0.35, 8, 6), capMat, x, h + 0.1, z);
});


for (let i = 0; i < 6; i++) {
  const a = (i / 6) * Math.PI * 2;
  const r = 10;
  const x = Math.cos(a) * r, z = Math.sin(a) * r;
  const h = 3.5 + (i % 2) * 1.2;
  mesh(new THREE.BoxGeometry(0.9, h, 0.9), darkMetal, x, h / 2, z);
  mesh(new THREE.CylinderGeometry(0.06, 0.06, h * 0.7, 10), greenGlow, x, h * 0.85, z);
  // Blinking top light
  const blinkMat = new THREE.MeshStandardMaterial({ color: 0xff4422, emissive: 0xff2200, emissiveIntensity: 2 });
  const blink = mesh(new THREE.SphereGeometry(0.08, 8, 6), blinkMat, x, h + 0.1, z);
  blink.userData.blinkOffset = i * 1.1;
  blink.userData.isBlink = true;
}


for (let i = 0; i < 10; i++) {
  const a = (i / 10) * Math.PI * 2;
  const r = 60 + Math.random() * 20;
  const h = 8 + Math.random() * 16;
  const x = Math.cos(a) * r, z = Math.sin(a) * r;
  const geo = new THREE.ConeGeometry(6 + Math.random() * 8, h, 5 + Math.floor(Math.random() * 4));
  const mat = new THREE.MeshStandardMaterial({ color: 0x0a1510, roughness: 1.0 });
  mesh(geo, mat, x, h / 2, z);
}

// ── Particles ─────
const particleCount = 280;
const particleGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(particleCount * 3);
const pSpeeds = new Float32Array(particleCount);
for (let i = 0; i < particleCount; i++) {
  pPos[i * 3] = (Math.random() - 0.5) * 80;
  pPos[i * 3 + 1] = Math.random() * 7 + 0.3;
  pPos[i * 3 + 2] = (Math.random() - 0.5) * 80;
  pSpeeds[i] = 0.08 + Math.random() * 0.18;
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const particleMat = new THREE.PointsMaterial({ color: 0x50c8ff, size: 0.07, transparent: true, opacity: 0.35, sizeAttenuation: true });
const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

// ── Restore World ───
function restoreWorld() {
  restored = true;

  // Scene atmosphere
  scene.background.set(0x8ecfe0);
  scene.fog = new THREE.FogExp2(0xaaddc8, 0.009);

  ambient.color.set(0xffeebb);
  ambient.intensity = 1.1;
  moonLight.color.set(0xffd28a);
  moonLight.intensity = 2.2;
  coreLight.color.set(0x88ffaa);
  coreLight.intensity = 4.0;

  groundMat.color.set(0x2a5c38);
  groundMat.emissive = new THREE.Color(0x071a0d);
  groundMat.emissiveIntensity = 0.15;

  greenGlow.emissive.set(0x1cff60);
  greenGlow.emissiveIntensity = 2.0;

  coreMat.color.set(0xc0ffd8);
  coreMat.emissive.set(0x3cff80);
  coreMat.emissiveIntensity = 2.2;

  ringMat.color.set(0xffd060);
  ringMat.emissive.set(0xff9020);
  ringMat.emissiveIntensity = 2.5;

  particleMat.color.set(0xc8ffaa);
  particleMat.opacity = 0.9;

  renderer.toneMappingExposure = 1.3;

  // Power up all renewables
  renewableGroups.forEach((r, i) => {
    setTimeout(() => powerUpRenewable(r), 400 + i * 180);
  });

  if (window.collectOrb) window.collectOrb && null; // already handled by index.html
}

function powerUpRenewable(r) {
  r.powered = true;

  // green LED on
  r.ledMat.color.set(0x00ff44);
  r.ledMat.emissive.set(0x00ff44);
  r.ledMat.emissiveIntensity = 3.0;

  // Beam on
  r.beamMat.opacity = 0.55;

  if (r.type === 'solar' && r.cellMat) {
    r.cellMat.emissive.set(0xffd040);
    r.cellMat.emissiveIntensity = 1.2;
  }
  if (r.type === 'biodome' && r.domeMat) {
    r.domeMat.emissive.set(0x40ff80);
    r.domeMat.emissiveIntensity = 1.0;
    r.plantMat.emissive.set(0x20ff50);
    r.plantMat.emissiveIntensity = 1.5;
  }
}

// ── UI updates ───
function updateUI() {
  const fractionEl = document.getElementById('orb-fraction');
  if (fractionEl) fractionEl.textContent = collected + ' / ' + shards.length;

  const nearCore = camera.position.distanceTo(core.position) < 3.5;
  const promptEl = document.getElementById('prompt-text');
  if (!promptEl) return;

  if (!document.pointerLockElement) return;

  if (restored) {
    promptEl.textContent = '✦ The world blooms — explore the living solarpunk city ✦';
  } else if (collected >= shards.length && nearCore) {
    promptEl.textContent = 'Press E to activate the Core and restore the world';
  } else if (collected >= shards.length) {
    promptEl.textContent = 'All shards found — return to the central Core';
  } else {
    const remaining = shards.length - collected;
    promptEl.textContent = remaining + ' energy shard' + (remaining > 1 ? 's' : '') + ' remaining — seek the glow';
  }
}

// ── Input ────
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyE' && collected >= shards.length
    && !restored && camera.position.distanceTo(core.position) < 3.5) {
    restoreWorld();
    if (window.collectOrb) {
    }
  }
});
addEventListener('keyup', (e) => (keys[e.code] = false));

document.addEventListener('mousemove', (e) => {
  if (!document.pointerLockElement) return;
  yaw -= e.movementX * 0.0022;
  pitch -= e.movementY * 0.0022;
  pitch = Math.max(-1.3, Math.min(1.3, pitch));
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

let _lastCollected = 0;
function syncHUDOrbs(n) {
  if (typeof window.collectOrb !== 'function') return;
  while (_lastCollected < n) {
    window.collectOrb();
    _lastCollected++;
  }
}

// ── Animate ─────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // Camera
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  const speed = restored ? 6.5 : 5.0;
  const fw = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const rt = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const mv = new THREE.Vector3();
  if (keys.KeyW) mv.sub(fw);
  if (keys.KeyS) mv.add(fw);
  if (keys.KeyA) mv.sub(rt);
  if (keys.KeyD) mv.add(rt);
  if (mv.lengthSq() > 0) camera.position.add(mv.normalize().multiplyScalar(speed * dt));
  camera.position.x = Math.max(-WORLD_HALF, Math.min(WORLD_HALF, camera.position.x));
  camera.position.z = Math.max(-WORLD_HALF, Math.min(WORLD_HALF, camera.position.z));
  camera.position.y = 1.7;

  // Core animation
  core.rotation.y += dt * (restored ? 1.4 : 0.6);
  const pulse = 1 + Math.sin(t * 2.2) * 0.05;
  core.scale.setScalar(pulse);
  coreLight.intensity = restored
    ? 4.0 + Math.sin(t * 3) * 0.8
    : 1.6 + Math.sin(t * 1.8) * 0.3;

  // Core rings
  ring1.rotation.z = t * 0.7;
  ring1.rotation.x = Math.sin(t * 0.4) * 0.3;
  ring2.rotation.z = -t * 0.5;
  ring2.rotation.y = t * 0.3;

  // Energy shards
  for (const shard of shards) {
    if (!shard.visible) continue;
    shard.position.y = 1.0 + Math.sin(t * 2.6 + shard.position.x * 0.7) * 0.22;
    shard.rotation.y += dt * 0.9;
    // Crystal shimmer — pulse emissive
    const shardBody = shard.children[0];
    if (shardBody && shardBody.material) {
      shardBody.material.emissiveIntensity = 1.8 + Math.sin(t * 4 + shard.position.z) * 0.6;
    }
    // Collect check
    if (camera.position.distanceTo(shard.position) < 1.5) {
      shard.visible = false;
      collected++;
      syncHUDOrbs(collected);
      updateUI();
    }
  }

  // Wind turbine blades
  renewableGroups.forEach((r) => {
    if (r.type === 'wind' && r.hub) {
      const spinSpeed = r.powered ? 3.5 : 0.25;
      r.hub.rotation.z += dt * spinSpeed;
    }
    // Beam pulse
    if (r.powered && r.beamMat) {
      r.beamMat.opacity = 0.35 + Math.sin(t * 3 + renewableGroups.indexOf(r)) * 0.2;
    }
    // Biodome glow pulse
    if (r.type === 'biodome' && r.powered && r.domeMat) {
      r.domeMat.emissiveIntensity = 0.9 + Math.sin(t * 1.5) * 0.3;
    }
  });

  // Antenna blink lights
  scene.traverse((obj) => {
    if (obj.userData.isBlink) {
      const on = Math.sin(t * 2.5 + (obj.userData.blinkOffset || 0)) > 0.6;
      obj.material.emissiveIntensity = on ? 3.0 : 0.1;
    }
  });

  // Particles float upward
  const pArr = particles.geometry.attributes.position.array;
  for (let i = 0; i < particleCount; i++) {
    pArr[i * 3 + 1] += dt * pSpeeds[i] * (restored ? 2.5 : 1.0);
    if (pArr[i * 3 + 1] > 8) pArr[i * 3 + 1] = 0.2;
  }
  particles.geometry.attributes.position.needsUpdate = true;
  particles.rotation.y += dt * 0.018;



  updateUI();
  renderer.render(scene, camera);
}

animate();