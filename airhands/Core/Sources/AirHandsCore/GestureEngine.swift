import Foundation

public enum SwipeDirection: String, Codable, Sendable {
    case left, right, up, down
}

/// Discrete things that happened this frame. Continuous cursor motion is in
/// `GestureOutput.pointer`, not here.
public enum GestureEvent: Equatable, Sendable {
    case click(count: Int)
    case rightClick
    case dragBegin
    case dragEnd
    /// Two-finger scroll motion this frame, in hand sizes (x right, y down, camera direction).
    case scroll(dx: Double, dy: Double)
    /// Scroll pose released; velocity in hand sizes per second (for momentum).
    case scrollEnd(vx: Double, vy: Double)
    /// Knob turned by whole steps (+ = clockwise as the user sees it).
    case knob(steps: Int)
    case swipe(SwipeDirection)
    case grabBegin
    /// Fist released; velocity in hand sizes per second (for throws).
    case grabEnd(vx: Double, vy: Double)
    case thumbsUp
    case peace
    case stopPalm
    /// + = hands moved apart.
    case zoom(steps: Int)
    case push
    case snap
}

public enum EngineMode: String, Sendable {
    case noHand, idle, pointing, pinching, dragging, knob, scrolling, grabbing, zooming, paused, suspended

    public var label: String {
        switch self {
        case .noHand: ""
        case .idle: "clutch"
        case .pointing: ""
        case .pinching: "pinch"
        case .dragging: "drag"
        case .knob: "volume"
        case .scrolling: "scroll"
        case .grabbing: "grab"
        case .zooming: "zoom"
        case .paused: "paused"
        case .suspended: "typing — paused"
        }
    }
}

/// What should drive the cursor this frame.
public struct PointerInput: Equatable, Sendable {
    /// Source point in normalized camera coordinates.
    public var camera: Vec2
    /// Changes whenever the source point changes (finger tip → pinch point → palm…), so the
    /// pointer controller can re-anchor instead of jumping.
    public var sourceID: Int
    /// Cursor gain, < 1 in precision mode.
    public var gain: Double
    /// Cursor must not move (pinch about to click).
    public var locked: Bool
}

public struct GestureOutput: Sendable {
    public var events: [GestureEvent] = []
    public var pointer: PointerInput?
    public var mode: EngineMode = .noHand
    /// 0...1: pinch approach while pointing, or progress of a timed hold.
    public var progress: Double = 0
    public var primaryTrackID: Int?
    public var handCount = 0
}

/// Pure gesture state machine: `HandFrame`s in, `GestureOutput`s out. No camera, no OS.
///
/// Rules: every threshold is in hand sizes with hysteresis; every discrete gesture has a
/// minimum duration; when two interpretations compete, the engine waits rather than guesses.
public final class GestureEngine {
    public var config: GestureConfig {
        didSet { applyConfigToGates() }
    }
    /// While paused only the stop-palm gesture is recognised (to resume).
    public var paused = false

    // MARK: Per-track memory

    private struct Sample { var t: Double; var palm: Vec2; var size: Double }

    private struct TrackMemory {
        var fingers = FingerStates()
        var indexGate: HysteresisGate
        var middleGate: HysteresisGate
        var indexBlocked = false     // pinch started while ineligible: ignore until released
        var middleBlocked = false
        /// When the thumb+middle gate closed; the pinch may still become valid shortly after
        /// (the middle finger is often still "curled" at first contact).
        var middleOnset: Double?
        var firstSeen: Double
        var lastSeen: Double
        var history: [Sample] = []
        var pose: Pose = .none
        var poseSince: Double

        init(t: Double, config: GestureConfig) {
            indexGate = HysteresisGate(enter: config.pinchEnter, exit: config.pinchExit, activeBelow: true)
            middleGate = HysteresisGate(enter: config.pinchEnter, exit: config.pinchExit, activeBelow: true)
            firstSeen = t; lastSeen = t; poseSince = t
        }

        func velocity(over window: Double, now: Double) -> Vec2 {
            guard let last = history.last,
                  let first = history.last(where: { now - $0.t >= window }) ?? history.first,
                  last.t - first.t > 1e-3 else { return .zero }
            return (last.palm - first.palm) / (last.t - first.t) / max(last.size, 1e-4)
        }
    }

