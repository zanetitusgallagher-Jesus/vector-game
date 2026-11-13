# AirHands — hands-free gesture control for macOS

Menu bar app (macOS 14+, Apple Silicon) that turns the built-in webcam into a pointer:
the index finger moves the cursor, pinches click, and hand poses trigger system actions.
Everything runs on-device; camera frames are never stored or sent anywhere (the Recorder
saves landmark coordinates only).

> This folder lives inside the `vector-game` repo but is a standalone project: nothing here
> is part of the GitHub Pages site.

## Build / run / test

Prerequisites: Xcode 15.3+ (Swift 5.10+), `brew install xcodegen`.

```bash
cp Config/Local.xcconfig.example Config/Local.xcconfig   # then set DEVELOPMENT_TEAM
./scripts/run.sh --screenshot   # generate project, build, relaunch, screenshot → build/screenshots/
./scripts/test.sh               # AirHandsCore unit tests (swift test; also runs on Linux)
./scripts/test.sh --xcode       # same tests through the Xcode scheme
./scripts/build.sh --adhoc      # build without a team (permissions reset every rebuild)
./scripts/logs.sh               # stream the app's logs
```

- Never hand-edit `AirHands.xcodeproj` (git-ignored); change `project.yml` and regenerate.
- Signing: Automatic, "Apple Development", team from `Config/Local.xcconfig` (git-ignored).
  A stable identity keeps Camera / Accessibility / Input Monitoring grants across rebuilds.
- Not sandboxed (CGEvent posting + Accessibility API). Hardened runtime on, with the camera
  entitlement. `LSUIElement` = menu bar only.
- CI: `.github/workflows/airhands.yml` (repo root) builds the app ad-hoc and runs the tests
  on a macOS runner for every push touching `airhands/**`.

## Architecture

```
Camera (AVCaptureSession) ─▶ HandTracker (Vision) ─▶ HandSmoother (One Euro) ─┬▶ GestureEngine ─▶ ActionEngine
        App/Pipeline            App/Pipeline            Core                  │      Core (M2)        App (M2)
                                                                              ├▶ Overlay (App/Overlay)
                                                                              └▶ LandmarkRecorder (Core)
```

Two halves:

- **`Core/` — AirHandsCore** (Swift package, Foundation only, no Apple UI/media frameworks).
  Everything that can be unit-tested lives here. Builds and tests on macOS and Linux.
  - `Landmarks.swift` — `HandJoint` (21), `Finger`, `Chirality`, `HandObservation`,
    `HandFrame`, `HandSkeleton.bones`. Coordinates: normalized 0…1, **origin top-left,
    already mirrored** (what the user sees in a mirror). `aspectRatio` = image w/h.
  - `HandGeometry.swift` — scale-invariant measures: hand size (wrist→middle MCP, in
    aspect-corrected units), joint distances in hand sizes, pinch distance, finger
    extension ratio, palm centre. All gesture thresholds use these units.
  - `OneEuroFilter.swift` — scalar + 2D One Euro filter, `SmoothingParameters`
    (minCutoff 1.2 Hz, beta 8, dCutoff 1 Hz — note beta is large because units are
    normalized, not pixels).
  - `HandSmoother.swift` — filters all 21 joints per hand, assigns stable `trackID`s
    (nearest wrist, chirality preferred), drops tracks unseen for 0.3 s.
  - `ScreenMapper.swift` — active zone (camera rect) → desktop in Quartz global coords
    (top-left origin, y down = CGEvent space), clamped onto real displays.
  - `Recorder.swift` — `LandmarkRecording` JSON (versioned), thread-safe `LandmarkRecorder`,
    `LandmarkReplayer`.
  - `SyntheticHand.swift` — generates landmark poses (open palm, point, fist, peace, pinch
    amount, rotation, scale, chirality) + `SeededNoise` jitter, for tests and fixtures.
  - `Stats.swift` — `RollingStats` (mean / percentile), `FPSMeter`.
  - `airhands-synth` executable — writes synthetic recordings:
    `cd Core && swift run airhands-synth point_sweep out.json`.
