// physics-world.js
// World object for managing physics simulation
export class PhysicsWorld {
  constructor() {
    this.bodies = [];
    this.gravity = -9.81;
  }
  addBody(body) { this.bodies.push(body); }
  removeBody(body) { this.bodies = this.bodies.filter(b => b !== body); }
  step(dt) {
    for (const body of this.bodies) {
      if (body.mass > 0) body.applyForce(0, body.mass * this.gravity, 0);
      body.integrate(dt);
    }
  }
}