    private enum Single: Equatable {
        case idle
        case pinchPending(start: Double, p0: Vec2, angle0: Double)
        case dragging
        case knob(ref: Double)
        case rightPinch
        case scrolling(last: Vec2)
        case grabbing
    }

    private var tracks: [Int: TrackMemory] = [:]
    private var primaryID: Int?
    private var single: Single = .idle
    private var scrollPendingSince: Double?
    private var scrollVelocity = Vec2.zero

    private var lastClick: (t: Double, count: Int)?
    private var swipeCooldownUntil = -Double.infinity
    private var swipeCandidate: (dir: SwipeDirection, t: Double)?
    private var grabHold: HoldTimer
    private var thumbsHold: HoldTimer
    private var peaceHold: HoldTimer
    private var stopHold: HoldTimer

    private var zoomRef: Double?
    private var twoHandCooldownUntil = -Double.infinity

    private var middleReleaseTime: Double?
    private var pendingRightClickDeadline: Double?
    private var lastTransient: Double?

    public init(config: GestureConfig = GestureConfig()) {
        self.config = config
        grabHold = HoldTimer(duration: config.grabHold)
        thumbsHold = HoldTimer(duration: config.thumbsUpHold)
        peaceHold = HoldTimer(duration: config.peaceHold)
        stopHold = HoldTimer(duration: config.stopHold)
    }

    private func applyConfigToGates() {
        for k in tracks.keys {
            tracks[k]!.indexGate.enter = config.pinchEnter; tracks[k]!.indexGate.exit = config.pinchExit
            tracks[k]!.middleGate.enter = config.pinchEnter; tracks[k]!.middleGate.exit = config.pinchExit
        }
        grabHold.duration = config.grabHold
        thumbsHold.duration = config.thumbsUpHold
        peaceHold.duration = config.peaceHold
        stopHold.duration = config.stopHold
    }

    public func reset() {
        tracks.removeAll(); primaryID = nil; single = .idle; scrollPendingSince = nil
        swipeCandidate = nil; zoomRef = nil; lastClick = nil
        grabHold.reset(); thumbsHold.reset(); peaceHold.reset(); stopHold.reset()
        middleReleaseTime = nil; pendingRightClickDeadline = nil
    }

    /// Report a sharp microphone transient (finger snap candidate) at host time `t`.
    public func audioTransient(at t: Double) {
        lastTransient = t
    }

    // MARK: - Frame processing

    public func process(_ frame: HandFrame, suspended: Bool = false) -> GestureOutput {
        let t = frame.timestamp
        var out = GestureOutput()

        // Hands resting in the keyboard zone at the bottom of the frame are ignored entirely.
        // Frames should come from HandSmoother (stable track IDs); raw frames get positional IDs.
        let features = frame.hands.enumerated()
            .map { i, h -> HandFeatures in
                var h = h
                if h.trackID == nil { h.trackID = 1000 + i }
                return HandFeatures(h, aspectRatio: frame.aspectRatio)
            }
            .filter { $0.palmCamera.y <= 1 - config.keyboardZoneHeight }
        out.handCount = features.count

        for f in features { updateTrack(f, t: t) }
        tracks = tracks.filter { t - $0.value.lastSeen < 2.0 }

        resolveDeferredRightClick(t: t, into: &out)

        if suspended {
            endAll(into: &out)
            out.mode = .suspended
            return out
        }

        // Keep the current primary hand while it is visible; otherwise pick the dominant one.
        let present = Dictionary(uniqueKeysWithValues: features.map { ($0.trackID, $0) })
        if let id = primaryID, present[id] == nil {
            if let mem = tracks[id], t - mem.lastSeen < config.lostGrace {
                out.mode = mode(); out.primaryTrackID = id
                return out   // brief dropout: hold state, no pointer, no events
            }
            endAll(into: &out)
            primaryID = nil
        }
        if primaryID == nil {
            primaryID = (features.first { $0.chirality == config.dominant } ?? features.first)?.trackID
        }
        guard let pid = primaryID, let primary = present[pid] else {
            out.mode = paused ? .paused : .noHand
            return out
        }
        out.primaryTrackID = pid

        if paused {
            out.mode = .paused
            checkStop(primary, t: t, into: &out)
            return out
        }

        if let other = features.first(where: { $0.trackID != pid }), handleTwoHands(primary, other, t: t, into: &out) {
            out.mode = .zooming
            return out
        } else if zoomRef != nil {
            zoomRef = nil
        }

        processSingle(primary, t: t, into: &out)
        return out
    }

