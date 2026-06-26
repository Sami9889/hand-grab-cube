// avatar-materials.js
// Provides more advanced materials for avatar rendering
import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';

export function createAvatarMaterial({ color = 0xffb347, metallic = 0.3, roughness = 0.5, skin = false } = {}) {
  if (skin) {
    return new THREE.MeshPhysicalMaterial({
      color,
      metalness: metallic,
      roughness,
      clearcoat: 0.3,
      clearcoatRoughness: 0.2,
      transmission: 0.2,
      thickness: 0.1,
      sheen: 0.5,
      sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.2),
    });
  }
  return new THREE.MeshStandardMaterial({ color, metalness: metallic, roughness });
}
