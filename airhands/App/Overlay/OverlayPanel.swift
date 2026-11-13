import AppKit

/// Transparent, click-through, always-on-top panel covering one screen, on every Space and
/// over full-screen apps. It never becomes key or main, so it cannot steal focus.
final class OverlayPanel: NSPanel {
    init(screen: NSScreen) {
        super.init(contentRect: screen.frame, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        isOpaque = false
        backgroundColor = .clear
        hasShadow = false
        ignoresMouseEvents = true
        isReleasedWhenClosed = false
        hidesOnDeactivate = false
        level = .screenSaver
        collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary, .ignoresCycle]
        animationBehavior = .none
        setFrame(screen.frame, display: false)
    }

    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}

/// Converts between AppKit global coordinates (origin bottom-left of the primary display,
/// y up) and Quartz global coordinates (origin top-left of the primary display, y down;
/// what CGEvent and AirHandsCore.ScreenMapper use).
enum ScreenSpace {
    static var primaryHeight: CGFloat { NSScreen.screens.first?.frame.height ?? 0 }

    static func quartzRect(_ appKit: CGRect) -> CGRect {
        CGRect(x: appKit.minX, y: primaryHeight - appKit.maxY, width: appKit.width, height: appKit.height)
    }
}
