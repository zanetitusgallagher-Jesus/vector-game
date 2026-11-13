import XCTest
@testable import AirHandsCore

final class GestureEngineTests: XCTestCase {
    let p = SyntheticHand.point()

    // MARK: Pointer + clutch

    func testPointingMovesPointerWithoutAnyEvents() {
        let h = GestureHarness()
        h.hold(p, 0.5)
        h.move(p, p.moved(to: Vec2(0.65, 0.55)), 0.6)
        h.move(p.moved(to: Vec2(0.65, 0.55)), p.moved(to: Vec2(0.35, 0.75)), 0.4)
        XCTAssertEqual(h.events, [])
        let tail = h.outputs.suffix(20)
        XCTAssertTrue(tail.allSatisfy { $0.mode == .pointing && $0.pointer != nil && $0.pointer!.locked == false })
    }

    func testOpenHandIsClutch() {
        let h = GestureHarness()
        h.hold(.openPalm(), 0.5)
        XCTAssertNil(h.outputs.last!.pointer)
        XCTAssertEqual(h.outputs.last!.mode, .idle)
        h.hold(.fist(), 0.1)   // shorter than the grab hold
        XCTAssertNil(h.outputs.last!.pointer)
    }

    func testPrecisionGainDropsAsPinchApproaches() {
        let h = GestureHarness()
        h.sigma = 0
        h.hold(p, 0.3)
        let far = h.outputs.last!.pointer!.gain
        h.hold(p.with { $0.pinch = 0.6 }, 0.3)
        let near = h.outputs.last!.pointer!.gain
        XCTAssertEqual(far, 1, accuracy: 0.05)
        XCTAssertLessThan(near, 0.8)
        XCTAssertGreaterThan(h.outputs.last!.progress, 0.2)
        XCTAssertEqual(h.events, [])
    }

    // MARK: Click / double click / drag

    func testPinchTapClicksOnceAndLocksCursor() {
        let h = GestureHarness()
        h.hold(p, 0.4)
        h.move(p, .pinched(), 0.1)
        h.hold(.pinched(), 0.12)
        XCTAssertTrue(h.outputs.last!.pointer!.locked, "cursor must not move while the pinch is down")
        h.move(.pinched(), p, 0.1)
        h.hold(p, 0.5)
        XCTAssertEqual(h.discrete, [.click(count: 1)])
    }

    func testDoublePinchIsDoubleClick() {
        let h = GestureHarness()
        h.hold(p, 0.4)
        for _ in 0..<2 {
            h.move(p, .pinched(), 0.07)
            h.hold(.pinched(), 0.07)
            h.move(.pinched(), p, 0.07)
            h.hold(p, 0.07)
        }
        h.hold(p, 0.5)
        XCTAssertEqual(h.clicks, [1, 2])
    }

    func testSlowSecondPinchIsTwoSingleClicks() {
        let h = GestureHarness()
        h.hold(p, 0.4)
        for _ in 0..<2 {
            h.move(p, .pinched(), 0.1); h.hold(.pinched(), 0.1); h.move(.pinched(), p, 0.1); h.hold(p, 0.6)
        }
        XCTAssertEqual(h.clicks, [1, 1])
    }

    func testPinchHoldAndMoveDrags() {
        let h = GestureHarness()
        h.hold(p, 0.4)
        h.move(p, .pinched(), 0.1)
        h.hold(.pinched(), 0.1)
        h.move(.pinched(), .pinched(at: Vec2(0.62, 0.6)), 0.5)
        XCTAssertEqual(h.outputs.last!.mode, .dragging)
        XCTAssertFalse(h.outputs.last!.pointer!.locked)
        h.move(.pinched(at: Vec2(0.62, 0.6)), p.moved(to: Vec2(0.62, 0.6)), 0.1)
        h.hold(p.moved(to: Vec2(0.62, 0.6)), 0.3)
        XCTAssertEqual(h.discrete, [.dragBegin, .dragEnd], "a drag must not also click")
    }

    func testLongPressStartsDragInPlace() {
        let h = GestureHarness()
        h.hold(p, 0.4)
        h.move(p, .pinched(), 0.1)
        h.hold(.pinched(), 0.8)
        h.move(.pinched(), p, 0.1)
        h.hold(p, 0.2)
        XCTAssertEqual(h.discrete, [.dragBegin, .dragEnd])
    }

    func testHandLostDuringDragReleasesButton() {
        let h = GestureHarness()
        h.hold(p, 0.4)
        h.move(p, .pinched(), 0.1)
        h.move(.pinched(), .pinched(at: Vec2(0.62, 0.6)), 0.4)
        h.noHands(0.1)
        XCTAssertEqual(h.discrete, [.dragBegin], "brief dropout keeps the drag")
        h.noHands(0.5)
        XCTAssertEqual(h.discrete, [.dragBegin, .dragEnd])
    }

