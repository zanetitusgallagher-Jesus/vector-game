import Foundation

/// What a discrete gesture does.
public enum ActionKind: String, Codable, CaseIterable, Sendable {
    case none
    case leftClick, rightClick, doubleClick
    case playPause, nextTrack, previousTrack
    case volumeUp, volumeDown, mute
    case screenshot
    case missionControl, appExpose, showDesktop, launchpad
    case spaceLeft, spaceRight
    case zoomIn, zoomOut
    case hideAllApps
    case togglePause
    case customShortcut

    public var title: String {
        switch self {
        case .none: "Do nothing"
        case .leftClick: "Left click"
        case .rightClick: "Right click"
        case .doubleClick: "Double click"
        case .playPause: "Play / pause media"
        case .nextTrack: "Next track"
        case .previousTrack: "Previous track"
        case .volumeUp: "Volume up"
        case .volumeDown: "Volume down"
        case .mute: "Mute"
        case .screenshot: "Screenshot (region)"
        case .missionControl: "Mission Control"
        case .appExpose: "App Exposé"
        case .showDesktop: "Show Desktop"
        case .launchpad: "Launchpad / Apps"
        case .spaceLeft: "Space to the left"
        case .spaceRight: "Space to the right"
        case .zoomIn: "Zoom in (⌘=)"
        case .zoomOut: "Zoom out (⌘-)"
        case .hideAllApps: "Hide all apps"
        case .togglePause: "Pause / resume AirHands"
        case .customShortcut: "Keyboard shortcut…"
        }
    }
}

/// A key + modifiers. `keyCode` is a macOS virtual key code (kVK_*).
public struct KeyCombo: Codable, Hashable, Sendable {
    public struct Modifiers: OptionSet, Codable, Hashable, Sendable {
        public let rawValue: Int
        public init(rawValue: Int) { self.rawValue = rawValue }
        public static let command = Modifiers(rawValue: 1)
        public static let shift = Modifiers(rawValue: 2)
        public static let option = Modifiers(rawValue: 4)
        public static let control = Modifiers(rawValue: 8)
    }

    public var keyCode: Int
    public var modifiers: Modifiers

    public init(keyCode: Int, modifiers: Modifiers) { self.keyCode = keyCode; self.modifiers = modifiers }

    /// ⌃⌥Space
    public static let defaultToggle = KeyCombo(keyCode: 49, modifiers: [.control, .option])

    public var displayString: String {
        var s = ""
        if modifiers.contains(.control) { s += "⌃" }
        if modifiers.contains(.option) { s += "⌥" }
        if modifiers.contains(.shift) { s += "⇧" }
        if modifiers.contains(.command) { s += "⌘" }
        return s + (Self.keyNames[keyCode] ?? "key \(keyCode)")
    }

    static let keyNames: [Int: String] = {
        var m: [Int: String] = [
            49: "Space", 36: "Return", 48: "Tab", 51: "Delete", 53: "Esc",
            123: "←", 124: "→", 125: "↓", 126: "↑",
            24: "=", 27: "-", 33: "[", 30: "]", 41: ";", 39: "'", 43: ",", 47: ".", 44: "/", 42: "\\", 50: "`",
        ]
        let letters: [(String, Int)] = [("A", 0), ("S", 1), ("D", 2), ("F", 3), ("H", 4), ("G", 5), ("Z", 6), ("X", 7),
                                        ("C", 8), ("V", 9), ("B", 11), ("Q", 12), ("W", 13), ("E", 14), ("R", 15),
                                        ("Y", 16), ("T", 17), ("O", 31), ("U", 32), ("I", 34), ("P", 35), ("L", 37),
                                        ("J", 38), ("K", 40), ("N", 45), ("M", 46)]
        for (n, c) in letters { m[c] = n }
        let digits = [29, 18, 19, 20, 21, 23, 22, 26, 28, 25]
        for (i, c) in digits.enumerated() { m[c] = "\(i)" }
        let fkeys = [122, 120, 99, 118, 96, 97, 98, 100, 101, 109, 103, 111]
        for (i, c) in fkeys.enumerated() { m[c] = "F\(i + 1)" }
        return m
    }()
}

