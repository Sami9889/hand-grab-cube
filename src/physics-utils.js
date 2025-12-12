// physics-utils.js
// Utility functions for physics engine
export function vec3(x, y, z) { return { x, y, z }; }
export function addVec3(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
export function subVec3(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