    // MARK: False-click resistance

    func testMakingAFistNeverClicks() {
        let h = GestureHarness()
        h.hold(p, 0.4)
        h.move(p, .fist(), 0.15)
        h.hold(.fist(), 0.15)
        h.move(.fist(), .openPalm(), 0.15)
        h.hold(.openPalm(), 0.3)
        XCTAssertEqual(h.clicks, [])
        XCTAssertEqual(h.count { $0 == .rightClick }, 0)
    }

    func testFastHandMotionWithPinchShapeDoesNotClick() {
        let h = GestureHarness()
        h.hold(p, 0.4)
        // Hand swinging across the frame while the thumb happens to touch the index.
        h.move(p, SyntheticHand.pinched(at: Vec2(0.85, 0.6)), 0.1)
        h.move(.pinched(at: Vec2(0.85, 0.6)), p.moved(to: Vec2(0.85, 0.6)), 0.1)
        h.hold(p.moved(to: Vec2(0.85, 0.6)), 0.3)
        XCTAssertEqual(h.clicks, [])
    }

    func testJitterAroundThresholdDoesNotFlicker() {
        let h = GestureHarness()
        h.sigma = 0.004   // heavy noise
        h.hold(p.with { $0.pinch = 0.72 }, 2.0)   // hovering just outside the pinch
        XCTAssertEqual(h.clicks, [])
    }

    func testHoveringFixtureReplayHasNoClicks() throws {
        let url = try XCTUnwrap(Bundle.module.url(forResource: "point_sweep", withExtension: "json", subdirectory: "Fixtures"))
        let rec = try LandmarkRecording.load(from: url)
        let s = HandSmoother(), e = GestureEngine()
        var events: [GestureEvent] = []
        LandmarkReplayer(rec).replay(startingAt: 50) { events += e.process(s.smooth($0)).events }
        XCTAssertEqual(events, [])
    }

    // MARK: Right click, scroll, knob

    func testMiddlePinchRightClicks() {
        let h = GestureHarness()
        // From the pointing pose, the thumb meets the (straightening) middle finger.
        let ready = SyntheticHand.point()
        let mid = SyntheticHand(curl: [0.7, 0, 0.1, 1, 1], pinch: 1, pinchFinger: .middle)
        h.hold(ready, 0.4)
        h.move(ready, mid, 0.1)
        h.hold(mid, 0.15)
        h.move(mid, ready, 0.1)
        h.hold(ready, 0.3)
        XCTAssertEqual(h.discrete.filter { $0 != .peace }, [.rightClick])
        XCTAssertEqual(h.clicks, [])
    }

    func testTwoFingerScroll() {
        let h = GestureHarness()
        let two = SyntheticHand.twoFingers()
        h.hold(two, 0.3)
        h.move(two, two.moved(to: Vec2(0.5, 0.5)), 0.4)   // hand moves up
        XCTAssertEqual(h.outputs.last!.mode, .scrolling)
        h.move(two.moved(to: Vec2(0.5, 0.5)), SyntheticHand.openPalm(at: Vec2(0.5, 0.5)), 0.12)
        h.hold(.openPalm(at: Vec2(0.5, 0.5)), 0.2)
        let dy = h.events.reduce(0.0) { if case let .scroll(_, d) = $1 { $0 + d } else { $0 } }
        XCTAssertLessThan(dy, -0.5, "moving up 0.2 of the frame ≈ -1.1 hand sizes")
        let end = h.events.first { if case .scrollEnd = $0 { true } else { false } }
        XCTAssertNotNil(end)
        XCTAssertEqual(h.clicks, [])
        XCTAssertFalse(h.events.contains(.peace))
    }

    func testPinchAndRotateTurnsKnob() {
        let h = GestureHarness()
        h.hold(p, 0.4)
        h.move(p, .pinched(), 0.1)
        h.hold(.pinched(), 0.1)
        // Turning a knob: the hand rotates about the pinch point, which stays put.
        let turned = SyntheticHand.pinched().rotatedAboutPinch(0.8)   // ~46° clockwise
        h.move(.pinched(), turned, 0.5)
        h.move(turned, turned.with { $0.pinch = 0 }, 0.1)
        h.hold(turned.with { $0.pinch = 0 }, 0.2)
        let steps = h.events.reduce(0) { if case let .knob(s) = $1 { $0 + s } else { $0 } }
        XCTAssertGreaterThanOrEqual(steps, 2)
        XCTAssertEqual(h.clicks, [])
        XCTAssertFalse(h.events.contains(.dragBegin))
    }

    // MARK: Holds

    func testThumbsUpHeldFiresOnce() {
        let h = GestureHarness()
        h.hold(.thumbsUp(), 1.5)
        XCTAssertEqual(h.discrete, [.thumbsUp])
    }