- **`App/` — macOS app target** (AVFoundation, Vision, AppKit, SwiftUI).
  - `Pipeline/CameraCapture.swift` — front camera, picks 640x480/1280x720 with the highest
    fps (ties → smaller), YUV 420f, late frames discarded. `stop()` removes inputs/outputs
    so the camera light turns off.
  - `Pipeline/HandTracker.swift` — one reused `VNDetectHumanHandPoseRequest` (max 2 hands)
    + `VNSequenceRequestHandler`. Converts Vision (bottom-left origin) → Core (top-left,
    mirrored X). Joints < 0.2 confidence → confidence 0. Hands without wrist + middle MCP
    are dropped.
  - `Pipeline/TrackingPipeline.swift` — runs tracker + smoother + recorder on the camera
    queue; at most one frame in flight to the main thread (drops rather than queues).
  - `Overlay/` — one transparent click-through `NSPanel` per display (`.screenSaver` level,
    all Spaces, full-screen auxiliary). Core Animation layers, no per-frame SwiftUI.
    Reticle at the mapped index tip; debug HUD (bottom-right of the menu-bar display) with
    camera-space skeleton (cyan = right, magenta = left, dot size = confidence, small grey
    dots = raw unsmoothed points), active zone (dashed), keyboard zone (orange), stats.
  - `AppModel.swift` — main-actor state, start/stop, permission prompt, latency stats,
    recording to `~/Library/Application Support/AirHands/Recordings/`.
  - `AirHandsApp.swift` — `MenuBarExtra` menu. `MenuBar/StatusIcon.swift` — icon per state.

Threading: camera queue does all per-frame work; main thread only draws. `AppModel` and
`OverlayController` are `@MainActor`; `TrackingPipeline` is deliberately not.

Latency shown in the HUD = `CACurrentMediaTime()` after the overlay layers update minus the
camera frame's presentation timestamp (both host clock). It excludes sensor exposure and
display scan-out (~1 refresh).

## Gesture map (defaults) and status

| Gesture | Action | Status |
|---|---|---|
| POINT (index out, others curled), move | move cursor | M2 (reticle preview only in M1) |
| Open / relaxed hand | clutch (cursor freezes) | M2 |
| Thumb+index pinch tap | left click | M2 |
| Thumb+index double pinch | double click | M2 |
| Thumb+index pinch-hold + move | drag | M2 |
| Thumb+middle pinch | right click | M3 |
| Index+middle extended, move | scroll (momentum) | M3 |
| Pinch + rotate (knob) | volume | M4 |
| Open palm swipe ←/→ | switch Space (Ctrl+←/→) | M4 |
| Open palm swipe ↑ / ↓ | Mission Control / Show Desktop | M4 |
| Fist grab, move, release / throw | move window / other display or snap half | M4 |
| Thumbs up 0.5 s | play/pause | M4 |
| Peace sign 0.5 s | screenshot (Cmd+Shift+4) | M4 |
| Palm to camera, still 1 s | pause/resume AirHands | M4 |
| Both hands pinch, spread/close | zoom (Cmd+= / Cmd+-) | M5 |
| Both palms push forward | App Exposé | M5 |
| Finger snap (pose + mic transient) | hide all apps (toggle) | M6 stretch |

Typing auto-pause (M3): any keydown suspends pointer + gestures; resume after 700 ms with no
keys **and** a hand raised in the active zone. Hands in the bottom keyboard zone (default
20 % of the frame) are ignored.

Design rules for GestureEngine (M2+): pure state machine over `HandFrame`s, no OS deps;
every threshold in hand-size units with hysteresis (e.g. pinch enter 0.25 / exit 0.38) and
minimum hold times; prefer a missed gesture over a false trigger. Tune thresholds from user
recordings (menu → Record Landmarks…), not guesses.

## Milestones

1. ✅ code complete: camera + hand skeleton debug overlay, smoothing, recorder, menu toggle.
   Needs on-device verification (see below).
2. Finger cursor with smoothing, clutch, pinch click and drag.
3. Scroll, right click, typing auto-pause, menu bar toggle polish, global hotkey.
4. System gestures: Spaces, Mission Control, Show Desktop, window grab/throw, volume.
5. Two-hand gestures, Settings window, remapping, calibration, onboarding.
6. Polish: reticle animations, latency/CPU tuning, battery saver, Control Center tile, snap.

## Manual test checklist (milestone 1)

- Menu bar shows a grey crossed-out hand. Click → toggle **AirHands** on → camera prompt on
  first run → green camera light on.
- Debug HUD bottom-right: skeleton follows your hand; moving your hand right moves it right
  (mirrored). Left hand magenta, right cyan. Two hands at once both draw.
- Cyan reticle follows the index fingertip across the screen(s), including over full-screen
  apps and other Spaces; clicks pass straight through the overlay.
- HUD stats: fps ≈ camera max, latency < 60 ms, vision ms.
- Menu icon turns cyan while a hand is tracked.
- Record Landmarks… → perform → Stop Recording → Show Recordings opens a JSON file.
- Toggle off → overlay disappears and the green camera light goes off within ~1 s.

## Conventions

- Keep Core free of Apple UI/media frameworks; if it needs a type (point/rect), define it.
- New gesture logic ⇒ unit tests from synthetic sequences (`SyntheticHand`) and, once
  available, real recordings checked into `Core/Tests/AirHandsCoreTests/Fixtures/`.
- Update this file when architecture, commands or the gesture map change.
