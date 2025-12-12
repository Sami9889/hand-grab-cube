// physics-character.js
// Character controller for avatars
export class PhysicsCharacter {
  constructor(body) {
    this.body = body;
  }
  jump(force = 5) {
    this.body.applyForce(0, force * this.body.mass, 0);
  }
  move(dx, dz, speed = 1) {
    this.body.applyForce(dx * speed, 0, dz * speed);
  }
}
