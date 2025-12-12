// script.js — three.js + cannon-es + MediaPipe Hands demo with pinch, physics, spawn, sound
import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';
import { VRButton } from 'https://unpkg.com/three@0.152.2/examples/jsm/webxr/VRButton.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

const videoElement = document.getElementById('video');
const statusEl = document.getElementById('status');
const overlay = document.getElementById('handCanvas');
const overlayCtx = overlay.getContext('2d');

// THREE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d10);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 100);
camera.position.set(0, 1.4, 2.8);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));
overlay.width = window.innerWidth; overlay.height = window.innerHeight;

// lights
const dir = new THREE.DirectionalLight(0xffffff, 1.0); dir.position.set(4, 8, 6); scene.add(dir); scene.add(new THREE.AmbientLight(0xffffff, 0.25));

// ground visual
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40,40), new THREE.MeshStandardMaterial({ color: 0x121316, roughness: 1 }));
ground.rotation.x = -Math.PI/2; ground.position.y = -1; scene.add(ground);

// object prototypes
const cubeSize = 0.35;
const cubeGeom = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
const cubeMat = new THREE.MeshStandardMaterial({ color: 0x0099ff, metalness: 0.2, roughness: 0.3 });

// physics
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
world.broadphase = new CANNON.SAPBroadphase(world);
world.solver.iterations = 10;
const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), -Math.PI/2); groundBody.position.set(0, -1, 0); world.addBody(groundBody);

// containers for bodies + meshes
const objects = [];

// configuration controlled by UI
let grabStiffness = 12; // used when holding an object
let isPaused = false;

// sound on collision
let collisionSoundBuffer = null;
function initSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    fetch('https://cdn.jsdelivr.net/gh/mdn/webaudio-examples/beat-detector/audio/hihat.wav')
      .then(r=>r.arrayBuffer()).then(b=>ctx.decodeAudioData(b)).then(buf=>{ collisionSoundBuffer = { ctx, buf }; });
  } catch (e) { console.warn('Audio init failed', e); }
}
initSound();

world.addEventListener('collide', function(e){
  if (!collisionSoundBuffer) return;
  const r = Math.min(1, e.contact.getImpactVelocityAlongNormal() / 5);
  if (r < 0.05) return;
  const s = collisionSoundBuffer;
  const src = s.ctx.createBufferSource(); src.buffer = s.buf; const gain = s.ctx.createGain(); gain.gain.value = r; src.connect(gain); gain.connect(s.ctx.destination); src.start();
});

// hand tracking state
// hand tracking state
let isPinched = false; let pinchAttachLocal = new CANNON.Vec3(); let prevHandPositions = []; const MAX_HISTORY = 8; let lastHandWorld = new THREE.Vector3(); let lastPinchTime = 0; let gravityOn = true;
let handVisible = false;

// Emit gesture events for external listeners. Dispatches a single `hand-gesture` CustomEvent
function emitGesture(type, data = {}) {
  const payload = { type, timestamp: performance.now(), data };
  try { window.dispatchEvent(new CustomEvent('hand-gesture', { detail: payload })); } catch (e) { console.warn('emitGesture failed', e); }
}

// small helper API to allow easier listening
window.HandGrabEmitter = {
  on: (fn) => window.addEventListener('hand-gesture', fn),
  off: (fn) => window.removeEventListener('hand-gesture', fn),
};

// helper: normalized hand coords to world
function handToWorld(normX, normY, zEstimate, sizeFactor=1.8) {
  const ndcX = (normX - 0.5) * 2; const ndcY = -(normY - 0.5) * 2;
  const zDepth = -0.3 - (zEstimate * sizeFactor);
  const ndc = new THREE.Vector3(ndcX, ndcY, zDepth);
  ndc.unproject(camera);
  return ndc;
}

