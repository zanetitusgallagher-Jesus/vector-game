import AirHandsCore
import AppKit
import ApplicationServices

/// Turns gesture events into OS actions. Runs on the pipeline queue (CGEvent posting and AX
/// calls are thread-safe); anything that needs AppKit hops to the main queue.
final class ActionEngine {
    let synth = InputSynth()
    let queue: DispatchQueue
    var settings = AppSettings()
    /// Usable display frames (no menu bar / Dock), Quartz coordinates.
    var visibleDisplays: [Rect] = []
    /// Called on `queue` when a gesture asks to pause / resume AirHands.
    var onTogglePause: (() -> Void)?

    private(set) var isDragging = false
    private var scrollRemainder = Vec2.zero
    private var momentum = ScrollMomentum()
    private var momentumTimer: DispatchSourceTimer?
    private var grab: (window: AXUIElement, startFrame: CGRect, startCursor: CGPoint)?

    init(queue: DispatchQueue) { self.queue = queue }

    // MARK: Cursor

    func moveCursor(to p: CGPoint) {
        synth.move(to: p, dragging: isDragging)
        if let g = grab {
            let origin = CGPoint(x: g.startFrame.minX + p.x - g.startCursor.x, y: g.startFrame.minY + p.y - g.startCursor.y)
            WindowMover.setPosition(g.window, origin)
        }
    }

    /// Release anything held (AirHands turned off / paused / typing).
    func releaseAll(cursor: CGPoint) {
        if isDragging { synth.leftUp(at: cursor); isDragging = false }
        grab = nil
        stopMomentum()
    }

    // MARK: Events

    func handle(_ event: GestureEvent, cursor: CGPoint) {
        switch event {
        case let .click(count):
            stopMomentum()
            synth.click(at: cursor, count: count)
        case .rightClick:
            perform(settings.binding(for: .middlePinch), at: cursor)
        case .dragBegin:
            stopMomentum()
            synth.leftDown(at: cursor)
            isDragging = true
        case .dragEnd:
            synth.leftUp(at: cursor)
            isDragging = false
        case let .scroll(dx, dy):
            stopMomentum()
            scroll(by: scrollPixels(Vec2(dx, dy)))
        case let .scrollEnd(vx, vy):
            if settings.scrollMomentum { startMomentum(scrollPixels(Vec2(vx, vy))) }
        case let .knob(steps):
            for _ in 0..<abs(steps) { synth.media(steps > 0 ? .soundUp : .soundDown) }
        case let .swipe(dir):
            let kind: GestureKind = switch dir {
            case .left: .swipeLeft
            case .right: .swipeRight
            case .up: .swipeUp
            case .down: .swipeDown
            }
            perform(settings.binding(for: kind), at: cursor)
        case .grabBegin:
            beginGrab(at: cursor)
        case let .grabEnd(vx, vy):
            endGrab(velocity: Vec2(vx, vy))
        case .thumbsUp:
            perform(settings.binding(for: .thumbsUp), at: cursor)
        case .peace:
            perform(settings.binding(for: .peace), at: cursor)
        case .stopPalm:
            perform(settings.binding(for: .stopPalm), at: cursor)
        case let .zoom(steps):
            for _ in 0..<abs(steps) { synth.key(steps > 0 ? 24 : 27, flags: .maskCommand) }
        case .push:
            perform(settings.binding(for: .twoHandPush), at: cursor)
        case .snap:
            perform(settings.binding(for: .snap), at: cursor)
        }
    }

    func perform(_ b: GestureBinding, at cursor: CGPoint) {
        switch b.action {
        case .none: break
        case .leftClick: synth.click(at: cursor, count: 1)
        case .rightClick: synth.rightClick(at: cursor)
        case .doubleClick: synth.click(at: cursor, count: 1); synth.click(at: cursor, count: 2)
        case .playPause: synth.media(.play)
        case .nextTrack: synth.media(.next)
        case .previousTrack: synth.media(.previous)
        case .volumeUp: synth.media(.soundUp)
        case .volumeDown: synth.media(.soundDown)
        case .mute: synth.media(.mute)
        case .screenshot: synth.key(21, flags: [.maskCommand, .maskShift])   // ⌘⇧4
        case .missionControl: Self.missionControl(nil)
        case .showDesktop: Self.missionControl("1")
        case .appExpose: Self.missionControl("2")
        case .launchpad: Self.openLaunchpad()
        case .spaceLeft: synth.key(123, flags: .maskControl)
        case .spaceRight: synth.key(124, flags: .maskControl)
        case .zoomIn: synth.key(24, flags: .maskCommand)
        case .zoomOut: synth.key(27, flags: .maskCommand)
        case .hideAllApps: DispatchQueue.main.async { Self.hideAllApps() }
        case .togglePause: onTogglePause?()
        case .customShortcut:
            if let s = b.shortcut { synth.key(s.keyCode, flags: Self.flags(s.modifiers)) }
        }
    }

