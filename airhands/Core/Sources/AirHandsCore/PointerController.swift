import Foundation

public enum PointerMode: String, Codable, CaseIterable, Sendable {
    /// Finger position = screen position (with a short glide instead of jumps).
    case absolute
    /// Trackpad-style: finger motion moves the cursor, with acceleration.
    case relative
}

public struct PointerTuning: Codable, Hashable, Sendable {
    public var mode: PointerMode = .absolute
    /// Relative mode: 1 = moving across the active zone moves across the desktop.
    public var speed: Double = 1.0
    /// Relative mode acceleration: extra gain per (zone widths / s) above `accelerationThreshold`.
    public var acceleration: Double = 0.9
    public var accelerationThreshold: Double = 0.4
    /// Absolute mode: fraction of the remaining offset closed per frame when not in precision.
    public var catchUp: Double = 0.18
    /// Ignore `PointerInput.locked` (lets the cursor move while a pinch is forming).
    public var lockOnPinch = true

    public init() {}
}

/// Turns `PointerInput` (a camera-space point + gain) into desktop cursor positions.
///
/// It always works on motion deltas, so switching the source point (fingertip → pinch point
/// → palm) or coming back from the clutch never makes the cursor jump. In absolute mode the
/// cursor then glides toward the absolute target while the hand is not in precision mode.
public final class PointerController {
    public var mapper: ScreenMapper
    public var tuning: PointerTuning

    public private(set) var cursor: Vec2?
    private var lastCamera: Vec2?
    private var lastSource: Int?
    private var lastTime: Double?

    public init(mapper: ScreenMapper, tuning: PointerTuning = PointerTuning()) {
        self.mapper = mapper; self.tuning = tuning
    }

    /// Forget the source (clutch): the next input re-anchors without moving the cursor.
    public func release() { lastCamera = nil; lastSource = nil; lastTime = nil }

    /// - Parameters:
    ///   - systemCursor: where the real cursor is now (the user may have used the trackpad).
    /// - Returns: the new cursor position, or nil if the cursor should not move.
    public func update(_ input: PointerInput?, at t: Double, systemCursor: Vec2) -> Vec2? {
        guard let input else { release(); return nil }
        let anchored = lastSource == input.sourceID && lastCamera != nil
        if !anchored || cursor == nil || lastCamera == nil {
            cursor = mapper.clampToDisplays(systemCursor)
            lastCamera = input.camera; lastSource = input.sourceID; lastTime = t
            return nil
        }
        // If something else moved the cursor (trackpad), continue from there.
        if let c = cursor, c.distance(to: systemCursor) > 40 { cursor = systemCursor }

        let dt = max(t - (lastTime ?? t), 1e-3)
        defer { lastCamera = input.camera; lastTime = t }
        if input.locked && tuning.lockOnPinch { return nil }

        let bounds = mapper.desktopBounds
        let zone = mapper.activeZone
        let dz = Vec2((input.camera.x - lastCamera!.x) / max(zone.width, 1e-6),
                      (input.camera.y - lastCamera!.y) / max(zone.height, 1e-6))
        var next = cursor!

        switch tuning.mode {
        case .absolute:
            next = next + Vec2(dz.x * bounds.width, dz.y * bounds.height) * input.gain
            if input.gain >= 0.99 {
                let target = mapper.map(input.camera)
                next = next + (target - next) * tuning.catchUp
            }
        case .relative:
            let speed = dz.length / dt
            let accel = 1 + tuning.acceleration * max(0, speed - tuning.accelerationThreshold)
            let k = tuning.speed * min(accel, 4) * input.gain
            next = next + Vec2(dz.x * bounds.width, dz.y * bounds.height) * k
        }
        next = mapper.clampToDisplays(next)
        guard next.distance(to: cursor!) > 0.05 else { return nil }
        cursor = next
        return next
    }
}

/// Typing auto-pause: any key press suspends gestures; they resume once no key has been
/// pressed for `resumeDelay` AND a hand has been raised into the active zone.
public struct TypingGate: Sendable {
    public var resumeDelay: Double
    public var enabled = true
    public private(set) var isSuspended = false
    private var lastKey = -Double.infinity

    public init(resumeDelay: Double = 0.7) { self.resumeDelay = resumeDelay }

    public mutating func keyDown(at t: Double) {
        guard enabled else { return }
        lastKey = t
        isSuspended = true
    }

    @discardableResult
    public mutating func update(at t: Double, handRaised: Bool) -> Bool {
        if !enabled { isSuspended = false; return false }
        if isSuspended, t - lastKey >= resumeDelay, handRaised { isSuspended = false }
        return isSuspended
    }
}

/// Scroll momentum after the scroll pose is released: exponential decay.
public struct ScrollMomentum: Sendable {
    /// Per-second decay rate (higher = stops sooner).
    public var friction: Double = 3.5
    public var minSpeed: Double = 20     // px / s
    public private(set) var velocity = Vec2.zero

    public init() {}

    public var isActive: Bool { velocity.length >= minSpeed }

    public mutating func start(_ v: Vec2) { velocity = v.length > 6000 ? v / v.length * 6000 : v }
    public mutating func stop() { velocity = .zero }

    /// Advances by `dt` seconds; returns the scroll delta (px) to apply.
    public mutating func step(_ dt: Double) -> Vec2 {
        guard isActive else { velocity = .zero; return .zero }
        let d = velocity * dt
        velocity = velocity * exp(-friction * dt)
        return d
    }
}