// small avatar for pose mapping
const avatar = { group: null, parts: {} };
function createAvatar() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffb347 });
  const joints = ['nose','lhShoulder','rhShoulder','lhElbow','rhElbow','lhWrist','rhWrist','lhip','rhip','lknee','rknee','lankle','rankle'];
  for (const j of joints) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.03,8,6), mat.clone());
    s.visible = false; g.add(s); avatar.parts[j] = s;
  }
  avatar.group = g; scene.add(g);
}
createAvatar();

// MediaPipe: Hands, Pose, FaceMesh
const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
const faceMesh = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });

// default options (may be adjusted by perf mode)
let perfMode = false; // when true, use lower load settings
let frameInterval = 33; // ms between processed frames (~30fps)
let processFrame = true;
let activeProcessor = hands; // currently selected processor

function applyPerfMode() {
  if (perfMode) {
    hands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.45, minTrackingConfidence: 0.45 });
    pose.setOptions({ modelComplexity: 0, smoothLandmarks: true, minDetectionConfidence: 0.45 });
    faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: false, minDetectionConfidence: 0.45 });
    renderer.setPixelRatio(1);
    world.solver.iterations = 6;
    frameInterval = 66; // slower processing
  } else {
    hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
    pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.6 });
    faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.6 });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    world.solver.iterations = 10;
    frameInterval = 33;
  }
}
applyPerfMode();

// wire results handlers
hands.onResults(onResults);
pose.onResults(onPoseResults);
faceMesh.onResults(onFaceResults);

// Camera: forward frames to the currently active processor, with throttling
const cam = new Camera(videoElement, { onFrame: async () => {
  if (!processFrame || !activeProcessor) return; processFrame = false;
  try {
    await activeProcessor.send({ image: videoElement });
  } catch (e) {}
  setTimeout(()=>{ processFrame = true; }, frameInterval);
}, width:1280, height:720 });

async function startCamera(){ try{ await cam.start(); statusEl.textContent = 'Status: camera started — show your hand/body/face'; } catch(err){ statusEl.textContent = 'Status: camera permission denied or not available'; console.error(err); } }
startCamera();

// Test video fallback scheduling
const TEST_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
let testVideoTimer = null;
function startTestVideo() {
  try { cam.stop(); } catch(e){}
  videoElement.src = TEST_VIDEO; videoElement.loop = true; videoElement.play();
  if (testVideoTimer) clearInterval(testVideoTimer);
  testVideoTimer = setInterval(()=>{ if (processFrame && activeProcessor) { processFrame = false; activeProcessor.send({ image: videoElement }).finally(()=>{ setTimeout(()=>processFrame=true, frameInterval); }); } }, frameInterval);
}
function stopTestVideo() {
  if (testVideoTimer) { clearInterval(testVideoTimer); testVideoTimer = null; }
  videoElement.pause(); videoElement.src = '';
  startCamera();
}

function isPinchLM(lm) { if (!lm || lm.length<21) return false; const t4 = lm[4]; const t8 = lm[8]; const dx=t4.x-t8.x, dy=t4.y-t8.y, dz=(t4.z||0)-(t8.z||0); const dist = Math.sqrt(dx*dx+dy*dy+dz*dz); return dist < 0.035; }

// draw hand overlay
function drawHand(landmarks, pinch) {
  overlayCtx.clearRect(0,0,overlay.width,overlay.height);
  if (!landmarks) return;
  overlayCtx.strokeStyle = pinch ? '#ffb347' : '#00d1ff'; overlayCtx.lineWidth = 2;
  for (let i=0;i<landmarks.length;i++){ const x = landmarks[i].x * overlay.width; const y = landmarks[i].y * overlay.height; overlayCtx.beginPath(); overlayCtx.arc(x,y,i===4||i===8?6:3,0,Math.PI*2); overlayCtx.fillStyle = (i===4||i===8)? '#fff' : '#bcd'; overlayCtx.fill(); overlayCtx.stroke(); }
  const conns = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],[0,17],[17,18],[18,19],[19,20]];
  overlayCtx.beginPath(); for (const [a,b] of conns){ overlayCtx.moveTo(landmarks[a].x*overlay.width, landmarks[a].y*overlay.height); overlayCtx.lineTo(landmarks[b].x*overlay.width, landmarks[b].y*overlay.height); } overlayCtx.stroke();
}

