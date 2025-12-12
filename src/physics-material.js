// physics-material.js
// Material properties for physics (friction, restitution)
export class PhysicsMaterial {
  constructor({ friction = 0.5, restitution = 0.2 } = {}) {
    this.friction = friction;
    this.restitution = restitution;
  }
}
