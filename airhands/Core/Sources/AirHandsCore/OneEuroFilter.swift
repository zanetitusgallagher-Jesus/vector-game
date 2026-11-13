import Foundation

/// Tunables for the One Euro filter (Casiez et al., CHI 2012).
///
/// Units: positions are normalized camera coordinates (0...1), so speeds are "frames per
/// second" in the order of 0...5. That is why `beta` is much larger here than the 0.007
/// often quoted for pixel units.
public struct SmoothingParameters: Codable, Hashable, Sendable {
    /// Cutoff (Hz) when the hand is still. Lower = less jitter, more lag at rest.
    public var minCutoff: Double
    /// Speed coefficient. Higher = cutoff rises faster with speed = less lag when moving.
    public var beta: Double
    /// Cutoff (Hz) for the derivative estimate.
    public var derivativeCutoff: Double

    public init(minCutoff: Double = 1.2, beta: Double = 8.0, derivativeCutoff: Double = 1.0) {
        self.minCutoff = minCutoff; self.beta = beta; self.derivativeCutoff = derivativeCutoff
    }

    public static let `default` = SmoothingParameters()
}

/// Scalar One Euro filter: an adaptive low-pass filter whose cutoff rises with speed.
public struct OneEuroFilter: Sendable {
    public var parameters: SmoothingParameters
    private var lastValue: Double?
    private var lastDerivative: Double = 0
    private var lastTime: Double?

    public init(_ parameters: SmoothingParameters = .default) { self.parameters = parameters }

    public mutating func reset() { lastValue = nil; lastDerivative = 0; lastTime = nil }

    private static func alpha(cutoff: Double, dt: Double) -> Double {
        let tau = 1.0 / (2.0 * Double.pi * cutoff)
        return 1.0 / (1.0 + tau / dt)
    }

    /// Filter `value` sampled at time `t` (seconds). The first sample passes through.
    public mutating func filter(_ value: Double, at t: Double) -> Double {
        guard let prev = lastValue, let prevT = lastTime else {
            lastValue = value; lastTime = t; lastDerivative = 0
            return value
        }
        let dt = t - prevT
        // Out-of-order or duplicate timestamps: keep state, return last output.
        guard dt > 1e-6 else { return prev }

        let rawDerivative = (value - prev) / dt
        let aD = Self.alpha(cutoff: parameters.derivativeCutoff, dt: dt)
        let derivative = lastDerivative + aD * (rawDerivative - lastDerivative)

        let cutoff = parameters.minCutoff + parameters.beta * abs(derivative)
        let a = Self.alpha(cutoff: cutoff, dt: dt)
        let out = prev + a * (value - prev)

        lastValue = out; lastDerivative = derivative; lastTime = t
        return out
    }
}

/// Two independent One Euro filters, one per axis.
public struct OneEuroFilter2D: Sendable {
    private var fx: OneEuroFilter
    private var fy: OneEuroFilter

    public init(_ parameters: SmoothingParameters = .default) {
        fx = OneEuroFilter(parameters); fy = OneEuroFilter(parameters)
    }

    public var parameters: SmoothingParameters {
        get { fx.parameters }
        set { fx.parameters = newValue; fy.parameters = newValue }
    }

    public mutating func reset() { fx.reset(); fy.reset() }

    public mutating func filter(_ p: Vec2, at t: Double) -> Vec2 {
        Vec2(fx.filter(p.x, at: t), fy.filter(p.y, at: t))
    }
}
