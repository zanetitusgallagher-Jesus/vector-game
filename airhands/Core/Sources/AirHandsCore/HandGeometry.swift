import Foundation

/// Scale-invariant measurements on one hand.
///
/// Normalized camera coordinates are not square (x spans the width, y the height), so every
/// point is first converted to an isotropic space where 1 unit = image height. All distances
/// are then divided by the hand size (wrist → middle-finger MCP) so thresholds hold at any
/// distance from the camera.
public struct HandGeometry: Sendable {
    public let hand: HandObservation
    public let aspectRatio: Double
    /// Wrist → middle MCP in isotropic units. Never zero.
    public let handSize: Double

    public init(_ hand: HandObservation, aspectRatio: Double) {
        self.hand = hand
        self.aspectRatio = aspectRatio
        let raw = Self.iso(hand[.wrist].position, aspectRatio).distance(to: Self.iso(hand[.middleMCP].position, aspectRatio))
        self.handSize = max(raw, 1e-4)
    }

    static func iso(_ p: Vec2, _ aspect: Double) -> Vec2 { Vec2(p.x * aspect, p.y) }

    /// Joint position in isotropic units (1 = image height).
    public func point(_ j: HandJoint) -> Vec2 { Self.iso(hand[j].position, aspectRatio) }

    /// Distance between two joints, in hand sizes.
    public func distance(_ a: HandJoint, _ b: HandJoint) -> Double {
        point(a).distance(to: point(b)) / handSize
    }

    /// Thumb-tip to finger-tip distance in hand sizes (the pinch metric).
    public func pinchDistance(_ finger: Finger = .index) -> Double {
        distance(.thumbTip, finger.tip)
    }

    /// How far the fingertip reaches from the wrist relative to its knuckle:
    /// ~1.0 or less when curled, ~1.8+ when straight. Thumb uses distance from the
    /// little-finger MCP instead (the thumb folds across the palm).
    public func extensionRatio(_ finger: Finger) -> Double {
        if finger == .thumb {
            return distance(.thumbTip, .littleMCP) / max(distance(.thumbCMC, .littleMCP), 1e-4)
        }
        let tip = point(finger.tip).distance(to: point(.wrist))
        let base = point(finger.base).distance(to: point(.wrist))
        return tip / max(base, 1e-4)
    }

    /// Palm centre: mean of wrist and the four MCPs (stable even when fingers move).
    public var palmCenter: Vec2 {
        let js: [HandJoint] = [.wrist, .indexMCP, .middleMCP, .ringMCP, .littleMCP]
        let sum = js.reduce(Vec2.zero) { $0 + hand[$1].position }
        return sum / Double(js.count)
    }
}
