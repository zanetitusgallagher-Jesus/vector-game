import XCTest
@testable import AirHandsCore

final class OneEuroFilterTests: XCTestCase {
    func testFirstSamplePassesThrough() {
        var f = OneEuroFilter()
        XCTAssertEqual(f.filter(0.42, at: 0), 0.42)
    }

    func testConstantInputStaysConstant() {
        var f = OneEuroFilter()
        var out = 0.0
        for i in 0..<60 { out = f.filter(0.3, at: Double(i) / 30) }
        XCTAssertEqual(out, 0.3, accuracy: 1e-12)
    }

    func testDuplicateTimestampIsIgnored() {
        var f = OneEuroFilter()
        _ = f.filter(0.1, at: 1)
        let a = f.filter(0.2, at: 1.0333)
        XCTAssertEqual(f.filter(0.9, at: 1.0333), a)   // same t: no update
        XCTAssertEqual(f.filter(0.9, at: 1.0), a)      // going back in time: no update
    }

    /// Still hand with detector jitter: output jitter must drop a lot.
    func testReducesJitterWhenStill() {
        var noise = SeededNoise(seed: 7)
        var f = OneEuroFilter()
        var raw = RollingStats(capacity: 240), filtered = RollingStats(capacity: 240)
        var prevRaw = 0.5, prevOut = 0.5
        for i in 0..<300 {
            let x = 0.5 + noise.gaussian(0.003)
            let y = f.filter(x, at: Double(i) / 30)
            if i > 60 { raw.add(abs(x - prevRaw)); filtered.add(abs(y - prevOut)) }
            prevRaw = x; prevOut = y
        }
        // Frame-to-frame motion of a still hand should shrink by at least 4x.
        XCTAssertLessThan(filtered.mean, raw.mean / 4, "raw \(raw.mean) filtered \(filtered.mean)")
    }

    /// Fast sweep: with beta the filter must lag much less than a fixed low-pass at minCutoff.
    func testLowLagWhenMovingFast() {
        let speed = 1.5 // image widths per second: a quick flick across the frame
        var adaptive = OneEuroFilter(SmoothingParameters(minCutoff: 1.2, beta: 8))
        var fixed = OneEuroFilter(SmoothingParameters(minCutoff: 1.2, beta: 0))
        var lagA = 0.0, lagF = 0.0
        for i in 0..<20 {
            let t = Double(i) / 60
            let x = speed * t
            lagA = x - adaptive.filter(x, at: t)
            lagF = x - fixed.filter(x, at: t)
        }
        XCTAssertLessThan(lagA, lagF / 3, "adaptive lag \(lagA) fixed lag \(lagF)")
        // Under ~1 frame of motion at 60 fps (0.025) after settling.
        XCTAssertLessThan(lagA, 0.03)
    }

    func test2DFilterFiltersAxesIndependently() {
        var f = OneEuroFilter2D()
        _ = f.filter(Vec2(0, 0), at: 0)
        let p = f.filter(Vec2(1, 0), at: 1.0 / 30)
        XCTAssertGreaterThan(p.x, 0)
        XCTAssertEqual(p.y, 0)
    }
}
