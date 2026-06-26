// physics-collider.js
// Collider abstraction for physics engine
export class Collider {
  constructor({ shape = 'box', size = [1,1,1], position = { x: 0, y: 0, z: 0 } } = {}) {
    this.shape = shape;
    this.size = size;
    this.position = { ...position };
  }
  intersects(other) {
    // Simple AABB collision for boxes
    if (this.shape === 'box' && other.shape === 'box') {
      for (let i = 0; i < 3; i++) {
        if (Math.abs(this.position[['x','y','z'][i]] - other.position[['x','y','z'][i]]) > (this.size[i] + other.size[i]) / 2) {
          return false;
        }
      }
      return true;
    }
    // TODO: Add other shapes
    return false;
  }
}
