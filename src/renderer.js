import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';

export async function createRenderer({ onResize, enableVR = true, cameraMode = 'orbit' } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0d10);
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 100);
  camera.position.set(0, 1.6, 2.6);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.xr.enabled = enableVR; // enable WebXR only if requested
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Camera controls for non-VR 3D game mode
  let controls = null;
  const cameraState = {
    mode: cameraMode, // 'orbit', 'firstPerson', 'free', or 'vr'
    orbitTarget: new THREE.Vector3(0, 1, 0),
    orbitDistance: 3.5,
    orbitAngleH: 0, // horizontal angle
    orbitAngleV: 0.3, // vertical angle
    firstPersonYaw: 0,
    firstPersonPitch: 0,
    position: new THREE.Vector3(0, 1.6, 2.6),
    keys: { w: false, a: false, s: false, d: false, shift: false, space: false }
  };

  // optional FPS stats (dynamic import) - non-fatal if not available
  let stats = null;
  try {
    const mod = await import('https://unpkg.com/three@0.152.2/examples/jsm/libs/stats.module.js');
    const Stats = mod.default || mod.Stats || null;
    if (Stats) {
      stats = Stats();
      stats.dom.style.position = 'absolute';
      stats.dom.style.top = '8px';
      stats.dom.style.left = '8px';
      stats.dom.style.zIndex = 9999;
      document.body.appendChild(stats.dom);
    }
  } catch (e) { /* ignore if stats module not available */ }
  // expose stats on the renderer for the render loop to update
  if (stats) renderer.__stats = stats;

  // lights
  const dir = new THREE.DirectionalLight(0xffffff, 0.9); dir.position.set(4, 8, 6); scene.add(dir);
  dir.castShadow = true;
  dir.shadow.mapSize.width = 1024; dir.shadow.mapSize.height = 1024;
  dir.shadow.camera.near = 0.5; dir.shadow.camera.far = 50;
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  // ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40,40), new THREE.MeshStandardMaterial({ color: 0x121316, roughness: 1 }));
  ground.rotation.x = -Math.PI/2; ground.position.y = -1; scene.add(ground);
  ground.receiveShadow = true;

  // helpers
  const grid = new THREE.GridHelper(10, 10, 0x2a2a2a, 0x151515); grid.position.y = -0.99; scene.add(grid);
  const axes = new THREE.AxesHelper(0.6); axes.position.y = -0.95; axes.visible = false; scene.add(axes);

  // Camera control functions for 3D game modes
  function updateOrbitCamera(dt) {
    const dist = cameraState.orbitDistance;
    const h = cameraState.orbitAngleH;
    const v = cameraState.orbitAngleV;
    camera.position.x = cameraState.orbitTarget.x + dist * Math.cos(v) * Math.sin(h);
    camera.position.y = cameraState.orbitTarget.y + dist * Math.sin(v);
    camera.position.z = cameraState.orbitTarget.z + dist * Math.cos(v) * Math.cos(h);
    camera.lookAt(cameraState.orbitTarget);
  }

  function updateFirstPersonCamera(dt) {
    const speed = cameraState.keys.shift ? 8 : 4;
    const velocity = new THREE.Vector3();
    
    // Forward/backward (relative to camera direction)
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0; // keep movement horizontal
    forward.normalize();
    
    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    
    if (cameraState.keys.w) velocity.add(forward);
    if (cameraState.keys.s) velocity.sub(forward);
    if (cameraState.keys.d) velocity.add(right);
    if (cameraState.keys.a) velocity.sub(right);
    if (cameraState.keys.space) velocity.y += 1;
    if (cameraState.keys.shift && !cameraState.keys.w && !cameraState.keys.s && !cameraState.keys.a && !cameraState.keys.d) velocity.y -= 1;
    
    velocity.normalize().multiplyScalar(speed * dt);
    camera.position.add(velocity);
    
    // Update camera rotation from yaw/pitch
    camera.rotation.order = 'YXZ';
    camera.rotation.y = cameraState.firstPersonYaw;
    camera.rotation.x = cameraState.firstPersonPitch;
  }

  // Mouse controls for camera
  let mouseDown = false;
  window.addEventListener('mousedown', (e) => {
    if (e.button === 0) mouseDown = true; // left click
  });
  window.addEventListener('mouseup', () => { mouseDown = false; });
  window.addEventListener('mousemove', (e) => {
    if (!mouseDown) return;
    
    const sensitivity = 0.003;
    if (cameraState.mode === 'orbit') {
      cameraState.orbitAngleH -= e.movementX * sensitivity;
      cameraState.orbitAngleV = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, cameraState.orbitAngleV - e.movementY * sensitivity));
    } else if (cameraState.mode === 'firstPerson') {
      cameraState.firstPersonYaw -= e.movementX * sensitivity;
      cameraState.firstPersonPitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, cameraState.firstPersonPitch - e.movementY * sensitivity));
    }
  });
  
  // Zoom with mouse wheel (orbit mode)
  window.addEventListener('wheel', (e) => {
    if (cameraState.mode === 'orbit') {
      cameraState.orbitDistance = Math.max(0.5, Math.min(20, cameraState.orbitDistance + e.deltaY * 0.01));
      e.preventDefault();
    }
  }, { passive: false });

  // Keyboard controls
  window.addEventListener('keydown', (e) => {
    if (e.key === 'w' || e.key === 'W') cameraState.keys.w = true;
    if (e.key === 'a' || e.key === 'A') cameraState.keys.a = true;
    if (e.key === 's' || e.key === 'S') cameraState.keys.s = true;
    if (e.key === 'd' || e.key === 'D') cameraState.keys.d = true;
    if (e.key === ' ') { cameraState.keys.space = true; e.preventDefault(); }
    if (e.key === 'Shift') cameraState.keys.shift = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 'W') cameraState.keys.w = false;
    if (e.key === 'a' || e.key === 'A') cameraState.keys.a = false;
    if (e.key === 's' || e.key === 'S') cameraState.keys.s = false;
    if (e.key === 'd' || e.key === 'D') cameraState.keys.d = false;
    if (e.key === ' ') cameraState.keys.space = false;
    if (e.key === 'Shift') cameraState.keys.shift = false;
  });

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (onResize) onResize();
  }
  window.addEventListener('resize', onWindowResize);

  // add VR button if available and requested
  if (enableVR) {
    try {
      const mod = await import('https://unpkg.com/three@0.152.2/examples/jsm/webxr/VRButton.js');
      const VRButton = mod.VRButton || mod.default || null;
      if (VRButton && typeof VRButton.createButton === 'function') document.body.appendChild(VRButton.createButton(renderer));
    } catch(e){ /* ignore if module not available */ }
  }

  // Expose camera control API
  const setCameraMode = (mode) => {
    cameraState.mode = mode;
    console.log('[Renderer] Camera mode:', mode);
  };

  return { 
    scene, 
    camera, 
    renderer, 
    onWindowResize, 
    helpers: { grid, axes }, 
    stats,
    cameraState,
    setCameraMode,
    updateCamera: (dt) => {
      if (cameraState.mode === 'orbit') updateOrbitCamera(dt);
      else if (cameraState.mode === 'firstPerson') updateFirstPersonCamera(dt);
      // 'free' and 'vr' modes don't auto-update
    }
  };
}

export function startLoop(renderer, scene, camera, tick, { updateCamera = null } = {}) {
  let last = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    
    // Update camera if control function provided (for non-VR modes)
    if (updateCamera && typeof updateCamera === 'function') {
      updateCamera(dt);
    }
    
    if (tick) tick(dt);
    
    // update optional stats if present on the renderer object
    try {
      const maybeStats = renderer.__stats;
      if (maybeStats && typeof maybeStats.update === 'function') maybeStats.update();
    } catch (e) { }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}
