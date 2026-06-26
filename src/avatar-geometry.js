// avatar-geometry.js
// Utility for generating more complex avatar geometry (muscle, body shapes)
import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';

export function createMuscleLimb(radius = 0.04, length = 0.3, color = 0xffb347) {
  // Capsule-like limb with rounded ends
  const group = new THREE.Group();
  const cyl = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 18),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4 })
  );
  group.add(cyl);
  const sph1 = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 12, 8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4 })
  );
  sph1.position.y = length / 2;
  group.add(sph1);
  const sph2 = sph1.clone();
  sph2.position.y = -length / 2;
  group.add(sph2);
  return group;
}

export function createTorsoShape(width = 0.22, height = 0.32, depth = 0.13, color = 0xffb347) {
  // Slightly rounded box for torso
  const geo = new THREE.BoxGeometry(width, height, depth, 2, 3, 2);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35 });
  const mesh = new THREE.Mesh(geo, mat);
  return mesh;
}
