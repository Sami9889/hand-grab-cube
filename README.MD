# etcGrab Cube — VR Full-Body Tracking Base (Sami9889/etcgrab-cube)

etcGrab Cube is a VR-ready full-body tracking and retargeting base. It uses MediaPipe Pose/Hands/FaceMesh for landmark detection, three.js for rendering, and provides utilities for multi-camera fusion, WebXR controllers, and haptics.

Key Capabilities
- Full-body pose tracking with MediaPipe Pose (world landmarks when available)
- Hand pinch detection and gesture events
- Multi-camera capture and simple fusion of world landmarks for more accurate 3D placement
- WebXR controller support and haptics helper
- Modular `src/` structure for HUD, calibration, multiview processing, and retargeting
- Minimal dev tooling with `vite` for local development

How to run (development)
1. Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

2. Open the shown dev server URL in Chrome/Chromium, allow camera access, and use the UI to select one or more cameras.
2. Put a single hand in view. Pinch (thumb + index) to pick up the cube. Move to move. Release to throw.
3. Press N to spawn a new cube at the camera center. Press G to toggle gravity. Press R to reset cubes to start.

Controls
- Pinch (thumb + index) to grab and move objects.
- Double-pinch quickly to spawn a new cube at your hand.
- N: spawn a cube.
- G: toggle gravity on/off for all objects.
- R: reset all cubes to their starting positions.

New UI controls (added):
- On-screen buttons: Spawn, Gravity toggle, Reset, Pause/Resume.
- Color picker: change cube color live.
- Speed slider: adjust how tightly objects follow your hand while grabbed.

Gesture events
- The app now emits DOM `hand-gesture` events for external integration. Listen on `window`:

```js
window.addEventListener('hand-gesture', (e) => {
   // e.detail = { type: 'pinchstart'|'pinchend'|'doublepinch'|'handpresent'|'handlost', timestamp, data }
   console.log(e.detail.type, e.detail.data);
});

// Convenience API
window.HandGrabEmitter.on((e)=>console.log(e.detail));
```

Events include a small `data` payload with world coordinates and velocity (for `pinchend`).

Tracking modes
- The UI now supports multiple tracking modes: `Hands`, `Pose (body)`, and `Face`.
- Use the `Tracking` selector in the UI to switch modes at runtime. The overlay will show landmarks for the selected mode when `Overlay` is enabled.
- Events emitted include `pose` and `face` event types when those processors detect landmarks.

VR & Snapshot
- The demo includes a WebXR `Enter VR` button (if your browser and device support WebXR). Use `Enter VR` to view the scene in VR and interact with cubes in headset modes.
- Use the `Snapshot` button to capture the current 3D view as a PNG download.

Camera fallback
- If you don't want to use your camera or it's unavailable, enable `Use Test Video` to feed a looping sample video to the trackers.

Notes
- For multi-camera fusion, start cameras with overlapping views. True multi-view reconstruction benefits from calibration or known camera poses; this project includes scaffolding for calibration.
- Works best in Chrome/Chromium on desktop. WebXR support varies by platform and browser.

Performance tips
- If the demo runs slowly, enable the **Low Perf** toggle in the UI — that lowers MediaPipe model complexity, throttles frame processing, reduces physics solver iterations and renderer pixel ratio.
- Reduce the `Max` objects value to limit how many cubes exist simultaneously.

License
MIT
