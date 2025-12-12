// physics-shape.js
// Shape utilities for physics engine
export function createBox(size = [1,1,1]) {
  return { shape: 'box', size };
}
export function createSphere(radius = 1) {
  return { shape: 'sphere', size: [radius, radius, radius] };
}
