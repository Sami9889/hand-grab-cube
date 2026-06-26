export class Joint {
  constructor(bodyA, bodyB, type = 'ball', maxAngle = null) {
    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this.type = type;
    this.maxAngle = maxAngle;
    this.velocityDamping = 0.1;

    if (type === 'ball' || type === 'hinge') {
      const dx = bodyB.position.x - bodyA.position.x;
      const dy = bodyB.position.y - bodyA.position.y;
      const dz = bodyB.position.z - bodyA.position.z;
      this.restLength = Math.sqrt(dx*dx + dy*dy + dz*dz);
      this.stiffness = 3.5;
    }
  }

  applyConstraint() {
    if (this.type === 'ball' || this.type === 'hinge') {
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

        if (this.bodyA.velocity) {
          this.bodyA.velocity.x *= (1 - this.velocityDamping);
          this.bodyA.velocity.y *= (1 - this.velocityDamping);
          this.bodyA.velocity.z *= (1 - this.velocityDamping);
        }
        if (this.bodyB.velocity) {
          this.bodyB.velocity.x *= (1 - this.velocityDamping);
          this.bodyB.velocity.y *= (1 - this.velocityDamping);
          this.bodyB.velocity.z *= (1 - this.velocityDamping);
        }
      }

      if (this.maxAngle !== null && this.bodyA.orientation && this.bodyB.orientation) {
        this.enforceAngleLimit();
      }
    }
  }

  enforceAngleLimit() {
    const orientA = this.bodyA.orientation;
    const orientB = this.bodyB.orientation;

    if (!orientA || !orientB) return;

    const dotProduct =
      orientA.x * orientB.x +
      orientA.y * orientB.y +
      orientA.z * orientB.z +
      orientA.w * orientB.w;

    const angle = 2 * Math.acos(Math.min(1, Math.abs(dotProduct)));
    if (angle > this.maxAngle) {
      const scaleFactor = this.maxAngle / angle;
      if (this.bodyB.velocity) {
        this.bodyB.velocity.x *= scaleFactor;
        this.bodyB.velocity.y *= scaleFactor;
        this.bodyB.velocity.z *= scaleFactor;
      }
    }
  }
}
