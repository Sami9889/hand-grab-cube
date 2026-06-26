// physics-integrator.js
// Integrator for advancing physics simulation
export function integrateBodies(bodies, dt) {
  for (const body of bodies) {
    body.integrate(dt);
  }
}
