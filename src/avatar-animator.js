// avatar-animator.js
// Provides procedural animation helpers for avatar movement
import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';

export function animateJump(avatar, t = 0) {
  // Simple jump: move torso and pelvis upward, bend knees
  if (!avatar.joints.torso || !avatar.joints.pelvis) return;
  const jumpHeight = Math.abs(Math.sin(t * Math.PI * 2)) * 0.18;
  avatar.joints.torso.mesh.position.y += jumpHeight;
  avatar.joints.pelvis.mesh.position.y += jumpHeight * 0.7;
  // Optionally bend knees (if present)
  ['leftKnee','rightKnee'].forEach(k => {
    if (avatar.joints[k]) avatar.joints[k].mesh.position.y -= jumpHeight * 0.4;
  });
}

export function animateKick(avatar, side = 'left', t = 0) {
  // Simple kick: move ankle and foot forward
  const ankle = avatar.joints[side + 'Ankle'];
  const foot = avatar.joints[side + 'Foot'];
  if (ankle && foot) {
    const kickDist = Math.abs(Math.sin(t * Math.PI)) * 0.22;
    ankle.mesh.position.z -= kickDist;
    foot.mesh.position.z -= kickDist * 1.1;
  }
}
