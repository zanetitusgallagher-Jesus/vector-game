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
        Toggle("AirHands", isOn: $model.isEnabled)
        Text(model.status.label)

        Divider()

        Toggle("Debug Overlay", isOn: $model.debugOverlay)
        if model.isRecording {
            Button("Stop Recording") { model.stopRecording() }
        } else {
            Button("Record Landmarks…") { promptAndRecord() }
                .disabled(!model.isEnabled)
        }
        Button("Show Recordings") { model.revealRecordings() }

        Divider()

        Button("Calibrate…") {}.disabled(true)    // milestone 5
        Button("Settings…") {}.disabled(true)     // milestone 5

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
