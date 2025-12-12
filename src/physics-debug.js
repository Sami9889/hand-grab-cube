// physics-debug.js
// Debug helpers for physics engine
export function logBodies(bodies) {
  for (const b of bodies) {
    console.log('Body', b.position, b.velocity);
  }
}