public struct GestureBinding: Codable, Hashable, Sendable {
    public var action: ActionKind
    public var shortcut: KeyCombo?
    public init(_ action: ActionKind, shortcut: KeyCombo? = nil) { self.action = action; self.shortcut = shortcut }
}

/// Everything the user can change. Stored as JSON in UserDefaults; unknown/missing keys fall
/// back to defaults, so adding settings never wipes old ones.
public struct AppSettings: Codable, Hashable, Sendable {
    public var gesture = GestureConfig()
    public var pointer = PointerTuning()
    public var smoothing = SmoothingParameters()
    /// Keyed by `GestureKind.rawValue`.
    public var bindings: [String: GestureBinding] = AppSettings.defaultBindings

    public var activeZone = ScreenMapper.defaultActiveZone
    /// Scroll pixels per hand size of finger travel.
    public var scrollSpeed = 1.0
    public var naturalScroll = true
    public var scrollMomentum = true

    public var typingPauseEnabled = true
    public var typingResumeDelay = 0.7

    public var batterySaver = true
    public var debugOverlay = false
    public var showReticle = true
    public var toggleHotkey = KeyCombo.defaultToggle
    public var onboardingCompleted = false

    public init() {}

    public static let defaultBindings: [String: GestureBinding] = [
        GestureKind.middlePinch.rawValue: GestureBinding(.rightClick),
        GestureKind.swipeLeft.rawValue: GestureBinding(.spaceLeft),
        GestureKind.swipeRight.rawValue: GestureBinding(.spaceRight),
        GestureKind.swipeUp.rawValue: GestureBinding(.missionControl),
        GestureKind.swipeDown.rawValue: GestureBinding(.showDesktop),
        GestureKind.thumbsUp.rawValue: GestureBinding(.playPause),
        GestureKind.peace.rawValue: GestureBinding(.screenshot),
        GestureKind.stopPalm.rawValue: GestureBinding(.togglePause),
        GestureKind.twoHandPush.rawValue: GestureBinding(.appExpose),
        GestureKind.snap.rawValue: GestureBinding(.hideAllApps),
    ]

    public func binding(for g: GestureKind) -> GestureBinding {
        bindings[g.rawValue] ?? Self.defaultBindings[g.rawValue] ?? GestureBinding(.none)
    }

    public mutating func setBinding(_ b: GestureBinding, for g: GestureKind) { bindings[g.rawValue] = b }

    public func isEnabled(_ g: GestureKind) -> Bool { gesture.enabled.contains(g) }

    public mutating func setEnabled(_ on: Bool, _ g: GestureKind) {
        if on { gesture.enabled.insert(g) } else { gesture.enabled.remove(g) }
    }

    // MARK: Persistence

    public func encoded() throws -> Data {
        let enc = JSONEncoder()
        enc.outputFormatting = [.sortedKeys]
        return try enc.encode(self)
    }

    /// Decodes stored settings on top of the defaults (missing keys keep default values).
    public static func decode(_ data: Data) -> AppSettings {
        guard let defaults = try? JSONSerialization.jsonObject(with: AppSettings().encoded()) as? [String: Any],
              let stored = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let mergedData = try? JSONSerialization.data(withJSONObject: merge(defaults, stored)),
              let s = try? JSONDecoder().decode(AppSettings.self, from: mergedData) else {
            return AppSettings()
        }
        return s
    }

    static func merge(_ base: [String: Any], _ over: [String: Any]) -> [String: Any] {
        var out = base
        for (k, v) in over {
            if let b = base[k] as? [String: Any], let o = v as? [String: Any] {
                out[k] = merge(b, o)
            } else {
                out[k] = v
            }
        }
        return out
    }
}
