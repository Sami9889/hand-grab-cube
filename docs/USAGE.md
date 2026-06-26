# Usage

1. Run `npm install` then `npm run dev`.
2. Open the site and use the multi-camera controls to start cameras.
3. Use the HUD and HUD toggle to inspect fused coordinates.
4. Enter VR via the `Enter VR` button if available.
5. Use the `Snapshot` button to capture the current 3D view as a PNG.
6. If your camera is unavailable, enable `Use Test Video` to feed a looping sample video to the trackers.
7. Toggle the hand/avatar outline feature with the manager workflow inputs: `enable_outline` / `disable_outline` (available via the repository Actions → Hand Grab Cube Manager).
8. Enable verbose runtime debugging with `enable_debug` / `disable_debug` (manager workflow) or the in-app `Debug` checkbox — when enabled, extra debug entries appear in the `eventLog` and browser console.
