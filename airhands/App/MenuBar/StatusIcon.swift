import AppKit

enum TrackingStatus: Equatable {
    case off
    case starting
    case on            // camera running, no hand in view
    case tracking      // a hand is being tracked
    case pausedTyping  // milestone 3
    case error(String)

    var label: String {
        switch self {
        case .off: "Off"
        case .starting: "Starting camera…"
        case .on: "On — no hand in view"
        case .tracking: "Tracking"
        case .pausedTyping: "Paused — typing"
        case .error(let msg): "Error: \(msg)"
        }
    }
}

/// Menu bar icon. Off = grey, on = standard menu bar color (white on a dark menu bar),
/// tracking = cyan, paused for typing = amber.
enum StatusIcon {
    static func image(for status: TrackingStatus) -> NSImage {
        let symbol: String
        let color: NSColor?
        switch status {
        case .off: symbol = "hand.raised.slash"; color = .systemGray
        case .starting, .on: symbol = "hand.raised"; color = nil
        case .tracking: symbol = "hand.point.up.left.fill"; color = NSColor(calibratedRed: 0.2, green: 0.9, blue: 1, alpha: 1)
        case .pausedTyping: symbol = "keyboard"; color = .systemOrange
        case .error: symbol = "exclamationmark.triangle"; color = .systemOrange
        }
        let base = NSImage(systemSymbolName: symbol, accessibilityDescription: "AirHands \(status.label)")
            ?? NSImage(systemSymbolName: "hand.raised", accessibilityDescription: "AirHands")!
        let sized = base.withSymbolConfiguration(.init(pointSize: 14, weight: .medium)) ?? base
        guard let color else {
            sized.isTemplate = true
            return sized
        }
        let tinted = sized.withSymbolConfiguration(.init(paletteColors: [color])) ?? sized
        tinted.isTemplate = false
        return tinted
    }
}
