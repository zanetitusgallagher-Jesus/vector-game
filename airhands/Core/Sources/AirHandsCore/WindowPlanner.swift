import Foundation

/// Where a thrown window should land. Rects are in Quartz global coordinates; `displays`
/// are the usable (visible, menu-bar-free) frames.
public enum WindowPlanner {
    public enum Outcome: Equatable, Sendable {
        case stay                   // not a throw: leave it where it was dropped
        case moveTo(Rect)
    }

    /// - Parameter velocity: hand velocity at release in hand sizes / s (x right, y down).
    public static func throwTarget(window: Rect, velocity: Vec2, displays: [Rect], minSpeed: Double) -> Outcome {
        guard velocity.length >= minSpeed, !displays.isEmpty else { return .stay }
        let current = displayIndex(containing: window, in: displays)
        let here = displays[current]
        let dir = velocity / velocity.length

        if displays.count > 1 {
            // The other display that lies most in the throw direction.
            var best: (i: Int, score: Double)?
            for (i, d) in displays.enumerated() where i != current {
                let v = d.center - here.center
                guard v.length > 1 else { continue }
                let score = (v / v.length).x * dir.x + (v / v.length).y * dir.y
                if score > 0.3, best == nil || score > best!.score { best = (i, score) }
            }
            if let b = best { return .moveTo(fit(window, from: here, into: displays[b.i])) }
        }
        // Single display (or nothing in that direction): snap to a half, or maximise when
        // thrown upward.
        if abs(dir.x) >= abs(dir.y) {
            let half = here.width / 2
            return .moveTo(Rect(x: dir.x < 0 ? here.x : here.x + half, y: here.y, width: half, height: here.height))
        }
        if dir.y < 0 { return .moveTo(here) }
        return .stay
    }

    /// Display with the largest overlap with the window (or the nearest one).
    public static func displayIndex(containing window: Rect, in displays: [Rect]) -> Int {
        var best = 0, bestArea = -1.0
        for (i, d) in displays.enumerated() {
            let w = max(0, min(window.maxX, d.maxX) - max(window.minX, d.minX))
            let h = max(0, min(window.maxY, d.maxY) - max(window.minY, d.minY))
            if w * h > bestArea { bestArea = w * h; best = i }
        }
        if bestArea <= 0 {
            best = displays.indices.min { displays[$0].center.distance(to: window.center) < displays[$1].center.distance(to: window.center) } ?? 0
        }
        return best
    }

    /// Same relative position on the other display, shrunk to fit if needed.
    public static func fit(_ w: Rect, from a: Rect, into b: Rect) -> Rect {
        let width = min(w.width, b.width), height = min(w.height, b.height)
        let rx = (w.x - a.x) / max(a.width - w.width, 1), ry = (w.y - a.y) / max(a.height - w.height, 1)
        let x = b.x + min(max(rx, 0), 1) * (b.width - width)
        let y = b.y + min(max(ry, 0), 1) * (b.height - height)
        return Rect(x: x, y: y, width: width, height: height)
    }
}

/// Calibration: the user points at the four screen corners in turn; holding still for
/// `holdTime` captures each one. The result becomes `ScreenMapper.activeZone`.
public struct CalibrationSession: Sendable {
    public enum Corner: Int, CaseIterable, Sendable {
        case topLeft, topRight, bottomRight, bottomLeft
        public var title: String {
            switch self {
            case .topLeft: "top-left"
            case .topRight: "top-right"
            case .bottomRight: "bottom-right"
            case .bottomLeft: "bottom-left"
            }
        }
    }

    public var holdTime = 0.8
    /// Max wander (normalized camera units) while holding still.
    public var tolerance = 0.015
    public private(set) var captured: [Vec2] = []
    private var recent: [(t: Double, p: Vec2)] = []

    public init() {}

    public var current: Corner? { Corner(rawValue: captured.count) }
    public var isComplete: Bool { captured.count == 4 }

    /// 0...1 progress of the current hold.
    public var holdProgress: Double {
        guard let first = recent.first, let last = recent.last else { return 0 }
        return min((last.t - first.t) / holdTime, 1)
    }

    /// Feed the fingertip (nil = no pointing hand). Returns the corner captured this frame.
    @discardableResult
    public mutating func feed(_ p: Vec2?, at t: Double) -> Corner? {
        guard let corner = current else { return nil }
        guard let p else { recent.removeAll(); return nil }
        recent.append((t, p))
        // Keep only the trailing run of samples that stay within tolerance of the newest.
        while let first = recent.first, first.p.distance(to: p) > tolerance { recent.removeFirst() }
        guard let first = recent.first, t - first.t >= holdTime else { return nil }
        let mean = recent.reduce(Vec2.zero) { $0 + $1.p } / Double(recent.count)
        // Reject a corner captured on top of the previous one (user did not move).
        if let prev = captured.last, prev.distance(to: mean) < 0.08 { recent.removeAll(); return nil }
        captured.append(mean)
        recent.removeAll()
        return corner
    }

    public mutating func restart() { captured.removeAll(); recent.removeAll() }

    /// The active zone, or nil if the corners are too close together to be usable.
    public var result: Rect? {
        guard isComplete else { return nil }
        let tl = captured[0], tr = captured[1], br = captured[2], bl = captured[3]
        let left = (tl.x + bl.x) / 2, right = (tr.x + br.x) / 2
        let top = (tl.y + tr.y) / 2, bottom = (bl.y + br.y) / 2
        let r = Rect(x: min(left, right), y: min(top, bottom), width: abs(right - left), height: abs(bottom - top))
        guard r.width >= 0.12, r.height >= 0.1, right > left, bottom > top else { return nil }
        return r
    }
}

/// Microphone transient detector for the finger-snap gesture: a peak far above the running
/// noise floor, with a refractory period.
public struct TransientDetector: Sendable {
    public var ratio = 7.0
    public var minPeak = 0.12
    public var refractory = 0.3
    private var floor = 0.0
    private var buffers = 0
    private var lastFire = -Double.infinity

    public init() {}

    /// Feed one audio buffer's peak and RMS (linear, 0...1). Returns true on a transient.
    public mutating func process(peak: Double, rms: Double, at t: Double) -> Bool {
        defer {
            floor = buffers == 0 ? max(rms, 1e-4) : floor * 0.97 + max(rms, 1e-4) * 0.03
            buffers += 1
        }
        // Learn the room's noise level before firing at all.
        guard buffers >= 20 else { return false }
        guard t - lastFire >= refractory, peak >= minPeak, peak >= floor * ratio else { return false }
        lastFire = t
        return true
    }
}
