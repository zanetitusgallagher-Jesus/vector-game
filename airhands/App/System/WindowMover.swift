import AppKit
import ApplicationServices

/// Moves / resizes other apps' windows through the Accessibility API. Requires the
/// Accessibility permission. Coordinates are Quartz global (top-left origin), which is
/// what AX uses too.
enum WindowMover {
    /// The standard window under a screen point, skipping AirHands' own overlay.
    static func window(at p: CGPoint) -> AXUIElement? {
        let system = AXUIElementCreateSystemWide()
        var hit: AXUIElement?
        if AXUIElementCopyElementAtPosition(system, Float(p.x), Float(p.y), &hit) == .success, let hit,
           pid(of: hit) != getpid(), let w = owningWindow(hit) {
            return w
        }
        return windowFromWindowList(at: p)
    }

    static func frame(of w: AXUIElement) -> CGRect? {
        guard let pos: CGPoint = value(w, kAXPositionAttribute, .cgPoint),
              let size: CGSize = value(w, kAXSizeAttribute, .cgSize) else { return nil }
        return CGRect(origin: pos, size: size)
    }

    @discardableResult
    static func setPosition(_ w: AXUIElement, _ p: CGPoint) -> Bool {
        var pt = p
        guard let v = AXValueCreate(.cgPoint, &pt) else { return false }
        return AXUIElementSetAttributeValue(w, kAXPositionAttribute as CFString, v) == .success
    }

    @discardableResult
    static func setSize(_ w: AXUIElement, _ s: CGSize) -> Bool {
        var sz = s
        guard let v = AXValueCreate(.cgSize, &sz) else { return false }
        return AXUIElementSetAttributeValue(w, kAXSizeAttribute as CFString, v) == .success
    }

    /// Position, then size, then position again (some apps clamp size to the old screen).
    static func setFrame(_ w: AXUIElement, _ r: CGRect) {
        setPosition(w, r.origin)
        setSize(w, r.size)
        setPosition(w, r.origin)
    }

    static func raise(_ w: AXUIElement) {
        AXUIElementPerformAction(w, kAXRaiseAction as CFString)
        if let app = NSRunningApplication(processIdentifier: pid(of: w)) { app.activate(options: []) }
    }

    // MARK: - Helpers

    static func pid(of e: AXUIElement) -> pid_t {
        var p: pid_t = 0
        AXUIElementGetPid(e, &p)
        return p
    }

    private static func attribute(_ e: AXUIElement, _ name: String) -> CFTypeRef? {
        var v: CFTypeRef?
        return AXUIElementCopyAttributeValue(e, name as CFString, &v) == .success ? v : nil
    }

    private static func value<T>(_ e: AXUIElement, _ name: String, _ type: AXValueType) -> T? {
        guard let raw = attribute(e, name), CFGetTypeID(raw) == AXValueGetTypeID() else { return nil }
        let axValue = raw as! AXValue
        let ptr = UnsafeMutablePointer<T>.allocate(capacity: 1)
        defer { ptr.deallocate() }
        guard AXValueGetValue(axValue, type, ptr) else { return nil }
        return ptr.pointee
    }

    private static func element(_ ref: CFTypeRef?) -> AXUIElement? {
        guard let ref, CFGetTypeID(ref) == AXUIElementGetTypeID() else { return nil }
        return (ref as! AXUIElement)
    }

    private static func owningWindow(_ start: AXUIElement) -> AXUIElement? {
        var e = start
        for _ in 0..<20 {
            if let role = attribute(e, kAXRoleAttribute) as? String, role == kAXWindowRole as String { return e }
            if let w = element(attribute(e, kAXWindowAttribute)) { return w }
            guard let parent = element(attribute(e, kAXParentAttribute)) else { return nil }
            e = parent
        }
        return nil
    }

    /// Fallback: frontmost normal window containing the point, matched to its AX window by frame.
    private static func windowFromWindowList(at p: CGPoint) -> AXUIElement? {
        guard let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] else { return nil }
        for info in list {
            guard (info[kCGWindowLayer as String] as? Int) == 0,
                  let pid = info[kCGWindowOwnerPID as String] as? pid_t, pid != getpid(),
                  let b = info[kCGWindowBounds as String] as? [String: CGFloat],
                  let x = b["X"], let y = b["Y"], let w = b["Width"], let h = b["Height"] else { continue }
            let bounds = CGRect(x: x, y: y, width: w, height: h)
            guard bounds.contains(p) else { continue }
            let app = AXUIElementCreateApplication(pid)
            guard let windows = attribute(app, kAXWindowsAttribute) as? [AXUIElement] else { return nil }
            return windows.first { win in
                guard let f = frame(of: win) else { return false }
                return abs(f.minX - bounds.minX) < 4 && abs(f.minY - bounds.minY) < 4
            } ?? windows.first
        }
        return nil
    }
}
