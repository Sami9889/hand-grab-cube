// physics-joint.js
// Joint abstraction (for ragdoll, etc)
export class Joint {
  constructor(bodyA, bodyB, type = 'ball') {
    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this.type = type;
  }
  // TODO: Implement joint logic
}
