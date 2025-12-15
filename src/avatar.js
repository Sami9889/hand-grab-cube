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
  // Joints (spheres)
  jointNames.forEach(name => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), mat.clone());
    s.visible = false; group.add(s); joints[name] = { mesh: s, pos: new THREE.Vector3() };
  });
  const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
  bodyMesh.visible = false;
  group.add(bodyMesh);
  
  // Create joint references but no geometric shapes - scan will create the geometry
  jointNames.forEach(name => {
    joints[name] = { pos: new THREE.Vector3(), scanIndex: null };
  });
  // Head - will be replaced with actual face mesh from scan data
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 12), mat.clone());
  head.visible = false; group.add(head); joints.head = { mesh: head, pos: new THREE.Vector3() };
  
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
  // Torso (box)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.32, 0.12), mat.clone());
  torso.visible = false; group.add(torso); joints.torso = { mesh: torso, pos: new THREE.Vector3() };
  // Limbs (cylinders between joints, more anatomical detail)
  const limbPairs = [
    // Arms - detailed connections
    ['leftShoulder','leftUpperArm'], ['leftUpperArm','leftElbow'], ['leftElbow','leftForearm'], ['leftForearm','leftWrist'],
    ['rightShoulder','rightUpperArm'], ['rightUpperArm','rightElbow'], ['rightElbow','rightForearm'], ['rightForearm','rightWrist'],
    
    // Legs - detailed connections with heel and foot
    ['leftHip','leftUpperLeg'], ['leftUpperLeg','leftKnee'], ['leftKnee','leftLowerLeg'], ['leftLowerLeg','leftAnkle'], 
    ['leftAnkle','leftHeel'], ['leftHeel','leftFoot'], ['leftAnkle','leftFootIndex'],
    ['rightHip','rightUpperLeg'], ['rightUpperLeg','rightKnee'], ['rightKnee','rightLowerLeg'], ['rightLowerLeg','rightAnkle'], 
    ['rightAnkle','rightHeel'], ['rightHeel','rightFoot'], ['rightAnkle','rightFootIndex'],
    
    // Torso and spine - detailed connections
    ['leftShoulder','rightShoulder'], ['leftHip','rightHip'], ['pelvis','leftHip'], ['pelvis','rightHip'], 
    ['pelvis','spine'], ['spine','torso'], ['torso','chest'], ['chest','sternum'],
    ['torso','leftShoulder'], ['torso','rightShoulder'], ['neck','leftShoulder'], ['neck','rightShoulder'],
    
    // Head connections
    ['neck','nose'], ['nose','leftEye'], ['nose','rightEye'], ['leftEye','leftEar'], ['rightEye','rightEar']
  ];
  const limbs = limbPairs.map(([a,b]) => {
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,1,16), mat.clone());
    cyl.visible = false; group.add(cyl);
    return { mesh: cyl, a, b };
  });
  // head orientation arrow
  const headDir = new THREE.ArrowHelper(new THREE.Vector3(0,0,-1), new THREE.Vector3(0,0,0), 0.25, 0x88ff88);
  headDir.visible = false; group.add(headDir);
  scene.add(group);
  // increase smoothing for more stable movement
  return { group, joints, limbs, headDir, faceMesh, smoothFactor: 0.5 };
}

