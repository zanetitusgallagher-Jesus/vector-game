import AirHandsCore
import AppKit

/// One overlay panel per display; rebuilt when displays are added, removed or rearranged.
@MainActor
final class OverlayController {
    private var panels: [(panel: OverlayPanel, view: OverlayView)] = []
    private var screenObserver: NSObjectProtocol?
    private(set) var isVisible = false

    var debugEnabled = false {
        didSet { updateHUDPlacement() }
    }

    init() {
        screenObserver = NotificationCenter.default.addObserver(
            forName: NSApplication.didChangeScreenParametersNotification, object: nil, queue: .main
        ) { [weak self] _ in
            MainActor.assumeIsolated { self?.rebuild() }
        }
        rebuild()
    }

    /// Usable display rects (minus menu bar and Dock) in Quartz coordinates, for window snapping.
    var visibleDisplayRects: [Rect] {
        NSScreen.screens.map { s in
            let r = ScreenSpace.quartzRect(s.visibleFrame)
            return Rect(x: r.minX, y: r.minY, width: r.width, height: r.height)
        }
    }

    /// Display rects in Quartz global coordinates, for `ScreenMapper`.
    var displayRects: [Rect] {
        NSScreen.screens.map { s in
            let r = ScreenSpace.quartzRect(s.frame)
            return Rect(x: r.minX, y: r.minY, width: r.width, height: r.height)
        }
    }

    func show() {
        isVisible = true
        for p in panels { p.panel.orderFrontRegardless() }
    }

    func hide() {
        isVisible = false
        for p in panels {
            p.view.render(OverlayState())
            p.panel.orderOut(nil)
        }
    }

    func render(_ state: OverlayState) {
        guard isVisible else { return }
        for p in panels { p.view.render(state) }
    }

    private func rebuild() {
        for p in panels { p.panel.orderOut(nil); p.panel.close() }
        panels = NSScreen.screens.map { screen in
            let panel = OverlayPanel(screen: screen)
            let view = OverlayView(frame: CGRect(origin: .zero, size: screen.frame.size))
            view.screenRect = ScreenSpace.quartzRect(screen.frame)
            panel.contentView = view
            if isVisible { panel.orderFrontRegardless() }
            return (panel: panel, view: view)
        }
        updateHUDPlacement()
    }

    /// The debug HUD lives on the display with the menu bar.
    private func updateHUDPlacement() {
        for (i, p) in panels.enumerated() { p.view.showsHUD = debugEnabled && i == 0; p.view.isPrimary = i == 0 }
    }
}