// draw pose landmarks + skeleton
function drawPose(poseLandmarks) {
  overlayCtx.clearRect(0,0,overlay.width,overlay.height);
  if (!poseLandmarks) return;
  overlayCtx.strokeStyle = '#8af'; overlayCtx.lineWidth = 2; overlayCtx.fillStyle = '#8af';
  // draw points
  for (let i=0;i<poseLandmarks.length;i++){ const p = poseLandmarks[i]; const x = p.x*overlay.width; const y = p.y*overlay.height; overlayCtx.beginPath(); overlayCtx.arc(x,y,3,0,Math.PI*2); overlayCtx.fill(); }
  // simple skeleton connections (subset)
  const conns = [[11,13],[13,15],[12,14],[14,16],[11,12],[23,24],[11,23],[12,24]];
  overlayCtx.beginPath(); for (const [a,b] of conns){ const A=poseLandmarks[a], B=poseLandmarks[b]; overlayCtx.moveTo(A.x*overlay.width, A.y*overlay.height); overlayCtx.lineTo(B.x*overlay.width, B.y*overlay.height); } overlayCtx.stroke();
}

// draw face landmarks (simple dots)
function drawFace(faceLandmarks) {
  overlayCtx.clearRect(0,0,overlay.width,overlay.height);
  if (!faceLandmarks) return;
  overlayCtx.fillStyle = '#ffb347';
  for (let i=0;i<faceLandmarks.length;i++){ const p = faceLandmarks[i]; overlayCtx.beginPath(); overlayCtx.arc(p.x*overlay.width, p.y*overlay.height, i%5===0?2.6:1.6,0,Math.PI*2); overlayCtx.fill(); }
}

function onPoseResults(results) {
  const lm = results.poseLandmarks;
  if (overlayToggle && overlayToggle.checked) drawPose(lm);
  emitGesture('pose', { present: !!lm, landmarks: lm ? lm.length : 0 });
  // update avatar positions (subset mapping)
  if (lm && avatar.group && trackingModeEl && trackingModeEl.value === 'pose') {
    const map = {
      nose: 0, lhShoulder:11, rhShoulder:12, lhElbow:13, rhElbow:14, lhWrist:15, rhWrist:16,
      lhip:23, rhip:24, lknee:25, rknee:26, lankle:27, rankle:28
    };
    avatar.group.visible = true;
    for (const k in map) {
      const idx = map[k]; const p = lm[idx]; const obj = avatar.parts[k];
      if (p && obj) {
        const w = handToWorld(p.x, p.y, p.z, 1.6);
        obj.position.copy(w);
        obj.visible = true;
      }
    }
  } else if (avatar.group) { avatar.group.visible = false; }
}

function onFaceResults(results) {
  const lm = results.multiFaceLandmarks && results.multiFaceLandmarks[0];
  if (overlayToggle && overlayToggle.checked) drawFace(lm);
  emitGesture('face', { present: !!lm, landmarks: lm ? lm.length : 0 });
}

