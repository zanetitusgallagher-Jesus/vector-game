import AirHandsCore
import CoreMedia
import Foundation
import QuartzCore

/// One processed frame, handed to the main thread.
struct PipelineOutput {
    /// Smoothed landmarks (what gestures and the overlay use).
    var frame: HandFrame
    /// Raw Vision landmarks (debug overlay can show both).
    var raw: HandFrame
    /// Host-clock time the camera captured the frame (seconds, CACurrentMediaTime base).
    var captureTime: Double
    var visionMs: Double
    var captureFPS: Double
}

/// Camera → Vision → One Euro smoothing → (recorder) → main thread.
///
/// Everything except `onOutput` runs on the camera's serial output queue, so the tracker
/// and smoother need no locks. Owned by `AppModel`; not main-actor isolated on purpose.
final class TrackingPipeline {
    let camera = CameraCapture()
    let recorder = LandmarkRecorder()
    private let tracker = HandTracker()
    private let smoother = HandSmoother()
    private var fps = FPSMeter()

    /// Called on the main queue for each processed frame.
    var onOutput: ((PipelineOutput) -> Void)?

    /// Only one frame may be waiting for the main thread; if the UI falls behind we drop
    /// frames instead of building up latency.
    private let pendingLock = NSLock()
    private var mainThreadBusy = false

    init() {
        camera.onFrame = { [weak self] buffer in self?.handle(buffer) }
    }

    var smoothing: SmoothingParameters {
        get { camera.outputQueue.sync { smoother.parameters } }
        set { camera.outputQueue.async { self.smoother.parameters = newValue } }
    }

    func start(completion: @escaping (Result<CameraInfo, Error>) -> Void) {
        camera.outputQueue.async { self.smoother.reset() }
        camera.start(completion: completion)
    }

    func stop() {
        camera.stop()
        camera.outputQueue.async { self.smoother.reset() }
    }

    private func handle(_ buffer: CMSampleBuffer) {
        guard let pixels = CMSampleBufferGetImageBuffer(buffer) else { return }
        // AVCapture presentation timestamps are on the host clock, the same clock as
        // CACurrentMediaTime(), so "now - captureTime" is the real pipeline latency.
        let captureTime = CMSampleBufferGetPresentationTimeStamp(buffer).seconds
        fps.tick(captureTime)

        let t0 = CACurrentMediaTime()
        guard let raw = tracker.process(pixels, timestamp: captureTime) else { return }
        let visionMs = (CACurrentMediaTime() - t0) * 1000

        let smoothed = smoother.smooth(raw)
        recorder.append(raw)   // record raw so replays can re-tune smoothing too

        let output = PipelineOutput(frame: smoothed, raw: raw, captureTime: captureTime, visionMs: visionMs, captureFPS: fps.fps)

        pendingLock.lock()
        let busy = mainThreadBusy
        if !busy { mainThreadBusy = true }
        pendingLock.unlock()
        guard !busy else { return }

        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.pendingLock.lock(); self.mainThreadBusy = false; self.pendingLock.unlock()
            self.onOutput?(output)
        }
    }
}
