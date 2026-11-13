import AirHandsCore
import AppKit
import AVFoundation
import Combine
import QuartzCore

struct PermissionsSnapshot: Equatable {
    var camera: PermissionState = .notDetermined
    var accessibility: PermissionState = .denied
    var inputMonitoring: PermissionState = .denied
    var microphone: PermissionState = .notDetermined

    static func current() -> PermissionsSnapshot {
        PermissionsSnapshot(camera: PermissionStatus.camera, accessibility: PermissionStatus.accessibility,
                            inputMonitoring: PermissionStatus.inputMonitoring, microphone: PermissionStatus.microphone)
    }
}

/// App state + wiring. Main actor; per-frame work happens in `TrackingPipeline` on the camera
/// queue, and only UI updates come back here.
@MainActor
final class AppModel: ObservableObject {
    let store = SettingsStore()

    @Published private(set) var status: TrackingStatus = .off
    @Published private(set) var cameraInfo: CameraInfo?
    @Published private(set) var isRecording = false
    @Published private(set) var lastRecordingURL: URL?
    @Published private(set) var paused = false
    @Published private(set) var permissions = PermissionsSnapshot.current()
    @Published private(set) var launchAtLogin = LaunchAtLogin.isEnabled

    @Published var isEnabled = false {
        didSet { guard isEnabled != oldValue else { return }; isEnabled ? start() : stop() }
    }

    private let pipeline = TrackingPipeline()
    private let overlay = OverlayController()
    private let keyboard = KeyboardMonitor()
    private let hotkey = HotKey()
    private let snap = SnapListener()
    private let windows = WindowPresenter()
    private var calibration: CalibrationModel?

    private var latency = RollingStats(capacity: 120)
    private var cursorLatency = RollingStats(capacity: 120)
    private var vision = RollingStats(capacity: 120)
    private var renderFPS = FPSMeter()
    private var timers: [Timer] = []
    private var screenObserver: NSObjectProtocol?
    private var onBattery = Power.isOnBattery

    var settings: AppSettings { store.value }

    init() {
        pipeline.onOutput = { [weak self] out in MainActor.assumeIsolated { self?.handle(out) } }
        pipeline.onPausedChanged = { [weak self] p in MainActor.assumeIsolated { self?.pausedChanged(p) } }
        store.onChange = { [weak self] new, old in MainActor.assumeIsolated { self?.settingsChanged(new, old) } }

        pipeline.apply(settings)
        overlay.debugEnabled = settings.debugOverlay
        updateDisplays()
        screenObserver = NotificationCenter.default.addObserver(forName: NSApplication.didChangeScreenParametersNotification,
                                                                object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.updateDisplays() }
        }

        hotkey.onPress = { [weak self] in MainActor.assumeIsolated { self?.toggle() } }
        hotkey.register(settings.toggleHotkey)
        let pipeline = self.pipeline
        keyboard.onKeyDown = { pipeline.keyDown() }
        // Called on the audio thread: must not be main-actor isolated.
        snap.onTransient = { @Sendable t in pipeline.audioTransient(at: t) }

