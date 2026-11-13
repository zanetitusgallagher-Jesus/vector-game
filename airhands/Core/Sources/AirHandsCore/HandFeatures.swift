import Foundation

/// Everything the gesture engine needs from one hand, measured once per frame.
/// Distances are in hand sizes; `*Iso` points are in isotropic units (1 = image height);
/// `*Camera` points are normalized camera coordinates (for cursor mapping).
public struct HandFeatures: Sendable {
    public let trackID: Int
    public let chirality: Chirality
    public let handSize: Double
    /// Extension ratio per finger (`HandGeometry.extensionRatio`), indexed by `Finger.rawValue`.
    public let extension_: [Double]
    public let pinchIndex: Double
    public let pinchMiddle: Double
    /// Gap between index and middle fingertips.
    public let indexMiddleGap: Double
    /// Gap between index and little fingertips (how fanned out the hand is).
    public let fanWidth: Double
    public let palmIso: Vec2
    public let palmCamera: Vec2
    /// Hand roll: angle of wrist → middle MCP, radians (0 = fingers up).
    public let orientation: Double
    /// Unit vector thumb MP → thumb tip (image space, y down).
    public let thumbDirection: Vec2
    /// Thumb tip is above every other joint.
    public let thumbIsTopmost: Bool
    public let indexTipCamera: Vec2
    public let pinchPointCamera: Vec2
    public let pinchPointIso: Vec2
    public let twoFingerPointIso: Vec2
    /// Mean joint confidence.
    public let confidence: Double

    public init(_ hand: HandObservation, aspectRatio: Double) {
        let g = HandGeometry(hand, aspectRatio: aspectRatio)
        trackID = hand.trackID ?? 0
        chirality = hand.chirality
        handSize = g.handSize
        extension_ = Finger.allCases.map { g.extensionRatio($0) }
        pinchIndex = g.pinchDistance(.index)
        pinchMiddle = g.pinchDistance(.middle)
        indexMiddleGap = g.distance(.indexTip, .middleTip)
        fanWidth = g.distance(.indexTip, .littleTip)
        let palmC = g.palmCenter
        palmCamera = palmC
        palmIso = Vec2(palmC.x * aspectRatio, palmC.y)
        let up = g.point(.middleMCP) - g.point(.wrist)
        orientation = atan2(up.x, -up.y)
        let td = g.point(.thumbTip) - g.point(.thumbMP)
        thumbDirection = td.length > 1e-9 ? td / td.length : Vec2(0, -1)
        let thumbY = hand[.thumbTip].position.y
        thumbIsTopmost = HandJoint.allCases.allSatisfy { j in
            j == .thumbTip || j == .thumbIP || hand[j].confidence == 0 || hand[j].position.y >= thumbY
        }
        indexTipCamera = hand[.indexTip].position
        pinchPointCamera = hand[.thumbTip].position.lerp(to: hand[.indexTip].position, 0.5)
        pinchPointIso = g.point(.thumbTip).lerp(to: g.point(.indexTip), 0.5)
        twoFingerPointIso = g.point(.indexTip).lerp(to: g.point(.middleTip), 0.5)
        confidence = hand.meanJointConfidence
    }

    public func ext(_ f: Finger) -> Double { extension_[f.rawValue] }
}

/// The static hand shapes the engine reasons about.
public enum Pose: String, Codable, Sendable {
    case none       // ambiguous / relaxed
    case point      // index out, middle/ring/little curled
    case two        // index + middle out, ring/little curled
    case open       // four fingers out
    case fist       // four fingers curled
    case thumbsUp   // fist, thumb straight up
}

/// Per-finger extended / curled state with hysteresis, per tracked hand.
public struct FingerStates: Sendable {
    private var extended: [HysteresisGate]
    private var curled: [HysteresisGate]
    private var thumbOut = HysteresisGate(enter: 1.32, exit: 1.22, activeBelow: false)

    public init() {
        extended = (0..<5).map { _ in HysteresisGate(enter: 1.55, exit: 1.42, activeBelow: false) }
        curled = (0..<5).map { _ in HysteresisGate(enter: 1.2, exit: 1.32, activeBelow: true) }
    }

    public private(set) var isExtended = [Bool](repeating: false, count: 5)
    public private(set) var isCurled = [Bool](repeating: false, count: 5)
    public private(set) var thumbExtended = false

    public mutating func update(_ f: HandFeatures) {
        for finger in [Finger.index, .middle, .ring, .little] {
            let i = finger.rawValue
            isExtended[i] = extended[i].update(f.ext(finger))
            isCurled[i] = curled[i].update(f.ext(finger))
        }
        thumbExtended = thumbOut.update(f.ext(.thumb))
        isExtended[0] = thumbExtended
    }

    public func pose(_ f: HandFeatures) -> Pose {
        let E = isExtended, C = isCurled
        let fourCurled = C[1] && C[2] && C[3] && C[4]
        if fourCurled {
            let up = f.thumbDirection.y < -0.75 && abs(f.thumbDirection.x) < 0.66
            return thumbExtended && up && f.thumbIsTopmost ? .thumbsUp : .fist
        }
        if E[1] && E[2] && E[3] && E[4] { return .open }
        if E[1] && E[2] && C[3] && C[4] { return .two }
        if E[1] && C[2] && C[3] && C[4] { return .point }
        return .none
    }
}