    private func updateTrack(_ f: HandFeatures, t: Double) {
        var m = tracks[f.trackID] ?? TrackMemory(t: t, config: config)
        m.fingers.update(f)
        let pose = m.fingers.pose(f)
        if pose != m.pose { m.pose = pose; m.poseSince = t }
        m.lastSeen = t
        m.history.append(Sample(t: t, palm: f.palmIso, size: f.handSize))
        if let cut = m.history.firstIndex(where: { t - $0.t <= 0.7 }), cut > 0 { m.history.removeFirst(cut) }
        tracks[f.trackID] = m
    }

    private func mode() -> EngineMode {
        switch single {
        case .idle: .idle
        case .pinchPending, .rightPinch: .pinching
        case .dragging: .dragging
        case .knob: .knob
        case .scrolling: .scrolling
        case .grabbing: .grabbing
        }
    }

    /// Releases anything held (mouse button, scroll, grab) — on hand loss, typing, pause.
    private func endAll(into out: inout GestureOutput) {
        switch single {
        case .dragging: out.events.append(.dragEnd)
        case .scrolling: out.events.append(.scrollEnd(vx: 0, vy: 0))
        case .grabbing: out.events.append(.grabEnd(vx: 0, vy: 0))
        default: break
        }
        single = .idle
        scrollPendingSince = nil
        swipeCandidate = nil
        zoomRef = nil
        grabHold.reset(); thumbsHold.reset(); peaceHold.reset(); stopHold.reset()
        if let id = primaryID, tracks[id] != nil {
            // Whatever pinch is closed right now must open before it can do anything.
            if tracks[id]!.indexGate.isOn { tracks[id]!.indexBlocked = true }
            if tracks[id]!.middleGate.isOn { tracks[id]!.middleBlocked = true }
        }
    }

    // MARK: - Single hand

