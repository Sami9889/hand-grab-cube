import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';

export async function createRenderer({ onResize, enableVR = true } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0d10);
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 100);
  camera.position.set(0, 1.6, 2.6);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.xr.enabled = true; // enable WebXR if available
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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

  return { scene, camera, renderer, onWindowResize, helpers: { grid, axes }, stats };
}

export function startLoop(renderer, scene, camera, tick) {
  let last = performance.now();
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
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