    func testThumbsUpTooShortDoesNothing() {
        let h = GestureHarness()
        h.hold(.thumbsUp(), 0.3)
        h.hold(.openPalm(), 0.3)
        XCTAssertEqual(h.discrete, [])
    }

    func testPeaceHeldTakesScreenshotNotScroll() {
        let h = GestureHarness()
        h.hold(.peace(), 0.8)
        XCTAssertEqual(h.discrete, [.peace])
    }

    func testStopPalmHeldStill() {
        let h = GestureHarness()
        h.hold(.stopPalm(), 1.3)
        XCTAssertEqual(h.discrete, [.stopPalm])
    }

    func testRelaxedOpenPalmIsNotStop() {
        let h = GestureHarness()
        h.hold(.openPalm(), 2)
        XCTAssertEqual(h.discrete, [])
    }

    func testPausedOnlyListensForStop() {
        let h = GestureHarness()
        h.engine.paused = true
        h.hold(p, 0.3); h.move(p, .pinched(), 0.1); h.move(.pinched(), p, 0.1)
        h.hold(.thumbsUp(), 1)
        XCTAssertEqual(h.discrete, [])
        XCTAssertEqual(h.outputs.last!.mode, .paused)
        h.hold(.stopPalm(), 1.8)
        XCTAssertEqual(h.discrete, [.stopPalm])
    }

    // MARK: Swipes

    func testOpenPalmSwipes() {
        for (to, dir) in [(Vec2(0.75, 0.6), SwipeDirection.right), (Vec2(0.25, 0.6), .left), (Vec2(0.5, 0.35), .up)] {
            let h = GestureHarness()
            let start = SyntheticHand.openPalm(at: Vec2(0.5, 0.6))
            h.hold(start, 0.7)
            h.move(start, .openPalm(at: to), 0.2)
            h.hold(.openPalm(at: to), 0.3)
            XCTAssertEqual(h.discrete, [.swipe(dir)], "\(dir)")
        }
    }

    func testSlowOpenPalmDriftIsNotASwipe() {
        let h = GestureHarness()
        h.hold(.openPalm(at: Vec2(0.4, 0.6)), 0.6)
        h.move(.openPalm(at: Vec2(0.4, 0.6)), .openPalm(at: Vec2(0.7, 0.6)), 2.0)
        XCTAssertEqual(h.discrete, [])
    }

    func testRaisingHandIntoViewIsNotSwipeUp() {
        let h = GestureHarness()
        h.noHands(0.5)
        h.move(.openPalm(at: Vec2(0.5, 0.78)), .openPalm(at: Vec2(0.5, 0.5)), 0.25)
        h.hold(.openPalm(at: Vec2(0.5, 0.5)), 0.5)
        XCTAssertEqual(h.discrete, [])
    }

    func testOneSwipeFiresOncePerCooldown() {
        let h = GestureHarness()
        let a = SyntheticHand.openPalm(at: Vec2(0.3, 0.6)), b = SyntheticHand.openPalm(at: Vec2(0.7, 0.6))
        h.hold(a, 0.7)
        h.move(a, b, 0.2)
        h.move(b, a, 0.2)   // swinging straight back inside the cooldown
        XCTAssertEqual(h.discrete, [.swipe(.right)])
    }

    // MARK: Grab / throw

    func testFistGrabMoveAndThrow() {
        let h = GestureHarness()
        let f0 = SyntheticHand.fist(at: Vec2(0.4, 0.6))
        h.hold(f0, 0.4)
        XCTAssertEqual(h.discrete, [.grabBegin])
        XCTAssertEqual(h.outputs.last!.mode, .grabbing)
        XCTAssertNotNil(h.outputs.last!.pointer)
        h.move(f0, .fist(at: Vec2(0.7, 0.6)), 0.15)                 // fast flick right
        h.move(.fist(at: Vec2(0.7, 0.6)), .openPalm(at: Vec2(0.72, 0.6)), 0.06)
        h.hold(.openPalm(at: Vec2(0.72, 0.6)), 0.2)
        guard case let .grabEnd(vx, _)? = h.discrete.last else { return XCTFail("no grabEnd: \(h.discrete)") }
        XCTAssertGreaterThan(vx, 4, "throw speed in hand sizes / s")
    }

    // MARK: Two hands

