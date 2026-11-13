import AirHandsCore
import AppKit
import AVFoundation
import Combine
import QuartzCore

/// App state + wiring. Main actor; the heavy lifting happens in `TrackingPipeline` on the
/// camera queue.
@MainActor
final class AppModel: ObservableObject {
    @Published private(set) var status: TrackingStatus = .off
    @Published private(set) var cameraInfo: CameraInfo?
    @Published private(set) var isRecording = false
    @Published private(set) var lastRecordingURL: URL?

    @Published var isEnabled = false {
        didSet { guard isEnabled != oldValue else { return }; isEnabled ? start() : stop() }
    }
    @Published var debugOverlay: Bool = UserDefaults.standard.bool(forKey: "debugOverlay") {
        didSet {
            UserDefaults.standard.set(debugOverlay, forKey: "debugOverlay")
            overlay.debugEnabled = debugOverlay
        }
    }

    /// Fraction of the camera frame at the bottom where hands are ignored (milestone 3 makes
    /// this functional; for now it is drawn in the debug HUD).
    var keyboardZoneHeight = 0.2
    var activeZone = ScreenMapper.defaultActiveZone

    private let pipeline = TrackingPipeline()
    private let overlay = OverlayController()
    private var latency = RollingStats(capacity: 120)
    private var vision = RollingStats(capacity: 120)
    private var renderFPS = FPSMeter()

    init() {
        // Default: debug HUD on for milestone 1 so there is something to look at.
        // (Property observers do not run inside init, so the overlay is set explicitly.)
        if UserDefaults.standard.object(forKey: "debugOverlay") == nil { debugOverlay = true }
        overlay.debugEnabled = debugOverlay
        pipeline.onOutput = { [weak self] out in
            MainActor.assumeIsolated { self?.handle(out) }
        }
    }

    /// Only publish real changes: frames arrive at 30-60 Hz and every publish re-renders
    /// the menu bar label.
    private func setStatus(_ new: TrackingStatus) {
        if status != new { status = new }
    }

    func toggle() { isEnabled.toggle() }

    // MARK: - Start / stop

    private func start() {
        switch CameraCapture.authorizationStatus {
        case .authorized:
            startCamera()
        case .notDetermined:
            status = .starting
            CameraCapture.requestAccess { [weak self] granted in
                guard let self else { return }
                if granted { self.startCamera() } else { self.cameraDenied() }
            }
        default:
            cameraDenied()
        }
    }