function onResults(results) {
  const now = performance.now();
  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    drawHand(null,false);
    if (handVisible) { emitGesture('handlost', {}); }
    handVisible = false;
    // if we lost tracking while pinched, emit a release
    if (isPinched) { emitGesture('pinchend', { reason: 'tracking-lost' }); }
    isPinched = false; prevHandPositions = [];
    return;
  }
  // we have a hand
  if (!handVisible) { handVisible = true; emitGesture('handpresent', {}); }
  const lm = results.multiHandLandmarks[0];
  const screenSize = Math.hypot((lm[0].x-lm[12].x),(lm[0].y-lm[12].y));
  const depthEst = lm[8].z || lm[0].z || 0;
  const worldPt = handToWorld((lm[0].x+lm[9].x)/2, (lm[0].y+lm[9].y)/2, depthEst, 1.6 + screenSize*8);
  prevHandPositions.push(worldPt.clone()); if (prevHandPositions.length>MAX_HISTORY) prevHandPositions.shift();
  const pinch = isPinchLM(lm);

  // double-pinch detection for spawn
  if (pinch && now - lastPinchTime < 280) {
    // double-pinch -> spawn a cube at hand position
    spawnCube(new CANNON.Vec3(worldPt.x, worldPt.y, worldPt.z));
    emitGesture('doublepinch', { world: { x: worldPt.x, y: worldPt.y, z: worldPt.z }, normalized: { x: lm[8].x, y: lm[8].y } });
  }
  if (pinch) lastPinchTime = now;

  if (pinch && !isPinched) {
    // start pinch: attach to nearest object under hand or spawn if none
    isPinched = true; statusEl.textContent='Status: pinched';
    // choose nearest object to hand
    let nearest = null; let bestDist = Infinity;
    for (const o of objects) {
      const d = o.body.position.distanceTo(new CANNON.Vec3(worldPt.x, worldPt.y, worldPt.z)); if (d < bestDist) { bestDist = d; nearest = o; }
    }
    if (!nearest || bestDist > 0.45) {
      // if none close, spawn a new cube attached to hand
      spawnCube(new CANNON.Vec3(worldPt.x, worldPt.y, worldPt.z)); nearest = objects[objects.length-1];
    }
    // attach this object
    window._held = nearest; // debug
    const body = nearest.body;
    pinchAttachLocal.copy(body.pointToLocalFrame(new CANNON.Vec3(worldPt.x, worldPt.y, worldPt.z)));
    emitGesture('pinchstart', { world: { x: worldPt.x, y: worldPt.y, z: worldPt.z }, normalized: { x: lm[8].x, y: lm[8].y }, attachedObjectIndex: objects.indexOf(nearest) });
  } else if (!pinch && isPinched) {
    // release: apply velocity from hand history
    const len = prevHandPositions.length; if (len>=2) {
      const pLast = prevHandPositions[len-1]; const pPrev = prevHandPositions[Math.max(0, len-3)];
      const dt = (1/60) * (len>1? (len-1) : 1);
      const vx = (pLast.x - pPrev.x)/dt; const vy = (pLast.y - pPrev.y)/dt; const vz = (pLast.z - pPrev.z)/dt;
      if (window._held) {
        window._held.body.velocity.set(vx, vy, vz);
        window._held.body.angularVelocity.set((Math.random()-0.5)*2, (Math.random()-0.5)*2, (Math.random()-0.5)*2);
        // haptic
        if (navigator.vibrate) navigator.vibrate(30);
      }
      emitGesture('pinchend', { world: { x: pLast.x, y: pLast.y, z: pLast.z }, velocity: { x: vx, y: vy, z: vz } });
    }
    isPinched=false; prevHandPositions=[]; statusEl.textContent='Status: released';
    window._held = null;
  }

  if (isPinched) { lastHandWorld.copy(worldPt); }
  if (overlayToggle && overlayToggle.checked) drawHand(lm, pinch);
}

// physics loop
const timeStep = 1/60; let lastTime;
function physicsStep(delta) {
  if (isPinched && window._held) {
    const body = window._held.body; const q = body.quaternion; const attachLocal = pinchAttachLocal.clone(); const attachWorld = new CANNON.Vec3(); q.vmult(attachLocal, attachWorld);
    const desiredPos = new CANNON.Vec3(lastHandWorld.x - attachWorld.x, lastHandWorld.y - attachWorld.y, lastHandWorld.z - attachWorld.z);
    const toTarget = desiredPos.vsub(body.position); const k = grabStiffness; const correction = toTarget.scale(k * delta);
    body.velocity.x = correction.x/Math.max(1e-6, delta); body.velocity.y = correction.y/Math.max(1e-6, delta); body.velocity.z = correction.z/Math.max(1e-6, delta);
    body.angularVelocity.scale(0.8, body.angularVelocity);
    // color highlight
    window._held.mesh && window._held.mesh.material.color.lerp(new THREE.Color(0xffb347), 0.14);
  }

  world.step(timeStep, delta, 3);
  // sync
  for (const o of objects) {
    o.mesh.position.set(o.body.position.x, o.body.position.y, o.body.position.z);
    o.mesh.quaternion.set(o.body.quaternion.x, o.body.quaternion.y, o.body.quaternion.z, o.body.quaternion.w);
  }
}

