import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';

export function createAvatar(scene) {
  console.log('[AVATAR] Creating avatar');
  
  const group = new THREE.Group();
  
  // Bright, easy-to-see material
  const mat = new THREE.MeshStandardMaterial({ 
    color: 0x00ff00,  // Bright green
    wireframe: false,  // Solid, not wireframe
    emissive: 0x00ff00,  // Self-illuminated
    emissiveIntensity: 0.5
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
      new THREE.SphereGeometry(0.05, 12, 12),  // Optimized size
      mat.clone()
    );
    sphere.visible = true;
    sphere.castShadow = true;
    group.add(sphere);
    joints[name] = { 
      mesh: sphere, 
      pos: new THREE.Vector3() 
    };
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
      new THREE.CylinderGeometry(0.03, 0.03, 1, 8),
      mat.clone()
    );
    cylinder.visible = true;
    cylinder.castShadow = true;
    group.add(cylinder);
    return { mesh: cylinder, a, b };
  });
  
  scene.add(group);
  group.visible = true;
  
  return { group, joints, limbs };
}

export function updateAvatarFromPose(avatar, landmarks, landmarkToWorld) {
  if (!avatar || !landmarks || landmarks.length === 0) {
    return;
  }
  
  if (!landmarkToWorld || typeof landmarkToWorld !== 'function') {
    console.error('[AVATAR] landmarkToWorld must be a function');
    return;
  }
  
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
    if (!landmarks[idx] || !avatar.joints[name]) {
      continue;
    }
    
    const lm = landmarks[idx];
    const joint = avatar.joints[name];
    
    // Check visibility (if available) - lower threshold
    if (lm.visibility !== undefined && lm.visibility < 0.1) {
      joint.mesh.visible = false;
      continue;
    }
    
    try {
      const worldPos = landmarkToWorld(lm.x, lm.y, lm.z);
      if (!worldPos || isNaN(worldPos.x) || isNaN(worldPos.y) || isNaN(worldPos.z)) {
        continue;
      }
      
      // Stronger smoothing for stability
      joint.pos.lerp(worldPos, 0.3);
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
    
    if (!jointA || !jointB || !jointA.mesh.visible || !jointB.mesh.visible) {
      limb.mesh.visible = false;
      continue;
    }
    
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
}
