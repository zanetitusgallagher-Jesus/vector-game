import Foundation

/// Generates plausible 2D hand landmarks for a pose, so gestures can be unit-tested (and
/// demoed) without a camera. It is a projection model, not anatomy: a finger curling toward
/// the palm is modelled as its segments foreshortening (cos of the bend angle), which is what
/// a camera facing the palm sees.
public struct SyntheticHand: Sendable {
    /// Wrist position in normalized camera coordinates.
    public var wrist: Vec2
    /// Hand size (wrist → middle MCP) as a fraction of image height.
    public var size: Double
    /// Rotation in radians; 0 = fingers pointing straight up in the image.
    public var rotation: Double
    public var chirality: Chirality
    /// Curl per finger, 0 = straight, 1 = fully curled. Indexed by `Finger.rawValue`.
    public var curl: [Double]
    /// 0 = thumb at rest; 1 = thumb tip touching `pinchFinger`'s tip.
    public var pinch: Double
    public var pinchFinger: Finger
    public var confidence: Double

    public init(wrist: Vec2 = Vec2(0.5, 0.7), size: Double = 0.18, rotation: Double = 0,
                chirality: Chirality = .right, curl: [Double] = [0, 0, 0, 0, 0],
                pinch: Double = 0, pinchFinger: Finger = .index, confidence: Double = 0.9) {
        precondition(curl.count == 5)
        self.wrist = wrist; self.size = size; self.rotation = rotation; self.chirality = chirality
        self.curl = curl; self.pinch = pinch; self.pinchFinger = pinchFinger; self.confidence = confidence
    }

    // MARK: Named poses

    public static func openPalm(at wrist: Vec2 = Vec2(0.5, 0.7)) -> SyntheticHand {
        SyntheticHand(wrist: wrist)
    }
    /// Index extended, others curled, thumb tucked: the cursor pose.
    public static func point(at wrist: Vec2 = Vec2(0.5, 0.7)) -> SyntheticHand {
        SyntheticHand(wrist: wrist, curl: [0.7, 0, 1, 1, 1])
    }
    public static func fist(at wrist: Vec2 = Vec2(0.5, 0.7)) -> SyntheticHand {
        SyntheticHand(wrist: wrist, curl: [0.8, 1, 1, 1, 1])
    }
    public static func peace(at wrist: Vec2 = Vec2(0.5, 0.7)) -> SyntheticHand {
        SyntheticHand(wrist: wrist, curl: [0.8, 0, 0, 1, 1])
    }

    // MARK: Model (isotropic units, hand size = 1, fingers toward -y)

    /// MCP offsets from the wrist for a right hand with the palm facing the camera, as seen
    /// in the mirrored image (thumb on the left).
    private static let baseOffsets: [Vec2] = [
        Vec2(-0.32, -0.22),  // thumb CMC
        Vec2(-0.30, -0.95),  // index MCP
        Vec2(0.00, -1.00),   // middle MCP (defines hand size)
        Vec2(0.26, -0.94),   // ring MCP
        Vec2(0.48, -0.80),   // little MCP
    ]
    private static let segmentLengths: [[Double]] = [
        [0.38, 0.30, 0.26],   // thumb CMC→MP→IP→tip
        [0.44, 0.27, 0.21],
        [0.48, 0.30, 0.23],
        [0.44, 0.28, 0.22],
        [0.34, 0.22, 0.19],
    ]
    /// Bend (radians) at each joint when curl = 1.
    private static let maxBend: [[Double]] = [
        [0.5, 0.6, 0.6],
        [1.6, 1.7, 1.2],
        [1.6, 1.7, 1.2],
        [1.6, 1.7, 1.2],
        [1.6, 1.7, 1.2],
    ]
    private static let fingerDirections: [Vec2] = [
        Vec2(-0.75, -0.66),  // thumb splays out to the side and up
        Vec2(-0.12, -1), Vec2(0, -1), Vec2(0.1, -1), Vec2(0.22, -1),
    ]

