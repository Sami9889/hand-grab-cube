import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';

export function createAvatar(scene) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ 
    color: 0xffb347,
    wireframe: true,  // Show wireframe/outline like lidar scan
    transparent: false,
    opacity: 1.0
  });
  const joints = {};
  const jointNames = [
    // Head and neck (detailed)
    'nose', 'head', 'neck',
    'leftEye', 'rightEye',
    'leftEar', 'rightEar',
    'leftEyeInner', 'rightEyeInner',
    'leftEyeOuter', 'rightEyeOuter',
    'mouthLeft', 'mouthRight',
    
    // Shoulders and arms (detailed)
    'leftShoulder', 'rightShoulder',
    'leftUpperArm', 'rightUpperArm',
    'leftElbow', 'rightElbow',
    'leftForearm', 'rightForearm',
    'leftWrist', 'rightWrist',
    
    // Torso and spine (detailed)
    'torso', 'spine', 'pelvis', 'hips',
    'chest', 'upperBack', 'lowerBack',
    
    // Legs (detailed)
    'leftHip', 'rightHip',
    'leftUpperLeg', 'rightUpperLeg',
    'leftKnee', 'rightKnee',
    'leftLowerLeg', 'rightLowerLeg',
    'leftAnkle', 'rightAnkle',
    'leftFoot', 'rightFoot',
    'leftHeel', 'rightHeel',
    'leftFootIndex', 'rightFootIndex',
    
    // Additional joints for better stability
    'leftLowerArm', 'rightLowerArm',
    'sternum', // chest center
    'leftPinky', 'rightPinky',
    'leftIndex', 'rightIndex',
    'leftThumb', 'rightThumb',
  ]
  // Body scan mesh - no simple shapes, everything from scan data
  const bodyGeometry = new THREE.BufferGeometry();
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffb347,
    wireframe: true,
    side: THREE.DoubleSide
  });
  const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
  bodyMesh.visible = false;
  group.add(bodyMesh);
  
  // Create joint references but no geometric shapes - scan will create the geometry
  jointNames.forEach(name => {
    joints[name] = { pos: new THREE.Vector3(), scanIndex: null };
  });
  // Face mesh from actual scan data (468 landmarks from MediaPipe FaceMesh)
  const faceGeometry = new THREE.BufferGeometry();
  const faceMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffb347,
    wireframe: true,
    side: THREE.DoubleSide
  });
  const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
  faceMesh.visible = false;
  group.add(faceMesh);
  // head orientation arrow
  const headDir = new THREE.ArrowHelper(new THREE.Vector3(0,0,-1), new THREE.Vector3(0,0,0), 0.25, 0x88ff88);
  headDir.visible = false; group.add(headDir);
  scene.add(group);
  // increase smoothing for more stable movement
  return { group, joints, headDir, faceMesh, bodyMesh, smoothFactor: 0.5 };
}

export function updateAvatarFromPose(avatar, landmarks, handToWorld) {
  // Null safety checks
  if (!avatar || !avatar.joints || !avatar.group) {
    console.error('[ERROR] Invalid avatar object passed to updateAvatarFromPose');
    return;
  }
  
  if (!landmarks || landmarks.length === 0) {
    avatar.group.visible = false;
    if (avatar.bodyMesh) avatar.bodyMesh.visible = false;
    if (avatar.headDir) avatar.headDir.visible = false;
    return;
  }
  
  avatar.group.visible = true;
  
  // Update body mesh from pose scan data (33 landmarks from MediaPipe Pose)
  if (avatar.bodyMesh && landmarks.length > 0) {
    try {
      updateBodyMeshFromScan(avatar.bodyMesh, landmarks, handToWorld);
    } catch (e) {
      console.error('[ERROR] Error updating body mesh from scan:', e);
    }
  }
  // Joint positions stored for reference but no rendering - scan mesh does it all
  // All geometry now from scan data - no manual positioning needed
}

// Update body mesh from actual MediaPipe Pose scan data (33 landmarks)
function updateBodyMeshFromScan(bodyMeshObj, landmarks, handToWorld) {
  if (!bodyMeshObj || !landmarks || landmarks.length === 0) {
    if (bodyMeshObj) bodyMeshObj.visible = false;
    return;
  }
  
  try {
    // MediaPipe Pose provides 33 3D landmarks
    const positions = new Float32Array(landmarks.length * 3);
    
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      if (!lm) continue;
      // Use handToWorld to convert to proper 3D space
      const w = handToWorld(lm.x, lm.y, lm.z, 1.6);
      positions[i * 3] = w.x;
      positions[i * 3 + 1] = w.y;
      positions[i * 3 + 2] = w.z;
    }
    
    // Create body mesh triangulation (connect landmarks to form body surface)
    const indices = [];
    // Torso connections
    indices.push(11, 12, 23); // left shoulder, right shoulder, left hip
    indices.push(12, 23, 24); // right shoulder, left hip, right hip
    indices.push(11, 23, 24); // left shoulder, left hip, right hip
    indices.push(11, 12, 24); // left shoulder, right shoulder, right hip
    
    // Arms
    indices.push(11, 13, 15); // left arm
    indices.push(12, 14, 16); // right arm
    
    // Legs
    indices.push(23, 25, 27); // left leg
    indices.push(24, 26, 28); // right leg
    indices.push(27, 29, 31); // left foot
    indices.push(28, 30, 32); // right foot
    
    // More connections for better mesh
    indices.push(0, 11, 12); // head to shoulders
    
    bodyMeshObj.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    bodyMeshObj.geometry.setIndex(indices);
    bodyMeshObj.geometry.computeVertexNormals();
    bodyMeshObj.geometry.attributes.position.needsUpdate = true;
    bodyMeshObj.visible = true;
    
  } catch (e) {
    console.error('[ERROR] Failed to update body mesh from scan:', e);
    bodyMeshObj.visible = false;
  }
}

// Update face mesh from actual MediaPipe FaceMesh scan data (468 landmarks)
export function updateFaceMeshFromScan(faceMeshObj, faceLandmarks, avatar) {
  if (!faceMeshObj || !faceLandmarks || faceLandmarks.length === 0) {
    if (faceMeshObj) faceMeshObj.visible = false;
    return;
  }
  
  try {
    // MediaPipe FaceMesh provides 468 3D landmarks
    const positions = new Float32Array(faceLandmarks.length * 3);
    
    for (let i = 0; i < faceLandmarks.length; i++) {
      const lm = faceLandmarks[i];
      // Convert normalized coordinates to world space
      positions[i * 3] = (lm.x - 0.5) * 2;      // x: -1 to 1
      positions[i * 3 + 1] = -(lm.y - 0.5) * 2; // y: -1 to 1 (flip)
      positions[i * 3 + 2] = -lm.z * 2;         // z: depth
    }
    
    // Create triangulated mesh from landmarks
    const indices = [];
    // Connect nearby points to form triangles
    for (let i = 0; i < faceLandmarks.length - 2; i++) {
      if (i % 3 === 0) {
        indices.push(i, i + 1, i + 2);
      }
    }
    
    faceMeshObj.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    faceMeshObj.geometry.setIndex(indices);
    faceMeshObj.geometry.computeVertexNormals();
    faceMeshObj.geometry.attributes.position.needsUpdate = true;
    faceMeshObj.visible = true;
    
  } catch (e) {
    console.error('[ERROR] Failed to update face mesh from scan:', e);
    faceMeshObj.visible = false;
  }
}
