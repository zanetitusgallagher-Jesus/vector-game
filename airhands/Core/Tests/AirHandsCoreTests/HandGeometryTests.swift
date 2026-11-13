import XCTest
@testable import AirHandsCore

final class HandGeometryTests: XCTestCase {
    func testLandmarkIndexing() {
        XCTAssertEqual(HandJoint.allCases.count, 21)
        XCTAssertEqual(Finger.index.joints, [.indexMCP, .indexPIP, .indexDIP, .indexTip])
        XCTAssertEqual(Finger.thumb.tip, .thumbTip)
        XCTAssertEqual(Finger.little.base, .littleMCP)
        XCTAssertEqual(HandSkeleton.bones.count, 23)
    }

    func testHandSizeMatchesSynthesizedSize() {
        for aspect in [4.0 / 3.0, 16.0 / 9.0] {
            let h = SyntheticHand(size: 0.2, rotation: 0.4).observation(aspectRatio: aspect)
            let g = HandGeometry(h, aspectRatio: aspect)
            XCTAssertEqual(g.handSize, 0.2, accuracy: 1e-9, "aspect \(aspect)")
        }
    }

    /// The same pose must measure the same at any distance, rotation and image aspect.
    func testPinchDistanceIsScaleRotationAndAspectInvariant() {
        var values: [Double] = []
        for size in [0.08, 0.15, 0.3] {
            for rot in [-0.6, 0, 0.9] {
                for aspect in [4.0 / 3.0, 16.0 / 9.0] {
                    let h = SyntheticHand(size: size, rotation: rot, pinch: 0.5).observation(aspectRatio: aspect)
                    values.append(HandGeometry(h, aspectRatio: aspect).pinchDistance())
                }
            }
        }
        for v in values { XCTAssertEqual(v, values[0], accuracy: 1e-9) }
    }

    func testPinchDistanceShrinksToZero() {
        let open = HandGeometry(SyntheticHand(pinch: 0).observation(), aspectRatio: 4.0 / 3.0)
        let closed = HandGeometry(SyntheticHand(pinch: 1).observation(), aspectRatio: 4.0 / 3.0)
        XCTAssertGreaterThan(open.pinchDistance(), 0.5)
        XCTAssertLessThan(closed.pinchDistance(), 0.01)
    }

    func testExtensionRatioSeparatesStraightFromCurled() {
        let point = HandGeometry(SyntheticHand.point().observation(), aspectRatio: 4.0 / 3.0)
        XCTAssertGreaterThan(point.extensionRatio(.index), 1.7)
        for f in [Finger.middle, .ring, .little] {
            XCTAssertLessThan(point.extensionRatio(f), 1.2, "\(f)")
        }
    }

    func testLeftHandIsMirrored() {
        let r = SyntheticHand(chirality: .right).observation(aspectRatio: 1)
        let l = SyntheticHand(chirality: .left).observation(aspectRatio: 1)
        XCTAssertLessThan(r[.thumbTip].position.x, r[.wrist].position.x)
        XCTAssertGreaterThan(l[.thumbTip].position.x, l[.wrist].position.x)
    }
}
