import Foundation
@testable import AirHandsCore

extension SyntheticHand {
    /// Interpolates every continuous parameter (for smooth synthetic transitions).
    func lerp(to b: SyntheticHand, _ t: Double) -> SyntheticHand {
        var h = self
        h.wrist = wrist.lerp(to: b.wrist, t)
        h.size = size + (b.size - size) * t
        h.rotation = rotation + (b.rotation - rotation) * t
        h.curl = zip(curl, b.curl).map { $0 + ($1 - $0) * t }
        h.pinch = pinch + (b.pinch - pinch) * t
        h.spread = spread + (b.spread - spread) * t
        if t >= 0.5 { h.pinchFinger = b.pinchFinger; h.chirality = b.chirality }
        return h
    }

    func moved(to w: Vec2) -> SyntheticHand { var h = self; h.wrist = w; return h }
    func with(_ f: (inout SyntheticHand) -> Void) -> SyntheticHand { var h = self; f(&h); return h }

    /// Rotates the hand by `angle` about the thumb+index pinch point (a knob turn).
    func rotatedAboutPinch(_ angle: Double, aspect: Double = 4.0 / 3.0) -> SyntheticHand {
        let before = HandFeatures(observation(aspectRatio: aspect), aspectRatio: aspect).pinchPointIso
        var h = self
        h.rotation += angle
        let after = HandFeatures(h.observation(aspectRatio: aspect), aspectRatio: aspect).pinchPointIso
        let d = before - after
        h.wrist = Vec2(h.wrist.x + d.x / aspect, h.wrist.y + d.y)
        return h
    }

    /// Point pose with the thumb pinched onto the index tip.
    static func pinched(at w: Vec2 = Vec2(0.5, 0.7)) -> SyntheticHand {
        SyntheticHand.point(at: w).with { $0.pinch = 1 }
    }
}

/// Drives synthetic hand sequences through HandSmoother → GestureEngine at 30 fps, exactly
/// like the app does, and collects everything that comes out.
final class GestureHarness {
    let smoother = HandSmoother()
    let engine: GestureEngine
    var t = 100.0
    let dt = 1.0 / 30
    var noise = SeededNoise(seed: 11)
    var sigma = 0.0015       // realistic Vision jitter (normalized units)
    var suspended = false
    private(set) var events: [GestureEvent] = []
    private(set) var outputs: [GestureOutput] = []
    var onFrame: ((GestureOutput) -> Void)?

    init(config: GestureConfig = GestureConfig()) { engine = GestureEngine(config: config) }

    func step(_ hands: [SyntheticHand]) {
        var f = HandFrame(timestamp: t, aspectRatio: 4.0 / 3.0, hands: hands.map { $0.observation() })
        if sigma > 0 { f = noise.jitter(f, sigma: sigma) }
        let out = engine.process(smoother.smooth(f), suspended: suspended)
        events += out.events
        outputs.append(out)
        onFrame?(out)
        t += dt
    }

    func hold(_ hands: [SyntheticHand], _ seconds: Double) {
        for _ in 0..<max(1, Int((seconds / dt).rounded())) { step(hands) }
    }
    func hold(_ h: SyntheticHand, _ seconds: Double) { hold([h], seconds) }

    func move(_ a: [SyntheticHand], _ b: [SyntheticHand], _ seconds: Double) {
        let n = max(1, Int((seconds / dt).rounded()))
        for i in 1...n {
            let k = Double(i) / Double(n)
            step(zip(a, b).map { $0.lerp(to: $1, k) })
        }
    }
    func move(_ a: SyntheticHand, _ b: SyntheticHand, _ seconds: Double) { move([a], [b], seconds) }

    func noHands(_ seconds: Double) { hold([], seconds) }

    func clearEvents() { events.removeAll(); outputs.removeAll() }

    var clicks: [Int] { events.compactMap { if case let .click(c) = $0 { c } else { nil } } }

    func count(_ match: (GestureEvent) -> Bool) -> Int { events.filter(match).count }

    /// Events other than continuous scroll / knob deltas, for compact assertions.
    var discrete: [GestureEvent] {
        events.filter {
            switch $0 {
            case .scroll, .knob, .zoom: false
            default: true
            }
        }
    }
}
