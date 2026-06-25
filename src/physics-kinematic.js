// physics-kinematic.js
// Kinematic body abstraction (for animated/controlled objects)
export class KinematicBody {
  constructor({ position = { x: 0, y: 0, z: 0 } } = {}) {
    this.position = { ...position };
  }
  moveTo(x, y, z) {
    this.position = { x, y, z };
  }
}
