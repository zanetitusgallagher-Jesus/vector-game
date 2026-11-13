# AirHands — hands-free gesture control for macOS

Menu bar app (macOS 14+, Apple Silicon and Intel) that turns the built-in webcam into a pointer:
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
- CI: `.github/workflows/airhands.yml` (repo root) runs the tests, builds a universal
  ad-hoc-signed `AirHands.zip` (artifact) on every push touching `airhands/**`. Releases:
  run the workflow manually with `release_tag` (e.g. `airhands-v0.6.0`) — this session cannot
  push tags. Users install from the release (no Xcode).

## Architecture

```
Camera ─▶ HandTracker ─▶ HandSmoother ─▶ GestureEngine ─▶ PointerController ─▶ ActionEngine ─▶ CGEvent / AX
(AVFoundation) (Vision)   (One Euro)      (pure FSM)        (cursor math)        (OS actions)
                                   └──▶ LandmarkRecorder          └──▶ main thread: Overlay, menu, windows
```

All per-frame work (tracking → gestures → cursor events) runs on the camera's serial output
queue in `TrackingPipeline`, so the cursor never waits for the main thread. The main thread
only draws the overlay and UI (and may skip frames; clicks and cursor moves never do).

### `Core/` — AirHandsCore (pure Swift, Foundation only; `swift test` on macOS and Linux)

| File | What |
|---|---|
| `Landmarks.swift` | `HandJoint` (21), `Finger`, `Chirality`, `HandObservation`, `HandFrame`. Normalized coords, **top-left origin, mirrored**. |
| `Geometry.swift` | `Vec2`, `Rect` (no CoreGraphics). |
| `HandGeometry.swift` | Aspect-corrected, hand-size-normalized measures. |
| `HandFeatures.swift` | Per-frame features (extension ratios, pinch distances, fan width, orientation, thumb direction) + `FingerStates` (hysteresis per finger) → `Pose` (point / two / open / fist / thumbsUp / none). |
| `Hysteresis.swift` | `HysteresisGate` (enter/exit), `HoldTimer` (fires once per hold). |
| `GestureEngine.swift` | The state machine. `process(HandFrame, suspended:) → GestureOutput` (events, pointer input, mode, progress). Handles paused mode, keyboard zone, lost-hand grace, two-hand arbitration, snap/right-click arbitration. |
| `GestureConfig.swift` | `GestureKind` (all gestures) + every threshold / hold time. |
| `PointerController.swift` | Pointer input → desktop cursor (absolute with glide / relative with acceleration, precision gain, lock, re-anchoring on source change). Also `TypingGate`, `ScrollMomentum`. |
| `WindowPlanner.swift` | Throw target (other display / snap half / maximise), `CalibrationSession` (4 corners), `TransientDetector` (snap). |
| `Settings.swift` | `AppSettings` (Codable, forward-compatible merge decode), `ActionKind`, `KeyCombo`, `GestureBinding` + default map. |
| `OneEuroFilter.swift`, `HandSmoother.swift`, `ScreenMapper.swift`, `Recorder.swift`, `Stats.swift`, `SyntheticHand.swift` | as named. |

`airhands-synth`: `swift run airhands-synth probe` prints features for each synthetic pose
(use it when changing thresholds); `swift run airhands-synth point_sweep out.json` writes fixtures.

### `App/` — macOS target

- `Pipeline/CameraCapture.swift` — 640x480/720p at max fps, YUV, late frames dropped, `setMaxFPS` (battery saver), full teardown on stop (camera light off).
- `Pipeline/HandTracker.swift` — reused `VNDetectHumanHandPoseRequest` (2 hands) + `VNSequenceRequestHandler`.
- `Pipeline/TrackingPipeline.swift` — the per-frame loop; idle throttling (every other frame after 1.5 s without hands); latency + CPU measurement.
- `Pipeline/ActionEngine.swift` — gesture events → actions: clicks (with click state for double click), drag (mouse down/dragged/up), pixel scroll + 120 Hz momentum, media keys (volume, play/pause), Mission Control binary (`1` = Show Desktop, `2` = App Exposé), ⌃←/→ Spaces, ⌘⇧4, ⌘= / ⌘-, hide all apps, custom shortcuts, window grab/throw.
- `System/InputSynth.swift` — CGEvent posting; every event tagged with `InputSynth.marker` so the keyboard monitor ignores our own shortcuts.
- `System/WindowMover.swift` — AX window under point (skips our overlay; CGWindowList fallback), get/set frame.
- `System/SystemServices.swift` — permissions, `KeyboardMonitor` (listen-only CGEventTap, NSEvent fallback), Carbon `HotKey`, `Power` (IOKit), `LaunchAtLogin` (SMAppService), `SnapListener` (AVAudioEngine), `CPUMeter`.
- `Overlay/` — per-display click-through panels; reticle (colour per mode, shrink as pinch closes, progress ring, click pulse), mode label, status pill (typing / paused), debug HUD.
- `UI/` — `SettingsStore` (UserDefaults JSON), `WindowPresenter`, `SettingsView` (General, Pointer, Gestures remap, Tuning, Permissions), `CalibrationView` (+ live mirrored camera preview), `OnboardingView`.
- `AppModel.swift` — wiring, status, permissions polling, battery polling, windows, recorder. `AirHandsApp.swift` — menu.