        timers.append(Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.refreshPermissions() }
        })
        timers.append(Timer.scheduledTimer(withTimeInterval: 20, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.refreshPower() }
        })

        if !settings.onboardingCompleted {
            DispatchQueue.main.async { [weak self] in
                MainActor.assumeIsolated { self?.openOnboarding() }
            }
        }
    }

    func toggle() { isEnabled.toggle() }

    /// Only publish real changes: frames arrive at 30-60 Hz and every publish re-renders
    /// the menu bar icon.
    private func setStatus(_ new: TrackingStatus) {
        if status != new { status = new }
    }

    // MARK: - Start / stop

    private func start() {
        switch PermissionStatus.camera {
        case .granted:
            startCamera()
        case .notDetermined:
            setStatus(.starting)
            CameraCapture.requestAccess { [weak self] granted in
                guard let self else { return }
                self.refreshPermissions()
                if granted { self.startCamera() } else { self.cameraDenied() }
            }
        case .denied:
            cameraDenied()
        }
    }

    private func startCamera() {
        guard isEnabled else { return }
        setStatus(.starting)
        refreshPower()
        pipeline.start { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let info):
                guard self.isEnabled else { self.pipeline.stop(); return }   // turned off meanwhile
                self.cameraInfo = info
                self.setStatus(self.paused ? .paused : .on)
                self.overlay.show()
                self.keyboard.start()
                self.updateSnapListener()
                if PermissionStatus.accessibility != .granted { PermissionStatus.requestAccessibility() }
            case .failure(let error):
                self.isEnabled = false   // runs stop(), which sets .off…
                self.setStatus(.error(error.localizedDescription))   // …so the error goes after
            }
        }
    }

    private func stop() {
        if isRecording { stopRecording() }
        pipeline.stop()
        overlay.hide()
        keyboard.stop()
        snap.stop()
        setStatus(.off)
        latency = RollingStats(capacity: 120)
        cursorLatency = RollingStats(capacity: 120)
        vision = RollingStats(capacity: 120)
    }

    private func cameraDenied() {
        isEnabled = false
        setStatus(.error("camera access denied"))
        let alert = NSAlert()
        alert.messageText = "AirHands needs the camera"
        alert.informativeText = "Allow AirHands in System Settings → Privacy & Security → Camera. Video is processed on this Mac only and never stored or sent anywhere."
        alert.addButton(withTitle: "Open System Settings")
        alert.addButton(withTitle: "Cancel")
        NSApp.activate(ignoringOtherApps: true)
        if alert.runModal() == .alertFirstButtonReturn { Permissions.open(.camera) }
    }

    func setPaused(_ on: Bool) { pipeline.setPaused(on) }

    private func pausedChanged(_ p: Bool) {
        paused = p
        if isEnabled { setStatus(p ? .paused : .on) }
    }

    // MARK: - Settings / environment

    private func settingsChanged(_ new: AppSettings, _ old: AppSettings) {
        pipeline.apply(new)
        overlay.debugEnabled = new.debugOverlay
        if new.toggleHotkey != old.toggleHotkey { hotkey.register(new.toggleHotkey) }
        if new.isEnabled(.snap) != old.isEnabled(.snap) { updateSnapListener() }
        if new.batterySaver != old.batterySaver { refreshPower() }
    }

    private func updateDisplays() {
        pipeline.setDisplays(overlay.displayRects, visible: overlay.visibleDisplayRects)
    }

    private func refreshPermissions() {
        let now = PermissionsSnapshot.current()
        if now.inputMonitoring == .granted && permissions.inputMonitoring != .granted && isEnabled {
            keyboard.restart()   // upgrade from the fallback monitor to the event tap
        }
        if now != permissions { permissions = now }
    }

    private func refreshPower() {
        onBattery = Power.isOnBattery
        pipeline.camera.setMaxFPS(settings.batterySaver && onBattery ? 30 : 60)
    }

    private func updateSnapListener() {
        guard isEnabled, settings.isEnabled(.snap) else { snap.stop(); return }
        switch PermissionStatus.microphone {
        case .granted:
            try? snap.start()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .audio) { [weak self] ok in
                DispatchQueue.main.async {
                    MainActor.assumeIsolated {
                        self?.refreshPermissions()
                        if ok { self?.updateSnapListener() }
                    }
                }
            }
        case .denied:
            break
        }
    }

    func requestCamera() {
        CameraCapture.requestAccess { [weak self] _ in self?.refreshPermissions() }
    }

    func requestMicrophone() {
        AVCaptureDevice.requestAccess(for: .audio) { [weak self] _ in
            DispatchQueue.main.async { MainActor.assumeIsolated { self?.refreshPermissions() } }
        }
    }

    func setLaunchAtLogin(_ on: Bool) {
        do { try LaunchAtLogin.set(on) } catch {
            NSAlert(error: error).runModal()
        }
        launchAtLogin = LaunchAtLogin.isEnabled
    }

    // MARK: - Frames

    private func handle(_ out: PipelineOutput) {
        guard isEnabled else { return }
        let now = CACurrentMediaTime()
        renderFPS.tick(now)
        vision.add(out.visionMs)
        if let c = out.cursorLatencyMs { cursorLatency.add(c) }

        if out.paused { setStatus(.paused) }
        else if out.typingSuspended { setStatus(.pausedTyping) }
        else { setStatus(out.gesture.handCount > 0 ? .tracking : .on) }

        calibration?.feed(out)

        let g = out.gesture
        var state = OverlayState()
        let handVisible = g.handCount > 0 && g.primaryTrackID != nil
        if settings.showReticle, handVisible, !out.typingSuspended, !out.paused, calibration == nil {
            state.reticle = out.cursor
            state.style = Self.style(for: g.mode)
            state.progress = g.progress
            let shown: [EngineMode] = [.dragging, .scrolling, .grabbing, .knob, .zooming]
            state.modeLabel = settings.debugOverlay || shown.contains(g.mode) ? g.mode.label : nil
            state.pulse = g.events.contains { e in
                if case .click = e { return true }
                return e == .rightClick
            }
        }
        if out.typingSuspended { state.pill = "⌨︎  typing — gestures paused" }
        else if out.paused { state.pill = "✋  AirHands paused — hold an open palm still to resume" }
        if settings.debugOverlay {
            state.debug = DebugState(frame: out.frame, raw: out.raw, activeZone: settings.activeZone,
                                     keyboardZoneHeight: settings.gesture.keyboardZoneHeight, lines: debugLines(out))
        }
        overlay.render(state)

        // Measured after the layers are updated; Core Animation commits at the end of this
        // run-loop turn and the display adds up to one refresh on top.
        let ms = (CACurrentMediaTime() - out.captureTime) * 1000
        if ms > 0 && ms < 2000 { latency.add(ms) }
    }

    private static func style(for mode: EngineMode) -> ReticleStyle {
        switch mode {
        case .pointing: .pointing
        case .pinching: .pinch
        case .dragging: .drag
        case .scrolling: .scroll
        case .grabbing: .grab
        case .knob: .knob
        case .zooming: .zoom
        case .paused, .suspended: .paused
        case .idle, .noHand: .clutch
        }
    }

    private func debugLines(_ out: PipelineOutput) -> [String] {
        let cam = cameraInfo.map { "\($0.width)x\($0.height)@\(Int($0.maxFPS))" } ?? "-"
        let battery = onBattery && settings.batterySaver ? " (battery)" : ""
        var lines = [
            String(format: "cam %@  fps %.0f→%.0f  ui %.0f  cpu %.0f%%", cam, out.captureFPS, out.processedFPS, renderFPS.fps, out.cpuPercent) + battery,
            String(format: "latency cursor %.0f ms (p95 %.0f)  overlay %.0f ms  vision %.1f ms",
                   cursorLatency.mean, cursorLatency.percentile(95), latency.mean, vision.mean),
            "mode \(out.gesture.mode.rawValue)  progress \(String(format: "%.2f", out.gesture.progress))"
                + (out.typingSuspended ? "  TYPING" : "") + (out.paused ? "  PAUSED" : ""),
        ]
        for h in out.frame.hands.prefix(2) {
            let f = HandFeatures(h, aspectRatio: out.frame.aspectRatio)
            let tag = h.chirality == .unknown ? "?" : (h.chirality == .left ? "L" : "R")
            let ext = f.extension_.map { String(format: "%.1f", $0) }.joined(separator: " ")
            lines.append(String(format: "%@#%ld pinch %.2f mid %.2f gap %.2f ext[%@]", tag, h.trackID ?? 0,
                                f.pinchIndex, f.pinchMiddle, f.indexMiddleGap, ext))
        }
        if isRecording { lines.append("● REC \(pipeline.recorder.frameCount) frames") }
        return lines
    }

    // MARK: - Windows

    func openSettings() {
        windows.show("settings", title: "AirHands Settings", size: CGSize(width: 680, height: 600)) {
            SettingsView(store: store, model: self)
        }
    }

    func openOnboarding() {
        windows.show("onboarding", title: "Welcome to AirHands", size: CGSize(width: 640, height: 560)) {
            OnboardingView(model: self) { [weak self] in
                guard let self else { return }
                self.store.value.onboardingCompleted = true
                self.windows.close("onboarding")
                self.isEnabled = true
            }
        }
    }

    func openCalibration() {
        if !isEnabled { isEnabled = true }
        let model = CalibrationModel()
        calibration = model
        pipeline.setCalibrating(true)
        let session = pipeline.captureSession
        windows.show("calibration", title: "Calibrate AirHands", size: CGSize(width: 600, height: 660), onClose: { [weak self] in
            self?.calibration = nil
            self?.pipeline.setCalibrating(false)
        }) {
            CalibrationView(calib: model, captureSession: session, onSave: { [weak self] zone in
                self?.store.value.activeZone = zone
                self?.windows.close("calibration")
            }, onCancel: { [weak self] in
                self?.windows.close("calibration")
            })
        }
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
            setStatus(.error("could not save recording: \(error.localizedDescription)"))
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
