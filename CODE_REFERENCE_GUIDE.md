# Code Reference Guide - Avatar Animation Glitches

## Quick Navigation to Problem Areas

### Issue 1: Sliding Movement (No Walking Animation)

**Primary File:** `src/physics-support-leg.js` (19 lines)
```javascript
// PROBLEM: Only compares Y coordinates, ignores foot velocity/contact
export function getSupportLeg(landmarks) {
  const left = landmarks[27], right = landmarks[28];
  return left.y < right.y ? 'left' : 'right';  // <-- TOO SIMPLE
}

export function getSupportFootPosition(landmarks) {
  const left = landmarks[27], right = landmarks[28];
  return left.y < right.y ? left : right;  // <-- SAME ISSUE
}
```
**What's Missing:**
- No ground contact detection
- No foot velocity tracking
- No contact duration tracking
- No stride prediction

**Secondary File:** `main.js` (lines 520-580)
```javascript
// PROBLEM: Direct position mapping, no walking cycle
updateAvatarFromPose(avatar, latestPose.world, ...);

if (trackedPos) {
  avatar.group.position.lerp(
    new THREE.Vector3(trackedPos.x, trackedPos.y, trackedPos.z),
    0.4  // <-- Simple linear interpolation, no procedural walking
  );
}
```

**Tertiary File:** `src/avatar.js` (lines 770-825)
```javascript
// Feet are rendered as static geometry based on ankle/foot landmarks
// No IK, no foot lock during stance phase, no swing phase animation
const footMid = new THREE.Vector3()
  .add(j.leftAnkle.mesh.position)
  .add(j.leftFootIndex.mesh.position)
  .add(j.leftHeel.mesh.position)
  .multiplyScalar(1/3);
  
['leftFootWireframe', 'leftFootSolid'].forEach(name => {
  const part = avatar.bodyParts[name];
  if (part && footDir.length() > 0.01) {
    part.position.copy(footMid);  // <-- Direct mapping
    // NO IK, NO FOOT LOCK
  }
});
```

---

### Issue 2: Head Leaning Instead of Rotating

**Primary File:** `src/avatar.js` (lines 703-740)
```javascript
// PROBLEM: No rotation calculation, just direct position mapping
updateDualSphere('headWireframe', 'headSolid', j.nose);  // <-- HEAD IS JUST A POSITION

// NECK - between head and shoulders
const shoulderCenter = new THREE.Vector3()
  .addVectors(j.leftShoulder.mesh.position, j.rightShoulder.mesh.position)
  .multiplyScalar(0.5);
const neckTop = j.nose.mesh.position.clone();
neckTop.y -= 0.1;  // <-- Neck doesn't constrain head, just renders a line
```

**What's Missing:**
- No calculation of head pitch/yaw/roll from landmarks
- No head rotation quaternion
- No neck length constraint
- No cervical spine limits
- No eye vector calculation

**Secondary Issue in:** `src/avatar.js` (lines 465-500)
```javascript
// updateAvatarFromPose function
for (const [name, idx] of Object.entries(map)) {
  if (!landmarks[idx] || !avatar.joints[name]) continue;
  
  const lm = landmarks[idx];
  const worldPos = landmarkToWorld(lm.x, lm.y, lm.z);  // <-- POSITION ONLY
  
  joint.pos.lerp(relativePos, avatar.smoothFactor);
  joint.mesh.position.copy(joint.pos);  // <-- NO ROTATION ASSIGNED
  // MISSING: joint.mesh.quaternion.copy(...) 
}
```

**What Should Happen:**
```javascript
// MISSING: Head rotation calculation
const headRotation = calculateHeadRotationFromLandmarks(
  landmarks[0],   // nose
  landmarks[2],   // leftEye
  landmarks[5],   // rightEye
  landmarks[7],   // leftEar
  landmarks[8]    // rightEar
);

const headJoint = avatar.joints['nose'];
headJoint.mesh.quaternion.slerp(headRotation, smoothFactor);
headJoint.mesh.position.copy(neckAttachmentPoint);  // Keep at neck
```

---

### Issue 3: Legs Glitch During Sitting

**Primary File:** `src/avatar-animator.js` (72 lines total)
```javascript
// PROBLEM: No sitting animation exists at all
export function animateJump(avatar, t = 0) { /* ... */ }
export function animateKick(avatar, side = 'left', t = 0) { /* ... */ }
export function animateWave(avatar, side = 'right', t = 0) { /* ... */ }

// MISSING ENTIRELY: animateSit() function
// MISSING: sitTransition() function
// MISSING: bendKnees() function
```

