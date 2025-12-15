import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';
import { createRenderer, startLoop } from './src/renderer.js';
import { clampVelocity, clampPosition, syncKinematic } from './src/physics-stabilizer.js';
import { getSupportLeg, getSupportFootPosition } from './src/physics-support-leg.js';
import { createAdvancedRagdoll, setAdvancedRagdollMode, updateAdvancedRagdollVisuals, blendToTracking } from './src/physics-ragdoll-advanced.js';
import { createTracking } from './src/tracking.js';
import { createAvatar, updateAvatarFromPose } from './src/avatar.js';
import { createVRControls } from './src/vr.js';
import { createUI } from './src/ui.js';
import { createHUD } from './src/hud.js';
import { fuseAverages } from './src/multiview.js';

// Enhanced error reporting for debugging
window.addEventListener('error', (event) => {
  console.error('Global Error:', event.message, event.filename, event.lineno, event.colno, event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
});

// Also log all THREE.Vector3 and constructor calls
const originalError = console.error;
console.error = function(...args) {
  originalError.apply(console, ['[ERROR]', ...args]);
};

const originalWarn = console.warn;
console.warn = function(...args) {
  originalWarn.apply(console, ['[WARN]', ...args]);
};

(async function(){
      // ragdoll toggle UI
      let ragdoll = null;
      let world = { addBody: ()=>{}, step: ()=>{} }; // stub, replace with real physics world if needed
      const ragdollBtn = document.getElementById('ragdollToggle');
      if (ragdollBtn) {
        ragdollBtn.addEventListener('click', async ()=>{
          if (!ragdoll) ragdoll = createAdvancedRagdoll(avatar, world);
          if (avatar.isRagdoll) {
            // Blending out of ragdoll: move all bodies to tracked pose, zero velocities
            if (latestPose && latestPose.world && ragdoll) {
              for (const name in ragdoll.bodies) {
                const idx = avatar.joints[name] && avatar.joints[name].mesh ? null : null;
                // Try to use world pose index if available
                let tracked = null;
                if (avatar.joints[name] && avatar.joints[name].mesh) {
                  tracked = avatar.joints[name].mesh.position;
                } else if (typeof idx === 'number' && latestPose.world[idx]) {
                  tracked = latestPose.world[idx];
                }
                if (tracked) {
                  ragdoll.bodies[name].position.x = tracked.x;
                  ragdoll.bodies[name].position.y = tracked.y;
                  ragdoll.bodies[name].position.z = tracked.z;
                  ragdoll.bodies[name].velocity.x = 0;
                  ragdoll.bodies[name].velocity.y = 0;
                  ragdoll.bodies[name].velocity.z = 0;
                }
              }
            }
          }
          avatar.isRagdoll = !avatar.isRagdoll;
          setAdvancedRagdollMode(avatar, ragdoll, avatar.isRagdoll);
          ragdollBtn.textContent = avatar.isRagdoll ? 'Disable Ragdoll' : 'Enable Ragdoll';
        });
      }
    // Try to trigger camera permission popup on load if no cameras are detected
    // Always request camera permission on load to trigger popup
    async function forceCameraPermissionRequest() {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        await refreshCameras();
      } catch (e) {
        console.warn('Camera permission request failed', e);
        if (statusEl) statusEl.textContent = 'Status: Camera permission denied or unavailable.';
      }
    }

  const { scene, camera, renderer, helpers, stats } = await createRenderer();
  document.body.appendChild(renderer.domElement);
  // status element
  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.textContent = 'Status: renderer ready';

  // keep overlay canvas from index.html for 2D drawing
  const overlay = document.getElementById('handCanvas');
  const overlayCtx = overlay.getContext('2d');
  overlay.width = window.innerWidth; overlay.height = window.innerHeight;

  // tracking
  const tracking = await createTracking({ onEvent: handleTrackingEvent, perfMode: false });
  const videoEl = document.getElementById('video');
  try { await tracking.startCamera(videoEl); if (statusEl) statusEl.textContent = 'Status: camera started'; } catch(e) { console.warn('camera start failed', e); if (statusEl) statusEl.textContent = 'Status: camera failed'; }

  // avatar
  const avatar = createAvatar(scene);
  // Example: attach a physics body to the avatar root (stub, replace with real body if needed)
  avatar.physicsBody = {
    position: { x: 0, y: 1.6, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    mass: 80
  };

  // HUD for camera status and pose data
  const hud = createHUD(document.body);
  const hudToggle = document.getElementById('hudToggle');
  if (hudToggle) hudToggle.addEventListener('change', (e)=>{ hud.el.style.display = e.target.checked ? 'block' : 'none'; });
  let hudStatus = 'ready';

  // UI
  const ui = createUI();
  // populate available video input devices (multi-select)
  const cameraSelect = document.getElementById('cameraSelect');
  const cameraStartBtn = document.getElementById('cameraStartBtn');
  const cameraStopBtn = document.getElementById('cameraStopBtn');
  const activeCamHandles = [];
  async function refreshCameras(){
    try{
      const devices = await navigator.mediaDevices.enumerateDevices();
      const vids = devices.filter(d=>d.kind==='videoinput');
      if (!cameraSelect) return;
      cameraSelect.innerHTML = '';
      if (vids.length === 0) {
        if (statusEl) statusEl.textContent = 'Status: No cameras detected. Please check browser permissions.';
      }
      vids.forEach((v,i)=>{ const o = document.createElement('option'); o.value = v.deviceId; o.textContent = v.label || `Camera ${i+1}`; cameraSelect.appendChild(o); });
    }catch(e){ 
      console.warn('enumerateDevices failed', e); 
      if (statusEl) statusEl.textContent = 'Status: Unable to enumerate cameras. Permission denied or not supported.';
    }
  }
  await refreshCameras();
  await forceCameraPermissionRequest();
  if (cameraStartBtn && cameraSelect) cameraStartBtn.addEventListener('click', async ()=>{
    const selected = Array.from(cameraSelect.selectedOptions).map(o=>o.value);
    if (!selected || selected.length===0) {
      if (statusEl) statusEl.textContent = 'Status: Please select one or more cameras.';
      return alert('Select one or more cameras');
    }
    // create video elements per camera and start pose capture
    let started = 0;
    let failed = 0;
    for (let i=0;i<selected.length;i++){
      const id = selected[i];
      const v = document.createElement('video');
      v.autoplay = true;
      v.playsInline = true;
      v.style.display='none';
      document.body.appendChild(v);
      try {
        // Await the camera start to catch async errors
        const handle = await tracking.startCamera(v, { deviceId: id });
        activeCamHandles.push(handle);
        started++;
      } catch(e) {
        failed++;
        console.warn('Camera start failed', e);
        if (statusEl) statusEl.textContent = 'Status: Camera permission denied, unavailable, or getUserMedia failed.';
      }
    }
    if (statusEl) {
      if (started > 0 && failed === 0) statusEl.textContent = `Status: Started ${started} camera(s)`;
      else if (started > 0 && failed > 0) statusEl.textContent = `Status: Started ${started} camera(s), failed to start ${failed}`;
      else statusEl.textContent = 'Status: No cameras started. Check permissions or device availability.';
    }
    alert(`Started ${started} camera(s)` + (failed > 0 ? `, failed: ${failed}` : ''));
  });
  if (cameraStopBtn) cameraStopBtn.addEventListener('click', ()=>{ activeCamHandles.forEach(h=>{ try{ tracking.stopCamera(h); if (h && h.videoEl && h.videoEl.parentNode) h.videoEl.parentNode.removeChild(h.videoEl); }catch(e){} }); activeCamHandles.length=0; alert('Stopped cameras'); });
  ui.on('trackingMode', (e)=>{ tracking.setActive(e.target.value); overlayCtx.clearRect(0,0,overlay.width,overlay.height); });
  ui.on('lowPerf', (e)=>{ tracking.applyPerf(e.target.checked); });
  ui.on('useTestVideo', (e)=>{ if (e.target.checked) tracking.useTestVideo(videoEl,'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'); else { try{ tracking.startCamera(videoEl); }catch(e){ console.warn('restart failed',e); } } });
  // extras wiring
  const extras = ui.extras;
  // FPS toggle wiring
  if (extras.showFps) {
    // set initial visibility
    const visible = extras.showFps.checked;
    if (renderer.__stats && renderer.__stats.dom) renderer.__stats.dom.style.display = visible ? 'block' : 'none';
    extras.showFps.addEventListener('change', (e)=>{
      const vis = e.target.checked;
      if (renderer.__stats && renderer.__stats.dom) renderer.__stats.dom.style.display = vis ? 'block' : 'none';
    });
  }
  let showHands = extras.showHands ? extras.showHands.checked : true;
  let showPose = extras.showPose ? extras.showPose.checked : true;
  let showFace = extras.showFace ? extras.showFace.checked : true;
  let smoothing = extras.smoothing ? Number(extras.smoothing.value) : 0.5;
  if (extras.showHands) extras.showHands.addEventListener('change', (e)=>{ showHands = e.target.checked; });
  if (extras.showPose) extras.showPose.addEventListener('change', (e)=>{ showPose = e.target.checked; });
  if (extras.showFace) extras.showFace.addEventListener('change', (e)=>{ showFace = e.target.checked; });
  if (extras.smoothing) extras.smoothing.addEventListener('input', (e)=>{ smoothing = Number(e.target.value); });

  // WebSocket forwarder
  import('./src/network.js').then(mod=>{
    const net = mod.createNetworkForwarder();
    if (extras.wsConnect && extras.wsUrl) {
      extras.wsConnect.addEventListener('click', ()=>{
        const url = extras.wsUrl.value.trim(); if (!url) return alert('Enter WS url'); net.connect(url); window._net = net; alert('WS connecting');
      });
    }
    // forward all tracking-event messages
    window.addEventListener('tracking-event', (e)=>{ if (window._net && window._net.send) window._net.send(e.detail); });
  });

  // snapshot
  const snapshotBtn = document.getElementById('snapshotBtn');
  if (snapshotBtn) snapshotBtn.addEventListener('click', ()=>{
    try { renderer.render(scene, camera); const data = renderer.domElement.toDataURL('image/png'); const a = document.createElement('a'); a.href = data; a.download = `snapshot-${Date.now()}.png`; a.click(); } catch(e){ console.warn(e); }
  });

  // initialize VR controller helpers (haptics + events)
  let vrControls = null;
  try {
    vrControls = createVRControls(renderer, scene, {
      onSelectStart: (ev)=>{ window.dispatchEvent(new CustomEvent('hand-gesture',{ detail: { type: 'vr-selectstart' } })); },
      onSelectEnd:   (ev)=>{ window.dispatchEvent(new CustomEvent('hand-gesture',{ detail: { type: 'vr-selectend' } })); }
    });
    // wire VR controller grips to avatar wrists if available
    if (vrControls && vrControls.controllers && avatar) {
      const leftGrip = vrControls.controllers[0]; const rightGrip = vrControls.controllers[1];
      if (leftGrip && avatar.joints.leftWrist) { leftGrip.grip.add(avatar.joints.leftWrist.mesh); }
      if (rightGrip && avatar.joints.rightWrist) { rightGrip.grip.add(avatar.joints.rightWrist.mesh); }
    }
  } catch(e){ console.warn('VR controls init failed', e); }

  // wire haptics test button
  const hapticsBtn = document.getElementById('hapticsTest');
  if (hapticsBtn) hapticsBtn.addEventListener('click', ()=>{ if (vrControls && vrControls.pulseOnControllers) { vrControls.pulseOnControllers(0.7, 80); alert('Sent haptic pulse'); } else alert('No VR session/controllers available'); });

  // event log wiring
  window.addEventListener('tracking-event', (e)=>{
    const el = document.getElementById('eventLog'); if (!el) return; const div = document.createElement('div'); div.className='ev'; div.textContent = e.detail.type + ' ' + JSON.stringify(e.detail.data||{}); el.prepend(div); while(el.children.length>30) el.removeChild(el.lastChild);
  });

  // track pose updates to update avatar
  let latestPose = null;
  const latestPosePerCamera = [];
  // smoothing buffers for landmarks
  let smoothedHands = null;
  let smoothedPose = null;
  let smoothedWorldPose = null;
  let smoothedFace = null;
  const SMOOTH = { hands: 0.6, pose: 0.45, face: 0.5 };
  function smoothLandmarks(prev, cur, alpha) {
    if (!cur) return null;
    if (!prev) return cur.map(p => ({ x: p.x, y: p.y, z: p.z, visibility: p.visibility }));
    const out = new Array(cur.length);
    for (let i = 0; i < cur.length; i++) {
      const c = cur[i] || { x:0,y:0,z:0 };
      const p = prev[i] || { x:c.x,y:c.y,z:c.z };
      out[i] = { x: p.x * (1-alpha) + c.x * alpha, y: p.y * (1-alpha) + c.y * alpha, z: p.z * (1-alpha) + c.z * alpha };
      if (c.visibility !== undefined) out[i].visibility = (p.visibility||0)*(1-alpha) + (c.visibility||0)*alpha;
    }
    return out;
  }
  // keep latest raw hands payload (for gesture flags) and smoothed landmarks separately
  let latestHandsRaw = null;
  // tracking event handler — listen for camera-ready and camera-error too
  function handleTrackingEvent(ev) {
    // listen for camera status
    if (ev.type === 'camera-ready') { hudStatus = 'camera ' + (ev.data.index || 0) + ' ready'; hud.set('Status', hudStatus); return; }
    if (ev.type === 'camera-error') { hudStatus = 'ERROR: ' + (ev.data.error || 'unknown'); hud.set('Status', hudStatus); return; }
    // normalize incoming event payloads: tracking.js emits objects with `.landmarks` for pose/face,
    // and an array of { landmarks, handedness, gesture } for hands.
    if (ev.type === 'hands') {
      latestHandsRaw = Array.isArray(ev.data) ? ev.data : [];
      const first = latestHandsRaw.length>0 ? latestHandsRaw[0] : null;
      const lmArray = first ? first.landmarks : null;
      smoothedHands = smoothLandmarks(smoothedHands, lmArray, smoothing);
      if (showHands) {
        // prepare merged objects for drawing: use smoothed landmarks but keep gesture flags
        const drawArray = latestHandsRaw.map((h, idx)=>({ landmarks: smoothedHands && idx===0 ? smoothedHands : h.landmarks, gesture: h.gesture }));
        draw2DHands(overlayCtx, drawArray);
      }
      return;
    }
    if (ev.type === 'pose') {
      // event may include cameraIndex when from a dedicated pose instance
      const camIdx = (ev.data && ev.data.cameraIndex !== undefined) ? ev.data.cameraIndex : 0;
      const lm = (ev.data && ev.data.landmarks) ? ev.data.landmarks : (Array.isArray(ev.data) ? ev.data : []);
      const world = (ev.data && ev.data.worldLandmarks) ? ev.data.worldLandmarks : null;
      // smooth per-camera normalized and world landmarks
      const sm = smoothLandmarks(null, lm, smoothing);
      const smWorld = world ? smoothLandmarks(null, world, Math.min(0.6, smoothing)) : null;
      latestPosePerCamera[camIdx] = { landmarks: sm, world: smWorld };
      // draw overlay from first available camera's normalized landmarks
      const first = latestPosePerCamera.find(p=>p && p.landmarks);
      if (first && first.landmarks) draw2DPose(overlayCtx, first.landmarks);
      // fuse world landmarks if at least one camera provides them
      const available = latestPosePerCamera.filter(p=>p && p.world);
      if (available.length>0) {
        latestPose = { world: fuseAverages(available.map(p=>p.world)) };
        hud.set('Fusion', 'fusing ' + available.length + ' cam(s)');
      } else {
        latestPose = { landmarks: first ? first.landmarks : null };
        hud.set('Fusion', 'no world landmarks');
      }
      return;
    }
    if (ev.type === 'face') {
      const lm = ev.data && ev.data.landmarks ? ev.data.landmarks : ev.data;
      smoothedFace = smoothLandmarks(smoothedFace, lm, smoothing);
      if (showFace) draw2DFace(overlayCtx, smoothedFace);
      return;
    }
  }

  // drawing helpers: clear once per frame in each draw to avoid flicker
  function draw2DHands(ctx, hands){ ctx.clearRect(0,0,overlay.width,overlay.height); if (!hands || hands.length===0) return; const connections = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20]]; ctx.lineWidth=2;
    for(const h of hands){
      const lm = h.landmarks || h;
      const gesture = h.gesture || {};
      // draw bones
      ctx.strokeStyle = gesture.pinch ? 'rgba(255,120,80,0.95)' : 'rgba(0,209,255,0.9)'; ctx.beginPath();
      for(const [a,b] of connections){ const A=lm[a], B=lm[b]; if(!A||!B) continue; ctx.moveTo(A.x*overlay.width, A.y*overlay.height); ctx.lineTo(B.x*overlay.width, B.y*overlay.height); }
      ctx.stroke();
      // draw joints with confidence-sized circles
      for(let i=0;i<lm.length;i++){ const p=lm[i]; if(!p) continue; const x=p.x*overlay.width, y=p.y*overlay.height; const r = (i===4||i===8)?6:3; ctx.fillStyle = gesture.pinch ? '#ffb' : '#fff'; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); }
      // if pinch gesture, draw connecting circle/line between tips
      if (gesture && gesture.pinch) {
        const t4 = lm[4]; const t8 = lm[8]; if (t4 && t8) {
          const x1=t4.x*overlay.width, y1=t4.y*overlay.height, x2=t8.x*overlay.width, y2=t8.y*overlay.height;
          ctx.strokeStyle = 'rgba(255,200,120,0.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); ctx.fillStyle='rgba(255,200,120,0.9)'; ctx.beginPath(); ctx.arc((x1+x2)/2,(y1+y2)/2,8,0,Math.PI*2); ctx.fill(); ctx.lineWidth=2;
        }
      }
    }
  }

  function draw2DPose(ctx, pose){ ctx.clearRect(0,0,overlay.width,overlay.height); if (!pose) return; const conns = [[11,13],[13,15],[12,14],[14,16],[11,12],[23,24],[11,23],[12,24],[23,25],[24,26],[25,27],[26,28]]; ctx.lineWidth=3; ctx.strokeStyle = 'rgba(138,175,255,0.95)';
    // draw bones
    ctx.beginPath(); for(const [a,b] of conns){ const A=pose[a], B=pose[b]; if(!A||!B) continue; ctx.moveTo(A.x*overlay.width, A.y*overlay.height); ctx.lineTo(B.x*overlay.width, B.y*overlay.height); } ctx.stroke();
    // draw joints with confidence-based alpha
    for(let i=0;i<pose.length;i++){ const p=pose[i]; if(!p) continue; const conf = p.visibility!==undefined? p.visibility : 1.0; ctx.globalAlpha = Math.max(0.2, conf); ctx.fillStyle='#8af'; ctx.beginPath(); ctx.arc(p.x*overlay.width, p.y*overlay.height, 4,0,Math.PI*2); ctx.fill(); } ctx.globalAlpha = 1.0;
  }



  function draw2DFace(ctx, face){ ctx.clearRect(0,0,overlay.width,overlay.height); if (!face) return; ctx.lineWidth=1; ctx.strokeStyle='rgba(255,180,71,0.9)'; ctx.fillStyle='rgba(255,180,71,0.9)';
    // some facial feature loops (indices from MediaPipe FaceMesh common landmarks)
    const lips = [61,146,91,181,84,17,314,405,321,375,291];
    const leftEye = [33,7,163,144,145,153,154,155,133];
    const rightEye = [263,249,390,373,374,380,381,382,362];
    const jaw = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152];
    function drawLoop(idxs){ ctx.beginPath(); for(let i=0;i<idxs.length;i++){ const p = face[idxs[i]]; if(!p) continue; const x=p.x*overlay.width, y=p.y*overlay.height; if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); } ctx.closePath(); ctx.stroke(); }
    drawLoop(lips); drawLoop(leftEye); drawLoop(rightEye); drawLoop(jaw);
    // draw some dots for landmark clarity
    for(let i=0;i<face.length;i+=6){ const p=face[i]; if(!p) continue; ctx.beginPath(); ctx.arc(p.x*overlay.width,p.y*overlay.height,1.2,0,Math.PI*2); ctx.fill(); }
  }

  // render loop updates avatar from latest pose
  startLoop(renderer, scene, camera, (dt)=>{
    if (latestPose) {
      let trackedPos = null;
      let smoothing = 0.7;
      if (latestPose.world && latestPose.world.length) {
        // Use support leg/foot if available
        const supportFoot = getSupportFootPosition(latestPose.world);
        if (supportFoot) {
          trackedPos = { x: supportFoot.x, y: supportFoot.y + 1.6, z: -supportFoot.z };
          smoothing = 0.85; // stickier when on one foot
        } else {
          const pelvis = latestPose.world[23] || latestPose.world[24] || latestPose.world[0];
          if (pelvis) trackedPos = { x: pelvis.x, y: pelvis.y + 1.6, z: -pelvis.z };
        }
        updateAvatarFromPose(avatar, latestPose.world, (x,y,z,scale)=>{
          const v = new THREE.Vector3(x, y + 1.6, -z);
          return v;
        });
      } else if (latestPose.landmarks) {
        const supportFoot = getSupportFootPosition(latestPose.landmarks);
        if (supportFoot) {
          const ndcX = (supportFoot.x - 0.5) * 2; const ndcY = -(supportFoot.y - 0.5) * 2; const ndcZ = -0.3 - (supportFoot.z * 1.6);
          const v = new THREE.Vector3(ndcX, ndcY, ndcZ); v.unproject(camera);
          trackedPos = { x: v.x, y: v.y, z: v.z };
          smoothing = 0.85;
        } else {
          const pelvis = latestPose.landmarks[23] || latestPose.landmarks[24] || latestPose.landmarks[0];
          if (pelvis) {
            const ndcX = (pelvis.x - 0.5) * 2; const ndcY = -(pelvis.y - 0.5) * 2; const ndcZ = -0.3 - (pelvis.z * 1.6);
            const v = new THREE.Vector3(ndcX, ndcY, ndcZ); v.unproject(camera);
            trackedPos = { x: v.x, y: v.y, z: v.z };
          }
        }
        updateAvatarFromPose(avatar, latestPose.landmarks, (x,y,z,scale)=>{
          const ndcX = (x - 0.5) * 2; const ndcY = -(y - 0.5) * 2; const ndcZ = -0.3 - (z * 1.6);
          const v = new THREE.Vector3(ndcX, ndcY, ndcZ); v.unproject(camera); return v;
        });
      }
      // Physics stabilization: clamp and sync
      if (avatar.isRagdoll && ragdoll) {
        // In ragdoll mode, update visuals from physics
        updateAdvancedRagdollVisuals(avatar);
        // Optionally blend back to tracking if needed
      } else if (avatar.physicsBody) {
        clampVelocity(avatar.physicsBody, 4);
        clampPosition(avatar.physicsBody, -2, 3);
        if (trackedPos) {
          // Smoothly blend to tracked position for ground contact
          avatar.physicsBody.position.x = avatar.physicsBody.position.x * (1-smoothing) + trackedPos.x * smoothing;
          avatar.physicsBody.position.y = avatar.physicsBody.position.y * (1-smoothing) + trackedPos.y * smoothing;
          avatar.physicsBody.position.z = avatar.physicsBody.position.z * (1-smoothing) + trackedPos.z * smoothing;
          avatar.physicsBody.velocity.x = 0;
          avatar.physicsBody.velocity.y = 0;
          avatar.physicsBody.velocity.z = 0;
        }
      }
    }
  });

})();
