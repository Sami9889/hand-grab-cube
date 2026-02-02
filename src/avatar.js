import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';

export function createAvatar(scene) {
  console.log('[AVATAR] Creating advanced wireframe grid 3D avatar with 33-point tracking');
  
  const group = new THREE.Group();
  
  // Advanced wireframe grid materials
  const gridMat = new THREE.MeshStandardMaterial({ 
    color: 0x00ffff,  // Cyan grid
    wireframe: true,
    transparent: true,
    opacity: 0.7,
    emissive: 0x004455,
    emissiveIntensity: 0.3
  });
  
  const solidGridMat = new THREE.MeshStandardMaterial({ 
    color: 0x0088ff,  // Blue solid with transparency
    transparent: true,
    opacity: 0.4,
    roughness: 0.3,
    metalness: 0.8,
    envMapIntensity: 1.0
  });
  
  const jointMat = new THREE.MeshStandardMaterial({ 
    color: 0xff0080,  // Hot pink for joints
    emissive: 0xff0040,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.9
  });
  
  const joints = {};
  const bodyParts = {};
  const connections = [];
  
  // ALL 33 MediaPipe Pose landmarks for complete tracking
  const jointNames = [
    'nose', 'leftEyeInner', 'leftEye', 'leftEyeOuter',
    'rightEyeInner', 'rightEye', 'rightEyeOuter',
    'leftEar', 'rightEar', 'mouthLeft', 'mouthRight',
    'leftShoulder', 'rightShoulder',
    'leftElbow', 'rightElbow', 'leftWrist', 'rightWrist',
    'leftPinky', 'rightPinky', 'leftIndex', 'rightIndex',
    'leftThumb', 'rightThumb',
    'leftHip', 'rightHip', 'leftKnee', 'rightKnee',
    'leftAnkle', 'rightAnkle', 'leftHeel', 'rightHeel',
    'leftFootIndex', 'rightFootIndex'
  ];
  
  // Additional finger joint names for detailed hand tracking (if hand landmarks available)
  const fingerJointNames = {
    left: [
      'leftThumbCMC', 'leftThumbMCP', 'leftThumbIP', 'leftThumbTip',
      'leftIndexMCP', 'leftIndexPIP', 'leftIndexDIP', 'leftIndexTip',
      'leftMiddleMCP', 'leftMiddlePIP', 'leftMiddleDIP', 'leftMiddleTip',
      'leftRingMCP', 'leftRingPIP', 'leftRingDIP', 'leftRingTip',
      'leftPinkyMCP', 'leftPinkyPIP', 'leftPinkyDIP', 'leftPinkyTip'
    ],
    right: [
      'rightThumbCMC', 'rightThumbMCP', 'rightThumbIP', 'rightThumbTip',
      'rightIndexMCP', 'rightIndexPIP', 'rightIndexDIP', 'rightIndexTip',
      'rightMiddleMCP', 'rightMiddlePIP', 'rightMiddleDIP', 'rightMiddleTip',
      'rightRingMCP', 'rightRingPIP', 'rightRingDIP', 'rightRingTip',
      'rightPinkyMCP', 'rightPinkyPIP', 'rightPinkyDIP', 'rightPinkyTip'
    ]
  };
  
  // Create glowing spheres for all 33 joints
  jointNames.forEach((name, idx) => {
    try {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 16, 16),
        jointMat.clone()
      );
      sphere.visible = true;
      sphere.castShadow = true;
      group.add(sphere);
      joints[name] = { 
        mesh: sphere, 
        pos: new THREE.Vector3(),
        index: idx
      };
    } catch (err) {
      if (console && console.error) {
        console.error(`[AVATAR] Error creating joint ${name}:`, err);
      }
    }
  });
  
  // Create smaller spheres for finger joints (for detailed hand tracking)
  const fingerJointMat = new THREE.MeshStandardMaterial({ 
    color: 0xff6b00,  // Orange for finger joints
    emissive: 0xff3300,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.85
  });
  
  [...fingerJointNames.left, ...fingerJointNames.right].forEach((name) => {
    try {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.015, 12, 12), // Smaller spheres for fingers
        fingerJointMat.clone()
      );
      sphere.visible = false; // Hidden by default until hand tracking is active
      sphere.castShadow = true;
      group.add(sphere);
      joints[name] = { 
        mesh: sphere, 
        pos: new THREE.Vector3(),
        isFinger: true
      };
    } catch (err) {
      if (console && console.error) {
        console.error(`[AVATAR] Error creating finger joint ${name}:`, err);
      }
    }
  });
  
  // Create connection lines (grid structure) - MediaPipe skeleton
  const skeletonConnections = [
    // Face
    ['nose', 'leftEyeInner'], ['leftEyeInner', 'leftEye'], ['leftEye', 'leftEyeOuter'], ['leftEyeOuter', 'leftEar'],
    ['nose', 'rightEyeInner'], ['rightEyeInner', 'rightEye'], ['rightEye', 'rightEyeOuter'], ['rightEyeOuter', 'rightEar'],
    ['mouthLeft', 'mouthRight'],
    // Shoulders
    ['leftShoulder', 'rightShoulder'],
    ['leftShoulder', 'leftEar'], ['rightShoulder', 'rightEar'],
    // Arms
    ['leftShoulder', 'leftElbow'], ['leftElbow', 'leftWrist'],
    ['rightShoulder', 'rightElbow'], ['rightElbow', 'rightWrist'],
    // Hands
    ['leftWrist', 'leftPinky'], ['leftWrist', 'leftIndex'], ['leftWrist', 'leftThumb'],
    ['rightWrist', 'rightPinky'], ['rightWrist', 'rightIndex'], ['rightWrist', 'rightThumb'],
    ['leftPinky', 'leftIndex'], ['rightPinky', 'rightIndex'],
    // Torso
    ['leftShoulder', 'leftHip'], ['rightShoulder', 'rightHip'],
    ['leftHip', 'rightHip'],
    // Legs
    ['leftHip', 'leftKnee'], ['leftKnee', 'leftAnkle'],
    ['rightHip', 'rightKnee'], ['rightKnee', 'rightAnkle'],
    // Feet
    ['leftAnkle', 'leftHeel'], ['leftAnkle', 'leftFootIndex'], ['leftHeel', 'leftFootIndex'],
    ['rightAnkle', 'rightHeel'], ['rightAnkle', 'rightFootIndex'], ['rightHeel', 'rightFootIndex']
  ];
  
  // Add finger connections for detailed hand tracking
  const fingerConnections = [
    // Left hand fingers
    ['leftWrist', 'leftThumbCMC'], ['leftThumbCMC', 'leftThumbMCP'], ['leftThumbMCP', 'leftThumbIP'], ['leftThumbIP', 'leftThumbTip'],
    ['leftWrist', 'leftIndexMCP'], ['leftIndexMCP', 'leftIndexPIP'], ['leftIndexPIP', 'leftIndexDIP'], ['leftIndexDIP', 'leftIndexTip'],
    ['leftWrist', 'leftMiddleMCP'], ['leftMiddleMCP', 'leftMiddlePIP'], ['leftMiddlePIP', 'leftMiddleDIP'], ['leftMiddleDIP', 'leftMiddleTip'],
    ['leftWrist', 'leftRingMCP'], ['leftRingMCP', 'leftRingPIP'], ['leftRingPIP', 'leftRingDIP'], ['leftRingDIP', 'leftRingTip'],
    ['leftWrist', 'leftPinkyMCP'], ['leftPinkyMCP', 'leftPinkyPIP'], ['leftPinkyPIP', 'leftPinkyDIP'], ['leftPinkyDIP', 'leftPinkyTip'],
    // Right hand fingers
    ['rightWrist', 'rightThumbCMC'], ['rightThumbCMC', 'rightThumbMCP'], ['rightThumbMCP', 'rightThumbIP'], ['rightThumbIP', 'rightThumbTip'],
    ['rightWrist', 'rightIndexMCP'], ['rightIndexMCP', 'rightIndexPIP'], ['rightIndexPIP', 'rightIndexDIP'], ['rightIndexDIP', 'rightIndexTip'],
    ['rightWrist', 'rightMiddleMCP'], ['rightMiddleMCP', 'rightMiddlePIP'], ['rightMiddlePIP', 'rightMiddleDIP'], ['rightMiddleDIP', 'rightMiddleTip'],
    ['rightWrist', 'rightRingMCP'], ['rightRingMCP', 'rightRingPIP'], ['rightRingPIP', 'rightRingDIP'], ['rightRingDIP', 'rightRingTip'],
    ['rightWrist', 'rightPinkyMCP'], ['rightPinkyMCP', 'rightPinkyPIP'], ['rightPinkyPIP', 'rightPinkyDIP'], ['rightPinkyDIP', 'rightPinkyTip']
  ];
  
  // Create thin glowing lines for connections
  skeletonConnections.forEach(([a, b]) => {
    try {
      const lineMat = new THREE.LineBasicMaterial({ 
        color: 0x00ffff, 
        transparent: true, 
        opacity: 0.8,
        linewidth: 2
      });
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(6); // 2 points * 3 coordinates
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const line = new THREE.Line(geometry, lineMat);
      group.add(line);
      connections.push({ line, a, b });
    } catch (err) {
      if (console && console.error) {
        console.error(`[AVATAR] Error creating connection between ${a} and ${b}:`, err);
      }
    }
  });
  
  // Create finger connection lines (thinner, orange color)
  fingerConnections.forEach(([a, b]) => {
    try {
      const lineMat = new THREE.LineBasicMaterial({ 
        color: 0xff6b00,  // Orange for fingers
        transparent: true, 
        opacity: 0.7,
        linewidth: 1
      });
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(6);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const line = new THREE.Line(geometry, lineMat);
      line.visible = false; // Hidden by default until hand tracking is active
      group.add(line);
      connections.push({ line, a, b, isFinger: true });
    } catch (err) {
      if (console && console.error) {
        console.error(`[AVATAR] Error creating finger connection between ${a} and ${b}:`, err);
      }
    }
  });
  
  // Create HIGH-DETAIL grid mesh body parts (32+ segments for grid-like appearance)
  
  // HEAD - High-poly sphere with dual-layer wireframe + solid
  const headWireframe = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 32, 32),
    gridMat.clone()
  );
  headWireframe.castShadow = true;
  headWireframe.visible = true;
  group.add(headWireframe);
  bodyParts.headWireframe = headWireframe;
  
  const headSolid = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 32, 32),
    solidGridMat.clone()
  );
  headSolid.visible = true;
  group.add(headSolid);
  bodyParts.headSolid = headSolid;
  
  // NECK - High-poly cylinder
  const neckWireframe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, 0.15, 16, 8),
    gridMat.clone()
  );
  group.add(neckWireframe);
  bodyParts.neckWireframe = neckWireframe;
  
  const neckSolid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.055, 0.15, 16, 8),
    solidGridMat.clone()
  );
  group.add(neckSolid);
  bodyParts.neckSolid = neckSolid;
  
  // TORSO - High-poly box/cylinder (chest)
  const torsoWireframe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.15, 0.5, 24, 16),
    gridMat.clone()
  );
  group.add(torsoWireframe);
  bodyParts.torsoWireframe = torsoWireframe;
  
  const torsoSolid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.14, 0.5, 24, 16),
    solidGridMat.clone()
  );
  group.add(torsoSolid);
  bodyParts.torsoSolid = torsoSolid;
  
  // PELVIS - High-poly tapered cylinder
  const pelvisWireframe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.13, 0.2, 20, 8),
    gridMat.clone()
  );
  group.add(pelvisWireframe);
  bodyParts.pelvisWireframe = pelvisWireframe;
  
  const pelvisSolid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.12, 0.2, 20, 8),
    solidGridMat.clone()
  );
  group.add(pelvisSolid);
  bodyParts.pelvisSolid = pelvisSolid;
  
  // Function to create dual-layer limb (wireframe + solid)
  function createGridLimb(radiusTop, radiusBottom, height, name) {
    const wireframe = new THREE.Mesh(
      new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 16, 16),
      gridMat.clone()
    );
    wireframe.castShadow = true;
    wireframe.visible = true; // Initialize as visible
    group.add(wireframe);
    
    const solid = new THREE.Mesh(
      new THREE.CylinderGeometry(radiusTop * 0.9, radiusBottom * 0.9, height, 16, 16),
      solidGridMat.clone()
    );
    solid.visible = true; // Initialize as visible
    group.add(solid);
    
    bodyParts[name + 'Wireframe'] = wireframe;
    bodyParts[name + 'Solid'] = solid;
    return { wireframe, solid };
  }
  
  // ARMS - High-poly cylinders
  createGridLimb(0.045, 0.04, 0.3, 'leftUpperArm');
  createGridLimb(0.045, 0.04, 0.3, 'rightUpperArm');
  createGridLimb(0.04, 0.035, 0.28, 'leftForearm');
  createGridLimb(0.04, 0.035, 0.28, 'rightForearm');
  
  // HANDS - High-poly spheres
  const leftHandWireframe = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 20, 20),
    gridMat.clone()
  );
  group.add(leftHandWireframe);
  bodyParts.leftHandWireframe = leftHandWireframe;
  
  const leftHandSolid = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 20, 20),
    solidGridMat.clone()
  );
  group.add(leftHandSolid);
  bodyParts.leftHandSolid = leftHandSolid;
  
  const rightHandWireframe = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 20, 20),
    gridMat.clone()
  );
  group.add(rightHandWireframe);
  bodyParts.rightHandWireframe = rightHandWireframe;
  
  const rightHandSolid = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 20, 20),
    solidGridMat.clone()
  );
  group.add(rightHandSolid);
  bodyParts.rightHandSolid = rightHandSolid;
  
  // LEGS - High-poly cylinders
  createGridLimb(0.08, 0.06, 0.45, 'leftThigh');
  createGridLimb(0.08, 0.06, 0.45, 'rightThigh');
  createGridLimb(0.06, 0.045, 0.45, 'leftShin');
  createGridLimb(0.06, 0.045, 0.45, 'rightShin');
  
  // FEET - High-poly boxes with grid
  const leftFootWireframe = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.06, 0.25, 8, 4, 12),
    gridMat.clone()
  );
  group.add(leftFootWireframe);
  bodyParts.leftFootWireframe = leftFootWireframe;
  
  const leftFootSolid = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.055, 0.24, 8, 4, 12),
    solidGridMat.clone()
  );
  group.add(leftFootSolid);
  bodyParts.leftFootSolid = leftFootSolid;
  
  const rightFootWireframe = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.06, 0.25, 8, 4, 12),
    gridMat.clone()
  );
  group.add(rightFootWireframe);
  bodyParts.rightFootWireframe = rightFootWireframe;
  
  const rightFootSolid = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.055, 0.24, 8, 4, 12),
    solidGridMat.clone()
  );
  group.add(rightFootSolid);
  bodyParts.rightFootSolid = rightFootSolid;
  
  scene.add(group);
  group.visible = true;
  
  console.log('[AVATAR] Advanced wireframe grid 3D avatar created');
  console.log('[AVATAR] - 33 tracking joints');
  console.log('[AVATAR] -', connections.length, 'skeleton connections');
  console.log('[AVATAR] -', Object.keys(bodyParts).length, 'high-detail body parts');
  console.log('[AVATAR] - Transparent grid mesh with dual-layer rendering');
  
  return { group, joints, bodyParts, connections, smoothFactor: 0.65 };
}