    private func startCamera() {
        guard isEnabled else { return }
        status = .starting
        pipeline.start { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let info):
                guard self.isEnabled else { self.pipeline.stop(); return }  // turned off meanwhile
                self.cameraInfo = info
                self.status = .on
                self.overlay.show()
            case .failure(let error):
                self.isEnabled = false   // runs stop(), which sets .off…
                self.status = .error(error.localizedDescription)   // …so the error goes after
            }
        }
    }

    private func stop() {
        if isRecording { stopRecording() }
        pipeline.stop()
        overlay.hide()
        status = .off
        latency = RollingStats(capacity: 120)
        vision = RollingStats(capacity: 120)
    }

    private func cameraDenied() {
        isEnabled = false
        status = .error("camera access denied")
        let alert = NSAlert()
        alert.messageText = "AirHands needs the camera"
        alert.informativeText = "Allow AirHands in System Settings → Privacy & Security → Camera. Video is processed on this Mac only and never stored or sent anywhere."
        alert.addButton(withTitle: "Open System Settings")
        alert.addButton(withTitle: "Cancel")
        NSApp.activate(ignoringOtherApps: true)
        if alert.runModal() == .alertFirstButtonReturn {
            Permissions.open(.camera)
        }
    }

    // MARK: - Frames

    private func handle(_ out: PipelineOutput) {
        guard isEnabled else { return }
        let now = CACurrentMediaTime()
        renderFPS.tick(now)
        vision.add(out.visionMs)

        let primary = Self.primaryHand(out.frame)
        if case .pausedTyping = status {} else {
            setStatus(primary == nil ? .on : .tracking)
        }

        let mapper = ScreenMapper(activeZone: activeZone, displays: overlay.displayRects)
        let reticle = primary.map { hand -> CGPoint in
            let p = mapper.map(hand[.indexTip].confidence > 0 ? hand[.indexTip].position : hand[.wrist].position)
            return CGPoint(x: p.x, y: p.y)
        }

        var debug: DebugState?
        if debugOverlay {
            debug = DebugState(frame: out.frame, raw: out.raw, activeZone: activeZone,
                               keyboardZoneHeight: keyboardZoneHeight, lines: debugLines(out, primary: primary))
        }
        overlay.render(OverlayState(reticle: reticle, modeLabel: debugOverlay ? "milestone 1 · preview only" : nil, debug: debug))

        // Measured after the layers are updated; Core Animation commits at the end of this
        // run-loop turn and the display adds up to one refresh on top.
        // Guard against a camera whose timestamps are not on the host clock.
        let ms = (CACurrentMediaTime() - out.captureTime) * 1000
        if ms > 0 && ms < 2000 { latency.add(ms) }
    }

    /// The hand that drives the cursor: right hand if present (dominant-hand setting comes in
    /// milestone 5), otherwise the most confident one.
    static func primaryHand(_ frame: HandFrame) -> HandObservation? {
        frame.hands.first(where: { $0.chirality == .right }) ?? frame.hands.max(by: { $0.confidence < $1.confidence })
    }

    private func debugLines(_ out: PipelineOutput, primary: HandObservation?) -> [String] {
        let cam = cameraInfo.map { "\($0.width)x\($0.height) @\(Int($0.maxFPS))" } ?? "-"
        var lines = [
            String(format: "camera %@  fps %.1f  ui %.1f", cam, out.captureFPS, renderFPS.fps),
            String(format: "latency %.0f ms (p95 %.0f)  vision %.1f ms", latency.mean, latency.percentile(95), vision.mean),
        ]
        if out.frame.hands.isEmpty {
            lines.append("no hands")
        }
        for h in out.frame.hands {
            let g = HandGeometry(h, aspectRatio: out.frame.aspectRatio)
            let tag = h.chirality == .unknown ? "?" : (h.chirality == .left ? "L" : "R")
            lines.append(String(format: "%@#%ld conf %.2f size %.2f pinch %.2f idx %.2f",
                                tag, h.trackID ?? 0, h.confidence, g.handSize, g.pinchDistance(), g.extensionRatio(.index)))
        }
        if isRecording { lines.append("● REC \(pipeline.recorder.frameCount) frames") }
        return lines
    }

    // MARK: - Recorder

    static var recordingsFolder: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return base.appendingPathComponent("AirHands/Recordings", isDirectory: true)
    }

    func startRecording(label: String = "untitled") {
        guard isEnabled else { return }
        pipeline.recorder.start(label: label)
        isRecording = true
    }

    func stopRecording() {
        guard let rec = pipeline.recorder.stop() else { isRecording = false; return }
        isRecording = false
        let stamp = ISO8601DateFormatter().string(from: rec.createdAt).replacingOccurrences(of: ":", with: "-")
        let safeLabel = rec.label.replacingOccurrences(of: "/", with: "-")
        let url = Self.recordingsFolder.appendingPathComponent("\(stamp) \(safeLabel).json")
        do {
            try rec.save(to: url)
            lastRecordingURL = url
        } catch {
            status = .error("could not save recording: \(error.localizedDescription)")
        }
    }

    func revealRecordings() {
        try? FileManager.default.createDirectory(at: Self.recordingsFolder, withIntermediateDirectories: true)
        if let last = lastRecordingURL {
            NSWorkspace.shared.activateFileViewerSelecting([last])
        } else {
            NSWorkspace.shared.open(Self.recordingsFolder)
        }
    }
}
