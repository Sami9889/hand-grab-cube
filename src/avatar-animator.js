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

export function animateWave(avatar, side = 'right', t = 0) {
  // Wave animation: move wrist and hand up and down with arm rotation
  const shoulder = avatar.joints[side + 'Shoulder'];
  const elbow = avatar.joints[side + 'Elbow'];
  const wrist = avatar.joints[side + 'Wrist'];
  const index = avatar.joints[side + 'Index'];
  const pinky = avatar.joints[side + 'Pinky'];
  const thumb = avatar.joints[side + 'Thumb'];
  
  if (!wrist) return;
  
  // Wave height and rotation - more dramatic
  const waveHeight = Math.sin(t * Math.PI * 4) * 0.25; // More dramatic vertical motion
  const waveRotation = Math.sin(t * Math.PI * 4) * 0.4; // Add rotational motion
  
  // Move shoulder back for wave gesture
  if (shoulder) {
    shoulder.mesh.position.z -= Math.sin(t * Math.PI * 4) * 0.08;
  }
  
  // Bend elbow
  if (elbow) {
    elbow.mesh.position.y += waveHeight * 0.8;
    elbow.mesh.position.x += Math.sin(t * Math.PI * 4) * 0.1;
  }
  
  // Move wrist up and down
  wrist.mesh.position.y += waveHeight;
  wrist.mesh.position.x += waveRotation * 0.15;
  wrist.mesh.position.z += Math.sin(t * Math.PI * 4) * 0.08;
  
  // Move fingers
  if (index) {
    index.mesh.position.y += waveHeight * 1.3;
  }
  if (thumb) {
    thumb.mesh.position.y += waveHeight * 1.2;
  }
  if (pinky) {
    pinky.mesh.position.y += waveHeight * 1.25;
  }
}
