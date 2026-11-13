# Kinetic Clash

A 2-player full-body superhero battle in one self-contained `index.html`. It uses Three.js 0.160 and MediaPipe Tasks Vision 0.10.14 (PoseLandmarker), both loaded from jsDelivr. Everything else is procedural.

Open it from any static server (camera access needs `https://` or `localhost`). Then pick **Play with camera** or one of the keyboard modes.

- **Camera:** two players stand side by side, P1 on the left. If only one person is detected, you fight a CPU hero. Calibrate for 3 seconds standing tall with your arms at your sides.
- **Body controls:**
  - Jog in place to run and lean to steer.
  - Twist your shoulders to look around.
  - Jump.
  - Squat and release to super jump.
  - A fast arm thrust is a punch.
  - Cross your forearms in front of your face to block.
  - Clap overhead for your ULTIMATE.
  - Run into a wall to run up it.
- **Heroes:**
  - Halcyon (Telekinetic)
  - Flicker (Speedster)
  - Bulwark (Titan)
  - Squall (Storm)
  - Wick (Thread Runner)

  Each hero's gestures are listed on its select card.
- **Keyboard:**
  - P1: WASD, Space jump, C crouch, V block, F punch, Q/E/R powers, T ultimate.
  - P2: arrows, Enter jump, Right Shift crouch, K block, L punch, I/O/P powers, U ultimate.
- **Debug:** D shows the gesture debug label in camera mode. In keyboard mode use F3 or the backquote key (`).
- **Exit:** Esc returns to the title.
- **First to 5 KOs wins**, followed by a replay of the final KO.
