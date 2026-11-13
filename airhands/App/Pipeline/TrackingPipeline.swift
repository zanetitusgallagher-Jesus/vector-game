import AirHandsCore
import AVFoundation
import CoreMedia
import Foundation
import QuartzCore

/// One processed frame, handed to the main thread for the overlay / UI.
struct PipelineOutput {
    var frame: HandFrame
    var raw: HandFrame
    var gesture: GestureOutput
    /// Cursor position (Quartz global) when AirHands is steering it, else the real cursor.
    var cursor: CGPoint
    var steering: Bool
    var typingSuspended: Bool
    var paused: Bool
    /// Primary hand's index fingertip (normalized camera) while pointing — for calibration.
    var fingertip: Vec2?
    var captureTime: Double
    /// Capture → cursor event posted, milliseconds.
    var cursorLatencyMs: Double?
    var visionMs: Double
    var captureFPS: Double
    var processedFPS: Double
    var cpuPercent: Double
}

/// Camera → Vision → smoothing → gesture engine → cursor + actions.
///
/// Everything runs on the camera's serial output queue, so the cursor moves without waiting
/// for the main thread (lowest latency). Settings from the UI are applied on that queue.
final class TrackingPipeline {
    let camera = CameraCapture()
    let recorder = LandmarkRecorder()
    private let tracker = HandTracker()
    private let smoother = HandSmoother()
    private let engine = GestureEngine()
    private let pointer = PointerController(mapper: ScreenMapper(displays: []))
    private var typing = TypingGate()
    private lazy var actions = ActionEngine(queue: queue)

    var queue: DispatchQueue { camera.outputQueue }

    /// Called on the main queue for each processed frame.
    var onOutput: ((PipelineOutput) -> Void)?
    /// Called on the main queue when the pause state changes (stop gesture, menu, hotkey).
    var onPausedChanged: ((Bool) -> Void)?

    // Queue-confined state.
    private var settings = AppSettings()
    private var displays: [Rect] = []
    private var calibrating = false
    private var captureFPS = FPSMeter()
    private var processedFPS = FPSMeter()
    private var cpu = CPUMeter()
    private var frameIndex = 0
    private var lastHandTime = 0.0
    private var wasSteering = false

    private let pendingLock = NSLock()
    private var mainThreadBusy = false

    init() {
        camera.onFrame = { [weak self] buffer in self?.handle(buffer) }
        actions.onTogglePause = { [weak self] in
            guard let self else { return }
            self.setPausedOnQueue(!self.engine.paused)
        }
    }

    var captureSession: AVCaptureSession? { camera.session }

    // MARK: Control (call from main)

    func start(completion: @escaping (Result<CameraInfo, Error>) -> Void) {
        queue.async { self.smoother.reset(); self.engine.reset() }
        camera.start(completion: completion)
    }

    func stop() {
        camera.stop()
        queue.async {
            self.actions.releaseAll(cursor: InputSynth.cursorLocation)
            self.smoother.reset(); self.engine.reset(); self.pointer.release()
        }
    }

    func apply(_ s: AppSettings) {
        queue.async {
            self.settings = s
            self.smoother.parameters = s.smoothing
            self.engine.config = s.gesture
            self.pointer.tuning = s.pointer
            self.pointer.mapper = ScreenMapper(activeZone: s.activeZone, displays: self.displays)
            self.typing.enabled = s.typingPauseEnabled
            self.typing.resumeDelay = s.typingResumeDelay
            self.actions.settings = s
        }
    }

    func setDisplays(_ frames: [Rect], visible: [Rect]) {
        queue.async {
            self.displays = frames
            self.pointer.mapper = ScreenMapper(activeZone: self.settings.activeZone, displays: frames)
            self.actions.visibleDisplays = visible
        }
    }

    func keyDown() {
        let t = CACurrentMediaTime()
        queue.async { self.typing.keyDown(at: t) }
    }

    func audioTransient(at t: Double) {
        queue.async { self.engine.audioTransient(at: t) }
    }

    func setCalibrating(_ on: Bool) {
        queue.async { self.calibrating = on }
    }

    func setPaused(_ on: Bool) {
        queue.async { self.setPausedOnQueue(on) }
    }

    private func setPausedOnQueue(_ on: Bool) {
        guard engine.paused != on else { return }
        engine.paused = on
        if on { actions.releaseAll(cursor: InputSynth.cursorLocation); pointer.release() }
        DispatchQueue.main.async { self.onPausedChanged?(on) }
    }

    // MARK: Frames

    private func handle(_ buffer: CMSampleBuffer) {
        guard let pixels = CMSampleBufferGetImageBuffer(buffer) else { return }
        // AVCapture timestamps are on the host clock, like CACurrentMediaTime().
        let captureTime = CMSampleBufferGetPresentationTimeStamp(buffer).seconds
        captureFPS.tick(captureTime)
        frameIndex += 1

        // Nobody in view for a while: look every other frame only (saves CPU).
        let idle = captureTime - lastHandTime > 1.5
        if idle && frameIndex % 2 == 1 { return }

        let t0 = CACurrentMediaTime()
        guard let raw = tracker.process(pixels, timestamp: captureTime) else { return }
        let visionMs = (CACurrentMediaTime() - t0) * 1000
        processedFPS.tick(captureTime)
        cpu.sample()
        if !raw.hands.isEmpty { lastHandTime = captureTime }

        let smoothed = smoother.smooth(raw)
        recorder.append(raw)   // raw, so replays can re-tune smoothing too

        let handRaised = smoothed.hands.contains { h in
            let palm = HandGeometry(h, aspectRatio: smoothed.aspectRatio).palmCenter
            return palm.y <= 1 - settings.gesture.keyboardZoneHeight
        }
        let suspended = typing.update(at: captureTime, handRaised: handRaised)

        let g = engine.process(smoothed, suspended: suspended && !calibrating)
        var cursor = InputSynth.cursorLocation
        var latency: Double?
        var steering = false
        var fingertip: Vec2?

        if calibrating {
            // Calibration only watches the fingertip; no cursor, no clicks.
            if g.mode == .pointing { fingertip = g.pointer?.camera }
            pointer.release()
        } else {
            if suspended || g.mode == .suspended { actions.releaseAll(cursor: cursor) }
            let sys = Vec2(Double(cursor.x), Double(cursor.y))
            if let p = pointer.update(g.pointer, at: captureTime, systemCursor: sys) {
                cursor = CGPoint(x: p.x, y: p.y)
                actions.moveCursor(to: cursor)
                latency = (CACurrentMediaTime() - captureTime) * 1000
            }
            steering = g.pointer != nil
            for e in g.events { actions.handle(e, cursor: cursor) }
            if wasSteering && !steering { pointer.release() }
            wasSteering = steering
        }

        let output = PipelineOutput(frame: smoothed, raw: raw, gesture: g, cursor: cursor, steering: steering,
                                    typingSuspended: suspended, paused: engine.paused, fingertip: fingertip,
                                    captureTime: captureTime, cursorLatencyMs: latency, visionMs: visionMs,
                                    captureFPS: captureFPS.fps, processedFPS: processedFPS.fps, cpuPercent: cpu.percent)

        pendingLock.lock()
        let busy = mainThreadBusy
        if !busy { mainThreadBusy = true }
        pendingLock.unlock()
        // The UI may skip frames; clicks and cursor moves above never do.
        guard !busy else { return }
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.pendingLock.lock(); self.mainThreadBusy = false; self.pendingLock.unlock()
            self.onOutput?(output)
        }
    }
}
