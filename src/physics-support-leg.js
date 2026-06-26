// physics-support-leg.js
// Detects which leg is supporting and syncs physics body accordingly
export function getSupportLeg(landmarks) {
  // Use MediaPipe Pose indices: 27 = leftAnkle, 28 = rightAnkle
  if (!landmarks || landmarks.length < 29) return null;
  const left = landmarks[27], right = landmarks[28];
  if (!left || !right) return null;
  // Lower y is closer to ground (y up)
  return left.y < right.y ? 'left' : 'right';
}

export function getSupportFootPosition(landmarks) {
  if (!landmarks || landmarks.length < 29) return null;
  const left = landmarks[27], right = landmarks[28];
  if (!left || !right) return null;
  return left.y < right.y ? left : right;
}
