// physics-stepper.js
// Physics simulation stepper (fixed timestep)
export function stepPhysics(world, dt = 1/60) {
  world.step(dt);
}