export function updateAvatarFromPose(avatar, landmarks, handToWorld) {
  // Null safety checks
  if (!avatar || !avatar.joints || !avatar.group) {
    console.error('[ERROR] Invalid avatar object passed to updateAvatarFromPose');
    return;
  }
  
  if (!landmarks || landmarks.length === 0) {
    avatar.group.visible = false;
    // Hide all parts with null checks
    try {
      Object.values(avatar.joints).forEach(j => {
        if (j && j.mesh) j.mesh.visible = false;
      });
      if (avatar.limbs) avatar.limbs.forEach(l => {
        if (l && l.mesh) l.mesh.visible = false;
      });
      if (avatar.fingers) {
        Object.values(avatar.fingers).forEach(arr => {
          if (arr) arr.forEach(f => {
            if (f && f.mesh) f.mesh.visible = false;
          });
        });
      }
      if (avatar.headDir) avatar.headDir.visible = false;
    } catch (e) {
      console.error('[ERROR] Error hiding avatar parts:', e);
    }
    return;
  }
  
  avatar.group.visible = true;
  // Show all parts by default (will be positioned below) with null checks
  try {
    Object.values(avatar.joints).forEach(j => {
      if (j && j.mesh) j.mesh.visible = true;
    });
    if (avatar.limbs) avatar.limbs.forEach(l => {
      if (l && l.mesh) l.mesh.visible = true;
    });
    if (avatar.fingers) {
      Object.values(avatar.fingers).forEach(arr => {
        if (arr) arr.forEach(f => {
          if (f && f.mesh) f.mesh.visible = true;
        });
      });
    }
  } catch (e) {
    console.error('[ERROR] Error showing avatar parts:', e);
  }
  
  // Hand and finger tips (if hand landmarks are available on window._lastHands)
  if (window._lastHands && Array.isArray(window._lastHands)) {
    try {
      ['left','right'].forEach((side, sidx) => {
        const hand = window._lastHands.find(h => h && h.handedness && h.handedness.toLowerCase() === side);
        if (hand && hand.landmarks && avatar.fingers && avatar.fingers[side]) {
          for (let i = 0; i < avatar.fingers[side].length; i++) {
            const tip = avatar.fingers[side][i];
            if (!tip || !tip.mesh) continue;
            const lm = hand.landmarks[tip.idx];
            if (lm && lm.x !== undefined && lm.y !== undefined && lm.z !== undefined) {
              try {
                const w = handToWorld(lm.x, lm.y, lm.z, 1.6);
                if (w && tip.pos) {
                  tip.pos.lerp(w, 0.7);
                  tip.mesh.position.copy(tip.pos);
                  tip.mesh.visible = true;
                }
              } catch (e) {
                tip.mesh.visible = false;
              }
            } else {
              tip.mesh.visible = false;
            }
          }
        } else if (avatar.fingers && avatar.fingers[side]) {
          avatar.fingers[side].forEach(tip => {
            if (tip && tip.mesh) tip.mesh.visible = false;
          });
        }
      });
    } catch (e) {
      console.error('[ERROR] Error updating finger tips:', e);
    }
  }
  // mapping by approximate pose indices (MediaPipe Pose uses 33 landmarks)
  // Extended mapping for more joints (MediaPipe Pose uses 33 landmarks)
  const map = {
    // Head (0-10) - detailed facial landmarks
    nose: 0, 
    head: 0,  // use same index as nose
    neck: 1,  // ear region
    leftEye: 2,
    rightEye: 5,
    leftEar: 7,
    rightEar: 8,
    leftEyeInner: 1,
    rightEyeInner: 4,
    leftEyeOuter: 3,
    rightEyeOuter: 6,
    mouthLeft: 9,
    mouthRight: 10,
    
    // Shoulders and arms (11-16)
    leftShoulder: 11, 
    rightShoulder: 12,
    leftElbow: 13, 
    rightElbow: 14,
    leftWrist: 15, 
    rightWrist: 16,
    leftUpperArm: 11, 
    rightUpperArm: 12,
    leftLowerArm: 13, 
    rightLowerArm: 14,
    leftForearm: 13,
    rightForearm: 14,
    
    // Torso and hips (11-24) - detailed spine
    torso: 23,
    spine: 23,
    pelvis: 23,
    hips: 24,
    sternum: 11,  // use shoulder midpoint approximation
    chest: 11,
    upperBack: 12,
    lowerBack: 23,
    
    // Hands (15-22) - finger tips
    leftPinky: 17,
    rightPinky: 18,
    leftIndex: 19,
    rightIndex: 20,
    leftThumb: 21,
    rightThumb: 22,
    
    // Legs (23-32) - detailed leg tracking
    leftHip: 23, 
    rightHip: 24,
    leftKnee: 25, 
    rightKnee: 26,
    leftAnkle: 27, 
    rightAnkle: 28,
    leftUpperLeg: 23, 
    rightUpperLeg: 24,
    leftLowerLeg: 25, 
    rightLowerLeg: 26,
    leftHeel: 29,
    rightHeel: 30,
    leftFoot: 31, 
    rightFoot: 32,
    leftFootIndex: 31,
    rightFootIndex: 32
  };
  // Per-limb smoothing and stability
  const legKeys = [
    'leftHip','rightHip','leftKnee','rightKnee','leftAnkle','rightAnkle',
    'leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg',
    'leftFoot','rightFoot','leftHeel','rightHeel','leftFootIndex','rightFootIndex'
  ];
  const maxLegMove = 0.18; // meters, max allowed jump per frame (tighter for stability)
  // Update joints with extensive null checks
  try {
    for (const key in map) {
      const idx = map[key];
      if (idx === undefined || idx === null) continue;
      const p = landmarks[idx];
      const part = avatar.joints[key];
      if (!p || !part || !part.pos || !part.mesh) continue;
      if (p.x === undefined || p.y === undefined || p.z === undefined) continue;
      
      try {
        const w = handToWorld(p.x, p.y, p.z, 1.6);
        if (!w || w.x === undefined || w.y === undefined || w.z === undefined) continue;
        
        let smooth = avatar.smoothFactor || 0.5;
        if (legKeys.includes(key)) smooth = Math.max(0.7, avatar.smoothFactor || 0.5);
        if (legKeys.includes(key)) {
          const dist = part.pos.distanceTo(w);
          if (dist > maxLegMove) continue;
        }
        part.pos.lerp(w, smooth);
        part.mesh.position.copy(part.pos);
        part.mesh.visible = true;
      } catch (e) {
        // Silently skip this joint if there's an error
        continue;
      }
    }
  } catch (e) {
    console.error('[ERROR] Error updating joints:', e);
  }
  // Head (use nose position, offset upward)
  const nose = landmarks[0];
  if (nose && avatar.joints.head) {
    const w = handToWorld(nose.x, nose.y-0.09, nose.z, 1.6); // offset up for head
    avatar.joints.head.pos.lerp(w, 0.7);
    avatar.joints.head.mesh.position.copy(avatar.joints.head.pos);
    avatar.joints.head.mesh.visible = true;
  }
  // Head removed - using scanned face mesh instead
  // Torso (midpoint between shoulders and hips)
  const ls = landmarks[11], rs = landmarks[12], lh = landmarks[23], rh = landmarks[24];
  if (ls && rs && lh && rh && avatar.joints.torso) {
    const midShoulders = { x: (ls.x+rs.x)/2, y: (ls.y+rs.y)/2, z: (ls.z+rs.z)/2 };
    const midHips = { x: (lh.x+rh.x)/2, y: (lh.y+rh.y)/2, z: (lh.z+rh.z)/2 };
    const mid = { x: (midShoulders.x+midHips.x)/2, y: (midShoulders.y+midHips.y)/2, z: (midShoulders.z+midHips.z)/2 };
    const w = handToWorld(mid.x, mid.y, mid.z, 1.6);
    avatar.joints.torso.pos.lerp(w, 0.7);
    avatar.joints.torso.mesh.position.copy(avatar.joints.torso.pos);
    avatar.joints.torso.mesh.visible = true;
  }
  // Limbs (cylinders between joints) - with extensive null checks
  if (avatar.limbs) {
    try {
      for (const limb of avatar.limbs) {
        if (!limb || !limb.mesh || !limb.a || !limb.b) {
          if (limb && limb.mesh) limb.mesh.visible = false;
          continue;
        }
        
        const a = avatar.joints[limb.a], b = avatar.joints[limb.b];
        if (!a || !b || !a.mesh || !b.mesh || !a.mesh.position || !b.mesh.position) {
          limb.mesh.visible = false;
          continue;
        }
        
        try {
          const posA = a.mesh.position, posB = b.mesh.position;
          // Position limb between joints
          const mid = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
          limb.mesh.position.copy(mid);
          // Set orientation
          const dir = new THREE.Vector3().subVectors(posB, posA);
          const len = dir.length();
          if (len < 0.01) { limb.mesh.visible = false; continue; }
          limb.mesh.scale.set(1, len, 1);
          limb.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.clone().normalize());
          limb.mesh.visible = true;
        } catch (e) {
          limb.mesh.visible = false;
        }
      }
    } catch (e) {
      console.error('[ERROR] Error updating limbs:', e);
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

// New function to update face mesh from actual MediaPipe FaceMesh scan data
export function updateFaceMeshFromScan(faceMeshObj, faceLandmarks) {
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
    
    // Create triangulated mesh from landmarks (MediaPipe provides canonical face topology)
    // Using Delaunay-like triangulation for face mesh
    const indices = [];
    // MediaPipe face mesh canonical triangulation (simplified for wireframe)
    // Connect nearby points to form triangles
    for (let i = 0; i < faceLandmarks.length - 2; i++) {
      if (i % 3 === 0) { // Create triangles
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
