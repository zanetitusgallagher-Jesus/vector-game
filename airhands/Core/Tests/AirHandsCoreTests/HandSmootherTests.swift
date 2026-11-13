import XCTest
@testable import AirHandsCore

final class HandSmootherTests: XCTestCase {
    private let aspect = 4.0 / 3.0

    func testTrackIDIsStableWhileHandMoves() {
        let s = HandSmoother()
        var ids = Set<Int?>()
        for i in 0..<60 {
            let t = Double(i) / 30
            let f = SyntheticHand(wrist: Vec2(0.3 + 0.005 * Double(i), 0.7)).frame(at: t)
            ids.insert(s.smooth(f).hands.first?.trackID)
        }
        XCTAssertEqual(ids.count, 1)
        XCTAssertNotNil(ids.first!)
    }

    func testTwoHandsKeepSeparateTracksEvenWhenOrderSwaps() {
        let s = HandSmoother()
        var leftIDs = Set<Int>(), rightIDs = Set<Int>()
        for i in 0..<30 {
            let t = Double(i) / 30
            let l = SyntheticHand(wrist: Vec2(0.7, 0.7), chirality: .left).observation(aspectRatio: aspect)
            let r = SyntheticHand(wrist: Vec2(0.3, 0.7), chirality: .right).observation(aspectRatio: aspect)
            // Vision does not return hands in a stable order.
            let hands = i % 2 == 0 ? [l, r] : [r, l]
            let out = s.smooth(HandFrame(timestamp: t, aspectRatio: aspect, hands: hands))
            XCTAssertEqual(out.hands.count, 2)
            for h in out.hands {
                if h.chirality == .left { leftIDs.insert(h.trackID!) } else { rightIDs.insert(h.trackID!) }
            }
        }
        XCTAssertEqual(leftIDs.count, 1)
        XCTAssertEqual(rightIDs.count, 1)
        XCTAssertNotEqual(leftIDs, rightIDs)
    }

    func testLostHandStartsFreshTrackWithoutSwoosh() {
        let s = HandSmoother(lostTimeout: 0.3)
        var firstID: Int?
        for i in 0..<10 {
            firstID = s.smooth(SyntheticHand(wrist: Vec2(0.3, 0.7)).frame(at: Double(i) / 30)).hands[0].trackID
        }
        // Hand disappears for 0.5 s and comes back elsewhere.
        let back = s.smooth(SyntheticHand(wrist: Vec2(0.7, 0.5)).frame(at: 10.0 / 30 + 0.5))
        XCTAssertNotEqual(back.hands[0].trackID, firstID)
        // New track: first sample passes through unfiltered, i.e. no drag from the old spot.
        XCTAssertEqual(back.hands[0][.wrist].position.x, 0.7, accuracy: 1e-9)
    }

    func testSmoothingReducesJitterOnEveryJoint() {
        var noise = SeededNoise(seed: 3)
        let s = HandSmoother()
        let clean = SyntheticHand.point().frame(at: 0)
        var rawErr = 0.0, outErr = 0.0
        for i in 0..<200 {
            var f = noise.jitter(clean, sigma: 0.004)
            f.timestamp = Double(i) / 30
            let out = s.smooth(f)
            guard i > 30 else { continue }
            for j in 0..<HandJoint.count {
                rawErr += f.hands[0].landmarks[j].position.distance(to: clean.hands[0].landmarks[j].position)
                outErr += out.hands[0].landmarks[j].position.distance(to: clean.hands[0].landmarks[j].position)
            }
        }
        XCTAssertLessThan(outErr, rawErr / 2, "raw \(rawErr) smoothed \(outErr)")
    }

    func testUndetectedJointsAreNotFiltered() {
        let s = HandSmoother()
        var h = SyntheticHand().observation(aspectRatio: aspect)
        h[.littleTip] = Landmark(.zero, confidence: 0)
        let out = s.smooth(HandFrame(timestamp: 0, aspectRatio: aspect, hands: [h]))
        XCTAssertEqual(out.hands[0][.littleTip].confidence, 0)
    }
}
