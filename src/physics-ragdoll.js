// physics-ragdoll.js
// Full ragdoll system: creates physics bodies and joints for avatar, supports mode switching
import { RigidBody } from './physics-rigidbody.js';
import { Joint } from './physics-joint.js';

export function createRagdoll(avatar, world) {
  // Create a rigid body for each major joint
  const jointNames = Object.keys(avatar.joints);
  const bodies = {};
  for (const name of jointNames) {
    const j = avatar.joints[name];
    bodies[name] = new RigidBody({
      mass: name.includes('Hip') || name.includes('pelvis') ? 10 : 2,
      position: { x: j.mesh.position.x, y: j.mesh.position.y, z: j.mesh.position.z },
      shape: 'sphere',
      size: [0.08,0.08,0.08]
    });
    world.addBody(bodies[name]);
  }
  // Connect bodies with joints (ball joints for now)
  const jointPairs = [
    ['leftShoulder','leftElbow'], ['leftElbow','leftWrist'],
    ['rightShoulder','rightElbow'], ['rightElbow','rightWrist'],
    ['leftHip','leftKnee'], ['leftKnee','leftAnkle'],
    ['rightHip','rightKnee'], ['rightKnee','rightAnkle'],
    ['leftShoulder','rightShoulder'], ['leftHip','rightHip'],
    ['leftShoulder','leftHip'], ['rightShoulder','rightHip'],
    ['pelvis','leftHip'], ['pelvis','rightHip'], ['pelvis','torso'],
    ['torso','leftShoulder'], ['torso','rightShoulder']
  ];
  const joints = [];
  for (const [a,b] of jointPairs) {
    if (bodies[a] && bodies[b]) joints.push(new Joint(bodies[a], bodies[b], 'ball'));
  }
  return { bodies, joints };
}

export function setRagdollMode(avatar, ragdoll, enabled = true) {
  avatar.isRagdoll = enabled;
  avatar.ragdoll = ragdoll;
}

export function updateRagdollVisuals(avatar) {
  if (!avatar.isRagdoll || !avatar.ragdoll) return;
  // Copy physics body positions to avatar joints
  for (const name in avatar.ragdoll.bodies) {
    if (avatar.joints[name]) {
      const p = avatar.ragdoll.bodies[name].position;
      avatar.joints[name].mesh.position.set(p.x, p.y, p.z);
    }
  }
}
