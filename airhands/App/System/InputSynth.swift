import AppKit
import CoreGraphics

/// Posts synthetic mouse / keyboard / media-key events. Thread-safe (CGEvent posting is).
/// Every event is tagged with `marker` so our own keyboard monitor can ignore it — otherwise a
/// gesture shortcut (e.g. ⌘⇧4) would trigger the typing auto-pause.
final class InputSynth {
    static let marker: Int64 = 0x4149_5248   // "AIRH"
    private let source = CGEventSource(stateID: .hidSystemState)

    private func post(_ event: CGEvent?) {
        guard let event else { return }
        event.setIntegerValueField(.eventSourceUserData, value: Self.marker)
        event.post(tap: .cghidEventTap)
    }

    /// Current cursor position in Quartz global coordinates.
    static var cursorLocation: CGPoint { CGEvent(source: nil)?.location ?? .zero }

    // MARK: Mouse

    func move(to p: CGPoint, dragging: Bool) {
        post(CGEvent(mouseEventSource: source, mouseType: dragging ? .leftMouseDragged : .mouseMoved,
                     mouseCursorPosition: p, mouseButton: .left))
    }

    func leftDown(at p: CGPoint, clickCount: Int = 1) {
        let e = CGEvent(mouseEventSource: source, mouseType: .leftMouseDown, mouseCursorPosition: p, mouseButton: .left)
        e?.setIntegerValueField(.mouseEventClickState, value: Int64(clickCount))
        post(e)
    }

    func leftUp(at p: CGPoint, clickCount: Int = 1) {
        let e = CGEvent(mouseEventSource: source, mouseType: .leftMouseUp, mouseCursorPosition: p, mouseButton: .left)
        e?.setIntegerValueField(.mouseEventClickState, value: Int64(clickCount))
        post(e)
    }

    /// One click. For a double click call with count 1, then 2 (that is what macOS expects).
    func click(at p: CGPoint, count: Int) {
        leftDown(at: p, clickCount: count)
        leftUp(at: p, clickCount: count)
    }

    func rightClick(at p: CGPoint) {
        post(CGEvent(mouseEventSource: source, mouseType: .rightMouseDown, mouseCursorPosition: p, mouseButton: .right))
        post(CGEvent(mouseEventSource: source, mouseType: .rightMouseUp, mouseCursorPosition: p, mouseButton: .right))
    }

    /// Pixel scroll. Positive dy = content moves down (classic wheel up).
    func scroll(dx: Int32, dy: Int32) {
        guard dx != 0 || dy != 0 else { return }
        let e = CGEvent(scrollWheelEvent2Source: source, units: .pixel, wheelCount: 2, wheel1: dy, wheel2: dx, wheel3: 0)
        e?.setIntegerValueField(.scrollWheelEventIsContinuous, value: 1)
        post(e)
    }

    // MARK: Keyboard

    func key(_ code: Int, flags: CGEventFlags) {
        var f = flags
        // Arrow keys carry these flags when typed on a real keyboard; Mission Control's
        // Space-switching shortcut only matches with them.
        if (123...126).contains(code) { f.formUnion([.maskSecondaryFn, .maskNumericPad]) }
        let down = CGEvent(keyboardEventSource: source, virtualKey: CGKeyCode(code), keyDown: true)
        let up = CGEvent(keyboardEventSource: source, virtualKey: CGKeyCode(code), keyDown: false)
        down?.flags = f
        up?.flags = f
        post(down)
        post(up)
    }

    func key(_ combo: KeyComboFlags) { key(combo.code, flags: combo.flags) }

    // MARK: Media keys (volume, play/pause) — the same events the F-keys send.

    enum MediaKey: Int32 {
        case soundUp = 0, soundDown = 1, mute = 7, play = 16, next = 17, previous = 18
    }

    func media(_ k: MediaKey) {
        for down in [true, false] {
            let flags = NSEvent.ModifierFlags(rawValue: down ? 0xA00 : 0xB00)
            let data1 = Int((k.rawValue << 16) | ((down ? 0xA : 0xB) << 8))
            let ev = NSEvent.otherEvent(with: .systemDefined, location: .zero, modifierFlags: flags, timestamp: 0,
                                        windowNumber: 0, context: nil, subtype: 8, data1: data1, data2: -1)
            post(ev?.cgEvent)
        }
    }
}

struct KeyComboFlags {
    var code: Int
    var flags: CGEventFlags
}
