import XCTest
@testable import AirHandsCore

final class PointerControllerTests: XCTestCase {
    let screen = Rect(x: 0, y: 0, width: 1500, height: 1000)
    var mapper: ScreenMapper { ScreenMapper(activeZone: Rect(x: 0.2, y: 0.1, width: 0.6, height: 0.6), displays: [screen]) }

    func input(_ x: Double, _ y: Double, source: Int = 11, gain: Double = 1, locked: Bool = false) -> PointerInput {
        PointerInput(camera: Vec2(x, y), sourceID: source, gain: gain, locked: locked)
    }

    func testFirstInputAnchorsWithoutJumping() {
        let pc = PointerController(mapper: mapper)
        XCTAssertNil(pc.update(input(0.8, 0.7), at: 0, systemCursor: Vec2(100, 100)))
        XCTAssertEqual(pc.cursor, Vec2(100, 100))
    }

    func testAbsoluteModeConvergesToFingerPosition() {
        let pc = PointerController(mapper: mapper)
        var t = 0.0, sys = Vec2(100, 100)
        _ = pc.update(input(0.5, 0.4), at: t, systemCursor: sys)
        for _ in 0..<60 {
            t += 1.0 / 30
            if let c = pc.update(input(0.5, 0.4), at: t, systemCursor: sys) { sys = c }
        }
        XCTAssertEqual(sys.x, 750, accuracy: 3)
        XCTAssertEqual(sys.y, 500, accuracy: 3)
    }

    func testLockedInputFreezesAndUnlockDoesNotJump() {
        let pc = PointerController(mapper: mapper)
        var sys = Vec2(750, 500)
        _ = pc.update(input(0.5, 0.4), at: 0, systemCursor: sys)
        XCTAssertNil(pc.update(input(0.55, 0.45, locked: true), at: 0.033, systemCursor: sys))
        // Unlocked at the new finger spot: only the motion since then counts.
        if let c = pc.update(input(0.55, 0.45), at: 0.066, systemCursor: sys) { sys = c }
        XCTAssertLessThan(sys.distance(to: Vec2(750, 500)), 30, "no jump after a locked pinch")
    }

    func testSourceChangeReAnchors() {
        let pc = PointerController(mapper: mapper)
        let sys = Vec2(400, 400)
        _ = pc.update(input(0.5, 0.4, source: 11), at: 0, systemCursor: sys)
        XCTAssertNil(pc.update(input(0.7, 0.6, source: 12), at: 0.033, systemCursor: sys), "new source re-anchors, no move")
    }

    func testPrecisionGainScalesRelativeMotion() {
        var tuning = PointerTuning(); tuning.mode = .relative; tuning.acceleration = 0
        func travel(gain: Double) -> Double {
            let pc = PointerController(mapper: mapper, tuning: tuning)
            let start = Vec2(750, 500)
            _ = pc.update(input(0.5, 0.4, gain: gain), at: 0, systemCursor: start)
            let end = pc.update(input(0.53, 0.4, gain: gain), at: 0.033, systemCursor: start)!
            return end.x - start.x
        }
        XCTAssertEqual(travel(gain: 1), 75, accuracy: 0.5)   // 0.03 / 0.6 * 1500
        XCTAssertEqual(travel(gain: 0.3), 22.5, accuracy: 0.5)
    }

    func testRelativeAccelerationMakesFastMovesGoFarther() {
        var tuning = PointerTuning(); tuning.mode = .relative
        let pc = PointerController(mapper: mapper, tuning: tuning)
        let s = Vec2(750, 500)
        _ = pc.update(input(0.5, 0.4), at: 0, systemCursor: s)
        let slow = pc.update(input(0.503, 0.4), at: 0.033, systemCursor: s)!.x - 750
        let pc2 = PointerController(mapper: mapper, tuning: tuning)
        _ = pc2.update(input(0.5, 0.4), at: 0, systemCursor: s)
        let fast = pc2.update(input(0.53, 0.4), at: 0.033, systemCursor: s)!.x - 750
        XCTAssertGreaterThan(fast / slow, 10 * 1.5, "10x the motion should be more than 10x the travel")
    }

    func testTrackpadMovementIsRespected() {
        let pc = PointerController(mapper: mapper, tuning: { var t = PointerTuning(); t.mode = .relative; return t }())
        _ = pc.update(input(0.5, 0.4), at: 0, systemCursor: Vec2(100, 100))
        let c = pc.update(input(0.51, 0.4), at: 0.033, systemCursor: Vec2(900, 900))!
        XCTAssertGreaterThan(c.x, 900)
    }
}

final class TypingGateTests: XCTestCase {
    func testKeyPressSuspendsUntilQuietAndHandRaised() {
        var g = TypingGate(resumeDelay: 0.7)
        XCTAssertFalse(g.update(at: 0, handRaised: true))
        g.keyDown(at: 1)
        XCTAssertTrue(g.update(at: 1.2, handRaised: true), "too soon")
        XCTAssertTrue(g.update(at: 2.0, handRaised: false), "quiet but no hand raised")
        XCTAssertFalse(g.update(at: 2.1, handRaised: true))
    }