    static func flags(_ m: KeyCombo.Modifiers) -> CGEventFlags {
        var f: CGEventFlags = []
        if m.contains(.command) { f.insert(.maskCommand) }
        if m.contains(.shift) { f.insert(.maskShift) }
        if m.contains(.option) { f.insert(.maskAlternate) }
        if m.contains(.control) { f.insert(.maskControl) }
        return f
    }

    // MARK: Scroll

    /// Hand sizes → wheel pixels. Natural: content follows the hand.
    private func scrollPixels(_ handSizes: Vec2) -> Vec2 {
        let k = 900 * settings.scrollSpeed * (settings.naturalScroll ? 1 : -1)
        return handSizes * k
    }

    private func scroll(by px: Vec2) {
        let total = px + scrollRemainder
        let ix = total.x.rounded(.towardZero), iy = total.y.rounded(.towardZero)
        scrollRemainder = Vec2(total.x - ix, total.y - iy)
        synth.scroll(dx: Int32(clamping: Int(ix)), dy: Int32(clamping: Int(iy)))
    }

    private func startMomentum(_ v: Vec2) {
        momentum.start(v)
        guard momentum.isActive else { return }
        let timer = DispatchSource.makeTimerSource(queue: queue)
        let dt = 1.0 / 120
        timer.schedule(deadline: .now() + dt, repeating: dt)
        timer.setEventHandler { [weak self] in
            guard let self else { return }
            let d = self.momentum.step(dt)
            if self.momentum.isActive { self.scroll(by: d) } else { self.stopMomentum() }
        }
        momentumTimer?.cancel()
        momentumTimer = timer
        timer.resume()
    }

    private func stopMomentum() {
        momentum.stop()
        momentumTimer?.cancel()
        momentumTimer = nil
    }

    // MARK: Window grab / throw

    private func beginGrab(at cursor: CGPoint) {
        guard let w = WindowMover.window(at: cursor), let f = WindowMover.frame(of: w) else { return }
        WindowMover.raise(w)
        grab = (w, f, cursor)
    }

    private func endGrab(velocity: Vec2) {
        guard let g = grab else { return }
        grab = nil
        guard let f = WindowMover.frame(of: g.window) else { return }
        let rect = Rect(x: f.minX, y: f.minY, width: f.width, height: f.height)
        switch WindowPlanner.throwTarget(window: rect, velocity: velocity, displays: visibleDisplays, minSpeed: settings.gesture.throwSpeed) {
        case .stay: break
        case let .moveTo(r):
            WindowMover.setFrame(g.window, CGRect(x: r.x, y: r.y, width: r.width, height: r.height))
        }
    }

    // MARK: System UI

    private static func missionControl(_ arg: String?) {
        // The Mission Control binary takes 1 = Show Desktop, 2 = App Exposé, none = Mission Control.
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/System/Applications/Mission Control.app/Contents/MacOS/Mission Control")
        if let arg { p.arguments = [arg] }
        try? p.run()
    }

    private static func openLaunchpad() {
        for path in ["/System/Applications/Launchpad.app", "/System/Applications/Apps.app"] where FileManager.default.fileExists(atPath: path) {
            NSWorkspace.shared.open(URL(fileURLWithPath: path))
            return
        }
    }

    private static func hideAllApps() {
        let me = ProcessInfo.processInfo.processIdentifier
        for app in NSWorkspace.shared.runningApplications where app.activationPolicy == .regular && app.processIdentifier != me {
            app.hide()
        }
    }
}
