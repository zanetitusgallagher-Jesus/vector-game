import AVFoundation
import CoreMedia

struct CameraInfo: Equatable {
    var deviceName: String
    var width: Int
    var height: Int
    var maxFPS: Double
}

enum CameraError: LocalizedError {
    case notAuthorized
    case noCamera
    case cannotAddInput
    case cannotAddOutput

    var errorDescription: String? {
        switch self {
        case .notAuthorized: "AirHands does not have camera access."
        case .noCamera: "No camera found."
        case .cannotAddInput: "Could not open the camera."
        case .cannotAddOutput: "Could not read frames from the camera."
        }
    }
}

/// Owns the AVCaptureSession. Frames arrive on `outputQueue` (a serial, high-priority
/// background queue) via `onFrame`. `stop()` tears the session down completely so the green
/// camera light goes off.
final class CameraCapture: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
    let outputQueue = DispatchQueue(label: "airhands.camera.frames", qos: .userInteractive)
    private let sessionQueue = DispatchQueue(label: "airhands.camera.session")
    private var session: AVCaptureSession?
    private var device: AVCaptureDevice?

    /// Called on `outputQueue` for every frame. Late frames are dropped by AVFoundation,
    /// never queued, so slow processing lowers fps instead of adding latency.
    var onFrame: ((CMSampleBuffer) -> Void)?

    /// Upper bound on capture fps (battery saver lowers this in milestone 6).
    var maxFPS: Double = 60

    static var authorizationStatus: AVAuthorizationStatus { AVCaptureDevice.authorizationStatus(for: .video) }

    static func requestAccess(_ completion: @escaping (Bool) -> Void) {
        AVCaptureDevice.requestAccess(for: .video) { ok in DispatchQueue.main.async { completion(ok) } }
    }

    func start(completion: @escaping (Result<CameraInfo, Error>) -> Void) {
        sessionQueue.async { [weak self] in
            guard let self else { return }
            let result = Result { try self.configureAndStart() }
            DispatchQueue.main.async { completion(result) }
        }
    }

    func stop() {
        sessionQueue.async { [weak self] in
            guard let self, let session = self.session else { return }
            session.stopRunning()
            session.beginConfiguration()
            session.inputs.forEach(session.removeInput)
            session.outputs.forEach(session.removeOutput)
            session.commitConfiguration()
            self.session = nil
            self.device = nil
        }
    }

    // MARK: - Configuration

    private func configureAndStart() throws -> CameraInfo {
        guard Self.authorizationStatus == .authorized else { throw CameraError.notAuthorized }
        if let session, session.isRunning, let device {
            return info(for: device)
        }
        guard let device = Self.pickCamera() else { throw CameraError.noCamera }

        let session = AVCaptureSession()
        session.beginConfiguration()

        let input = try AVCaptureDeviceInput(device: device)
        guard session.canAddInput(input) else { throw CameraError.cannotAddInput }
        session.addInput(input)

        let output = AVCaptureVideoDataOutput()
        output.alwaysDiscardsLateVideoFrames = true
        // Bi-planar YUV is the camera's native format and what Vision consumes without a copy.
        output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarFullRange]
        output.setSampleBufferDelegate(self, queue: outputQueue)
        guard session.canAddOutput(output) else { throw CameraError.cannotAddOutput }
        session.addOutput(output)

        // We mirror in software (HandTracker) so the buffer orientation is always known.
        if let connection = output.connection(with: .video), connection.isVideoMirroringSupported {
            connection.automaticallyAdjustsVideoMirroring = false
            connection.isVideoMirrored = false
        }

        // Must come after addInput: adding an input can reset the active format.
        try configureFormat(device)
        session.commitConfiguration()
        session.startRunning()

        self.session = session
        self.device = device
        return info(for: device)
    }

    private func info(for device: AVCaptureDevice) -> CameraInfo {
        let dims = CMVideoFormatDescriptionGetDimensions(device.activeFormat.formatDescription)
        let fps = device.activeVideoMinFrameDuration.seconds > 0 ? 1 / device.activeVideoMinFrameDuration.seconds : 0
        return CameraInfo(deviceName: device.localizedName, width: Int(dims.width), height: Int(dims.height), maxFPS: fps)
    }

    /// Built-in FaceTime camera first; any other camera as a fallback.
    static func pickCamera() -> AVCaptureDevice? {
        let builtIn = AVCaptureDevice.DiscoverySession(deviceTypes: [.builtInWideAngleCamera], mediaType: .video, position: .unspecified).devices
        if let cam = builtIn.first { return cam }
        return AVCaptureDevice.default(for: .video)
    }

    /// Picks 640x480 or 1280x720 with the highest frame rate; on a tie, the smaller one
    /// (Vision downsamples internally, so extra pixels only cost CPU).
    private func configureFormat(_ device: AVCaptureDevice) throws {
        struct Candidate { let format: AVCaptureDevice.Format; let area: Int32; let fps: Double }
        let wanted: Set<[Int32]> = [[640, 480], [1280, 720]]
        let candidates: [Candidate] = device.formats.compactMap { f in
            let d = CMVideoFormatDescriptionGetDimensions(f.formatDescription)
            guard wanted.contains([d.width, d.height]) else { return nil }
            let fps = f.videoSupportedFrameRateRanges.map(\.maxFrameRate).max() ?? 0
            return Candidate(format: f, area: d.width * d.height, fps: min(fps, maxFPS))
        }
        guard let best = candidates.max(by: { a, b in
            a.fps != b.fps ? a.fps < b.fps : a.area > b.area
        }) else { return } // keep the default format

        try device.lockForConfiguration()
        defer { device.unlockForConfiguration() }
        device.activeFormat = best.format
        if best.fps > 0 {
            // Cap the rate with the min frame duration only; leaving the max duration free
            // lets the camera slow down in low light to get a usable exposure.
            device.activeVideoMinFrameDuration = CMTime(value: 1, timescale: CMTimeScale(best.fps.rounded()))
        }
    }

    // MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        onFrame?(sampleBuffer)
    }
}