Permissions: Camera (tracking), Accessibility (post events, move windows), Input Monitoring
(typing auto-pause; NSEvent fallback works with Accessibility only), Microphone (snap only).

## Gesture map (defaults; discrete ones remappable in Settings → Gestures)

| Gesture | Action | Notes |
|---|---|---|
| POINT (index out, others curled) | move cursor | precision gain as pinch closes; cursor locked while pinch is down |
| Open / relaxed hand | clutch | cursor stops |
| Thumb+index pinch tap | left click | ≥50 ms; clicks on release; second tap within 0.4 s = double click |
| Pinch hold (0.55 s) or pinch + move (0.15 hand) | drag | mouse down/dragged/up |
| Thumb+middle pinch | right click | deferred 150 ms when snap is on |
| Index+middle together, move | scroll | momentum on release |
| Pinch + rotate (18° to start, 12° per step) | volume up/down | clockwise = up |
| Open palm swipe ←/→ | Space left/right (⌃←/⌃→) | 1.3 hand sizes in 0.35 s; confirmed 80 ms later; 0.8 s cooldown |
| Open palm swipe ↑ / ↓ | Mission Control / Show Desktop | hand must be tracked ≥ 0.5 s (raising a hand is not a swipe) |
| Fist 0.25 s, move, release | move window; fast release throws (other display, else snap half, up = maximise) | |
| Thumbs up 0.5 s | play/pause | |
| Peace sign (V, spread) 0.5 s | screenshot ⌘⇧4 | fingers together = scroll instead |
| Fanned palm held still 1 s | pause / resume AirHands | only gesture recognised while paused |
| Both hands pinch, spread / close | zoom ⌘= / ⌘- | per 15 % distance change; zoom pinches never click |
| Both open palms push forward (+25 % size in 0.6 s) | App Exposé | |
| Finger snap (thumb+middle release + mic transient) | hide all apps | off by default; needs microphone |

Typing auto-pause: any key press suspends everything (drags are released); resumes after
0.7 s without keys **and** a hand raised above the keyboard zone (bottom 20 % of the frame,
where hands are ignored anyway).

Toggle: menu bar icon (grey off / white on / cyan tracking / amber typing / grey pause),
global hotkey ⌃⌥Space (remappable), menu "Pause Gestures".

**Control Center tile: not built.** Third-party Control Center controls on macOS require the
macOS 26 SDK (WidgetKit `ControlWidget`) plus a properly signed app extension; CI has Xcode
16.4 / macOS 15 SDK and builds are ad-hoc signed, so the system would not load the extension.
Revisit with Xcode 26 + a Developer ID.

## Milestones

All six are implemented and unit-tested at the GestureEngine level; none has been verified
on a real Mac yet. Thresholds are tuned against synthetic hands only — real recordings
(menu → Record Landmarks…) should replace them as fixtures.

## Manual test checklist

1. First launch: onboarding window; grant Camera, Accessibility, Input Monitoring.
2. Point: cursor follows; open hand: cursor stops; pinch tap clicks; double pinch double-clicks;
   pinch-hold-move selects text / drags a file; cursor does not jump on pinch.
3. Thumb+middle: context menu. Two fingers up/down: scrolls with momentum.
4. Type in any app: pill "typing — gestures paused"; hand resting low never moves the cursor.
5. ⌃⌥Space toggles; menu icon colours change.
6. Swipes (Spaces, Mission Control, Show Desktop), pinch-rotate volume, fist-grab a window
   and throw it, thumbs up (music), peace (screenshot crosshair), fanned palm 1 s (pause pill).
7. Two-hand pinch spread in a browser zooms; both palms forward → App Exposé.
8. Settings: remap peace → custom shortcut; calibration wizard; battery saver shows
   "(battery)" in the debug HUD when unplugged; debug HUD latency < 60 ms, CPU < 25 %.
9. Off → camera light goes off.

## Conventions

- Keep Core free of Apple UI/media frameworks; if it needs a type (point/rect), define it.
- New gesture logic ⇒ unit tests from synthetic sequences (`SyntheticHand`) and, once
  available, real recordings checked into `Core/Tests/AirHandsCoreTests/Fixtures/`.
- Update this file when architecture, commands or the gesture map change.
