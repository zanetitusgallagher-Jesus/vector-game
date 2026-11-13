import Foundation

/// A boolean threshold with separate enter / exit levels so it never flickers around a
/// single value. `activeBelow` = true for "smaller is on" metrics such as pinch distance.
public struct HysteresisGate: Sendable, Equatable {
    public var enter: Double
    public var exit: Double
    public var activeBelow: Bool
    public private(set) var isOn = false

    public init(enter: Double, exit: Double, activeBelow: Bool) {
        precondition(activeBelow ? exit >= enter : exit <= enter, "exit must be looser than enter")
        self.enter = enter; self.exit = exit; self.activeBelow = activeBelow
    }

    @discardableResult
    public mutating func update(_ value: Double) -> Bool {
        if activeBelow {
            isOn = isOn ? value < exit : value < enter
        } else {
            isOn = isOn ? value > exit : value > enter
        }
        return isOn
    }

    public mutating func reset() { isOn = false }
}

/// Fires once when a condition has held continuously for `duration`; re-arms only after the
/// condition goes false.
public struct HoldTimer: Sendable, Equatable {
    public var duration: Double
    private var since: Double?
    private var fired = false

    public init(duration: Double) { self.duration = duration }

    /// Progress 0...1 of the current hold (for UI rings).
    public func progress(at t: Double) -> Double {
        guard let s = since, !fired else { return fired ? 1 : 0 }
        return min(max((t - s) / max(duration, 1e-6), 0), 1)
    }

    /// Returns true exactly once per continuous hold.
    public mutating func update(_ condition: Bool, at t: Double) -> Bool {
        guard condition else { since = nil; fired = false; return false }
        if since == nil { since = t }
        if !fired, t - since! >= duration { fired = true; return true }
        return false
    }

    public var isHolding: Bool { since != nil && !fired }
    public mutating func reset() { since = nil; fired = false }
}
