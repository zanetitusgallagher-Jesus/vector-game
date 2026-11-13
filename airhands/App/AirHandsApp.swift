import AppKit
import SwiftUI

@main
struct AirHandsApp: App {
    @StateObject private var model = AppModel()

    var body: some Scene {
        MenuBarExtra {
            MenuContent(model: model)
        } label: {
            Image(nsImage: StatusIcon.image(for: model.status))
        }
        .menuBarExtraStyle(.menu)
    }
}

struct MenuContent: View {
    @ObservedObject var model: AppModel

    var body: some View {
        Toggle("AirHands  (\(model.store.value.toggleHotkey.displayString))", isOn: $model.isEnabled)
        Text(model.status.label)
        if model.isEnabled {
            Button(model.paused ? "Resume Gestures" : "Pause Gestures") { model.setPaused(!model.paused) }
        }

        Divider()

        Button("Calibrate…") { model.openCalibration() }
        Button("Settings…") { model.openSettings() }
            .keyboardShortcut(",")
        Toggle("Debug Overlay", isOn: $model.store.value.debugOverlay)
        if model.permissions.accessibility != .granted || model.permissions.inputMonitoring != .granted
            || model.permissions.camera != .granted {
            Button("⚠︎ Permissions needed…") { model.openOnboarding() }
        }

        Divider()

        if model.isRecording {
            Button("Stop Recording") { model.stopRecording() }
        } else {
            Button("Record Landmarks…") { promptAndRecord() }
                .disabled(!model.isEnabled)
        }
        Button("Show Recordings") { model.revealRecordings() }
        Toggle("Launch at Login", isOn: Binding(get: { model.launchAtLogin }, set: { model.setLaunchAtLogin($0) }))

        Divider()

        Button("Quit AirHands") { NSApp.terminate(nil) }
            .keyboardShortcut("q")
    }

    @MainActor private func promptAndRecord() {
        let alert = NSAlert()
        alert.messageText = "Record landmarks"
        alert.informativeText = "Describe what you will perform (e.g. \"pinch click x5\"). Only hand landmark coordinates are saved — never camera images."
        let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 260, height: 24))
        field.placeholderString = "pinch click x5"
        alert.accessoryView = field
        alert.addButton(withTitle: "Start")
        alert.addButton(withTitle: "Cancel")
        NSApp.activate(ignoringOtherApps: true)
        alert.window.initialFirstResponder = field
        guard alert.runModal() == .alertFirstButtonReturn else { return }
        let label = field.stringValue.trimmingCharacters(in: .whitespaces)
        model.startRecording(label: label.isEmpty ? "untitled" : label)
    }
}
