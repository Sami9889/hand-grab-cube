// avatar-outline.js
// Adds outline/highlight effect to avatar parts (e.g. when holding something)
import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';

export function addOutline(mesh, color = 0x00ff00, thickness = 0.025) {
  // Create a slightly larger mesh with emissive color for outline effect
  const outlineMat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  const outline = mesh.clone();
  outline.material = outlineMat;
  outline.scale.multiplyScalar(1 + thickness);
  outline.renderOrder = 1;
  mesh.add(outline);
  mesh.userData.outline = outline;
  return outline;
}

export function removeOutline(mesh) {
  if (mesh.userData.outline) {
    mesh.remove(mesh.userData.outline);
    delete mesh.userData.outline;
  }
}
