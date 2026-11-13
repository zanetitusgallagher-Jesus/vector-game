import Foundation

/// A 2D point / vector in Double precision. Core avoids CoreGraphics so it stays portable.
public struct Vec2: Hashable, Codable, Sendable {
    public var x: Double
    public var y: Double

    public init(_ x: Double, _ y: Double) { self.x = x; self.y = y }
    public init(x: Double, y: Double) { self.x = x; self.y = y }

    public static let zero = Vec2(0, 0)

    public var length: Double { (x * x + y * y).squareRoot() }
    public func distance(to other: Vec2) -> Double { (self - other).length }

    public static func + (a: Vec2, b: Vec2) -> Vec2 { Vec2(a.x + b.x, a.y + b.y) }
    public static func - (a: Vec2, b: Vec2) -> Vec2 { Vec2(a.x - b.x, a.y - b.y) }
    public static func * (a: Vec2, s: Double) -> Vec2 { Vec2(a.x * s, a.y * s) }
    public static func / (a: Vec2, s: Double) -> Vec2 { Vec2(a.x / s, a.y / s) }

    public func rotated(by radians: Double) -> Vec2 {
        let c = cos(radians), s = sin(radians)
        return Vec2(x * c - y * s, x * s + y * c)
    }

    public func lerp(to other: Vec2, _ t: Double) -> Vec2 { self + (other - self) * t }
}

/// Axis-aligned rectangle. In global display space the origin is top-left, y grows down
/// (Quartz / CGEvent convention). In camera space it is normalized 0...1, also top-left.
public struct Rect: Hashable, Codable, Sendable {
    public var x: Double
    public var y: Double
    public var width: Double
    public var height: Double

    public init(x: Double, y: Double, width: Double, height: Double) {
        self.x = x; self.y = y; self.width = width; self.height = height
    }

    public static let unit = Rect(x: 0, y: 0, width: 1, height: 1)

    public var minX: Double { x }
    public var minY: Double { y }
    public var maxX: Double { x + width }
    public var maxY: Double { y + height }
    public var center: Vec2 { Vec2(x + width / 2, y + height / 2) }

    public func contains(_ p: Vec2) -> Bool {
        p.x >= minX && p.x < maxX && p.y >= minY && p.y < maxY
    }

    /// Closest point inside the rect (max edge pulled in by `inset` so it stays "inside").
    public func clamp(_ p: Vec2, inset: Double = 0) -> Vec2 {
        Vec2(min(max(p.x, minX), maxX - inset), min(max(p.y, minY), maxY - inset))
    }

    public func union(_ o: Rect) -> Rect {
        let nx = min(minX, o.minX), ny = min(minY, o.minY)
        return Rect(x: nx, y: ny, width: max(maxX, o.maxX) - nx, height: max(maxY, o.maxY) - ny)
    }
}
