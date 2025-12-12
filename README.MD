etcGrab Cube is a VR-ready full-body tracking and retargeting base. It uses MediaPipe Pose/Hands/FaceMesh for landmark detection, three.js for rendering, and provides utilities for multi-camera fusion, WebXR controllers, and haptics.

# etcGrab Cube — VR Full-Body Tracking, Ragdoll, and Modular Avatar (Sami9889/etcgrab-cube)

etcGrab Cube is a VR-ready, modular full-body tracking and avatar system. It features MediaPipe Pose/Hands/FaceMesh for landmark detection, three.js for rendering, multi-camera fusion, advanced avatar mesh, ragdoll physics, and a highly extensible codebase.

## Key Features
- Full-body pose tracking with MediaPipe Pose (world landmarks when available)
- Hand and finger tracking, gesture events, and pinch/grab detection
- Multi-camera capture and fusion for robust 3D tracking
- Advanced avatar: detailed mesh, accessories, and expressive movement
- Ragdoll physics: toggleable, with smooth blending between tracking and physics
- WebXR controller support and haptics
- Modular `src/` structure: physics, HUD, calibration, multiview, accessories, animator, outline, and more
- UI toggles for ragdoll, VR, HUD, smoothing, and more
- Robust error handling, camera permission feedback, and stability for fast or single-leg movement


## How to Run (Development)
1. Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

2. Open the shown dev server URL in Chrome/Chromium, allow camera access, and use the UI to select one or more cameras.
3. Use the UI toggles to enable/disable ragdoll, VR, HUD, and more. Move your body and hands to control the avatar. Pinch to grab, wave, or interact.

## Controls & UI
- Pinch (thumb + index) to grab (gesture events emitted)
- Toggle ragdoll mode with the UI button
- Use camera selector for multi-camera fusion
- HUD toggle, smoothing slider, and more in the UI
- Enter VR with the WebXR button (if supported)


## Gesture Events
- The app emits DOM `hand-gesture` events for external integration. Listen on `window`:

```js
window.addEventListener('hand-gesture', (e) => {
   // e.detail = { type: 'pinchstart'|'pinchend'|'doublepinch'|'handpresent'|'handlost', timestamp, data }
   console.log(e.detail.type, e.detail.data);
});

// Convenience API
window.HandGrabEmitter.on((e)=>console.log(e.detail));
```

Events include a small `data` payload with world coordinates and velocity (for `pinchend`).


## Tracking Modes
- Switch between `Hands`, `Pose (body)`, and `Face` using the UI selector. Overlay shows landmarks for the selected mode. Events include `pose` and `face` types.


## VR & Snapshot
- WebXR `Enter VR` button for VR mode (if supported)
- `Snapshot` button to capture the current 3D view as a PNG


## Camera Fallback
- Enable `Use Test Video` to feed a looping sample video to the trackers if your camera is unavailable.


## Notes
- For multi-camera fusion, start cameras with overlapping views. Calibration scaffolding is included.
- Works best in Chrome/Chromium on desktop. WebXR support varies by platform and browser.


## Performance Tips
- Enable **Low Perf** in the UI to lower model complexity and improve speed.


## License
MIT
