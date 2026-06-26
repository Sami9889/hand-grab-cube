export class PhysicsWorld {
  constructor() {
    this.bodies = [];
    this.joints = [];
    this.gravity = -9.81;
    this.constraintIterations = 3;
  }
  addBody(body) { this.bodies.push(body); }
  removeBody(body) { this.bodies = this.bodies.filter(b => b !== body); }
  addJoint(joint) { this.joints.push(joint); }
  removeJoint(joint) { this.joints = this.joints.filter(j => j !== joint); }

  step(dt) {
    for (const body of this.bodies) {
      if (body.mass > 0) body.applyForce(0, body.mass * this.gravity, 0);
      body.integrate(dt);
    }

    for (let iteration = 0; iteration < this.constraintIterations; iteration++) {
      for (const joint of this.joints) {
        joint.applyConstraint();
      }
    }
  }

  setConstraintIterations(iterations) {
    this.constraintIterations = Math.max(1, Math.min(10, iterations));
  }
}