    private func processSingle(_ f: HandFeatures, t: Double, into out: inout GestureOutput) {
        let id = f.trackID
        guard var m = tracks[id] else { return }
        defer { tracks[id] = m }

        let wasIndex = m.indexGate.isOn, wasMiddle = m.middleGate.isOn
        let indexOn = m.indexGate.update(f.pinchIndex)
        let middleOn = m.middleGate.update(f.pinchMiddle) && f.pinchIndex > config.pinchExit
        if !indexOn { m.indexBlocked = false }
        if !middleOn { m.middleBlocked = false; m.middleOnset = nil }
        if middleOn && !wasMiddle { m.middleOnset = t }
        let speed = m.velocity(over: 0.1, now: t).length
        let pose = m.pose
        let fingers = m.fingers

        // ---- Continue the current interaction --------------------------------------------
        switch single {
        case let .pinchPending(start, p0, angle0):
            if !indexOn {
                single = .idle
                if t - start >= config.pinchDebounce, config.isOn(.pinchClick) {
                    let count = (lastClick.map { t - $0.t <= config.doubleClickWindow } ?? false) ? min(lastClick!.count + 1, 3) : 1
                    lastClick = (t, count)
                    out.events.append(.click(count: count))
                }
            } else if t - start >= config.pinchDebounce {
                let moved = (f.pinchPointIso - p0).length / f.handSize
                let turned = angleDelta(f.orientation, angle0) * 180 / .pi
                // Turning about the pinch point also moves it a little: while the hand is
                // clearly rotating, wait for the knob decision instead of starting a drag.
                let rotating = config.isOn(.knob) && abs(turned) >= config.knobEnterDegrees * 0.4
                if config.isOn(.knob), abs(turned) >= config.knobEnterDegrees, moved < config.dragThreshold * 2.5 {
                    single = .knob(ref: angle0)
                } else if config.isOn(.pinchDrag),
                          (moved >= config.dragThreshold && !rotating) || moved >= config.dragThreshold * 2.5
                            || (t - start >= config.longPress && !rotating) {
                    single = .dragging
                    lastClick = nil
                    out.events.append(.dragBegin)
                }
            }
            if case .pinchPending = single {
                out.mode = .pinching
                out.progress = 1
                out.pointer = PointerInput(camera: f.pinchPointCamera, sourceID: id * 10 + 2, gain: 1, locked: true)
                return
            }
            if case .knob = single { out.mode = .knob; return }
            if case .dragging = single {
                out.mode = .dragging
                out.pointer = PointerInput(camera: f.pinchPointCamera, sourceID: id * 10 + 2, gain: 1, locked: false)
                return
            }
            if !indexOn { break }   // clicked → fall through to idle handling below
        case .dragging:
            if indexOn {
                out.mode = .dragging
                out.pointer = PointerInput(camera: f.pinchPointCamera, sourceID: id * 10 + 2, gain: 1, locked: false)
                return
            }
            single = .idle
            out.events.append(.dragEnd)
        case let .knob(ref):
            if indexOn {
                let deg = angleDelta(f.orientation, ref) * 180 / .pi
                let steps = Int(deg / config.knobStepDegrees)
                if steps != 0 {
                    out.events.append(.knob(steps: steps))
                    single = .knob(ref: ref + Double(steps) * config.knobStepDegrees * .pi / 180)
                }
                out.mode = .knob
                return
            }
            single = .idle
        case .rightPinch:
            if middleOn { out.mode = .pinching; out.progress = 1; return }
            single = .idle
            middleReleaseTime = t
            if config.isOn(.snap) {
                // Right click is deferred briefly so a snap (same motion) can claim it.
                pendingRightClickDeadline = config.isOn(.middlePinch) ? t + config.snapWindow : nil
                if let tr = lastTransient, abs(tr - t) <= config.snapWindow {
                    pendingRightClickDeadline = nil
                    lastTransient = nil
                    out.events.append(.snap)
                }
            }
        case let .scrolling(last):
            let stillTwo = pose == .two && f.indexMiddleGap < config.scrollTogetherMax + 0.1
            if stillTwo {
                let p = f.twoFingerPointIso
                let d = (p - last) / f.handSize
                if d.length > 1e-4 { out.events.append(.scroll(dx: d.x, dy: d.y)) }
                // Exponential velocity estimate for momentum.
                if let prev = m.history.dropLast().last {
                    let dt = max(t - prev.t, 1e-3)
                    scrollVelocity = scrollVelocity.lerp(to: d / dt, 0.35)
                }
                single = .scrolling(last: p)
                out.mode = .scrolling
                return
            }
            single = .idle
            out.events.append(.scrollEnd(vx: scrollVelocity.x, vy: scrollVelocity.y))
            scrollVelocity = .zero
        case .grabbing:
            if pose == .fist || pose == .thumbsUp {
                out.mode = .grabbing
                out.pointer = PointerInput(camera: f.palmCamera, sourceID: id * 10 + 3, gain: 1, locked: false)
                return
            }
            single = .idle
            let v = m.velocity(over: 0.12, now: t)
            out.events.append(.grabEnd(vx: v.x, vy: v.y))
        case .idle:
            break
        }

        // ---- Idle: look for something new to start ----------------------------------------
        let indexOnset = indexOn && !wasIndex
        let middleCandidate = middleOn && !m.middleBlocked && (m.middleOnset.map { t - $0 <= 0.2 } ?? false)

        if indexOnset {
            let eligible = !fingers.isCurled[Finger.index.rawValue] && pose != .fist && pose != .thumbsUp
                && speed < config.maxPinchOnsetSpeed
                && (config.isOn(.pinchClick) || config.isOn(.pinchDrag) || config.isOn(.knob))
            if eligible && !m.indexBlocked {
                single = .pinchPending(start: t, p0: f.pinchPointIso, angle0: f.orientation)
                resetHolds()
                out.mode = .pinching
                out.progress = 1
                out.pointer = PointerInput(camera: f.pinchPointCamera, sourceID: id * 10 + 2, gain: 1, locked: true)
                return
            }
            m.indexBlocked = true
        }

        if middleCandidate, config.isOn(.middlePinch) || config.isOn(.snap) {
            let eligible = !fingers.isCurled[Finger.middle.rawValue] && !fingers.isCurled[Finger.index.rawValue]
                && pose != .fist && speed < config.maxPinchOnsetSpeed
            if eligible {
                single = .rightPinch
                resetHolds()
                if !config.isOn(.snap) && config.isOn(.middlePinch) { out.events.append(.rightClick) }
                out.mode = .pinching
                return
            }
            if speed >= config.maxPinchOnsetSpeed { m.middleBlocked = true }
        }

        // Scroll: two fingers held together for a moment.
        if config.isOn(.scroll), pose == .two, f.indexMiddleGap < config.scrollTogetherMax, !indexOn {
            if scrollPendingSince == nil { scrollPendingSince = t }
            if t - scrollPendingSince! >= config.scrollStartDelay {
                single = .scrolling(last: f.twoFingerPointIso)
                scrollVelocity = .zero
                scrollPendingSince = nil
                resetHolds()
                out.mode = .scrolling
                return
            }
        } else {
            scrollPendingSince = nil
        }

        let still = speed < config.stillSpeed

        // Fist → grab.
        if grabHold.update(config.isOn(.fistGrab) && pose == .fist, at: t) {
            single = .grabbing
            out.events.append(.grabBegin)
            out.mode = .grabbing
            out.pointer = PointerInput(camera: f.palmCamera, sourceID: id * 10 + 3, gain: 1, locked: false)
            return
        }
        if thumbsHold.update(config.isOn(.thumbsUp) && pose == .thumbsUp && still, at: t) {
            out.events.append(.thumbsUp)
        }
        let peaceShape = pose == .two && f.indexMiddleGap >= config.peaceSpreadMin
        if peaceHold.update(config.isOn(.peace) && peaceShape && still, at: t) {
            out.events.append(.peace)
        }
        checkStop(f, t: t, into: &out)
        checkSwipe(f, mem: m, t: t, into: &out)

        // Pointer: POINT pose moves the cursor; anything else is the clutch.
        if config.isOn(.pointer), pose == .point || (pose == .none && fingers.isExtended[Finger.index.rawValue] && !fingers.isExtended[Finger.middle.rawValue]) {
            let span = max(config.precisionFar - config.pinchEnter, 1e-3)
            let closeness = 1 - min(max((f.pinchIndex - config.pinchEnter) / span, 0), 1)
            let gain = config.precisionEnabled ? 1 - (1 - config.precisionMinGain) * closeness : 1
            out.pointer = PointerInput(camera: f.indexTipCamera, sourceID: id * 10 + 1, gain: gain, locked: false)
            out.mode = .pointing
            out.progress = config.isOn(.pinchClick) ? closeness : 0
        } else {
            out.mode = .idle
            let holds = [grabHold.progress(at: t), thumbsHold.progress(at: t), peaceHold.progress(at: t), stopHold.progress(at: t)]
            out.progress = holds.max() ?? 0
        }
    }