**What's Missing Completely:**
```javascript
// Need to add these functions:

export function detectSitting(landmarks) {
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  
  const hipY = (leftHip.y + rightHip.y) / 2;
  const kneeY = (leftKnee.y + rightKnee.y) / 2;
  
  // User is sitting when hips drop to ~knee level
  return (kneeY - hipY) < 0.15;  // <-- MISSING
}

export function animateSit(avatar, sitAmount = 0) {
  // sitAmount ranges from 0 (standing) to 1 (fully sitting)
  
  // Bend knees
  const leftKnee = avatar.joints['leftKnee'];
  const rightKnee = avatar.joints['rightKnee'];
  
  // Apply knee bend by moving knees forward/down
  // This pushes the shin forward and down relative to thigh
  // <-- ENTIRE SYSTEM MISSING
}

export function sitTransition(avatar, currentState, targetState, blendAmount) {
  // Smooth animation from standing to sitting
  // Or from sitting back to standing
  // <-- ENTIRE SYSTEM MISSING
}
```

**Secondary File:** `main.js` (render loop, lines 520-580)
```javascript
// PROBLEM: No sit state tracking in render loop
if (latestPose) {
  // ... pose update code ...
  updateAvatarFromPose(avatar, latestPose.world, ...);
  // NO SIT DETECTION HERE
}

// MISSING LOGIC:
// const isSitting = detectSitting(latestPose.world);
// if (isSitting !== wasLastFrameSitting) {
//   animate sit transition over 0.3 seconds
// }
// blendAnimationState(currentState, targetState, blendAmount);
```

**Tertiary File:** `src/avatar.js` (lines 743-768)
```javascript
// Legs are rendered as cylinders between joints
updateDualBodyPart('leftThighWireframe', 'leftThighSolid', j.leftHip, j.leftKnee);
updateDualBodyPart('leftShinWireframe', 'leftShinSolid', j.leftKnee, j.leftAnkle);

// PROBLEM: When user sits and knees bend:
// - Hip position drops (tracked)
// - Avatar moves down with hip
// - But knee/ankle stay at pose-derived positions
// - This creates stretched/glitched legs
// NEEDS: IK solver to maintain leg geometry
```

---

### Issue 4: Swat/Gesture Animation Glitches

**Primary File:** `src/avatar-animator.js` (lines 32-73)
```javascript
export function animateWave(avatar, side = 'right', t = 0) {
  const waveHeight = Math.sin(t * Math.PI * 4) * 0.25;
  const waveRotation = Math.sin(t * Math.PI * 4) * 0.4;
  
  // PROBLEM 1: Modifies same joints that pose update just set
  if (shoulder) {
    shoulder.mesh.position.z -= Math.sin(t * Math.PI * 4) * 0.08;  // <-- ADD to pose
  }
  
  if (elbow) {
    elbow.mesh.position.y += waveHeight * 0.8;  // <-- ADD to pose
    elbow.mesh.position.x += Math.sin(t * Math.PI * 4) * 0.1;
  }
  
  // PROBLEM 2: Ignores actual pose data
  // These hard-coded sine waves play regardless of what user is actually doing
  wrist.mesh.position.y += waveHeight;  // <-- HARD OVERRIDE
  wrist.mesh.position.x += waveRotation * 0.15;
}
```

**Conflicting Call Location:** `main.js` (lines 650-653)
```javascript
// PROBLEM: Animation called AFTER pose update
// This causes position conflicts

if (testVideoActive || cameraStarted) {
  animateWave(avatar, 'right', waveTime);
  // At this point, wrist position was already set by updateAvatarFromPose()
  // Now animateWave ADDS on top of it
  // Result: Double animation, glitchy motion
}
```

**Order of Operations (THE PROBLEM):**
```
Frame 1:
  1. updateAvatarFromPose(avatar, landmarks)
     └─ Sets wrist.mesh.position = [0.5, 1.2, -0.3]
  
  2. animateWave(avatar, 'right', waveTime)
     └─ Adds to wrist: position.y += 0.25
     └─ Now wrist.mesh.position = [0.5, 1.45, -0.3]
  
  3. render()
     └─ Wrist is at [0.5, 1.45, -0.3]

Frame 2:
  1. updateAvatarFromPose(avatar, landmarks)
     └─ Sets wrist.mesh.position = [0.48, 1.18, -0.28]
     (pose changed slightly, user moved slightly)
  
  2. animateWave(avatar, 'right', waveTime + dt)
     └─ Adds to wrist: position.y += 0.20 (different sine value)
     └─ Now wrist.mesh.position = [0.48, 1.38, -0.28]
  
  3. render()
     └─ Wrist jerks around: [0.5, 1.45] -> [0.48, 1.38]
     └─ GLITCH: Erratic motion combining pose + animation
```