    func testEveryKeyRestartsTheDelay() {
        var g = TypingGate(resumeDelay: 0.7)
        for i in 0..<10 { g.keyDown(at: Double(i) * 0.2) }
        XCTAssertTrue(g.update(at: 2.0, handRaised: true))
        XCTAssertFalse(g.update(at: 2.6, handRaised: true))
    }

    func testDisabled() {
        var g = TypingGate(); g.enabled = false
        g.keyDown(at: 0)
        XCTAssertFalse(g.update(at: 0.01, handRaised: false))
    }
}

final class MomentumTests: XCTestCase {
    func testMomentumDecaysToZero() {
        var m = ScrollMomentum()
        m.start(Vec2(0, 1200))
        var total = 0.0, steps = 0
        while m.isActive && steps < 1000 { total += m.step(1.0 / 60).y; steps += 1 }
        XCTAssertFalse(m.isActive)
        XCTAssertEqual(total, 1200 / 3.5, accuracy: 40)   // ∫ v e^{-kt} = v/k
        XCTAssertLessThan(steps, 120)
    }
}

final class WindowPlannerTests: XCTestCase {
    let left = Rect(x: 0, y: 25, width: 1500, height: 950)
    let right = Rect(x: 1500, y: -200, width: 2560, height: 1415)
    let win = Rect(x: 200, y: 200, width: 800, height: 600)

    func testSlowReleaseStays() {
        XCTAssertEqual(WindowPlanner.throwTarget(window: win, velocity: Vec2(1, 0), displays: [left], minSpeed: 4), .stay)
    }

    func testThrowOnSingleDisplaySnapsToHalf() {
        XCTAssertEqual(WindowPlanner.throwTarget(window: win, velocity: Vec2(8, 1), displays: [left], minSpeed: 4),
                       .moveTo(Rect(x: 750, y: 25, width: 750, height: 950)))
        XCTAssertEqual(WindowPlanner.throwTarget(window: win, velocity: Vec2(-8, 0), displays: [left], minSpeed: 4),
                       .moveTo(Rect(x: 0, y: 25, width: 750, height: 950)))
        XCTAssertEqual(WindowPlanner.throwTarget(window: win, velocity: Vec2(0, -9), displays: [left], minSpeed: 4),
                       .moveTo(left), "throw up maximises")
    }

    func testThrowTowardOtherDisplayMovesThere() {
        guard case let .moveTo(r) = WindowPlanner.throwTarget(window: win, velocity: Vec2(8, 0), displays: [left, right], minSpeed: 4) else {
            return XCTFail()
        }
        XCTAssertTrue(right.contains(r.center))
        XCTAssertEqual(r.width, 800); XCTAssertEqual(r.height, 600)
    }

    func testThrowAwayFromOnlyOtherDisplayFallsBackToHalf() {
        let out = WindowPlanner.throwTarget(window: win, velocity: Vec2(-8, 0), displays: [left, right], minSpeed: 4)
        XCTAssertEqual(out, .moveTo(Rect(x: 0, y: 25, width: 750, height: 950)))
    }

    func testFitShrinksOversizeWindow() {
        let big = Rect(x: 1500, y: -200, width: 2400, height: 1400)
        let r = WindowPlanner.fit(big, from: right, into: left)
        XCTAssertEqual(r, left)
    }
}

final class CalibrationTests: XCTestCase {
    func testFourCornersProduceZone() {
        var c = CalibrationSession()
        var noise = SeededNoise(seed: 5)
        let corners = [Vec2(0.25, 0.15), Vec2(0.75, 0.16), Vec2(0.76, 0.62), Vec2(0.24, 0.6)]
        var t = 0.0
        var got: [CalibrationSession.Corner] = []
        for p in corners {
            for _ in 0..<40 {
                if let k = c.feed(Vec2(p.x + noise.gaussian(0.002), p.y + noise.gaussian(0.002)), at: t) { got.append(k) }
                t += 1.0 / 30
            }
            for _ in 0..<5 { c.feed(nil, at: t); t += 1.0 / 30 }   // moving to the next corner
        }
        XCTAssertEqual(got, [.topLeft, .topRight, .bottomRight, .bottomLeft])
        let r = try! XCTUnwrap(c.result)
        XCTAssertEqual(r.x, 0.245, accuracy: 0.01); XCTAssertEqual(r.maxX, 0.755, accuracy: 0.01)
        XCTAssertEqual(r.y, 0.155, accuracy: 0.01); XCTAssertEqual(r.maxY, 0.61, accuracy: 0.01)
    }

