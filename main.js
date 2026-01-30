import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';
import { createRenderer, startLoop } from './src/renderer.js';
import { clampVelocity, clampPosition } from './src/physics-stabilizer.js';
import { getSupportFootPosition } from './src/physics-support-leg.js';
import { createTracking } from './src/tracking.js';
import { createAvatar, updateAvatarFromPose } from './src/avatar.js';
import { createHUD } from './src/hud.js';
import { fuseAverages } from './src/multiview.js';

// Enhanced error reporting
window.addEventListener('error', (event) => {
  console.error('Global Error:', event.message, event.filename, event.lineno, event.colno, event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
});

(async function(){
  // Initialize renderer
  const { scene, camera, renderer, cameraState, setCameraMode, updateCamera } = await createRenderer({ 
    enableVR: false, 
    cameraMode: 'orbit' 
  });
  document.body.appendChild(renderer.domElement);
  
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = 'Status: Renderer initialized';
    statusEl.classList.add('loading');
  }

  // Initialize tracking
  const tracking = await createTracking({ onEvent: handleTrackingEvent, perfMode: false });
  const videoEl = document.getElementById('video');
  
  // Create 3D avatar
  const avatar = createAvatar(scene);
  console.log('3D Avatar created:', avatar);
  avatar.group.visible = true;
  avatar.group.position.set(0, 0, 0);
  
  // Physics body for avatar
  avatar.physicsBody = {
    position: { x: 0, y: 1.6, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    mass: 80
  };

  // HUD
  const hud = createHUD(document.body);
  const hudToggle = document.getElementById('hudToggle');
  if (hudToggle) {
    hudToggle.addEventListener('change', (e) => {
      hud.el.style.display = e.target.checked ? 'block' : 'none';
    });
  }

  // Camera management
  const cameraSelect = document.getElementById('cameraSelect');
  const cameraStartBtn = document.getElementById('cameraStartBtn');
  const cameraStopBtn = document.getElementById('cameraStopBtn');
  const activeCamHandles = [];
  
  async function refreshCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const vids = devices.filter(d => d.kind === 'videoinput');
      if (!cameraSelect) return;
      cameraSelect.innerHTML = '';
      
      if (vids.length === 0) {
        if (statusEl) statusEl.textContent = 'Status: No cameras detected';
        return;
      }
      
      vids.forEach((v, i) => {
        const o = document.createElement('option');
        o.value = v.deviceId;
        o.textContent = v.label || `Camera ${i + 1}`;
        cameraSelect.appendChild(o);
      });
    } catch (e) {
      console.warn('Failed to enumerate cameras:', e);
      if (statusEl) statusEl.textContent = 'Status: Camera access denied';
    }
  }
  
  async function requestCameraPermission() {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      await refreshCameras();
    } catch (e) {
      console.warn('Camera permission request failed:', e);
      if (statusEl) statusEl.textContent = 'Status: Camera permission denied';
    }
  }
  
  await refreshCameras();
  await requestCameraPermission();
  
  // Start camera button
  if (cameraStartBtn && cameraSelect) {
    cameraStartBtn.addEventListener('click', async () => {
      const selected = Array.from(cameraSelect.selectedOptions).map(o => o.value);
      if (!selected || selected.length === 0) {
        if (statusEl) statusEl.textContent = 'Status: Please select a camera';
        return;
      }
      
      let started = 0;
      for (const deviceId of selected) {
        const v = document.createElement('video');
        v.autoplay = true;
        v.playsInline = true;
        v.style.display = 'none';
        document.body.appendChild(v);
        
        try {
          const handle = await tracking.startCamera(v, { deviceId });
          activeCamHandles.push(handle);
          started++;
        } catch (e) {
          console.warn('Camera start failed:', e);
        }
      }
      
      if (statusEl) {
        statusEl.classList.remove('loading');
        statusEl.textContent = started > 0 
          ? `Status: Tracking active (${started} camera${started > 1 ? 's' : ''})` 
          : 'Status: Failed to start cameras';
      }
    });
  }
  
  // Stop camera button
  if (cameraStopBtn) {
    cameraStopBtn.addEventListener('click', () => {
      activeCamHandles.forEach(h => {
        try {
          tracking.stopCamera(h);
          if (h?.videoEl?.parentNode) h.videoEl.parentNode.removeChild(h.videoEl);
        } catch (e) {
          console.warn('Error stopping camera:', e);
        }
      });
      activeCamHandles.length = 0;
      if (statusEl) {
        statusEl.classList.add('loading');
        statusEl.textContent = 'Status: Tracking stopped';
      }
    });
  }
  
  // Smoothing control
  const smoothingInput = document.getElementById('smoothing');
  let smoothing = 0.5;
  if (smoothingInput) {
    smoothingInput.addEventListener('input', (e) => {
      smoothing = Number(e.target.value);
    });
  }
  
  // Performance mode
  const lowPerfInput = document.getElementById('lowPerf');
  if (lowPerfInput) {
    lowPerfInput.addEventListener('change', (e) => {
      tracking.applyPerf(e.target.checked);
    });
  }

  // Event logging
  window.addEventListener('tracking-event', (e) => {
    const el = document.getElementById('eventLog');
    if (!el) return;
    
    const div = document.createElement('div');
    div.className = 'ev';
    div.textContent = `${e.detail.type} ${JSON.stringify(e.detail.data || {})}`;
    el.prepend(div);
    
    while (el.children.length > 30) {
      el.removeChild(el.lastChild);
    }
  });

  // Tracking data
  let latestPose = null;
  const latestPosePerCamera = [];

  // Tracking event handler
  function handleTrackingEvent(ev) {
    if (ev.type === 'camera-ready') {
      hud.set('Camera', `Camera ${ev.data.index || 0} ready`);
      return;
    }
    
    if (ev.type === 'camera-error') {
      hud.set('Error', ev.data.error || 'unknown');
      return;
    }
    
    if (ev.type === 'pose') {
      const camIdx = (ev.data.metadata?.cameraIndex) || 0;
      const lm = ev.data.normalized || [];
      const world = ev.data.world || null;
      
      latestPosePerCamera[camIdx] = { landmarks: lm, world: world };
      
      // Prefer world landmarks (3D) over normalized landmarks (2D)
      const first = latestPosePerCamera.find(p => p && (p.world || p.landmarks));
      if (first) {
        if (first.world && first.world.length > 0) {
          latestPose = { world: first.world };
          hud.set('Tracking', `3D World (${first.world.length})`);
        } else if (first.landmarks && first.landmarks.length > 0) {
          latestPose = { landmarks: first.landmarks };
          hud.set('Tracking', `2D Screen (${first.landmarks.length})`);
        }
      }
      
      // Fuse multiple cameras if available
      const available = latestPosePerCamera.filter(p => p?.world);
      if (available.length > 1) {
        latestPose = { world: fuseAverages(available.map(p => p.world)) };
        hud.set('Fusion', `${available.length} cameras fused`);
      }
    }
  }

  // Camera mode selector
  const cameraModeSelect = document.createElement('select');
  cameraModeSelect.id = 'cameraModeSelect';
  cameraModeSelect.innerHTML = `
    <option value="orbit">Orbit View</option>
    <option value="firstPerson">First Person</option>
    <option value="free">Free Camera</option>
  `;
  cameraModeSelect.style.cssText = 'position:absolute; top:120px; left:16px; z-index:1000; padding:8px; background:rgba(6,8,15,0.85); color:#fff; border:1px solid rgba(255,255,255,0.1); border-radius:6px; backdrop-filter:blur(8px);';
  document.body.appendChild(cameraModeSelect);
  cameraModeSelect.addEventListener('change', (e) => {
    setCameraMode(e.target.value);
  });

  // Render loop
  let frameCount = 0;
  let lastLogTime = 0;
  
  startLoop(renderer, scene, camera, (dt) => {
    frameCount++;
    const now = performance.now();
    
    if (latestPose) {
      // Use world landmarks if available (3D tracking)
      if (latestPose.world?.length) {
        // Log occasionally for debugging
        if (now - lastLogTime > 2000) {
          console.log('[3D TRACKING] Using world landmarks:', latestPose.world.length);
          console.log('[3D TRACKING] Sample landmark (hip):', latestPose.world[23]);
          lastLogTime = now;
        }
        
        updateAvatarFromPose(avatar, latestPose.world, (x, y, z) => {
          // MediaPipe world landmarks are in meters with origin at hips
          // X: left/right (positive = right, flip for mirror view)
          // Y: up/down (positive = up) 
          // Z: forward/back (positive = away from camera)
          return new THREE.Vector3(-x, y, -z);
        });
      }
      // Fallback to screen landmarks (2D tracking)
      else if (latestPose.landmarks) {
        // Log occasionally for debugging
        if (now - lastLogTime > 2000) {
          console.log('[2D TRACKING] Using screen landmarks:', latestPose.landmarks.length);
          lastLogTime = now;
        }
        
        updateAvatarFromPose(avatar, latestPose.landmarks, (x, y, z) => {
          // MediaPipe normalized landmarks are in [0,1] screen space
          // Convert to world space with depth approximation
          const worldX = -(x - 0.5) * 4;  // Scale to reasonable world units, flip X
          const worldY = (1 - y - 0.5) * 4; // Flip Y and scale
          const worldZ = -z * 2;          // Use Z as depth estimate
          return new THREE.Vector3(worldX, worldY, worldZ);
        });
      }
    }
  }, { updateCamera });

})();
