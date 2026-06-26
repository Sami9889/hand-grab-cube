// physics-gravity.js
// Gravity logic for physics engine
export function applyGravity(body, g = -9.81) {
  body.applyForce(0, body.mass * g, 0);
}