    private func resetHolds() {
        grabHold.reset(); thumbsHold.reset(); peaceHold.reset(); stopHold.reset()
        swipeCandidate = nil
    }

    private func checkStop(_ f: HandFeatures, t: Double, into out: inout GestureOutput) {
        guard let m = tracks[f.trackID] else { return }
        let fanned = m.pose == .open && m.fingers.thumbExtended && f.fanWidth >= config.stopFanMin
        let still = m.velocity(over: 0.2, now: t).length < config.stillSpeed
        if stopHold.update(config.isOn(.stopPalm) && fanned && still, at: t) {
            out.events.append(.stopPalm)
        }
        if paused { out.progress = stopHold.progress(at: t) }
    }

    private func checkSwipe(_ f: HandFeatures, mem m: TrackMemory, t: Double, into out: inout GestureOutput) {
        let enabled: [SwipeDirection: GestureKind] = [.left: .swipeLeft, .right: .swipeRight, .up: .swipeUp, .down: .swipeDown]
        guard m.pose == .open else { swipeCandidate = nil; return }

        if let c = swipeCandidate {
            // Confirm only if the hand is still there and open a moment later: a hand
            // dropping out of the frame must not count as a swipe down.
            if t - c.t >= 0.08 {
                swipeCandidate = nil
                swipeCooldownUntil = t + config.swipeCooldown
                out.events.append(.swipe(c.dir))
            }
            return
        }
        guard t >= swipeCooldownUntil, t - m.firstSeen >= config.swipeMinTrackAge else { return }
        guard let old = m.history.first(where: { t - $0.t <= config.swipeWindow }),
              old.t >= m.poseSince - 1e-9, let now = m.history.last else { return }
        let d = (now.palm - old.palm) / max(now.size, 1e-4)
        let ax = abs(d.x), ay = abs(d.y)
        let dir: SwipeDirection
        if ax >= config.swipeDistance && ax >= 2 * ay {
            dir = d.x > 0 ? .right : .left
        } else if ay >= config.swipeDistance && ay >= 2 * ax {
            dir = d.y > 0 ? .down : .up
        } else { return }
        guard config.isOn(enabled[dir]!) else { return }
        swipeCandidate = (dir, t)
    }

