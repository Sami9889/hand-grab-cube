import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';

export function createAvatar(scene) {
  console.log('[AVATAR] Creating avatar');
  
  const group = new THREE.Group();
  
  // Bright, easy-to-see material
  const mat = new THREE.MeshStandardMaterial({ 
    color: 0xff6600,  // Bright orange
    wireframe: false,  // Solid, not wireframe
    emissive: 0xff3300,  // Self-illuminated
    emissiveIntensity: 0.3
  });
  
  const joints = {};
  
  // Just the essential joints for body tracking
  const jointNames = [
    'nose', 'leftShoulder', 'rightShoulder',
    'leftElbow', 'rightElbow', 'leftWrist', 'rightWrist',
    'leftHip', 'rightHip', 'leftKnee', 'rightKnee',
    'leftAnkle', 'rightAnkle'
  ];
  
  // Create visible spheres for each joint
  jointNames.forEach(name => {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),  // Larger, more visible
      mat.clone()
    );
    sphere.visible = true;
    sphere.castShadow = true;
    group.add(sphere);
    joints[name] = { 
      mesh: sphere, 
      pos: new THREE.Vector3() 
    };
    console.log('[AVATAR] Created joint:', name);
  });
  
  // Create limbs (connections between joints)
  const limbPairs = [
    ['leftShoulder', 'leftElbow'],
    ['leftElbow', 'leftWrist'],
    ['rightShoulder', 'rightElbow'],
    ['rightElbow', 'rightWrist'],
    ['leftShoulder', 'rightShoulder'],
    ['leftHip', 'rightHip'],
    ['leftShoulder', 'leftHip'],
    ['rightShoulder', 'rightHip'],
    ['leftHip', 'leftKnee'],
    ['leftKnee', 'leftAnkle'],
    ['rightHip', 'rightKnee'],
    ['rightKnee', 'rightAnkle']
  ];
  
  const limbs = limbPairs.map(([a, b]) => {
    const cylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1, 12),
      mat.clone()
    );
    cylinder.visible = true;
    cylinder.castShadow = true;
    group.add(cylinder);
    console.log('[AVATAR] Created limb:', a, '->', b);
    return { mesh: cylinder, a, b };
  });
  
  scene.add(group);
  group.visible = true;
  
  console.log('[AVATAR] Avatar created with', Object.keys(joints).length, 'joints and', limbs.length, 'limbs');
  
  return { group, joints, limbs, smoothFactor: 0.7 };
}

export function updateAvatarFromPose(avatar, landmarks, landmarkToWorld) {
  if (!avatar || !landmarks || landmarks.length === 0) {
    console.log('[AVATAR] No update - missing data');
    return;
  }
  
  console.log('[AVATAR] Updating with', landmarks.length, 'landmarks');
  
  // MediaPipe Pose landmark indices
  const map = {
    nose: 0,
    leftShoulder: 11,
    rightShoulder: 12,
    leftElbow: 13,
    rightElbow: 14,
    leftWrist: 15,
    rightWrist: 16,
    leftHip: 23,
    rightHip: 24,
    leftKnee: 25,
    rightKnee: 26,
    leftAnkle: 27,
    rightAnkle: 28
  };
  
  // Update joint positions
  for (const [name, idx] of Object.entries(map)) {
    if (!landmarks[idx] || !avatar.joints[name]) continue;
    
    const lm = landmarks[idx];
    const joint = avatar.joints[name];
    
    try {
      const worldPos = landmarkToWorld(lm.x, lm.y, lm.z);
      joint.pos.lerp(worldPos, avatar.smoothFactor);
      joint.mesh.position.copy(joint.pos);
      joint.mesh.visible = true;
    } catch (e) {
      console.error('[AVATAR] Error updating joint', name, ':', e);
    }
  }
  
  // Update limbs (connections)
  for (const limb of avatar.limbs) {
    const jointA = avatar.joints[limb.a];
    const jointB = avatar.joints[limb.b];
    
    if (!jointA || !jointB) continue;
    
    try {
      const posA = jointA.mesh.position;
      const posB = jointB.mesh.position;
      
      // Position limb at midpoint
      const mid = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
      limb.mesh.position.copy(mid);
      
      // Orient limb along line between joints
      const direction = new THREE.Vector3().subVectors(posB, posA);
      const length = direction.length();
      
      if (length > 0.01) {
        limb.mesh.scale.set(1, length, 1);
        limb.mesh.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction.normalize()
        );
        limb.mesh.visible = true;
      } else {
        limb.mesh.visible = false;
      }
    } catch (e) {
      console.error('[AVATAR] Error updating limb:', e);
    }
  }
  
  console.log('[AVATAR] Update complete');
}
