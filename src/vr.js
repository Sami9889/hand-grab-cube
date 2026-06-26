import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';

// Simple VR controller + haptics helper
export function createVRControls(renderer, scene, { onSelectStart, onSelectEnd, onSqueeze } = {}) {
  const controllers = [];

  function build(i) {
    const controller = renderer.xr.getController(i);
    controller.addEventListener('selectstart', (ev)=>{ tryPulse(ev); if (onSelectStart) onSelectStart(ev); window.dispatchEvent(new CustomEvent('vr-controller',{detail:{type:'selectstart', index:i}})); });
    controller.addEventListener('selectend',   (ev)=>{ if (onSelectEnd) onSelectEnd(ev); window.dispatchEvent(new CustomEvent('vr-controller',{detail:{type:'selectend', index:i}})); });
    controller.addEventListener('squeezestart',(ev)=>{ tryPulse(ev,0.6,40); if (onSqueeze) onSqueeze(ev, true); window.dispatchEvent(new CustomEvent('vr-controller',{detail:{type:'squeezestart', index:i}})); });
    controller.addEventListener('squeeze',     (ev)=>{ if (onSqueeze) onSqueeze(ev, false); window.dispatchEvent(new CustomEvent('vr-controller',{detail:{type:'squeeze', index:i}})); });

    const grip = renderer.xr.getControllerGrip(i);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), new THREE.MeshStandardMaterial({ color: 0x8899ff }));
    grip.add(mesh);
    scene.add(grip);
    controllers.push({ controller, grip, mesh });
    return { controller, grip, mesh };
  }

  function tryPulse(ev, intensity = 0.5, duration = 50) {
    try {
      const input = ev && ev.inputSource ? ev.inputSource : (ev.target && ev.target.inputSource);
      if (!input) return;
      const gp = input.gamepad;
      if (gp && gp.hapticActuators && gp.hapticActuators.length) {
        gp.hapticActuators[0].pulse(intensity, duration).catch(()=>{});
      } else if (gp && gp.vibrationActuator && gp.vibrationActuator.playEffect) {
        gp.vibrationActuator.playEffect('dual-rumble', { duration, strongMagnitude: intensity, weakMagnitude: intensity }).catch(()=>{});
      }
    } catch(e) { }
  }

  function pulseOnControllers(intensity=0.5, duration=60) {
    try {
      const session = renderer.xr.getSession && renderer.xr.getSession();
      if (!session) return;
      for (const inputSource of session.inputSources) {
        const gp = inputSource.gamepad;
        if (gp && gp.hapticActuators && gp.hapticActuators.length) gp.hapticActuators[0].pulse(intensity, duration).catch(()=>{});
      }
    } catch(e){}
  }

  // build two controllers
  build(0); build(1);

  return { controllers, pulseOnControllers, dispose: ()=>{ controllers.forEach(c=>{ if (c.grip && c.grip.parent) c.grip.parent.remove(c.grip); }); controllers.length=0; } };
}
// src/vr.js
export function initVR(renderer){
  try{
    // renderer should have xr enabled and VRButton already appended by renderer module
    if(!renderer) return false;
    return true;
  }catch(e){ console.warn('VR init failed', e); return false; }
}

export default { initVR };
