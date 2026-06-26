# Avatar Animation Glitches - Complete Investigation Documentation Index

Generated: June 5, 2026

## Quick Start

If you're looking for specific information about the avatar animation glitches, use this guide to navigate the documentation.

### I Want to...

**Understand the root causes of all 4 issues**
→ Read: `INVESTIGATION_SUMMARY.md`

**See detailed technical analysis with explanations**
→ Read: `ANIMATION_GLITCHES_ANALYSIS.md`

**Find exact code locations and code snippets**
→ Read: `CODE_REFERENCE_GUIDE.md`

**Learn how to fix each issue**
→ Read: `ANIMATION_GLITCHES_ANALYSIS.md` (Recommendations section)

---

## Documentation Files

### 1. INVESTIGATION_SUMMARY.md (12 KB)
**Purpose:** Executive summary and overview
**Best For:** Quick understanding of issues and recommended fixes

**Contents:**
- Overview of all 4 glitches
- Root causes for each issue
- Architecture issues explanation
- Critical missing components
- Priority fixes (ordered by impact)
- Code organization recommendations

**Key Sections:**
- Issue 1: Movement Glitch (Sliding Without Walking Animation)
- Issue 2: Head Movement Glitch (Leaning Back Instead of Looking Up)
- Issue 3: Sitting Glitch (Legs Glitch When Attempting to Sit)
- Issue 4: Swat/Gesture Glitch (Animation Glitches During Swatting)

**Read Time:** 10-15 minutes

---

### 2. ANIMATION_GLITCHES_ANALYSIS.md (18 KB)
**Purpose:** Comprehensive technical analysis
**Best For:** Deep understanding of mechanics and detailed solutions

**Contents:**
- Detailed explanation of each glitch
- Current implementation code analysis
- Missing components for each issue
- Root cause explanations (why it happens)
- Technical architecture issues
- Joint hierarchy and control flow
- Specific file locations and code snippets
- Summary table of root causes
- Detailed recommendations for fixes

**Key Sections:**
- Issue 1: Movement Glitch - Complete system breakdown
- Issue 2: Head Movement Glitch - Mechanics explanation
- Issue 3: Sitting Glitch - How glitching occurs
- Issue 4: Swat/Gesture Glitch - Animation conflict analysis
- Technical Architecture Issues (4 major areas)
- Specific File Locations and Code Snippets
- Recommendations for Fixes (Priority 1-4)

**Read Time:** 20-25 minutes

---

### 3. CODE_REFERENCE_GUIDE.md (13 KB)
**Purpose:** Exact code locations and code snippets showing problems
**Best For:** Finding specific problematic code and understanding what needs to change

**Contents:**
- Quick navigation to each problem area
- Exact line numbers for each issue
- Code snippets showing the problems
- What's missing (with pseudo-code examples)
- Summary table of file locations
- File statistics
- Architecture change visualization

**Key Sections:**
- Issue 1: Sliding Movement - 3 problematic code blocks
- Issue 2: Head Leaning - 2 problematic code blocks
- Issue 3: Sitting Glitch - 3 problematic code blocks
- Issue 4: Swat/Gesture - 4 problematic code blocks
- Summary Table (Issue → File → Lines → Problem → Fix Type)
- File Statistics
- Architecture Change Required

**Read Time:** 15-20 minutes

---

## Issue Summary at a Glance

| Issue | Root Cause | Missing System | Files Involved | Priority |
|-------|-----------|-----------------|-----------------|----------|
| Movement Glitch | No walking cycle, no IK | Walking system, foot lock, leg IK | physics-support-leg.js, main.js, avatar.js | 2 |
| Head Lean | No rotation calculation | Head rotation calc, neck IK | avatar.js, (main.js) | 1 |
| Sitting Glitch | No sit detection | Sit detection, knee animation, state transition | avatar-animator.js, main.js, avatar.js | 3 |
| Swat Glitch | Animation conflicts | Gesture detection, animation blending | avatar-animator.js, main.js | 4 |

---

## Files Analyzed

### Core Avatar Files
- **src/avatar.js** (909 lines)
  - Avatar structure and joint system
  - Pose mapping function: `updateAvatarFromPose()`
  - Body part rendering
  - Issues: 1, 2, 3

- **src/avatar-animator.js** (72 lines)
  - Animation functions: `animateJump()`, `animateKick()`, `animateWave()`
  - Issues: 3, 4

### Physics Files
- **src/physics-support-leg.js** (19 lines)
  - Support leg detection
  - Issues: 1

- **src/physics-stabilizer.js** (22 lines)
  - Physics constraints
  - Issues: 1 (indirectly)

### Main Files
- **main.js** (~850 lines)
  - Render loop
  - Pose data handling
  - Animation calls
  - Issues: 1, 2, 3, 4

- **src/tracking.js** (Large)
  - Pose data source (MediaPipe)
  - Issues: 1, 3

---

## Problem Distribution