export function updateAvatarFromPose(avatar, landmarks, landmarkToWorld) {
  // Comprehensive input validation
  if (!avatar) {
    if (console && console.warn) {
      console.warn('[AVATAR] updateAvatarFromPose called with null/undefined avatar');
    }
    return;
  }
  
  if (!landmarks || !Array.isArray(landmarks) || landmarks.length === 0) {
    if (console && console.warn) {
      console.warn('[AVATAR] updateAvatarFromPose called with invalid landmarks');
    }
    return;
  }
  
  if (!landmarkToWorld || typeof landmarkToWorld !== 'function') {
    if (console && console.error) {
      console.error('[AVATAR] updateAvatarFromPose called without valid landmarkToWorld function');
    }
    return;
  }
  
  if (!avatar.joints || !avatar.bodyParts) {
    if (console && console.warn) {
      console.warn('[AVATAR] Avatar missing joints or bodyParts');
    }
    return;
  }
  
  // Complete MediaPipe Pose landmark mapping (all 33 points)
  const map = {
    nose: 0,
    leftEyeInner: 1,
    leftEye: 2,
    leftEyeOuter: 3,
    rightEyeInner: 4,
    rightEye: 5,
    rightEyeOuter: 6,
    leftEar: 7,
    rightEar: 8,
    mouthLeft: 9,
    mouthRight: 10,
    leftShoulder: 11,
    rightShoulder: 12,
    leftElbow: 13,
    rightElbow: 14,
    leftWrist: 15,
    rightWrist: 16,
    leftPinky: 17,
    rightPinky: 18,
    leftIndex: 19,
    rightIndex: 20,
    leftThumb: 21,
    rightThumb: 22,
    leftHip: 23,
    rightHip: 24,
    leftKnee: 25,
    rightKnee: 26,
    leftAnkle: 27,
    rightAnkle: 28,
    leftHeel: 29,
    rightHeel: 30,
    leftFootIndex: 31,
    rightFootIndex: 32
  };
  
  // Calculate hip center for relative positioning
  let hipCenter = null;
  const leftHipLm = landmarks[map.leftHip];
  const rightHipLm = landmarks[map.rightHip];
  
  if (leftHipLm && rightHipLm) {
    const leftHipWorld = landmarkToWorld(leftHipLm.x, leftHipLm.y, leftHipLm.z);
    const rightHipWorld = landmarkToWorld(rightHipLm.x, rightHipLm.y, rightHipLm.z);
    
    if (leftHipWorld && rightHipWorld) {
      hipCenter = new THREE.Vector3()
        .addVectors(leftHipWorld, rightHipWorld)
        .multiplyScalar(0.5);
    }
  }
  
  // Update all 33 joint positions with smooth interpolation
  // Position joints RELATIVE to avatar group origin (not absolute world space)
  for (const [name, idx] of Object.entries(map)) {
    if (!landmarks[idx] || !avatar.joints[name]) {
      continue;
    }
    
    const lm = landmarks[idx];
    const joint = avatar.joints[name];
    
    // Check visibility (if available)
    if (lm.visibility !== undefined && lm.visibility < 0.3) {
      joint.mesh.visible = false;
      continue;
    }
    
    try {
      if (!landmarkToWorld || typeof landmarkToWorld !== 'function') {
        console.error('[AVATAR] landmarkToWorld is not a function');
        continue;
      }
      
      const worldPos = landmarkToWorld(lm.x, lm.y, lm.z);
      if (!worldPos || isNaN(worldPos.x) || isNaN(worldPos.y) || isNaN(worldPos.z)) {
        continue;
      }
      
      // Position relative to hip center for proper leg crossing, etc.
      let relativePos = worldPos;
      if (hipCenter) {
        relativePos = worldPos.clone().sub(hipCenter);
      }
      
      joint.pos.lerp(relativePos, avatar.smoothFactor);
      joint.mesh.position.copy(joint.pos);
      joint.mesh.visible = (lm.visibility === undefined || lm.visibility > 0.3);
    } catch (e) {
      console.error('[AVATAR] Error updating joint', name, ':', e);
    }
  }
  
  // Update skeleton connection lines
  if (avatar.connections) {
    for (const conn of avatar.connections) {
      try {
        const jointA = avatar.joints[conn.a];
        const jointB = avatar.joints[conn.b];
        
        if (!jointA || !jointB || !jointA.mesh || !jointB.mesh || 
            !jointA.mesh.position || !jointB.mesh.position ||
            !jointA.mesh.visible || !jointB.mesh.visible) {
          if (conn.line) conn.line.visible = false;
          continue;
        }
        
        if (!conn.line || !conn.line.geometry || !conn.line.geometry.attributes || 
            !conn.line.geometry.attributes.position || !conn.line.geometry.attributes.position.array) {
          continue;
        }
        
        const positions = conn.line.geometry.attributes.position.array;
        positions[0] = jointA.mesh.position.x;
        positions[1] = jointA.mesh.position.y;
        positions[2] = jointA.mesh.position.z;
        positions[3] = jointB.mesh.position.x;
        positions[4] = jointB.mesh.position.y;
        positions[5] = jointB.mesh.position.z;
        conn.line.geometry.attributes.position.needsUpdate = true;
        conn.line.visible = true;
      } catch (error) {
        if (console && console.error) {
          console.error('[AVATAR] Error updating connection line:', error);
        }
      }
    }
  }
  
  // Helper function to update dual-layer body part (wireframe + solid)
  function updateDualBodyPart(wireframeName, solidName, jointA, jointB, extraLength = 0) {
    const partWire = avatar.bodyParts[wireframeName];
    const partSolid = avatar.bodyParts[solidName];
    
    console.log(`[AVATAR] updateDualBodyPart called for ${wireframeName}/${solidName}`);
    
    // Enhanced validation with warnings for debugging
    if (!jointA || !jointB) {
      if (console && console.warn) {
        console.warn(`[AVATAR] Missing joints for ${wireframeName}/${solidName}`, jointA, jointB);
      }
      if (partWire) partWire.visible = false;
      if (partSolid) partSolid.visible = false;
      return;
    }
    
    if (!partWire || !partSolid) {
      if (console && console.warn) {
        console.warn(`[AVATAR] Missing body parts: ${wireframeName}/${solidName}`, partWire, partSolid);
      }
      return;
    }
    
    // Check if joints have valid mesh and position properties
    if (!jointA.mesh || !jointB.mesh || !jointA.mesh.position || !jointB.mesh.position) {
      if (console && console.warn) {
        console.warn(`[AVATAR] Invalid joint mesh structure for ${wireframeName}/${solidName}`);
      }
      if (partWire) partWire.visible = false;
      if (partSolid) partSolid.visible = false;
      return;
    }
    
    // Calculate mid point, direction, and length
    const mid = new THREE.Vector3()
      .addVectors(jointA.mesh.position, jointB.mesh.position)
      .multiplyScalar(0.5);
    const direction = new THREE.Vector3()
      .subVectors(jointB.mesh.position, jointA.mesh.position);
    const length = direction.length();
    
    if (length > 0.01) {
      [partWire, partSolid].forEach(part => {
        if (!part) return;
        part.position.copy(mid);
        
        // Scale to match joint distance with finer precision
        const baseHeight = part.geometry.parameters.height || 1;
        part.scale.y = (length + extraLength) / baseHeight;
        
        // Improved rotation to align with joint direction
        // Use proper vector normalization and add fine-tuning for orientation
        const normalizedDirection = direction.clone().normalize();
        const upVector = new THREE.Vector3(0, 1, 0);
        
        // Calculate rotation quaternion with improved precision
        part.quaternion.setFromUnitVectors(upVector, normalizedDirection);
        
        // Add fine rotation adjustments to prevent upside-down meshes
        // Apply correction based on the direction vector to ensure proper orientation
        if (normalizedDirection.y < -0.9) {
          // If pointing strongly downward, add 180-degree correction
          const correctionQuat = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0), 
            Math.PI
          );
          part.quaternion.multiply(correctionQuat);
        }
        
        part.visible = true;
        console.log(`[AVATAR] ${wireframeName}: SET VISIBLE = true`);
      });
    } else {
      console.log(`[AVATAR] ${wireframeName}: length too small, hiding parts`);
      if (partWire) partWire.visible = false;
      if (partSolid) partSolid.visible = false;
      return;
    }
  }
  
  // Helper for single-point body parts (dual-layer spheres)
  function updateDualSphere(wireframeName, solidName, joint) {
    const partWire = avatar.bodyParts[wireframeName];
    const partSolid = avatar.bodyParts[solidName];
    
    // Enhanced validation with warnings for debugging
    if (!joint) {
      if (console && console.warn) {
        console.warn(`[AVATAR] Missing joint for ${wireframeName}/${solidName}`);
      }
      if (partWire) partWire.visible = false;
      if (partSolid) partSolid.visible = false;
      return;
    }
    
    if (!partWire || !partSolid) {
      if (console && console.warn) {
        console.warn(`[AVATAR] Missing body parts: ${wireframeName}/${solidName}`);
      }
      return;
    }
    
    // Check if joint has valid mesh and position properties
    if (!joint.mesh || !joint.mesh.position) {
      if (console && console.warn) {
        console.warn(`[AVATAR] Invalid joint mesh structure for ${wireframeName}/${solidName}`);
      }
      if (partWire) partWire.visible = false;
      if (partSolid) partSolid.visible = false;
      return;
    }
    
    if (!joint.mesh.visible) {
      if (partWire) partWire.visible = false;
      if (partSolid) partSolid.visible = false;
      return;
    }
    
    try {
      [partWire, partSolid].forEach(part => {
        if (part) {
          part.position.copy(joint.mesh.position);
          part.visible = true;
        }
      });
    } catch (error) {
      if (console && console.error) {
        console.error(`[AVATAR] Error updating dual sphere ${wireframeName}/${solidName}:`, error);
      }
      // Hide parts on error to prevent visual glitches
      if (partWire) partWire.visible = false;
      if (partSolid) partSolid.visible = false;
    }
  }
  
  // Update high-detail grid body parts with dual-layer rendering
  if (avatar.bodyParts) {
    const j = avatar.joints;
    
    // HEAD - position at nose/face center
    updateDualSphere('headWireframe', 'headSolid', j.nose);
    
    // NECK - between head and shoulders
    if (j.nose && j.leftShoulder && j.rightShoulder && 
        j.nose.mesh && j.leftShoulder.mesh && j.rightShoulder.mesh &&
        j.nose.mesh.position && j.leftShoulder.mesh.position && j.rightShoulder.mesh.position) {
      try {
        const shoulderCenter = new THREE.Vector3()
          .addVectors(j.leftShoulder.mesh.position, j.rightShoulder.mesh.position)
          .multiplyScalar(0.5);
        const neckTop = j.nose.mesh.position.clone();
        neckTop.y -= 0.1; // slightly below head
        
        updateDualBodyPart('neckWireframe', 'neckSolid', 
          { mesh: { position: neckTop, visible: true } }, 
          { mesh: { position: shoulderCenter, visible: true } }
        );
      } catch (error) {
        if (console && console.error) {
          console.error('[AVATAR] Error updating neck:', error);
        }
      }
    }
    
    // TORSO - between shoulders and hips center
    if (j.leftShoulder && j.rightShoulder && j.leftHip && j.rightHip &&
        j.leftShoulder.mesh && j.rightShoulder.mesh && j.leftHip.mesh && j.rightHip.mesh &&
        j.leftShoulder.mesh.position && j.rightShoulder.mesh.position && 
        j.leftHip.mesh.position && j.rightHip.mesh.position) {
      try {
        const shoulderCenter = new THREE.Vector3()
          .addVectors(j.leftShoulder.mesh.position, j.rightShoulder.mesh.position)
          .multiplyScalar(0.5);
        const hipCenter = new THREE.Vector3()
          .addVectors(j.leftHip.mesh.position, j.rightHip.mesh.position)
          .multiplyScalar(0.5);
        
        updateDualBodyPart('torsoWireframe', 'torsoSolid',
          { mesh: { position: shoulderCenter, visible: true } },
          { mesh: { position: hipCenter, visible: true } }
        );
      } catch (error) {
        if (console && console.error) {
          console.error('[AVATAR] Error updating torso:', error);
        }
      }
    }
    
    // PELVIS - at hip center
    if (j.leftHip && j.rightHip && j.leftHip.mesh && j.rightHip.mesh &&
        j.leftHip.mesh.position && j.rightHip.mesh.position) {
      try {
        const hipCenter = new THREE.Vector3()
          .addVectors(j.leftHip.mesh.position, j.rightHip.mesh.position)
          .multiplyScalar(0.5);
        
        ['pelvisWireframe', 'pelvisSolid'].forEach(name => {
          const part = avatar.bodyParts[name];
          if (part) {
            part.position.copy(hipCenter);
            part.visible = true;
          }
        });
      } catch (error) {
        if (console && console.error) {
          console.error('[AVATAR] Error updating pelvis:', error);
        }
      }
    }
    
    // ARMS - Dual-layer high-detail cylinders
    updateDualBodyPart('leftUpperArmWireframe', 'leftUpperArmSolid', j.leftShoulder, j.leftElbow);
    updateDualBodyPart('rightUpperArmWireframe', 'rightUpperArmSolid', j.rightShoulder, j.rightElbow);
    updateDualBodyPart('leftForearmWireframe', 'leftForearmSolid', j.leftElbow, j.leftWrist);
    updateDualBodyPart('rightForearmWireframe', 'rightForearmSolid', j.rightElbow, j.rightWrist);
    
    // HANDS - Dual-layer spheres
    updateDualSphere('leftHandWireframe', 'leftHandSolid', j.leftWrist);
    updateDualSphere('rightHandWireframe', 'rightHandSolid', j.rightWrist);
    
    // LEGS - Dual-layer high-detail cylinders
    updateDualBodyPart('leftThighWireframe', 'leftThighSolid', j.leftHip, j.leftKnee);
    updateDualBodyPart('rightThighWireframe', 'rightThighSolid', j.rightHip, j.rightKnee);
    updateDualBodyPart('leftShinWireframe', 'leftShinSolid', j.leftKnee, j.leftAnkle);
    updateDualBodyPart('rightShinWireframe', 'rightShinSolid', j.rightKnee, j.rightAnkle);
    
    // FEET - Dual-layer boxes with proper orientation
    if (j.leftAnkle && j.leftFootIndex && j.leftHeel &&
        j.leftAnkle.mesh && j.leftFootIndex.mesh && j.leftHeel.mesh &&
        j.leftAnkle.mesh.position && j.leftFootIndex.mesh.position && j.leftHeel.mesh.position) {
      try {
        const footMid = new THREE.Vector3()
          .add(j.leftAnkle.mesh.position)
          .add(j.leftFootIndex.mesh.position)
          .add(j.leftHeel.mesh.position)
          .multiplyScalar(1/3);
        
        const footDir = new THREE.Vector3()
          .subVectors(j.leftFootIndex.mesh.position, j.leftHeel.mesh.position);
        
        ['leftFootWireframe', 'leftFootSolid'].forEach(name => {
          const part = avatar.bodyParts[name];
          if (part && footDir.length() > 0.01) {
            part.position.copy(footMid);
            part.quaternion.setFromUnitVectors(
              new THREE.Vector3(0, 0, 1),
              footDir.normalize()
            );
            part.visible = j.leftAnkle.mesh.visible && j.leftFootIndex.mesh.visible;
          }
        });
      } catch (error) {
        if (console && console.error) {
          console.error('[AVATAR] Error updating left foot:', error);
        }
      }
    }
    
    if (j.rightAnkle && j.rightFootIndex && j.rightHeel &&
        j.rightAnkle.mesh && j.rightFootIndex.mesh && j.rightHeel.mesh &&
        j.rightAnkle.mesh.position && j.rightFootIndex.mesh.position && j.rightHeel.mesh.position) {
      try {
        const footMid = new THREE.Vector3()
          .add(j.rightAnkle.mesh.position)
          .add(j.rightFootIndex.mesh.position)
          .add(j.rightHeel.mesh.position)
          .multiplyScalar(1/3);
        
        const footDir = new THREE.Vector3()
          .subVectors(j.rightFootIndex.mesh.position, j.rightHeel.mesh.position);
        
        ['rightFootWireframe', 'rightFootSolid'].forEach(name => {
          const part = avatar.bodyParts[name];
          if (part && footDir.length() > 0.01) {
            part.position.copy(footMid);
            part.quaternion.setFromUnitVectors(
              new THREE.Vector3(0, 0, 1),
              footDir.normalize()
            );
            part.visible = j.rightAnkle.mesh.visible && j.rightFootIndex.mesh.visible;
          }
        });
      } catch (error) {
        if (console && console.error) {
          console.error('[AVATAR] Error updating right foot:', error);
        }
      }
    }
  }
}