    func testTwoHandPinchSpreadZoomsIn() {
        let h = GestureHarness()
        let l0 = SyntheticHand.pinched(at: Vec2(0.42, 0.65)).with { $0.chirality = .left }
        let r0 = SyntheticHand.pinched(at: Vec2(0.58, 0.65))
        let l1 = l0.moved(to: Vec2(0.25, 0.65)), r1 = r0.moved(to: Vec2(0.75, 0.65))
        let lp = SyntheticHand.point(at: l0.wrist).with { $0.chirality = .left }, rp = SyntheticHand.point(at: r0.wrist)
        h.hold([lp, rp], 0.4)
        h.move([lp, rp], [l0, r0], 0.1)
        h.hold([l0, r0], 0.2)
        h.move([l0, r0], [l1, r1], 0.6)
        h.move([l1, r1], [lp.moved(to: l1.wrist), rp.moved(to: r1.wrist)], 0.1)
        h.hold([lp.moved(to: l1.wrist), rp.moved(to: r1.wrist)], 0.3)
        let steps = h.events.reduce(0) { if case let .zoom(s) = $1 { $0 + s } else { $0 } }
        XCTAssertGreaterThanOrEqual(steps, 2)
        XCTAssertEqual(h.clicks, [], "zoom pinches must not click")
        XCTAssertFalse(h.events.contains(.dragBegin))
    }

    func testBothPalmsPushForward() {
        let h = GestureHarness()
        let l = SyntheticHand.openPalm(at: Vec2(0.3, 0.7)).with { $0.chirality = .left }
        let r = SyntheticHand.openPalm(at: Vec2(0.7, 0.7))
        h.hold([l, r], 0.6)
        h.move([l, r], [l.with { $0.size = 0.25 }, r.with { $0.size = 0.25 }], 0.35)
        h.hold([l.with { $0.size = 0.25 }, r.with { $0.size = 0.25 }], 0.3)
        XCTAssertEqual(h.discrete, [.push])
    }

    // MARK: Typing + keyboard zone

    func testSuspendedEndsDragAndBlocksEverything() {
        let h = GestureHarness()
        h.hold(p, 0.4)
        h.move(p, .pinched(), 0.1)
        h.move(.pinched(), .pinched(at: Vec2(0.62, 0.6)), 0.4)
        h.suspended = true
        h.hold(.pinched(at: Vec2(0.62, 0.6)), 0.1)
        h.move(.pinched(at: Vec2(0.62, 0.6)), p, 0.1)
        h.hold(.thumbsUp(), 1)
        XCTAssertEqual(h.discrete, [.dragBegin, .dragEnd])
        XCTAssertEqual(h.outputs.last!.mode, .suspended)
        XCTAssertNil(h.outputs.last!.pointer)
        // Resuming with the pinch still closed must not click when it opens.
        h.suspended = false
        h.hold(p, 0.3)
        XCTAssertEqual(h.clicks, [])
    }

    func testHandsInKeyboardZoneAreIgnored() {
        let h = GestureHarness()
        // Palm centre below 80 % of the frame height.
        let low = SyntheticHand.point(at: Vec2(0.5, 1.02))
        h.hold(low, 0.4)
        h.move(low, .pinched(at: Vec2(0.5, 1.02)), 0.1)
        h.move(.pinched(at: Vec2(0.5, 1.02)), low, 0.1)
        XCTAssertEqual(h.events, [])
        XCTAssertEqual(h.outputs.last!.mode, .noHand)
    }

    // MARK: Config

    func testDisabledGestureDoesNothing() {
        var c = GestureConfig()
        c.enabled.remove(.thumbsUp)
        let h = GestureHarness(config: c)
        h.hold(.thumbsUp(), 1.5)
        XCTAssertEqual(h.discrete, [])
    }

    func testSnapClaimsTheMiddlePinchRelease() {
        var c = GestureConfig()
        c.enabled.insert(.snap)
        let ready = SyntheticHand.point()
        let mid = SyntheticHand(curl: [0.7, 0, 0.1, 1, 1], pinch: 1, pinchFinger: .middle)
        // With a transient at release: snap, no right click.
        let h = GestureHarness(config: c)
        h.hold(ready, 0.4); h.move(ready, mid, 0.1); h.hold(mid, 0.1)
        var sawRelease = false
        h.onFrame = { out in
            if !sawRelease, out.mode != .pinching { sawRelease = true; h.engine.audioTransient(at: h.t) }
        }
        h.move(mid, .fist(), 0.1)
        h.hold(.fist(), 0.15)
        h.onFrame = nil
        XCTAssertTrue(sawRelease)
        XCTAssertTrue(h.events.contains(.snap), "\(h.events)")
        XCTAssertFalse(h.events.contains(.rightClick))
        // Without a transient: the right click arrives after the snap window.
        let h2 = GestureHarness(config: c)
        h2.hold(ready, 0.4); h2.move(ready, mid, 0.1); h2.hold(mid, 0.1); h2.move(mid, ready, 0.1); h2.hold(ready, 0.3)
        XCTAssertEqual(h2.events.filter { $0 == .rightClick || $0 == .snap }, [.rightClick])
    }
}
