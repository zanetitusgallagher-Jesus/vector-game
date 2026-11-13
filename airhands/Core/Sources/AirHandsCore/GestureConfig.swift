import Foundation

/// Every gesture the engine can recognise. Raw values are stable (stored in settings).
public enum GestureKind: String, Codable, CaseIterable, Sendable {
    case pointer          // POINT pose moves the cursor
    case pinchClick       // thumb+index tap / double tap
    case pinchDrag        // thumb+index hold + move
    case middlePinch      // thumb+middle
    case scroll           // index+middle together, move
    case knob             // pinch + rotate
    case swipeLeft, swipeRight, swipeUp, swipeDown   // open palm
    case fistGrab         // grab / move / throw window
    case thumbsUp
    case peace
    case stopPalm         // fanned palm held still → pause/resume
    case twoHandZoom
    case twoHandPush
    case snap

    public var title: String {
        switch self {
        case .pointer: "Point to move cursor"
        case .pinchClick: "Pinch (thumb + index)"
        case .pinchDrag: "Pinch, hold and move"
        case .middlePinch: "Pinch (thumb + middle)"
        case .scroll: "Two fingers, move"
        case .knob: "Pinch and rotate"
        case .swipeLeft: "Open palm swipe left"
        case .swipeRight: "Open palm swipe right"
        case .swipeUp: "Open palm swipe up"
        case .swipeDown: "Open palm swipe down"
        case .fistGrab: "Fist grab, move, release"
        case .thumbsUp: "Thumbs up (hold)"
        case .peace: "Peace sign (hold)"
        case .stopPalm: "Palm to camera (hold still)"
        case .twoHandZoom: "Both hands pinch, spread"
        case .twoHandPush: "Both palms push forward"
        case .snap: "Finger snap (uses microphone)"
        }
    }

    /// Discrete gestures whose action can be remapped; the rest are continuous controls that
    /// can only be switched on or off.
    public var isRemappable: Bool {
        switch self {
        case .middlePinch, .swipeLeft, .swipeRight, .swipeUp, .swipeDown, .thumbsUp, .peace,
             .stopPalm, .twoHandPush, .snap: true
        default: false
        }
    }
}

/// Thresholds and timings. Distances in hand sizes, times in seconds.
public struct GestureConfig: Codable, Hashable, Sendable {
    public var pinchEnter = 0.25
    public var pinchExit = 0.38
    /// Pinch must stay closed this long to count (rejects one-frame noise).
    public var pinchDebounce = 0.05
    /// Pinch held longer than this without moving starts a drag (press and hold).
    public var longPress = 0.55
    /// Pinch point travel that turns a pinch into a drag.
    public var dragThreshold = 0.15
    public var doubleClickWindow = 0.4
    /// Hand roll (degrees) that turns a still pinch into the volume knob, and per step.
    public var knobEnterDegrees = 18.0
    public var knobStepDegrees = 12.0
    /// Pinches starting while the palm moves faster than this (hand sizes / s) are ignored.
    public var maxPinchOnsetSpeed = 2.5
    /// Precision mode: cursor gain falls from 1 at `precisionFar` to `precisionMinGain` at the pinch.
    public var precisionFar = 0.65
    public var precisionMinGain = 0.3
    public var precisionEnabled = true

    public var scrollTogetherMax = 0.5
    public var peaceSpreadMin = 0.6
    public var scrollStartDelay = 0.08

    public var swipeDistance = 1.3
    public var swipeWindow = 0.35
    public var swipeCooldown = 0.8
    public var swipeMinTrackAge = 0.5

    public var grabHold = 0.25
    public var throwSpeed = 4.0

    public var thumbsUpHold = 0.5
    public var peaceHold = 0.5
    public var stopHold = 1.0
    public var stopFanMin = 1.4
    public var stillSpeed = 0.5

    public var zoomStepRatio = 1.15
    public var pushGrowth = 1.25
    public var pushWindow = 0.6
    public var twoHandCooldown = 1.0

    /// Bottom fraction of the camera frame where hands are ignored (resting on the keyboard).
    public var keyboardZoneHeight = 0.2
    public var dominant: Chirality = .right
    /// How long a lost hand keeps its state before drags etc. are released.
    public var lostGrace = 0.2
    /// Max time between the thumb+middle release and a microphone transient for a snap.
    public var snapWindow = 0.15

    public var enabled: Set<GestureKind> = Set(GestureKind.allCases).subtracting([.snap])

    public init() {}

    public func isOn(_ g: GestureKind) -> Bool { enabled.contains(g) }
}
