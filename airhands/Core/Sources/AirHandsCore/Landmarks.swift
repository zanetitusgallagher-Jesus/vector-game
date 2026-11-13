import Foundation

/// The 21 hand joints, in the same order as MediaPipe / Vision's `.all` group.
public enum HandJoint: Int, CaseIterable, Codable, Sendable {
    case wrist = 0
    case thumbCMC, thumbMP, thumbIP, thumbTip
    case indexMCP, indexPIP, indexDIP, indexTip
    case middleMCP, middlePIP, middleDIP, middleTip
    case ringMCP, ringPIP, ringDIP, ringTip
    case littleMCP, littlePIP, littleDIP, littleTip

    public static let count = 21
}

public enum Finger: Int, CaseIterable, Codable, Sendable {
    case thumb, index, middle, ring, little

    /// Joints from base to tip (thumb: CMC, MP, IP, Tip; others: MCP, PIP, DIP, Tip).
    public var joints: [HandJoint] {
        let base = 1 + rawValue * 4
        return (0..<4).map { HandJoint(rawValue: base + $0)! }
    }
    public var base: HandJoint { joints[0] }
    public var tip: HandJoint { joints[3] }
}

public enum Chirality: String, Codable, Sendable {
    case left, right, unknown
}

public enum HandSkeleton {
    /// Bones to draw, as (from, to) joint pairs.
    public static let bones: [(HandJoint, HandJoint)] = {
        var b: [(HandJoint, HandJoint)] = []
        for finger in Finger.allCases {
            let j = finger.joints
            b.append((.wrist, j[0]))
            b.append((j[0], j[1])); b.append((j[1], j[2])); b.append((j[2], j[3]))
        }
        // Knuckle line across the palm.
        b.append((.indexMCP, .middleMCP)); b.append((.middleMCP, .ringMCP)); b.append((.ringMCP, .littleMCP))
        return b
    }()
}

/// One joint. `position` is normalized camera space: 0...1, origin top-left, already
/// mirrored so it matches what the user sees in a mirror. `confidence` 0 = not detected.
public struct Landmark: Hashable, Sendable {
    public var position: Vec2
    public var confidence: Double

    public init(_ position: Vec2, confidence: Double = 1) {
        self.position = position; self.confidence = confidence
    }
}

extension Landmark: Codable {
    // Compact on disk: [x, y, confidence] rounded to 5 decimals (sub-pixel at 4K).
    public init(from decoder: Decoder) throws {
        var c = try decoder.unkeyedContainer()
        let x = try c.decode(Double.self), y = try c.decode(Double.self)
        let conf = try c.decodeIfPresent(Double.self) ?? 1
        self.init(Vec2(x, y), confidence: conf)
    }
    public func encode(to encoder: Encoder) throws {
        var c = encoder.unkeyedContainer()
        func r(_ v: Double) -> Double { (v * 100_000).rounded() / 100_000 }
        try c.encode(r(position.x)); try c.encode(r(position.y)); try c.encode(r(confidence))
    }
}

public struct HandObservation: Codable, Hashable, Sendable {
    public var chirality: Chirality
    /// Overall observation confidence from the detector.
    public var confidence: Double
    /// Exactly 21 landmarks, indexed by `HandJoint.rawValue`.
    public var landmarks: [Landmark]
    /// Stable identity across frames, assigned by `HandSmoother`. nil for raw detections.
    public var trackID: Int?

    public init(chirality: Chirality, confidence: Double, landmarks: [Landmark], trackID: Int? = nil) {
        precondition(landmarks.count == HandJoint.count, "a hand has 21 landmarks")
        self.chirality = chirality; self.confidence = confidence
        self.landmarks = landmarks; self.trackID = trackID
    }

    public subscript(_ joint: HandJoint) -> Landmark {
        get { landmarks[joint.rawValue] }
        set { landmarks[joint.rawValue] = newValue }
    }

    /// Mean confidence of the joints that were detected at all.
    public var meanJointConfidence: Double {
        let c = landmarks.map(\.confidence)
        return c.reduce(0, +) / Double(c.count)
    }
}

/// Everything the tracker saw in one camera frame.
public struct HandFrame: Codable, Hashable, Sendable {
    /// Seconds. Live: host-clock presentation time of the camera frame. Recordings: rebased to 0.
    public var timestamp: Double
    /// Camera image width / height, so geometry can undo the non-square normalization.
    public var aspectRatio: Double
    public var hands: [HandObservation]

    public init(timestamp: Double, aspectRatio: Double, hands: [HandObservation]) {
        self.timestamp = timestamp; self.aspectRatio = aspectRatio; self.hands = hands
    }
}
