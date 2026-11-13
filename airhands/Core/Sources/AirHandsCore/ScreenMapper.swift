import Foundation

/// Maps a point in the camera's "active zone" onto the desktop.
///
/// Displays are given in global Quartz coordinates (origin top-left of the primary display,
/// y down — the same space `CGEvent` uses). The active zone is linearly stretched over the
/// bounding box of all displays; the result is then clamped onto the nearest real display so
/// the cursor never lands in the dead space of an L-shaped or staggered arrangement.
public struct ScreenMapper: Hashable, Codable, Sendable {
    /// Region of the (mirrored, normalized) camera frame that covers the whole desktop.
    public var activeZone: Rect
    public var displays: [Rect]

    public init(activeZone: Rect = ScreenMapper.defaultActiveZone, displays: [Rect]) {
        self.activeZone = activeZone
        self.displays = displays
    }

    /// Hands rarely reach the frame edges (the landmarks would leave the image), so by
    /// default the middle of the frame covers the screen. The bottom is left for the
    /// keyboard zone. Calibration (milestone 5) replaces this.
    public static let defaultActiveZone = Rect(x: 0.2, y: 0.12, width: 0.6, height: 0.56)

    public var desktopBounds: Rect {
        guard var u = displays.first else { return Rect(x: 0, y: 0, width: 1, height: 1) }
        for d in displays.dropFirst() { u = u.union(d) }
        return u
    }

    /// Normalized position within the active zone (0...1 each axis, unclamped).
    public func zonePosition(_ camera: Vec2) -> Vec2 {
        Vec2((camera.x - activeZone.x) / max(activeZone.width, 1e-6),
             (camera.y - activeZone.y) / max(activeZone.height, 1e-6))
    }

    /// Camera point → global desktop point, always on some display.
    public func map(_ camera: Vec2) -> Vec2 {
        let z = zonePosition(camera)
        let b = desktopBounds
        let raw = Vec2(b.x + min(max(z.x, 0), 1) * b.width, b.y + min(max(z.y, 0), 1) * b.height)
        return clampToDisplays(raw)
    }

    public func clampToDisplays(_ p: Vec2) -> Vec2 {
        guard !displays.isEmpty else { return p }
        if let d = displays.first(where: { $0.contains(p) }) { return d.clamp(p, inset: 1) }
        var best = p, bestDist = Double.infinity
        for d in displays {
            let c = d.clamp(p, inset: 1)
            let dist = c.distance(to: p)
            if dist < bestDist { bestDist = dist; best = c }
        }
        return best
    }
}