    func testMovingFingerNeverCaptures() {
        var c = CalibrationSession()
        for i in 0..<120 { c.feed(Vec2(0.2 + Double(i) * 0.004, 0.3), at: Double(i) / 30) }
        XCTAssertEqual(c.current, .topLeft)
    }

    func testDegenerateCornersAreRejected() {
        var c = CalibrationSession()
        var t = 0.0
        for p in [Vec2(0.5, 0.4), Vec2(0.55, 0.4), Vec2(0.55, 0.45), Vec2(0.5, 0.45)] {
            for _ in 0..<40 { c.feed(p, at: t); t += 1.0 / 30 }
            c.feed(nil, at: t)
        }
        XCTAssertNil(c.result)
    }
}

final class TransientDetectorTests: XCTestCase {
    func testSnapLikePeakFiresOnceAboveNoise() {
        var d = TransientDetector()
        var noise = SeededNoise(seed: 9)
        var fires: [Int] = []
        for i in 0..<400 {
            let base = 0.01 + abs(noise.gaussian(0.004))
            let peak = (i == 200 || i == 202) ? 0.6 : base * 2
            if d.process(peak: peak, rms: base, at: Double(i) * 0.005) { fires.append(i) }
        }
        XCTAssertEqual(fires, [200], "second peak is inside the refractory period")
    }

    func testLoudSteadyNoiseDoesNotFire() {
        var d = TransientDetector()
        var fired = false
        for i in 0..<400 { fired = d.process(peak: 0.3, rms: 0.2, at: Double(i) * 0.005) || fired }
        XCTAssertFalse(fired)
    }
}

final class SettingsTests: XCTestCase {
    func testRoundTrip() throws {
        var s = AppSettings()
        s.pointer.mode = .relative
        s.setBinding(GestureBinding(.customShortcut, shortcut: KeyCombo(keyCode: 0, modifiers: [.command, .shift])), for: .peace)
        s.setEnabled(false, .swipeUp)
        let back = AppSettings.decode(try s.encoded())
        XCTAssertEqual(back, s)
        XCTAssertEqual(back.binding(for: .peace).shortcut?.displayString, "⇧⌘A")
        XCTAssertFalse(back.isEnabled(.swipeUp))
    }

    func testMissingKeysFallBackToDefaults() {
        let partial = #"{"scrollSpeed": 2.5, "gesture": {"pinchEnter": 0.2}, "bindings": {"peace": {"action": "playPause"}}}"#
        let s = AppSettings.decode(partial.data(using: .utf8)!)
        XCTAssertEqual(s.scrollSpeed, 2.5)
        XCTAssertEqual(s.gesture.pinchEnter, 0.2)
        XCTAssertEqual(s.gesture.pinchExit, GestureConfig().pinchExit)
        XCTAssertEqual(s.binding(for: .peace).action, .playPause)
        XCTAssertEqual(s.binding(for: .thumbsUp).action, .playPause, "default binding kept")
        XCTAssertEqual(s.toggleHotkey, .defaultToggle)
    }

    func testGarbageGivesDefaults() {
        XCTAssertEqual(AppSettings.decode(Data("nope".utf8)), AppSettings())
    }

    func testDefaultsMatchSpec() {
        let s = AppSettings()
        XCTAssertEqual(s.binding(for: .swipeUp).action, .missionControl)
        XCTAssertEqual(s.binding(for: .swipeDown).action, .showDesktop)
        XCTAssertEqual(s.binding(for: .peace).action, .screenshot)
        XCTAssertEqual(s.binding(for: .stopPalm).action, .togglePause)
        XCTAssertEqual(s.binding(for: .twoHandPush).action, .appExpose)
        XCTAssertFalse(s.isEnabled(.snap), "snap is an opt-in stretch feature")
        XCTAssertEqual(s.toggleHotkey.displayString, "⌃⌥Space")
        XCTAssertEqual(s.typingResumeDelay, 0.7)
        XCTAssertEqual(s.gesture.pinchEnter, 0.25); XCTAssertEqual(s.gesture.pinchExit, 0.38)
    }
}

final class HysteresisTests: XCTestCase {
    func testGateHasDeadBand() {
        var g = HysteresisGate(enter: 0.25, exit: 0.38, activeBelow: true)
        XCTAssertFalse(g.update(0.3))
        XCTAssertTrue(g.update(0.24))
        XCTAssertTrue(g.update(0.35), "inside the dead band stays on")
        XCTAssertFalse(g.update(0.39))
        XCTAssertFalse(g.update(0.3), "inside the dead band stays off")
    }

    func testHoldFiresOncePerHold() {
        var h = HoldTimer(duration: 0.5)
        var fires = 0
        for i in 0..<60 { if h.update(true, at: Double(i) / 30) { fires += 1 } }
        XCTAssertEqual(fires, 1)
        _ = h.update(false, at: 2.1)
        for i in 0..<20 { if h.update(true, at: 2.2 + Double(i) / 30) { fires += 1 } }
        XCTAssertEqual(fires, 2)
    }
}