function animate(t) {
  requestAnimationFrame(animate);
  if (!lastTime) lastTime = t;
  const delta = Math.min(0.05, (t-lastTime)/1000); lastTime = t;
  if (!isPaused) physicsStep(delta);
  renderer.render(scene, camera);
}
animate();

// resize
window.addEventListener('resize', ()=>{ renderer.setSize(window.innerWidth, window.innerHeight); camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); overlay.width = window.innerWidth; overlay.height = window.innerHeight; });

// keyboard controls
window.addEventListener('keydown', (e)=>{
  if (e.key === 'n' || e.key === 'N') spawnCube(new CANNON.Vec3(0, 0.1, 0));
  if (e.key === 'g' || e.key === 'G') { gravityOn = !gravityOn; world.gravity.set(0, gravityOn? -9.82 : 0, 0); statusEl.textContent = `Status: gravity ${gravityOn? 'on':'off'}`; }
  if (e.key === 'r' || e.key === 'R') { // reset all
    for (let i=0;i<objects.length;i++){ const o=objects[i]; o.body.position.set((i%5)*0.6 - 1.2, 0.1 + Math.floor(i/5)*0.6, 0); o.body.velocity.set(0,0,0); o.body.angularVelocity.set(0,0,0); o.body.quaternion.set(0,0,0,1); }
    statusEl.textContent='Status: reset';
  }
});

// spawn function (single implementation)
function spawnCube(pos) {
  const body = new CANNON.Body({ mass:1, shape:new CANNON.Box(new CANNON.Vec3(cubeSize/2,cubeSize/2,cubeSize/2)), position: pos.clone(), linearDamping:0.08, angularDamping:0.5 });
  world.addBody(body);
  const mesh = new THREE.Mesh(cubeGeom, cubeMat.clone()); mesh.castShadow=true; mesh.receiveShadow=true; scene.add(mesh);
  const o = { body, mesh };
  objects.push(o);
  // cap objects to avoid slowdowns
  if (objects.length > maxObjects) {
    const old = objects.shift();
    try { world.removeBody(old.body); } catch(e){}
    try { scene.remove(old.mesh); } catch(e){}
  }
  return o;
}

// Utility: reset objects to a grid
function resetObjects() {
  for (let i=0;i<objects.length;i++){ const o=objects[i]; o.body.position.set((i%5)*0.6 - 1.2, 0.1 + Math.floor(i/5)*0.6, 0); o.body.velocity.set(0,0,0); o.body.angularVelocity.set(0,0,0); o.body.quaternion.set(0,0,0,1); }
}

// UI wiring
const spawnBtn = document.getElementById('spawnBtn');
const gravityBtn = document.getElementById('gravityBtn');
const resetBtn = document.getElementById('resetBtn');
const pauseBtn = document.getElementById('pauseBtn');
const colorPicker = document.getElementById('colorPicker');
const speedRange = document.getElementById('speedRange');
const lowPerfEl = document.getElementById('lowPerf');
const maxObjectsEl = document.getElementById('maxObjects');
let maxObjects = Number(maxObjectsEl ? maxObjectsEl.value : 25) || 25;
const trackingModeEl = document.getElementById('trackingMode');
const overlayToggle = document.getElementById('overlayToggle');
const useTestVideoEl = document.getElementById('useTestVideo');