    private func localPoints() -> [Vec2] {
        var pts = [Vec2](repeating: .zero, count: HandJoint.count)
        pts[HandJoint.wrist.rawValue] = .zero
        for finger in Finger.allCases {
            let f = finger.rawValue
            let dirRaw = Self.fingerDirections[f]
            var dir = dirRaw / dirRaw.length
            if finger == .thumb {
                // A curled thumb swings across the palm toward the little finger.
                dir = dir.lerp(to: Vec2(0.85, -0.5), curl[f] * 0.9)
                dir = dir / dir.length
            }
            var p = Self.baseOffsets[f]
            pts[finger.joints[0].rawValue] = p
            var bend = 0.0
            for s in 0..<3 {
                bend += Self.maxBend[f][s] * curl[f]
                // Foreshortening toward the camera; past 90° the segment folds back.
                p = p + dir * (Self.segmentLengths[f][s] * cos(finger == .thumb ? 0 : bend))
                if finger == .thumb { p = p + dir.rotated(by: .pi / 2) * (Self.segmentLengths[f][s] * sin(bend) * 0.3) }
                pts[finger.joints[s + 1].rawValue] = p
            }
        }
        if pinch > 0 {
            let target = pts[pinchFinger.tip.rawValue]
            let tip = HandJoint.thumbTip.rawValue, ip = HandJoint.thumbIP.rawValue
            let t = min(max(pinch, 0), 1)
            let tipDelta = target - pts[tip]
            pts[tip] = pts[tip] + tipDelta * t
            pts[ip] = pts[ip] + tipDelta * (t * 0.6)
            pts[HandJoint.thumbMP.rawValue] = pts[HandJoint.thumbMP.rawValue] + tipDelta * (t * 0.25)
        }
        return pts
    }

    /// Landmarks in normalized camera space for an image of the given aspect ratio.
    public func observation(aspectRatio: Double = 4.0 / 3.0) -> HandObservation {
        let mirror = chirality == .left ? -1.0 : 1.0
        let wristIso = Vec2(wrist.x * aspectRatio, wrist.y)
        let lms = localPoints().map { local -> Landmark in
            let p = Vec2(local.x * mirror, local.y).rotated(by: rotation) * size + wristIso
            return Landmark(Vec2(p.x / aspectRatio, p.y), confidence: confidence)
        }
        return HandObservation(chirality: chirality, confidence: confidence, landmarks: lms)
    }

    public func frame(at t: Double, aspectRatio: Double = 4.0 / 3.0) -> HandFrame {
        HandFrame(timestamp: t, aspectRatio: aspectRatio, hands: [observation(aspectRatio: aspectRatio)])
    }
}

/// Deterministic noise source for reproducible synthetic sequences (xorshift64*).
public struct SeededNoise: Sendable {
    private var state: UInt64
    public init(seed: UInt64) { state = seed == 0 ? 0x9E3779B97F4A7C15 : seed }

    public mutating func next() -> Double {
        state ^= state >> 12; state ^= state << 25; state ^= state >> 27
        let v = state &* 2685821657736338717
        return Double(v >> 11) / Double(1 << 53)
    }

    /// Approximately Gaussian (sum of uniforms), mean 0, standard deviation `sigma`.
    public mutating func gaussian(_ sigma: Double) -> Double {
        var s = 0.0
        for _ in 0..<6 { s += next() }
        return (s - 3) * sigma * 1.414
    }

    /// Adds per-joint jitter to a frame, mimicking detector noise.
    public mutating func jitter(_ frame: HandFrame, sigma: Double) -> HandFrame {
        var f = frame
        for h in f.hands.indices {
            for j in f.hands[h].landmarks.indices {
                f.hands[h].landmarks[j].position.x += gaussian(sigma) / frame.aspectRatio
                f.hands[h].landmarks[j].position.y += gaussian(sigma)
            }
        }
        return f
    }
}
