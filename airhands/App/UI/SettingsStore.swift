import AirHandsCore
import AppKit
import SwiftUI

/// The user's settings, persisted as JSON in UserDefaults. Every change is pushed to the
/// pipeline through `onChange`.
@MainActor
final class SettingsStore: ObservableObject {
    private static let key = "settings.v1"

    @Published var value: AppSettings {
        didSet {
            guard value != oldValue else { return }
            if let data = try? value.encoded() { UserDefaults.standard.set(data, forKey: Self.key) }
            onChange?(value, oldValue)
        }
    }

    var onChange: ((AppSettings, AppSettings) -> Void)?

    init() {
        if let data = UserDefaults.standard.data(forKey: Self.key) {
            value = AppSettings.decode(data)
        } else {
            value = AppSettings()
        }
    }

    func enabled(_ g: GestureKind) -> Binding<Bool> {
        Binding(get: { self.value.isEnabled(g) }, set: { self.value.setEnabled($0, g) })
    }

    func action(_ g: GestureKind) -> Binding<ActionKind> {
        Binding(get: { self.value.binding(for: g).action }, set: { a in
            var b = self.value.binding(for: g)
            b.action = a
            self.value.setBinding(b, for: g)
        })
    }

    func shortcut(_ g: GestureKind) -> Binding<KeyCombo?> {
        Binding(get: { self.value.binding(for: g).shortcut }, set: { s in
            var b = self.value.binding(for: g)
            b.shortcut = s
            if s != nil { b.action = .customShortcut }
            self.value.setBinding(b, for: g)
        })
    }

    func resetToDefaults() {
        var fresh = AppSettings()
        fresh.onboardingCompleted = value.onboardingCompleted
        fresh.activeZone = value.activeZone
        value = fresh
    }
}

/// Opens SwiftUI views in regular windows from this menu-bar-only app.
@MainActor
final class WindowPresenter {
    private var windows: [String: NSWindow] = [:]
    private var closeObservers: [String: NSObjectProtocol] = [:]

    func show<V: View>(_ id: String, title: String, size: CGSize, onClose: (() -> Void)? = nil, @ViewBuilder content: () -> V) {
        if let w = windows[id] {
            NSApp.activate(ignoringOtherApps: true)
            w.makeKeyAndOrderFront(nil)
            return
        }
        let w = NSWindow(contentRect: CGRect(origin: .zero, size: size),
                         styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        w.title = title
        w.isReleasedWhenClosed = false
        w.contentView = NSHostingView(rootView: content())
        w.center()
        windows[id] = w
        closeObservers[id] = NotificationCenter.default.addObserver(forName: NSWindow.willCloseNotification, object: w, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated {
                self?.windows[id] = nil
                if let o = self?.closeObservers.removeValue(forKey: id) { NotificationCenter.default.removeObserver(o) }
                onClose?()
            }
        }
        NSApp.activate(ignoringOtherApps: true)
        w.makeKeyAndOrderFront(nil)
    }

    func close(_ id: String) { windows[id]?.close() }
    func isOpen(_ id: String) -> Bool { windows[id] != nil }
}
