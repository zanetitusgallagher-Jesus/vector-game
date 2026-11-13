import XCTest
@testable import AirHandsCore

final class ScreenMapperTests: XCTestCase {
    private let laptop = Rect(x: 0, y: 0, width: 1512, height: 982)

    func testZoneCornersMapToScreenCorners() {
        let m = ScreenMapper(activeZone: Rect(x: 0.2, y: 0.1, width: 0.6, height: 0.6), displays: [laptop])
        let tl = m.map(Vec2(0.2, 0.1)), br = m.map(Vec2(0.8, 0.7)), c = m.map(Vec2(0.5, 0.4))
        XCTAssertEqual(tl.x, 0, accuracy: 1e-9); XCTAssertEqual(tl.y, 0, accuracy: 1e-9)
        XCTAssertEqual(br.x, 1511, accuracy: 1e-9); XCTAssertEqual(br.y, 981, accuracy: 1e-9)
        XCTAssertEqual(c.x, 756, accuracy: 1e-6); XCTAssertEqual(c.y, 491, accuracy: 1e-6)
    }

    func testOutsideZoneClampsToEdge() {
        let m = ScreenMapper(activeZone: Rect(x: 0.2, y: 0.1, width: 0.6, height: 0.6), displays: [laptop])
        let p = m.map(Vec2(-0.5, 2))
        XCTAssertEqual(p.x, 0); XCTAssertEqual(p.y, 981)
    }

    func testMultiDisplayDeadSpaceClampsToNearestDisplay() {
        // External 2560x1440 to the right of the laptop, aligned at the top.
        let ext = Rect(x: 1512, y: -200, width: 2560, height: 1440)
        let m = ScreenMapper(activeZone: .unit, displays: [laptop, ext])
        XCTAssertEqual(m.desktopBounds, Rect(x: 0, y: -200, width: 4072, height: 1440))
        // Top-left of the zone is above the laptop (dead space) → nearest laptop point.
        let p = m.map(Vec2(0, 0))
        XCTAssertEqual(p.x, 0); XCTAssertEqual(p.y, 0)
        // Right half lands on the external display.
        let q = m.map(Vec2(0.9, 0.5))
        XCTAssertTrue(ext.contains(q))
    }

    func testNoDisplaysIsHarmless() {
        let m = ScreenMapper(displays: [])
        _ = m.map(Vec2(0.5, 0.5))
    }
}
