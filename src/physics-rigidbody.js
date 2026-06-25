export class RigidBody {
  constructor({ mass = 1, position = { x: 0, y: 0, z: 0 }, velocity = { x: 0, y: 0, z: 0 }, shape = 'box', size = [1,1,1], linearDamping = 0, angularDamping = 0 } = {}) {
    this.mass = mass;
    this.position = { ...position };
    this.velocity = { ...velocity };
    this.shape = shape;
    this.size = size;
    this.forces = { x: 0, y: 0, z: 0 };
    this.linearDamping = linearDamping;
    this.angularDamping = angularDamping;
  }
  applyForce(fx, fy, fz) {
    this.forces.x += fx;
    this.forces.y += fy;
    this.forces.z += fz;
  }
  integrate(dt) {
    if (this.mass > 0) {
      this.velocity.x += (this.forces.x / this.mass) * dt;
      this.velocity.y += (this.forces.y / this.mass) * dt;
      this.velocity.z += (this.forces.z / this.mass) * dt;
    }

    const linearDampingFactor = Math.max(0, 1 - this.linearDamping * dt);
    this.velocity.x *= linearDampingFactor;
    this.velocity.y *= linearDampingFactor;
    this.velocity.z *= linearDampingFactor;

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    this.forces = { x: 0, y: 0, z: 0 };
  }
}
