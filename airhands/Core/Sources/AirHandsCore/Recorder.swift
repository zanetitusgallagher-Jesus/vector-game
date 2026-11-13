import Foundation

/// A recorded landmark stream. This JSON format is what unit tests replay, and what the user
/// records from the menu ("Record landmarks…") when a gesture needs tuning.
public struct LandmarkRecording: Codable, Hashable, Sendable {
    public static let currentVersion = 1

    public var version: Int
    /// What was performed, e.g. "pinch-click x5". Free text.
    public var label: String
    public var createdAt: Date
    /// Frames with timestamps rebased so the first frame is t = 0.
    public var frames: [HandFrame]

    public init(label: String, createdAt: Date = Date(), frames: [HandFrame]) {
        self.version = Self.currentVersion
        self.label = label; self.createdAt = createdAt; self.frames = frames
    }

    public var duration: Double { frames.last.map(\.timestamp) ?? 0 }

    public func jsonData(pretty: Bool = false) throws -> Data {
        let enc = JSONEncoder()
        enc.dateEncodingStrategy = .iso8601
        enc.outputFormatting = pretty ? [.sortedKeys, .prettyPrinted] : [.sortedKeys]
        return try enc.encode(self)
    }

    public static func decode(_ data: Data) throws -> LandmarkRecording {
        let dec = JSONDecoder()
        dec.dateDecodingStrategy = .iso8601
        let rec = try dec.decode(LandmarkRecording.self, from: data)
        guard rec.version <= currentVersion else {
            throw RecordingError.unsupportedVersion(rec.version)
        }
        return rec
    }

    public static func load(from url: URL) throws -> LandmarkRecording {
        try decode(Data(contentsOf: url))
    }

    public func save(to url: URL) throws {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try jsonData().write(to: url, options: .atomic)
    }
}

public enum RecordingError: Error, Equatable {
    case unsupportedVersion(Int)
}

/// Thread-safe recorder: `append` may be called from the camera queue while the UI starts/stops.
public final class LandmarkRecorder: @unchecked Sendable {
    private let lock = NSLock()
    private var frames: [HandFrame] = []
    private var startTime: Double?
    private var label = ""
    private var recording = false

    public init() {}

    public var isRecording: Bool { lock.lock(); defer { lock.unlock() }; return recording }
    public var frameCount: Int { lock.lock(); defer { lock.unlock() }; return frames.count }

    public func start(label: String) {
        lock.lock(); defer { lock.unlock() }
        frames.removeAll(keepingCapacity: true)
        startTime = nil
        self.label = label
        recording = true
    }

    public func append(_ frame: HandFrame) {
        lock.lock(); defer { lock.unlock() }
        guard recording else { return }
        let t0 = startTime ?? frame.timestamp
        startTime = t0
        var f = frame
        f.timestamp = frame.timestamp - t0
        frames.append(f)
    }

    /// Stops and returns what was recorded (nil if not recording).
    @discardableResult
    public func stop() -> LandmarkRecording? {
        lock.lock(); defer { lock.unlock() }
        guard recording else { return nil }
        recording = false
        return LandmarkRecording(label: label, frames: frames)
    }
}

/// Feeds a recording back into any frame consumer (smoother, gesture engine), optionally
/// offset to a new start time.
public struct LandmarkReplayer: Sendable {
    public let recording: LandmarkRecording

    public init(_ recording: LandmarkRecording) { self.recording = recording }

    public func frames(startingAt t0: Double = 0) -> [HandFrame] {
        recording.frames.map { var f = $0; f.timestamp += t0; return f }
    }

    public func replay(startingAt t0: Double = 0, into consumer: (HandFrame) -> Void) {
        for f in frames(startingAt: t0) { consumer(f) }
    }
}
