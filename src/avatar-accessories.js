// avatar-accessories.js
// Adds accessories (hats, glasses, etc) to the avatar
import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';

export function addHat(avatar, color = 0x222244) {
  const hat = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.13, 0.08, 18),
    new THREE.MeshStandardMaterial({ color, metalness: 0.2, roughness: 0.6 })
  );
  hat.position.set(0, 0.18, 0);
  hat.castShadow = true;
  avatar.group.add(hat);
  avatar.hat = hat;
}

export function addGlasses(avatar, color = 0x222222) {
  const glasses = new THREE.Group();
  for (let i = -1; i <= 1; i += 2) {
    const frame = new THREE.Mesh(
      new THREE.TorusGeometry(0.045, 0.012, 8, 16),
      new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.4 })
    );
    frame.position.set(0.045 * i, 0.09, 0.09);
    glasses.add(frame);
  }
  avatar.group.add(glasses);
  avatar.glasses = glasses;
}
