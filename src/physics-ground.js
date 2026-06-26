// physics-ground.js
// Ground plane for physics world
export function createGround({ size = [40, 40], y = -1 } = {}) {
  return {
    shape: 'box',
    size: [size[0], 0.1, size[1]],
    position: { x: 0, y, z: 0 },
    mass: 0
  };
}
