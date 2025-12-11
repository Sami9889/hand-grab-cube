# Hand Grab Cube — Web Physics Demo (Sami9889/hand-grab-cube)

A browser demo where you can pinch (thumb + index) to grab, move, and throw 3D cubes using your webcam. This repo expands the base demo with additional features and controls.

Features
- Pinch-to-grab (thumb tip + index tip) using MediaPipe Hands
- Physics-based cubes with momentum and realistic collisions (cannon-es)
- Throwing: release applies estimated hand velocity to the object
- Spawn multiple cubes (press N or double-pinch)
- Toggle gravity (G), reset all cubes (R)
- Visual overlay of hand landmarks and pinch indicator
- Improved depth mapping using landmark z and on-screen hand size
- Sound feedback on collisions and haptic vibration on supported devices
- No build step — serve from localhost or HTTPS

How to run
1. Serve the folder over HTTPS or from localhost. Example with Python 3:
   - `python -m http.server 8000`
   - Open `http://localhost:8000` and allow camera access.
2. Put a single hand in view. Pinch (thumb + index) to pick up the cube. Move to move. Release to throw.
3. Press N to spawn a new cube at the camera center. Press G to toggle gravity. Press R to reset cubes to start.

Controls
- Pinch (thumb + index) to grab and move objects.
- Double-pinch quickly to spawn a new cube at your hand.
- N: spawn a cube.
- G: toggle gravity on/off for all objects.
- R: reset all cubes to their starting positions.

Notes
- Use a single hand and good lighting for best tracking.
- Works best in Chrome/Chromium on desktop. Mobile may work but performance varies.

License
MIT