**What's Missing:**
```javascript
// MISSING: Gesture detection system
function detectGestureVelocity(landmarks, prevLandmarks, dt) {
  const wrist = landmarks[16];
  const prevWrist = prevLandmarks[16];
  
  const velocity = {
    x: (wrist.x - prevWrist.x) / dt,
    y: (wrist.y - prevWrist.y) / dt,
    z: (wrist.z - prevWrist.z) / dt
  };
  
  const speed = Math.sqrt(
    velocity.x * velocity.x + 
    velocity.y * velocity.y + 
    velocity.z * velocity.z
  );
  
  return { velocity, speed };  // <-- MISSING
}

// MISSING: Animation blending
function blendAnimation(poseJoint, proceduralJoint, blendWeight) {
  // blendWeight = 0: use pose only
  // blendWeight = 1: use procedural only
  // 0 < blendWeight < 1: blend both
  
  const blended = {
    x: poseJoint.x * (1 - blendWeight) + proceduralJoint.x * blendWeight,
    y: poseJoint.y * (1 - blendWeight) + proceduralJoint.y * blendWeight,
    z: poseJoint.z * (1 - blendWeight) + proceduralJoint.z * blendWeight
  };
  
  return blended;  // <-- MISSING
}

// MISSING: Actual gesture detection
export function detectSwat(gestureVelocity) {
  const speed = gestureVelocity.speed;
  const dy = gestureVelocity.velocity.y;
  
  if (speed > 0.8) {  // <-- Threshold for fast motion
    if (dy > 0.5) {
      return { type: 'swatDown', confidence: Math.min(1, speed / 2) };
    } else if (dy < -0.5) {
      return { type: 'swatUp', confidence: Math.min(1, speed / 2) };
    }
  }
  
  return null;  // <-- MISSING ENTIRE FUNCTION
}
```

**Proper Animation Call Should Look Like:**
```javascript
// MISSING: Gesture-aware animation system
if (latestPose && prevPose) {
  // Detect gestures
  const gesture = detectGestureVelocity(latestPose.world, prevPose.world, dt);
  
  // Determine blend weight based on gesture
  let blendWeight = 0;  // Default: full pose capture
  if (gesture.speed > 0.8) {
    blendWeight = Math.min(1, gesture.speed / 2);  // Blend in procedural
  }
  
  // Update pose
  updateAvatarFromPose(avatar, latestPose.world, ...);
  
  // Apply procedural animation with blending
  if (blendWeight > 0) {
    const proceduralPose = generateGestureAnimation(gesture, t);
    applyBlendedAnimation(avatar, proceduralPose, blendWeight);
  }
}
```

---

## Summary Table: Where to Fix Each Issue

| Issue | File | Lines | Problem | Fix Type |
|-------|------|-------|---------|----------|
| **Movement Glitch** | `physics-support-leg.js` | 2-18 | Y-axis only comparison | Add contact detection |
| | `main.js` | 560-580 | No walking cycle | Implement procedural walk |
| | `avatar.js` | 770-825 | No foot IK | Add foot lock system |
| **Head Lean** | `avatar.js` | 465-500 | No rotation calculation | Calculate head quaternion |
| | `avatar.js` | 703-740 | Direct position mapping | Use rotation constraints |
| | (everywhere) | - | No rotation storage | Add quaternion to joints |
| **Sitting Glitch** | `avatar-animator.js` | ALL | No sit animation | Create animateSit() |
| | `main.js` | 520-580 | No sit detection | Add detectSitting() |
| | `avatar.js` | 743-768 | Leg rendering conflict | Implement knee IK |
| **Gesture Glitch** | `avatar-animator.js` | 32-73 | Position overwriting | Implement blending |
| | `main.js` | 650-653 | Wrong call order | Call before pose update |
| | (everywhere) | - | No velocity tracking | Track prev positions |

---

## File Statistics

```
TOTAL FILES INVOLVED: 6

1. avatar.js (909 lines)
   - Involved in: ALL 4 issues
   - Needs: IK solvers, rotation calculation, state tracking

2. avatar-animator.js (72 lines)
   - Involved in: Issues 3 and 4
   - Needs: Complete animation system rewrite

3. physics-support-leg.js (19 lines)
   - Involved in: Issue 1
   - Needs: Contact detection, velocity tracking

4. main.js (~850 lines)
   - Involved in: ALL 4 issues
   - Needs: Animation loop restructuring, state machine

5. physics-stabilizer.js (22 lines)
   - Involved in: Issue 1 (indirectly)
   - Needs: Angular velocity clamping

6. tracking.js (Large)
   - Involved in: Issues 1, 3
   - Needs: Pose analysis layer
```

---

## Architecture Change Required

```
Current Flow (BROKEN):
├─ Read pose landmarks
├─ updateAvatarFromPose()        [Direct mapping]
├─ animateWave()                 [Hard-coded, conflicting]
├─ Physics updates
└─ Render

Needed Flow (FIXED):
├─ Read pose landmarks
├─ Pose Analysis
│  ├─ Calculate velocity
│  ├─ Detect gestures
│  ├─ Detect sitting
│  └─ Detect support leg
├─ State Machine
│  ├─ Determine animation state
│  └─ Calculate blend weights
├─ IK Layer
│  ├─ Head rotation constraints
│  ├─ Leg IK solver
│  └─ Foot contact system
├─ Animation Blending
│  ├─ Pose-based motion
│  ├─ Procedural motion
│  └─ Blended result
├─ Physics updates
└─ Render
```

