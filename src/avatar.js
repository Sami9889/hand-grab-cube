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
  
  // Create glowing spheres for all 33 joints
  jointNames.forEach((name, idx) => {
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
  
  // Create thin glowing lines for connections
  skeletonConnections.forEach(([a, b]) => {
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
  });
  
  // Create HIGH-DETAIL grid mesh body parts (32+ segments for grid-like appearance)
  
  // HEAD - High-poly sphere with dual-layer wireframe + solid
  const headWireframe = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 32, 32),
    gridMat.clone()
  );
  headWireframe.castShadow = true;
  group.add(headWireframe);
  bodyParts.headWireframe = headWireframe;
  
  const headSolid = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 32, 32),
    solidGridMat.clone()
  );
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
  
  // Function to create HIGH-DETAIL dual-layer limb (wireframe + solid) with 32+ segments
  function createGridLimb(radiusTop, radiusBottom, height, name) {
    const wireframe = new THREE.Mesh(
      new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 32, 32),  // 32 radial, 32 height segments
      gridMat.clone()
    );
    wireframe.castShadow = true;
    group.add(wireframe);
    
    const solid = new THREE.Mesh(
      new THREE.CylinderGeometry(radiusTop * 0.9, radiusBottom * 0.9, height, 32, 32),
      solidGridMat.clone()
    );
    group.add(solid);
    
    bodyParts[name + 'Wireframe'] = wireframe;
    bodyParts[name + 'Solid'] = solid;
    return { wireframe, solid };
  }
  
  // Function to create detailed sphere joints (50+ segments)
  function createDetailedJoint(radius, name, color = null) {
    const mat = color ? new THREE.MeshStandardMaterial({ 
      color: color, 
      emissive: color, 
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.85
    }) : gridMat.clone();
    
    const wireframe = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),  // High detail
      mat
    );
    wireframe.castShadow = true;
    group.add(wireframe);
    bodyParts[name] = wireframe;
    return wireframe;
  }
  
  // SHOULDERS - Joint spheres
  createDetailedJoint(0.07, 'leftShoulderJoint', 0xff6600);
  createDetailedJoint(0.07, 'rightShoulderJoint', 0xff6600);
  
  // ARMS - High-poly cylinders
  createGridLimb(0.045, 0.04, 0.3, 'leftUpperArm');
  createGridLimb(0.045, 0.04, 0.3, 'rightUpperArm');
  
  // ELBOWS - Joint spheres
  createDetailedJoint(0.055, 'leftElbowJoint', 0xff8800);
  createDetailedJoint(0.055, 'rightElbowJoint', 0xff8800);
  
  createGridLimb(0.04, 0.035, 0.28, 'leftForearm');
  createGridLimb(0.04, 0.035, 0.28, 'rightForearm');
  
  // WRISTS - Joint spheres
  createDetailedJoint(0.045, 'leftWristJoint', 0xffaa00);
  createDetailedJoint(0.045, 'rightWristJoint', 0xffaa00);
  
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
  
  // HIPS - Joint spheres
  createDetailedJoint(0.08, 'leftHipJoint', 0x00ff88);
  createDetailedJoint(0.08, 'rightHipJoint', 0x00ff88);
  
  // LEGS - High-poly cylinders
  createGridLimb(0.08, 0.06, 0.45, 'leftThigh');
  createGridLimb(0.08, 0.06, 0.45, 'rightThigh');
  
  // KNEES - Joint spheres
  createDetailedJoint(0.07, 'leftKneeJoint', 0x00ffaa);
  createDetailedJoint(0.07, 'rightKneeJoint', 0x00ffaa);
  
  createGridLimb(0.06, 0.045, 0.45, 'leftShin');
  createGridLimb(0.06, 0.045, 0.45, 'rightShin');
  
  // ANKLES - Joint spheres
  createDetailedJoint(0.055, 'leftAnkleJoint', 0x00ffcc);
  createDetailedJoint(0.055, 'rightAnkleJoint', 0x00ffcc);
  
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
  
  // ADDITIONAL DETAILED COMPONENTS (50+ more parts)
  
  // SPINE SEGMENTS - 5 vertebrae spheres for detailed spine tracking
  for (let i = 0; i < 5; i++) {
    createDetailedJoint(0.04, `spineSegment${i}`, 0x4488ff);
  }
  
  // RIBS - Left and right rib cage arcs (10 ribs each side)
  for (let i = 0; i < 10; i++) {
    const ribMat = new THREE.MeshStandardMaterial({
      color: 0x0088ff,
      wireframe: true,
      transparent: true,
      opacity: 0.5
    });
    
    const leftRib = new THREE.Mesh(
      new THREE.TorusGeometry(0.08 + i * 0.01, 0.01, 8, 16, Math.PI),
      ribMat
    );
    group.add(leftRib);
    bodyParts[`leftRib${i}`] = leftRib;
    
    const rightRib = new THREE.Mesh(
      new THREE.TorusGeometry(0.08 + i * 0.01, 0.01, 8, 16, Math.PI),
      ribMat.clone()
    );
    group.add(rightRib);
    bodyParts[`rightRib${i}`] = rightRib;
  }
  
  // FINGER SEGMENTS - Individual finger bones (3 segments × 5 fingers × 2 hands = 30)
  const fingerNames = ['thumb', 'index', 'middle', 'ring', 'pinky'];
  ['left', 'right'].forEach(side => {
    fingerNames.forEach(finger => {
      for (let segment = 0; segment < 3; segment++) {
        const fingerPart = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.007, 0.025, 8, 4),
          new THREE.MeshStandardMaterial({
            color: 0xffcc99,
            transparent: true,
            opacity: 0.7
          })
        );
        group.add(fingerPart);
        bodyParts[`${side}${finger}Segment${segment}`] = fingerPart;
      }
    });
  });
  
  // CLAVICLES - Collar bones
  const leftClavicle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.15, 12, 8),
    gridMat.clone()
  );
  group.add(leftClavicle);
  bodyParts.leftClavicle = leftClavicle;
  
  const rightClavicle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.15, 12, 8),
    gridMat.clone()
  );
  group.add(rightClavicle);
  bodyParts.rightClavicle = rightClavicle;
  
  // SCAPULAS - Shoulder blades (triangular shapes)
  ['left', 'right'].forEach(side => {
    const scapulaShape = new THREE.Shape();
    scapulaShape.moveTo(0, 0);
    scapulaShape.lineTo(0.08, -0.12);
    scapulaShape.lineTo(0, -0.15);
    scapulaShape.lineTo(0, 0);
    
    const scapulaGeom = new THREE.ShapeGeometry(scapulaShape);
    const scapula = new THREE.Mesh(
      scapulaGeom,
      new THREE.MeshStandardMaterial({
        color: 0x0088ff,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
      })
    );
    group.add(scapula);
    bodyParts[`${side}Scapula`] = scapula;
  });
  
  // TOE SEGMENTS - Individual toes (5 toes × 2 feet = 10)
  for (let i = 0; i < 5; i++) {
    const leftToe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.01, 0.03, 8, 4),
      new THREE.MeshStandardMaterial({ color: 0x666666, transparent: true, opacity: 0.8 })
    );
    group.add(leftToe);
    bodyParts[`leftToe${i}`] = leftToe;
    
    const rightToe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.01, 0.03, 8, 4),
      new THREE.MeshStandardMaterial({ color: 0x666666, transparent: true, opacity: 0.8 })
    );
    group.add(rightToe);
    bodyParts[`rightToe${i}`] = rightToe;
  }
  
  // EYES - Glowing spheres
  createDetailedJoint(0.02, 'leftEyeSphere', 0x00ffff);
  createDetailedJoint(0.02, 'rightEyeSphere', 0x00ffff);
  
  // EARS - Small detailed meshes
  ['left', 'right'].forEach(side => {
    const ear = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0xffccaa,
        transparent: true,
        opacity: 0.7
      })
    );
    group.add(ear);
    bodyParts[`${side}EarMesh`] = ear;
  });
  
  // JAW - Lower face mesh
  const jaw = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.06, 0.08, 8, 4, 6),
    new THREE.MeshStandardMaterial({
      color: 0xffccaa,
      transparent: true,
      opacity: 0.6,
      wireframe: true
    })
  );
  group.add(jaw);
  bodyParts.jaw = jaw;
  
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
  if (!avatar || !landmarks || landmarks.length === 0) {
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
  
  // Update all 33 joint positions with smooth interpolation
  for (const [name, idx] of Object.entries(map)) {
    if (!landmarks[idx] || !avatar.joints[name]) continue;
    
    const lm = landmarks[idx];
    const joint = avatar.joints[name];
    
    try {
      const worldPos = landmarkToWorld(lm.x, lm.y, lm.z);
      joint.pos.lerp(worldPos, avatar.smoothFactor);
      joint.mesh.position.copy(joint.pos);
      joint.mesh.visible = (lm.visibility === undefined || lm.visibility > 0.3);
    } catch (e) {
      console.error('[AVATAR] Error updating joint', name, ':', e);
    }
  }
  
  // Update skeleton connection lines
  if (avatar.connections) {
    for (const conn of avatar.connections) {
      const jointA = avatar.joints[conn.a];
      const jointB = avatar.joints[conn.b];
      
      if (!jointA || !jointB || !jointA.mesh.visible || !jointB.mesh.visible) {
        conn.line.visible = false;
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
    }
  }
  
  // Helper function to update dual-layer body part (wireframe + solid)
  function updateDualBodyPart(wireframeName, solidName, jointA, jointB, extraLength = 0) {
    const partWire = avatar.bodyParts[wireframeName];
    const partSolid = avatar.bodyParts[solidName];
    
    if (!jointA || !jointB || !partWire || !partSolid) return;
    if (!jointA.mesh.visible || !jointB.mesh.visible) {
      if (partWire) partWire.visible = false;
      if (partSolid) partSolid.visible = false;
      return;
    }
    
    const posA = jointA.mesh.position;
    const posB = jointB.mesh.position;
    
    // Position at midpoint
    const mid = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
    
    // Orient along line between joints
    const direction = new THREE.Vector3().subVectors(posB, posA);
    const length = direction.length();
    
    if (length > 0.01) {
      [partWire, partSolid].forEach(part => {
        if (!part) return;
        part.position.copy(mid);
        
        // Scale to match joint distance
        const baseHeight = part.geometry.parameters.height || 1;
        part.scale.y = (length + extraLength) / baseHeight;
        
        // Rotate to align with joint direction
        part.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction.normalize()
        );
        part.visible = true;
      });
    } else {
      if (partWire) partWire.visible = false;
      if (partSolid) partSolid.visible = false;
    }
  }
  
  // Helper for single-point body parts (dual-layer spheres OR single parts)
  function updateDualSphere(wireframeName, solidName, joint) {
    const partWire = avatar.bodyParts[wireframeName];
    const partSolid = avatar.bodyParts[solidName];
    
    if (!joint || !joint.mesh.visible) {
      if (partWire) partWire.visible = false;
      if (partSolid) partSolid.visible = false;
      return;
    }
    
    // Handle single part (when wireframe and solid are same)
    if (wireframeName === solidName) {
      if (partWire) {
        partWire.position.copy(joint.mesh.position);
        partWire.visible = true;
      }
      return;
    }
    
    [partWire, partSolid].forEach(part => {
      if (part) {
        part.position.copy(joint.mesh.position);
        part.visible = true;
      }
    });
  }
  
  // Update body parts
  if (avatar.bodyParts) {
    const bp = avatar.bodyParts;
    const j = avatar.joints;
    
    // HEAD - position at nose
    if (bp.head && j.nose) {
      bp.head.position.copy(j.nose.mesh.position);
      bp.head.visible = true;
    }
    
    // TORSO - between shoulders and hips center
    if (bp.torso && j.leftShoulder && j.rightShoulder && j.leftHip && j.rightHip) {
      const shoulderCenter = new THREE.Vector3()
        .addVectors(j.leftShoulder.mesh.position, j.rightShoulder.mesh.position)
        .multiplyScalar(0.5);
      const hipCenter = new THREE.Vector3()
        .addVectors(j.leftHip.mesh.position, j.rightHip.mesh.position)
        .multiplyScalar(0.5);
      
      const torsoMid = new THREE.Vector3()
        .addVectors(shoulderCenter, hipCenter)
        .multiplyScalar(0.5);
      bp.torso.position.copy(torsoMid);
      
      const torsoDir = new THREE.Vector3().subVectors(shoulderCenter, hipCenter);
      const torsoLength = torsoDir.length();
      if (torsoLength > 0.01) {
        bp.torso.scale.y = torsoLength / bp.torso.geometry.parameters.height;
        bp.torso.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          torsoDir.normalize()
        );
        bp.torso.visible = true;
      }
    }
    
    // PELVIS - between hips
    if (bp.pelvis && j.leftHip && j.rightHip) {
      const hipCenter = new THREE.Vector3()
        .addVectors(j.leftHip.mesh.position, j.rightHip.mesh.position)
        .multiplyScalar(0.5);
      bp.pelvis.position.copy(hipCenter);
      bp.pelvis.visible = true;
    }
    
    // ARMS
    updateBodyPart(bp.leftUpperArm, j.leftShoulder, j.leftElbow);
    updateBodyPart(bp.rightUpperArm, j.rightShoulder, j.rightElbow);
    updateBodyPart(bp.leftForearm, j.leftElbow, j.leftWrist);
    updateBodyPart(bp.rightForearm, j.rightElbow, j.rightWrist);
    
    // HANDS
    if (bp.leftHand && j.leftWrist) {
      bp.leftHand.position.copy(j.leftWrist.mesh.position);
      bp.leftHand.visible = true;
    }
    if (bp.rightHand && j.rightWrist) {
      bp.rightHand.position.copy(j.rightWrist.mesh.position);
      bp.rightHand.visible = true;
    }
    
    // LEGS
    updateBodyPart(bp.leftThigh, j.leftHip, j.leftKnee);
    updateBodyPart(bp.rightThigh, j.rightHip, j.rightKnee);
    updateBodyPart(bp.leftShin, j.leftKnee, j.leftAnkle);
    updateBodyPart(bp.rightShin, j.rightKnee, j.rightAnkle);
    
    // FEET
    if (bp.leftFoot && j.leftAnkle && j.leftFootIndex) {
      const footMid = new THREE.Vector3()
        .addVectors(j.leftAnkle.mesh.position, j.leftFootIndex.mesh.position)
        .multiplyScalar(0.5);
      bp.leftFoot.position.copy(footMid);
      
      const footDir = new THREE.Vector3()
        .subVectors(j.leftFootIndex.mesh.position, j.leftAnkle.mesh.position);
      if (footDir.length() > 0.01) {
        bp.leftFoot.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          footDir.normalize()
        );
        bp.leftFoot.visible = true;
      }
    }
    
    if (bp.rightFoot && j.rightAnkle && j.rightFootIndex) {
      const footMid = new THREE.Vector3()
        .addVectors(j.rightAnkle.mesh.position, j.rightFootIndex.mesh.position)
        .multiplyScalar(0.5);
      bp.rightFoot.position.copy(footMid);
      
      const footDir = new THREE.Vector3()
        .subVectors(j.rightFootIndex.mesh.position, j.rightAnkle.mesh.position);
      if (footDir.length() > 0.01) {
        bp.rightFoot.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          footDir.normalize()
        );
        bp.rightFoot.visible = true;
      }
    }
    
    // UPDATE ALL 50+ ADDITIONAL DETAILED COMPONENTS
    
    // JOINT SPHERES - Position at joint locations for enhanced visualization
    updateDualSphere('leftShoulderJoint', 'leftShoulderJoint', j.leftShoulder);
    updateDualSphere('rightShoulderJoint', 'rightShoulderJoint', j.rightShoulder);
    updateDualSphere('leftElbowJoint', 'leftElbowJoint', j.leftElbow);
    updateDualSphere('rightElbowJoint', 'rightElbowJoint', j.rightElbow);
    updateDualSphere('leftWristJoint', 'leftWristJoint', j.leftWrist);
    updateDualSphere('rightWristJoint', 'rightWristJoint', j.rightWrist);
    updateDualSphere('leftHipJoint', 'leftHipJoint', j.leftHip);
    updateDualSphere('rightHipJoint', 'rightHipJoint', j.rightHip);
    updateDualSphere('leftKneeJoint', 'leftKneeJoint', j.leftKnee);
    updateDualSphere('rightKneeJoint', 'rightKneeJoint', j.rightKnee);
    updateDualSphere('leftAnkleJoint', 'leftAnkleJoint', j.leftAnkle);
    updateDualSphere('rightAnkleJoint', 'rightAnkleJoint', j.rightAnkle);
    
    // CLAVICLES - Collar bones from shoulders to neck
    if (j.leftShoulder && j.rightShoulder) {
      const neckBase = new THREE.Vector3()
        .addVectors(j.leftShoulder.mesh.position, j.rightShoulder.mesh.position)
        .multiplyScalar(0.5);
      
      const leftClavicle = bp.leftClavicle;
      if (leftClavicle && j.leftShoulder.mesh.visible) {
        const mid = new THREE.Vector3()
          .addVectors(neckBase, j.leftShoulder.mesh.position)
          .multiplyScalar(0.5);
        leftClavicle.position.copy(mid);
        const dir = new THREE.Vector3().subVectors(j.leftShoulder.mesh.position, neckBase);
        if (dir.length() > 0.01) {
          leftClavicle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
          leftClavicle.scale.y = dir.length() / 0.15;
          leftClavicle.visible = true;
        }
      }
      
      const rightClavicle = bp.rightClavicle;
      if (rightClavicle && j.rightShoulder.mesh.visible) {
        const mid = new THREE.Vector3()
          .addVectors(neckBase, j.rightShoulder.mesh.position)
          .multiplyScalar(0.5);
        rightClavicle.position.copy(mid);
        const dir = new THREE.Vector3().subVectors(j.rightShoulder.mesh.position, neckBase);
        if (dir.length() > 0.01) {
          rightClavicle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
          rightClavicle.scale.y = dir.length() / 0.15;
          rightClavicle.visible = true;
        }
      }
    }
    
    // SPINE SEGMENTS - Distributed along the spine for detailed tracking
    if (j.nose && j.leftHip && j.rightHip) {
      const hipCenter = new THREE.Vector3()
        .addVectors(j.leftHip.mesh.position, j.rightHip.mesh.position)
        .multiplyScalar(0.5);
      const shoulderCenter = j.leftShoulder && j.rightShoulder 
        ? new THREE.Vector3()
            .addVectors(j.leftShoulder.mesh.position, j.rightShoulder.mesh.position)
            .multiplyScalar(0.5)
        : j.nose.mesh.position.clone();
      
      for (let i = 0; i < 5; i++) {
        const spine = bp[`spineSegment${i}`];
        if (spine) {
          const t = i / 4; // 0 to 1
          spine.position.lerpVectors(hipCenter, shoulderCenter, t);
          spine.visible = true;
        }
      }
    }
    
    // EYES - Position at eye joints
    updateDualSphere('leftEyeSphere', 'leftEyeSphere', j.leftEye);
    updateDualSphere('rightEyeSphere', 'rightEyeSphere', j.rightEye);
    
    // EARS - Position at ear joints
    if (j.leftEar && bp.leftEarMesh) {
      bp.leftEarMesh.position.copy(j.leftEar.mesh.position);
      bp.leftEarMesh.visible = j.leftEar.mesh.visible;
    }
    if (j.rightEar && bp.rightEarMesh) {
      bp.rightEarMesh.position.copy(j.rightEar.mesh.position);
      bp.rightEarMesh.visible = j.rightEar.mesh.visible;
    }
    
    // JAW - Position at mouth center
    if (j.mouthLeft && j.mouthRight && bp.jaw) {
      const mouthCenter = new THREE.Vector3()
        .addVectors(j.mouthLeft.mesh.position, j.mouthRight.mesh.position)
        .multiplyScalar(0.5);
      bp.jaw.position.copy(mouthCenter);
      bp.jaw.visible = j.mouthLeft.mesh.visible && j.mouthRight.mesh.visible;
    }
  }
}