// Export function to update hand landmarks from MediaPipe Hands
export function updateAvatarHands(avatar, handLandmarks, handedness, landmarkToWorld) {
  if (!avatar || !avatar.joints) {
    console.warn('[AVATAR] updateAvatarHands called with invalid avatar');
    return;
  }
  
  if (!handLandmarks || !Array.isArray(handLandmarks) || handLandmarks.length !== 21) {
    console.warn('[AVATAR] Invalid hand landmarks');
    return;
  }
  
  // Determine if left or right hand
  const isLeft = handedness && handedness.toLowerCase().includes('left');
  const prefix = isLeft ? 'left' : 'right';
  
  // MediaPipe hand landmark indices
  const handMap = [
    'Wrist', 'ThumbCMC', 'ThumbMCP', 'ThumbIP', 'ThumbTip',
    'IndexMCP', 'IndexPIP', 'IndexDIP', 'IndexTip',
    'MiddleMCP', 'MiddlePIP', 'MiddleDIP', 'MiddleTip',
    'RingMCP', 'RingPIP', 'RingDIP', 'RingTip',
    'PinkyMCP', 'PinkyPIP', 'PinkyDIP', 'PinkyTip'
  ];
  
  // Update finger joint positions
  handLandmarks.forEach((lm, idx) => {
    if (idx === 0) return; // Skip wrist (already tracked by pose)
    
    const jointName = prefix + handMap[idx];
    const joint = avatar.joints[jointName];
    
    if (!joint) return;
    
    try {
      const worldPos = landmarkToWorld(lm.x, lm.y, lm.z);
      if (!worldPos || isNaN(worldPos.x) || isNaN(worldPos.y) || isNaN(worldPos.z)) {
        return;
      }
      
      joint.pos.lerp(worldPos, 0.7); // Smooth finger movement
      joint.mesh.position.copy(joint.pos);
      joint.mesh.visible = true;
    } catch (e) {
      console.error(`[AVATAR] Error updating finger joint ${jointName}:`, e);
    }
  });
  
  // Show finger connections
  if (avatar.connections) {
    avatar.connections.forEach(conn => {
      if (conn.isFinger) {
        const jointA = avatar.joints[conn.a];
        const jointB = avatar.joints[conn.b];
        
        // Check if this connection belongs to the current hand
        if (!conn.a.startsWith(prefix) && !conn.b.startsWith(prefix)) {
          return;
        }
        
        if (jointA && jointB && jointA.mesh && jointB.mesh && 
            jointA.mesh.visible && jointB.mesh.visible) {
          const positions = conn.line.geometry.attributes.position.array;
          positions[0] = jointA.mesh.position.x;
          positions[1] = jointA.mesh.position.y;
          positions[2] = jointA.mesh.position.z;
          positions[3] = jointB.mesh.position.x;
          positions[4] = jointB.mesh.position.y;
          positions[5] = jointB.mesh.position.z;
          conn.line.geometry.attributes.position.needsUpdate = true;
          conn.line.visible = true;
        }
      }
    });
  }
  
  console.log(`[AVATAR] Updated ${prefix} hand with ${handLandmarks.length} finger landmarks`);
}
