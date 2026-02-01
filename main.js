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
  // Detect if mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  console.log('[Device] Mobile detected:', isMobile);
  
  // Initialize renderer with mobile optimizations
  const { scene, camera, renderer, cameraState, setCameraMode, updateCamera } = await createRenderer({ 
    enableVR: false, 
    cameraMode: 'orbit' 
  });
  
  // Apply mobile-specific renderer optimizations
  if (isMobile) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); // Lower pixel ratio for performance
    renderer.shadowMap.enabled = false; // Disable shadows on mobile for performance
    console.log('[Renderer] Mobile optimizations applied');
  }
  
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
  // Flip avatar to correct MediaPipe Y-axis (which points downward)
  avatar.group.scale.set(1, -1, 1);
  
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
  
  // Performance mode - enable by default on mobile
  const lowPerfInput = document.getElementById('lowPerf');
  if (lowPerfInput) {
    if (isMobile) {
      lowPerfInput.checked = true;
      tracking.applyPerf(true);
      console.log('[Tracking] Low performance mode enabled for mobile');
    }
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
  
  // Physics tracking variables
  let trackedPos = null;
  let smoothingFactor = 0.5;

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
      
      console.log('[TRACKING EVENT] Pose received - normalized:', lm.length, 'world:', world ? world.length : 'none');
      
      latestPosePerCamera[camIdx] = { landmarks: lm, world: world };
      
      // Prefer world landmarks (3D) over normalized landmarks (2D)
      const first = latestPosePerCamera.find(p => p && (p.world || p.landmarks));
      if (first) {
        if (first.world && first.world.length > 0) {
          latestPose = { world: first.world };
          hud.set('Tracking', `3D: ${first.world.length} landmarks`);
          console.log('[TRACKING] Using 3D world landmarks');
        } else if (first.landmarks && first.landmarks.length > 0) {
          latestPose = { landmarks: first.landmarks };
          hud.set('Tracking', `2D: ${first.landmarks.length} landmarks`);
          console.log('[TRACKING] Using 2D screen landmarks');
        }
      }
      
      // Fuse multiple cameras if available
      const available = latestPosePerCamera.filter(p => p?.world);
      if (available.length > 1) {
        latestPose = { world: fuseAverages(available.map(p => p.world)) };
        hud.set('Fusion', `${available.length} cameras`);
        console.log('[TRACKING] Fused', available.length, 'cameras');
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
    // Show/hide mobile controls based on camera mode
    if (isMobile) {
      const mobileControls = document.getElementById('mobileControls');
      const jumpButton = document.getElementById('jumpButton');
      if (e.target.value === 'firstPerson') {
        if (mobileControls) mobileControls.classList.add('active');
        if (jumpButton) jumpButton.style.display = 'flex';
      } else {
        if (mobileControls) mobileControls.classList.remove('active');
        if (jumpButton) jumpButton.style.display = 'none';
      }
    }
  });

  // Mobile virtual joystick controls
  if (isMobile) {
    const joystick = document.getElementById('joystick');
    const joystickKnob = joystick?.querySelector('.joystick-knob');
    const jumpButton = document.getElementById('jumpButton');
    
    if (joystick && joystickKnob) {
      let joystickActive = false;
      let joystickCenter = { x: 0, y: 0 };
      
      joystick.addEventListener('touchstart', (e) => {
        e.preventDefault();
        joystickActive = true;
        const rect = joystick.getBoundingClientRect();
        joystickCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      });
      
      joystick.addEventListener('touchmove', (e) => {
        if (!joystickActive) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - joystickCenter.x;
        const deltaY = touch.clientY - joystickCenter.y;
        
        // Limit movement to joystick radius
        const maxDistance = 35;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const limitedDeltaX = distance > maxDistance ? (deltaX / distance) * maxDistance : deltaX;
        const limitedDeltaY = distance > maxDistance ? (deltaY / distance) * maxDistance : deltaY;
        
        // Update knob position
        joystickKnob.style.transform = `translate(calc(-50% + ${limitedDeltaX}px), calc(-50% + ${limitedDeltaY}px))`;
        
        // Update camera state for first person mode
        if (cameraState.mode === 'firstPerson') {
          const normalizedX = limitedDeltaX / maxDistance;
          const normalizedY = limitedDeltaY / maxDistance;
          
          cameraState.keys.w = normalizedY < -0.3;
          cameraState.keys.s = normalizedY > 0.3;
          cameraState.keys.a = normalizedX < -0.3;
          cameraState.keys.d = normalizedX > 0.3;
        }
      });
      
      const resetJoystick = () => {
        joystickActive = false;
        joystickKnob.style.transform = 'translate(-50%, -50%)';
        cameraState.keys.w = false;
        cameraState.keys.s = false;
        cameraState.keys.a = false;
        cameraState.keys.d = false;
      };
      
      joystick.addEventListener('touchend', resetJoystick);
      joystick.addEventListener('touchcancel', resetJoystick);
    }
    
    // Jump button
    if (jumpButton) {
      jumpButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        cameraState.keys.space = true;
      });
      
      jumpButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        cameraState.keys.space = false;
      });
    }
    
    console.log('[Mobile] Virtual controls initialized');
  }

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
        
        const supportFoot = getSupportFootPosition(latestPose.world);
        if (supportFoot) {
          trackedPos = { 
            x: supportFoot.x, 
            y: -supportFoot.y + 1.6, 
            z: -supportFoot.z 
          };
          smoothingFactor = 0.85;
        } else {
          const pelvis = latestPose.world[23] || latestPose.world[24] || latestPose.world[0];
          if (pelvis) {
            trackedPos = { 
              x: pelvis.x, 
              y: -pelvis.y + 1.6, 
              z: -pelvis.z 
            };
          }
        }
        
        updateAvatarFromPose(avatar, latestPose.world, (x, y, z, scale) => {
          // MediaPipe world coordinates: x=right, y=up, z=forward (toward camera)
          // THREE.js: x=right, y=up, z=backward (away from camera)
          // Flip Z to convert from camera-forward to camera-backward
          return new THREE.Vector3(x, y, -z);
        });
      }
      // Fallback to screen landmarks (2D tracking)
      else if (latestPose.landmarks) {
        // Log occasionally for debugging
        if (now - lastLogTime > 2000) {
          console.log('[2D TRACKING] Using screen landmarks:', latestPose.landmarks.length);
          lastLogTime = now;
        }
        
        const supportFoot = getSupportFootPosition(latestPose.landmarks);
        if (supportFoot) {
          const ndcX = (supportFoot.x - 0.5) * 2;
          const ndcY = -(supportFoot.y - 0.5) * 2;
          const ndcZ = -0.3 - (supportFoot.z * 1.6);
          const v = new THREE.Vector3(ndcX, ndcY, ndcZ);
          v.unproject(camera);
          trackedPos = { x: v.x, y: v.y, z: v.z };
          smoothingFactor = 0.85;
        } else {
          const pelvis = latestPose.landmarks[23] || latestPose.landmarks[24] || latestPose.landmarks[0];
          if (pelvis) {
            const ndcX = (pelvis.x - 0.5) * 2;
            const ndcY = -(pelvis.y - 0.5) * 2;
            const ndcZ = -0.3 - (pelvis.z * 1.6);
            const v = new THREE.Vector3(ndcX, ndcY, ndcZ);
            v.unproject(camera);
            trackedPos = { x: v.x, y: v.y, z: v.z };
          }
        }
        
        updateAvatarFromPose(avatar, latestPose.landmarks, (x, y, z, scale) => {
          // Convert MediaPipe 2D landmarks [0-1] to THREE.js world space
          // x: 0-1 (left to right) -> THREE.js X
          // y: 0-1 (top to bottom) -> THREE.js Y (inverted)
          // z: relative depth -> THREE.js Z
          const ndcX = (x - 0.5) * 2;
          const ndcY = -(y - 0.5) * 2;  // Flip Y axis
          const ndcZ = -0.3 - (z * 1.6);
          const v = new THREE.Vector3(ndcX, ndcY, ndcZ);
          v.unproject(camera);
          return v;
        });
      }
    }
  }, { updateCamera });

})();
