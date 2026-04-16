// physics-joint.js
// Joint abstraction (for ragdoll, etc)
export class Joint {
  constructor(bodyA, bodyB, type = 'ball') {
    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this.type = type;
    if (type === 'ball') {
      const dx = bodyB.position.x - bodyA.position.x;
      const dy = bodyB.position.y - bodyA.position.y;
      const dz = bodyB.position.z - bodyA.position.z;
      this.restLength = Math.sqrt(dx*dx + dy*dy + dz*dz);
      this.stiffness = 1.0; // Adjust for tightness
    }
  }
  applyConstraint() {
    if (this.type === 'ball') {
      const posA = this.bodyA.position;
      const posB = this.bodyB.position;
      const dx = posB.x - posA.x;
      const dy = posB.y - posA.y;
      const dz = posB.z - posA.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (dist > 0) {
        const correction = (dist - this.restLength) / dist * this.stiffness;
        const cx = dx * correction * 0.5;
        const cy = dy * correction * 0.5;
        const cz = dz * correction * 0.5;
        this.bodyA.position.x += cx;
        this.bodyA.position.y += cy;
        this.bodyA.position.z += cz;
        this.bodyB.position.x -= cx;
        this.bodyB.position.y -= cy;
        this.bodyB.position.z -= cz;
      }
    }
  }
}
