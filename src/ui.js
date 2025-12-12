export function createUI(containerId='ui'){
  const ui = document.getElementById(containerId);
  const controls = {
    elements: {
      trackingMode: document.getElementById('trackingMode'),
      overlayToggle: document.getElementById('overlayToggle'),
      lowPerf: document.getElementById('lowPerf'),
      maxObjects: document.getElementById('maxObjects'),
      snapshot: document.getElementById('snapshotBtn'),
      useTestVideo: document.getElementById('useTestVideo')
    },
    extras: {
      showHands: document.getElementById('showHands'),
      showFps: document.getElementById('showFps'),
      showPose: document.getElementById('showPose'),
      showFace: document.getElementById('showFace'),
      smoothing: document.getElementById('smoothing'),
      wsUrl: document.getElementById('wsUrl'),
      wsConnect: document.getElementById('wsConnect')
    },
    on: (name, fn) => { const el = controls.elements[name]; if (!el) return; el.addEventListener('change', (e)=>fn(e)); },
    get: (name)=>{ const el = controls.elements[name]; if (!el) return null; if (el.type==='checkbox') return el.checked; return el.value; }
  };
  return controls;
}
