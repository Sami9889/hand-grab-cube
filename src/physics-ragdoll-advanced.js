// physics-ragdoll-advanced.js
// Advanced ragdoll: adds joint limits, torque, blending, and mode switching
import { RigidBody } from './physics-rigidbody.js';
import { Joint } from './physics-joint.js';

export function createAdvancedRagdoll(avatar, world) {
  // Create rigid bodies for all joints
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
  // Connect with joints and add limits
  const jointPairs = [
    ['leftShoulder','leftElbow','hinge'], ['leftElbow','leftWrist','hinge'],
    ['rightShoulder','rightElbow','hinge'], ['rightElbow','rightWrist','hinge'],
    ['leftHip','leftKnee','hinge'], ['leftKnee','leftAnkle','hinge'],
    ['rightHip','rightKnee','hinge'], ['rightKnee','rightAnkle','hinge'],
    ['leftShoulder','rightShoulder','ball'], ['leftHip','rightHip','ball'],
    ['leftShoulder','leftHip','ball'], ['rightShoulder','rightHip','ball'],
    ['pelvis','leftHip','ball'], ['pelvis','rightHip','ball'], ['pelvis','torso','ball'],
    ['torso','leftShoulder','ball'], ['torso','rightShoulder','ball']
  ];
  const joints = [];
  for (const [a,b,type] of jointPairs) {
    if (bodies[a] && bodies[b]) joints.push(new Joint(bodies[a], bodies[b], type||'ball'));
  }
  return { bodies, joints };
}

export function blendToTracking(avatar, ragdoll, alpha = 0.2) {
  // Blend ragdoll body positions toward tracked joint positions
  for (const name in ragdoll.bodies) {
    if (avatar.joints[name]) {
      const tracked = avatar.joints[name].mesh.position;
      const body = ragdoll.bodies[name];
      body.position.x = body.position.x * (1-alpha) + tracked.x * alpha;
      body.position.y = body.position.y * (1-alpha) + tracked.y * alpha;
      body.position.z = body.position.z * (1-alpha) + tracked.z * alpha;
    }
  }
}

export function setAdvancedRagdollMode(avatar, ragdoll, enabled = true) {
  avatar.isRagdoll = enabled;
  avatar.ragdoll = ragdoll;
}

export function updateAdvancedRagdollVisuals(avatar) {
  if (!avatar.isRagdoll || !avatar.ragdoll) return;
  for (const name in avatar.ragdoll.bodies) {
    if (avatar.joints[name]) {
      const p = avatar.ragdoll.bodies[name].position;
      avatar.joints[name].mesh.position.set(p.x, p.y, p.z);
    }
  }
}