if (lowPerfEl) {
  lowPerfEl.checked = perfMode;
  lowPerfEl.addEventListener('change', (e)=>{ perfMode = !!e.target.checked; applyPerfMode(); statusEl.textContent = `Status: ${perfMode? 'low perf':'normal'}`; });
}
if (maxObjectsEl) {
  maxObjectsEl.addEventListener('change', (e)=>{ const n = Number(e.target.value)||1; maxObjects = Math.max(1, Math.min(100, n)); });
}
if (trackingModeEl) {
  trackingModeEl.addEventListener('change', (e)=>{
    const v = e.target.value;
    if (v === 'hands') activeProcessor = hands;
    else if (v === 'pose') activeProcessor = pose;
    else if (v === 'face') activeProcessor = faceMesh;
    overlayCtx.clearRect(0,0,overlay.width,overlay.height);
    statusEl.textContent = `Status: tracking ${v}`;
  });
}
if (overlayToggle) {
  overlayToggle.addEventListener('change', ()=>{ overlayCtx.clearRect(0,0,overlay.width,overlay.height); });
}
if (useTestVideoEl) {
  useTestVideoEl.addEventListener('change', (e)=>{
    if (e.target.checked) startTestVideo(); else stopTestVideo();
  });
}

spawnBtn && spawnBtn.addEventListener('click', ()=>{ spawnCube(new CANNON.Vec3(0,0.1,0)); statusEl.textContent='Status: spawned'; });
gravityBtn && gravityBtn.addEventListener('click', ()=>{ gravityOn = !gravityOn; world.gravity.set(0, gravityOn? -9.82 : 0, 0); gravityBtn.textContent = `Gravity: ${gravityOn? 'On':'Off'}`; gravityBtn.setAttribute('aria-pressed', gravityOn? 'true':'false'); statusEl.textContent = `Status: gravity ${gravityOn? 'on':'off'}`; });
resetBtn && resetBtn.addEventListener('click', ()=>{ resetObjects(); statusEl.textContent='Status: reset'; });
pauseBtn && pauseBtn.addEventListener('click', ()=>{ isPaused = !isPaused; pauseBtn.textContent = isPaused ? 'Resume' : 'Pause'; statusEl.textContent = `Status: ${isPaused ? 'paused' : 'running'}`; });
colorPicker && colorPicker.addEventListener('input', (e)=>{ try{ cubeMat.color.set(e.target.value); // future cubes
  // update existing meshes subtly
  for (const o of objects) o.mesh.material.color.set(e.target.value);
}catch(e){}});
speedRange && speedRange.addEventListener('input', (e)=>{ grabStiffness = Number(e.target.value); });

// on-screen event log wiring
const eventLog = document.getElementById('eventLog');
function logEvent(type, data) {
  if (!eventLog) return;
  const el = document.createElement('div'); el.className = 'ev';
  const left = document.createElement('div'); left.textContent = type;
  const right = document.createElement('small'); right.textContent = JSON.stringify(data || {});
  el.appendChild(left); el.appendChild(right);
  eventLog.prepend(el);
  // keep reasonable size
  while (eventLog.children.length > 30) eventLog.removeChild(eventLog.lastChild);
}

window.addEventListener('hand-gesture', (e)=>{ logEvent(e.detail.type, e.detail.data); });

// Snapshot button
const snapshotBtn = document.getElementById('snapshotBtn');
if (snapshotBtn) snapshotBtn.addEventListener('click', ()=>{
  try {
    renderer.render(scene, camera);
    const data = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a'); a.href = data; a.download = `hand-grab-snap-${Date.now()}.png`; a.click();
  } catch (e) { console.warn('snapshot failed', e); }
});

// initial collision to wire up meshes to bodies: update meshes after adding bodies

// ensure first object mapping exists (we created earlier but re-create if not)
if (objects.length === 0) spawnCube(new CANNON.Vec3(0,0.1,0));

// collision handling: add small sound/haptic for stronger impacts
world.addEventListener('postStep', ()=>{});

// friendly status
statusEl.textContent = 'Status: ready — allow camera and pinch to interact';
