import XCTest
@testable import AirHandsCore

final class RecorderTests: XCTestCase {
    func testRecorderRebasesTimestampsAndOnlyRecordsWhileOn() {
        let r = LandmarkRecorder()
        r.append(SyntheticHand().frame(at: 99))           // not recording: dropped
        r.start(label: "test")
        for i in 0..<5 { r.append(SyntheticHand().frame(at: 1000 + Double(i) * 0.033)) }
        XCTAssertEqual(r.frameCount, 5)
        let rec = try! XCTUnwrap(r.stop())
        XCTAssertFalse(r.isRecording)
        XCTAssertNil(r.stop())
        XCTAssertEqual(rec.label, "test")
        XCTAssertEqual(rec.frames.count, 5)
        XCTAssertEqual(rec.frames[0].timestamp, 0)
        XCTAssertEqual(rec.duration, 4 * 0.033, accuracy: 1e-9)
    }

    func testJSONRoundTrip() throws {
        var frames: [HandFrame] = []
        for i in 0..<10 {
            var f = SyntheticHand(wrist: Vec2(0.4 + Double(i) * 0.01, 0.6), pinch: Double(i) / 10).frame(at: Double(i) / 30)
            f.hands[0].trackID = 1
            frames.append(f)
        }
        let rec = LandmarkRecording(label: "round trip", createdAt: Date(timeIntervalSince1970: 1_700_000_000), frames: frames)
        let back = try LandmarkRecording.decode(rec.jsonData())
        XCTAssertEqual(back.label, rec.label)
        XCTAssertEqual(back.createdAt, rec.createdAt)
        XCTAssertEqual(back.frames.count, 10)
        // Positions are stored at 5 decimals.
        for (a, b) in zip(back.frames, rec.frames) {
            XCTAssertEqual(a.timestamp, b.timestamp, accuracy: 1e-9)
            XCTAssertEqual(a.hands[0].trackID, 1)
            for j in 0..<21 {
                XCTAssertEqual(a.hands[0].landmarks[j].position.x, b.hands[0].landmarks[j].position.x, accuracy: 1e-5)
                XCTAssertEqual(a.hands[0].landmarks[j].position.y, b.hands[0].landmarks[j].position.y, accuracy: 1e-5)
            }
        }
    }

    func testRejectsFutureVersion() throws {
        var rec = LandmarkRecording(label: "x", frames: [])
        rec.version = 99
        XCTAssertThrowsError(try LandmarkRecording.decode(rec.jsonData())) { err in
            XCTAssertEqual(err as? RecordingError, .unsupportedVersion(99))
        }
    }

    func testReplayerFeedsFramesInOrderWithOffset() {
        let rec = LandmarkRecording(label: "x", frames: (0..<4).map { SyntheticHand().frame(at: Double($0)) })
        var seen: [Double] = []
        LandmarkReplayer(rec).replay(startingAt: 10) { seen.append($0.timestamp) }
        XCTAssertEqual(seen, [10, 11, 12, 13])
    }

    /// The checked-in fixture pins the on-disk format: if this breaks, old recordings break.
    func testDecodesCheckedInFixture() throws {
        let url = try XCTUnwrap(Bundle.module.url(forResource: "open_palm_still", withExtension: "json", subdirectory: "Fixtures"))
        let rec = try LandmarkRecording.load(from: url)
        XCTAssertEqual(rec.version, 1)
        XCTAssertEqual(rec.frames.count, 30)
        XCTAssertEqual(rec.frames[0].hands.count, 1)
        XCTAssertEqual(rec.frames[0].hands[0].landmarks.count, 21)
        XCTAssertEqual(rec.frames[0].hands[0].chirality, .right)
        // Replaying through the smoother must work and keep one track.
        let s = HandSmoother()
        var ids = Set<Int>()
        LandmarkReplayer(rec).replay { f in s.smooth(f).hands.forEach { ids.insert($0.trackID!) } }
        XCTAssertEqual(ids.count, 1)
    }

    func testStats() {
        var r = RollingStats(capacity: 4)
        for v in [1.0, 2, 3, 4, 5] { r.add(v) }   // 1 is evicted
        XCTAssertEqual(r.count, 4)
        XCTAssertEqual(r.mean, 3.5)
        XCTAssertEqual(r.percentile(50), 3)
        XCTAssertEqual(r.percentile(95), 5)
        var fps = FPSMeter(window: 1)
        for i in 0...60 { fps.tick(Double(i) / 30) }
        XCTAssertEqual(fps.fps, 30, accuracy: 0.01)
    }
}
