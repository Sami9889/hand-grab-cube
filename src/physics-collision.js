// physics-collision.js
// Collision detection and response
export function detectCollisions(bodies) {
  const collisions = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i], b = bodies[j];
      if (a.collider && b.collider && a.collider.intersects(b.collider)) {
        collisions.push([a, b]);
      }
    }
  }
  return collisions;
}
