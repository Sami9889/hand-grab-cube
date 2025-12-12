// physics-stabilizer.js
// Prevents physics glitches by clamping velocity/position and supporting kinematic override
export function clampVelocity(body, maxVel = 5) {
  ['x','y','z'].forEach(axis => {
    if (body.velocity[axis] > maxVel) body.velocity[axis] = maxVel;
    if (body.velocity[axis] < -maxVel) body.velocity[axis] = -maxVel;
  });
}

export function clampPosition(body, minY = -10, maxY = 10) {
  if (body.position.y < minY) body.position.y = minY;
  if (body.position.y > maxY) body.position.y = maxY;
}

export function syncKinematic(body, targetPos) {
  // Directly set position for kinematic/controlled avatars
  body.position.x = targetPos.x;
  body.position.y = targetPos.y;
  body.position.z = targetPos.z;
  body.velocity.x = 0;
  body.velocity.y = 0;
  body.velocity.z = 0;
}
