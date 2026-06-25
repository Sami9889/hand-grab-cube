// render-engine.js
// Abstraction for switching or extending the rendering engine
// This is a stub for integrating other renderers (e.g. Babylon.js, PlayCanvas, custom WebGL)

export function createRenderEngine(type = 'three') {
  if (type === 'three') {
    return import('./renderer.js');
  }
  // TODO: Add support for other engines
  throw new Error('Render engine not supported: ' + type);
}