    // MARK: - Two hands

    /// Returns true if a two-hand gesture owns this frame.
    private func handleTwoHands(_ a: HandFeatures, _ b: HandFeatures, t: Double, into out: inout GestureOutput) -> Bool {
        guard var ma = tracks[a.trackID], var mb = tracks[b.trackID] else { return false }
        // Evaluate the pinch gates on copies: if no two-hand gesture takes this frame, the
        // single-hand path must still see the primary's pinch onset.
        var ga = ma.indexGate, gb = mb.indexGate
        ga.update(a.pinchIndex)
        gb.update(b.pinchIndex)

        let bothPinch = ga.isOn && gb.isOn && !ma.indexBlocked && !mb.indexBlocked
            && !ma.fingers.isCurled[1] && !mb.fingers.isCurled[1]
        if config.isOn(.twoHandZoom), bothPinch || (zoomRef != nil && ga.isOn && gb.isOn) {
            ma.indexGate = ga; mb.indexGate = gb
            defer { tracks[a.trackID] = ma; tracks[b.trackID] = mb }
            let d = a.pinchPointIso.distance(to: b.pinchPointIso)
            if zoomRef == nil {
                zoomRef = d
                // The primary's pending pinch becomes part of the zoom: no click.
                if case .pinchPending = single { single = .idle }
                if case .dragging = single { out.events.append(.dragEnd); single = .idle }
            } else if let ref = zoomRef, ref > 1e-6 {
                let ratio = d / ref
                if ratio >= config.zoomStepRatio {
                    out.events.append(.zoom(steps: 1)); zoomRef = d
                } else if ratio <= 1 / config.zoomStepRatio {
                    out.events.append(.zoom(steps: -1)); zoomRef = d
                }
            }
            // When the zoom ends, neither pinch may turn into a click.
            ma.indexBlocked = true; mb.indexBlocked = true
            return true
        }

        if config.isOn(.twoHandPush), t >= twoHandCooldownUntil, ma.pose == .open, mb.pose == .open,
           grew(ma, t: t), grew(mb, t: t) {
            twoHandCooldownUntil = t + config.twoHandCooldown
            swipeCandidate = nil
            out.events.append(.push)
        }
        return false
    }

    private func grew(_ m: TrackMemory, t: Double) -> Bool {
        guard let old = m.history.first(where: { t - $0.t <= config.pushWindow }), let now = m.history.last,
              now.t - old.t >= 0.15 else { return false }
        return now.size / max(old.size, 1e-4) >= config.pushGrowth
    }

    private func resolveDeferredRightClick(t: Double, into out: inout GestureOutput) {
        guard let deadline = pendingRightClickDeadline else { return }
        if let tr = lastTransient, let rel = middleReleaseTime, abs(tr - rel) <= config.snapWindow {
            pendingRightClickDeadline = nil; lastTransient = nil
            out.events.append(.snap)
        } else if t >= deadline {
            pendingRightClickDeadline = nil
            out.events.append(.rightClick)
        }
    }
}

/// Smallest signed difference a − b, in radians.
func angleDelta(_ a: Double, _ b: Double) -> Double {
    var d = a - b
    while d > .pi { d -= 2 * .pi }
    while d < -.pi { d += 2 * .pi }
    return d
}
