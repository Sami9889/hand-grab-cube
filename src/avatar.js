import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';

export function createAvatar(scene) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffb347 });
  const joints = {};
  const jointNames = ['nose','leftShoulder','rightShoulder','leftElbow','rightElbow','leftWrist','rightWrist','leftHip','rightHip','leftKnee','rightKnee','leftAnkle','rightAnkle'];
  jointNames.forEach(name => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), mat.clone());
    s.visible = false; group.add(s); joints[name] = { mesh: s, pos: new THREE.Vector3() };
  });
  // head orientation arrow
  const headDir = new THREE.ArrowHelper(new THREE.Vector3(0,0,-1), new THREE.Vector3(0,0,0), 0.25, 0x88ff88);
  headDir.visible = false; group.add(headDir);
  scene.add(group);
  // increase smoothing for more stable movement
  return { group, joints, headDir, smoothFactor: 0.5 };
}

export function updateAvatarFromPose(avatar, landmarks, handToWorld) {
  if (!landmarks || landmarks.length === 0) { avatar.group.visible = false; return; }
  avatar.group.visible = true;
  // mapping by approximate pose indices (MediaPipe Pose uses 33 landmarks)
  const map = {
    nose: 0, leftShoulder:11, rightShoulder:12, leftElbow:13, rightElbow:14, leftWrist:15, rightWrist:16,
    leftHip:23, rightHip:24, leftKnee:25, rightKnee:26, leftAnkle:27, rightAnkle:28
  };
  for (const key in map) {
    const idx = map[key]; const p = landmarks[idx]; const part = avatar.joints[key];
    if (!p || !part) continue;
    const w = handToWorld(p.x, p.y, p.z, 1.6);
    // smoothing
    part.pos.lerp(w, avatar.smoothFactor);
    part.mesh.position.copy(part.pos);
    part.mesh.visible = true;
  }
  // update head orientation: use nose and shoulder mid point
  const nose = landmarks[0]; const ls = landmarks[11]; const rs = landmarks[12];
  if (nose && ls && rs) {
    const mid = new THREE.Vector3((ls.x+rs.x)/2, (ls.y+rs.y)/2, (ls.z+rs.z)/2);
    const noseW = handToWorld(nose.x, nose.y, nose.z, 1.6);
    const midW = handToWorld(mid.x, mid.y, mid.z, 1.6);
    const dir = new THREE.Vector3().subVectors(noseW, midW).normalize();
    avatar.headDir.position.copy(noseW);
    avatar.headDir.setDirection(dir);
    avatar.headDir.visible = true;
  } else {
    avatar.headDir.visible = false;
  }
}
