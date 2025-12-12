// physics-rigidbody.js
// Rigid body abstraction for physics engine
export class RigidBody {
  constructor({ mass = 1, position = { x: 0, y: 0, z: 0 }, velocity = { x: 0, y: 0, z: 0 }, shape = 'box', size = [1,1,1] } = {}) {
    this.mass = mass;
    this.position = { ...position };
    this.velocity = { ...velocity };
    this.shape = shape;
    this.size = size;
    this.forces = { x: 0, y: 0, z: 0 };
  }
  applyForce(fx, fy, fz) {
    this.forces.x += fx;
    this.forces.y += fy;
    this.forces.z += fz;
  }
  integrate(dt) {
    // Simple Euler integration
    this.velocity.x += (this.forces.x / this.mass) * dt;
    this.velocity.y += (this.forces.y / this.mass) * dt;
    this.velocity.z += (this.forces.z / this.mass) * dt;
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;
    // Reset forces
    this.forces = { x: 0, y: 0, z: 0 };
  }
}