### By Issue
- **Issue 1 (Movement):** 3 files, ~70 lines of problem code
- **Issue 2 (Head):** 2 files, ~100 lines of problem code
- **Issue 3 (Sitting):** 3 files, 0 lines (feature doesn't exist)
- **Issue 4 (Swat):** 2 files, ~40 lines of problem code

### By File
- **avatar.js:** 4 issues, needs major refactoring
- **main.js:** 4 issues, needs restructuring
- **avatar-animator.js:** 2 issues, needs complete rewrite
- **physics-support-leg.js:** 1 issue, needs enhancement
- **tracking.js:** 2 issues, needs pose analysis layer

---

## Key Findings

### Architecture Problem
The project uses **direct pose mapping** without:
- Inverse Kinematics (IK) solvers
- Animation state machine
- Gesture detection system
- Animation blending
- Pose analysis layer

This causes all 4 glitches.

### Missing Core Systems
1. **IK System** - Affects: Movement (Issue 1), Head (Issue 2), Sitting (Issue 3)
2. **State Machine** - Affects: Movement (Issue 1), Sitting (Issue 3), Gestures (Issue 4)
3. **Gesture Detection** - Affects: Swat (Issue 4)
4. **Animation Blending** - Affects: Swat (Issue 4)
5. **Pose Analysis** - Affects: Movement (Issue 1), Sitting (Issue 3)

### Code Quality Issues
- No animation state tracking
- No velocity/motion tracking
- Hard-coded animation values
- Animation functions modify same objects that pose update just set
- No constraint solvers
- No rotation support for joints

---

## Recommended Reading Order

### For Quick Understanding (15 minutes)
1. **INVESTIGATION_SUMMARY.md** - Get overview of all 4 issues

### For Implementation (45 minutes)
1. **INVESTIGATION_SUMMARY.md** - Understand the problems
2. **CODE_REFERENCE_GUIDE.md** - Find exact code locations
3. **ANIMATION_GLITCHES_ANALYSIS.md** - Deep dive into specific issues you're fixing

### For Comprehensive Knowledge (60 minutes)
1. **INVESTIGATION_SUMMARY.md** - Overview
2. **ANIMATION_GLITCHES_ANALYSIS.md** - Full technical analysis
3. **CODE_REFERENCE_GUIDE.md** - Code reference
4. **This file** - Index and navigation

---

## How to Use This Documentation

### For Bug Fixes
1. Read relevant "Issue" section in INVESTIGATION_SUMMARY.md
2. Look up specific code in CODE_REFERENCE_GUIDE.md
3. Reference detailed analysis in ANIMATION_GLITCHES_ANALYSIS.md
4. Implement fix based on recommendations

### For Architecture Redesign
1. Read "Architecture Issues" in INVESTIGATION_SUMMARY.md
2. Review "Technical Architecture Issues" in ANIMATION_GLITCHES_ANALYSIS.md
3. Check "Needed Flow" section in CODE_REFERENCE_GUIDE.md
4. Plan new system based on recommendations

### For Understanding One Specific Issue
1. Find issue in INVESTIGATION_SUMMARY.md
2. Get exact code locations from CODE_REFERENCE_GUIDE.md
3. Read detailed analysis in ANIMATION_GLITCHES_ANALYSIS.md for that issue

---

## Quick Reference: What Each File Controls

| Component | File | Control |
|-----------|------|---------|
| Avatar joints and geometry | avatar.js | Joint positions, body part rendering |
| Avatar animations | avatar-animator.js | Wave, jump, kick animations |
| Support leg detection | physics-support-leg.js | Which leg is supporting |
| Physics constraints | physics-stabilizer.js | Velocity/position clamping |
| Main render loop | main.js | Pose updates, animation calls, physics |
| Pose data source | tracking.js | MediaPipe landmark streaming |

---

## Critical Code Locations by Issue

### Issue 1: Movement Glitch
- `physics-support-leg.js` lines 2-18: Too simple support leg detection
- `main.js` lines 560-580: No walking cycle in position update
- `avatar.js` lines 770-825: No foot IK

### Issue 2: Head Lean
- `avatar.js` lines 703-740: No head rotation constraints
- `avatar.js` lines 465-500: No rotation calculation in pose mapping

### Issue 3: Sitting Glitch
- `avatar-animator.js` lines 1-72: No sitting animation (missing entirely)
- `main.js` lines 520-580: No sit detection
- `avatar.js` lines 743-768: No knee bending

### Issue 4: Swat Glitch
- `avatar-animator.js` lines 32-73: Hard-coded wave animation
- `main.js` lines 650-653: Animation called after pose update (conflicting)

---

## Next Steps

1. **Review** the documentation files to understand the issues
2. **Choose** which issue to fix first (Priority 1 recommended)
3. **Reference** CODE_REFERENCE_GUIDE.md for exact code locations
4. **Read** ANIMATION_GLITCHES_ANALYSIS.md for detailed solutions
5. **Implement** fixes based on recommendations
6. **Test** changes thoroughly

---

## Document Statistics

```
Total Documentation: 3 files
Total Content: ~43 KB
Total Analysis Time: ~60 minutes comprehensive

ANIMATION_GLITCHES_ANALYSIS.md: 18 KB (detailed analysis)
CODE_REFERENCE_GUIDE.md: 13 KB (code locations)
INVESTIGATION_SUMMARY.md: 12 KB (overview)
```

---

## Questions? Refer to...

**What is the root cause of issue X?**
→ INVESTIGATION_SUMMARY.md (Issue Breakdown sections)

**Where is the problematic code for issue X?**
→ CODE_REFERENCE_GUIDE.md (Look for issue heading)

**What's the detailed explanation of issue X?**
→ ANIMATION_GLITCHES_ANALYSIS.md (Issue X sections)

**How should I fix issue X?**
→ ANIMATION_GLITCHES_ANALYSIS.md (Recommendations section)

**What architecture changes are needed?**
→ INVESTIGATION_SUMMARY.md (Architecture Issues section)

**What files do I need to modify?**
→ CODE_REFERENCE_GUIDE.md (Summary Table)

---

**Investigation Completed By:** Claude Code Analysis Agent
**Date:** June 5, 2026
**Project:** hand-grab-cube
**Status:** Root causes identified for all 4 issues

