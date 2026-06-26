// physics-contacts.js
// Contact points for collision response
export class Contact {
  constructor(bodyA, bodyB, point = { x: 0, y: 0, z: 0 }) {
    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this.point = { ...point };
  }
}
