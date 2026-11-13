import Foundation

/// Fixed-size rolling window of samples (latency in ms, Vision time, ...).
public struct RollingStats: Sendable {
    public let capacity: Int
    private var samples: [Double] = []
    private var next = 0

    public init(capacity: Int = 90) {
        precondition(capacity > 0)
        self.capacity = capacity
        samples.reserveCapacity(capacity)
    }

    public mutating func add(_ v: Double) {
        if samples.count < capacity { samples.append(v) } else { samples[next] = v }
        next = (next + 1) % capacity
    }

    public var count: Int { samples.count }
    public var mean: Double { samples.isEmpty ? 0 : samples.reduce(0, +) / Double(samples.count) }
    public var max: Double { samples.max() ?? 0 }

    /// Nearest-rank percentile, p in 0...100.
    public func percentile(_ p: Double) -> Double {
        guard !samples.isEmpty else { return 0 }
        let sorted = samples.sorted()
        let rank = Int((p / 100 * Double(sorted.count)).rounded(.up)) - 1
        return sorted[Swift.max(0, Swift.min(sorted.count - 1, rank))]
    }
}

/// Frames per second over the last `window` seconds.
public struct FPSMeter: Sendable {
    public let window: Double
    private var times: [Double] = []

    public init(window: Double = 1.0) { self.window = window }

    public mutating func tick(_ t: Double) {
        times.append(t)
        while let first = times.first, t - first > window { times.removeFirst() }
    }

    public var fps: Double {
        guard times.count >= 2, let a = times.first, let b = times.last, b > a else { return 0 }
        return Double(times.count - 1) / (b - a)
    }
}
