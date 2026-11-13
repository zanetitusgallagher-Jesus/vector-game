import AirHandsCore
import AppKit
import SwiftUI

struct SettingsView: View {
    @ObservedObject var store: SettingsStore
    @ObservedObject var model: AppModel

    var body: some View {
        TabView {
            GeneralTab(store: store, model: model).tabItem { Label("General", systemImage: "gearshape") }
            PointerTab(store: store).tabItem { Label("Pointer", systemImage: "cursorarrow.motionlines") }
            GesturesTab(store: store).tabItem { Label("Gestures", systemImage: "hand.raised") }
            TuningTab(store: store).tabItem { Label("Tuning", systemImage: "slider.horizontal.3") }
            PermissionsTab(model: model).tabItem { Label("Permissions", systemImage: "lock.shield") }
        }
        .padding(16)
        .frame(minWidth: 620, minHeight: 520)
    }
}

// MARK: - General

private struct GeneralTab: View {
    @ObservedObject var store: SettingsStore
    @ObservedObject var model: AppModel

    var body: some View {
        Form {
            Section("AirHands") {
                Toggle("AirHands on", isOn: $model.isEnabled)
                LabeledContent("Toggle shortcut") {
                    ShortcutRecorder(combo: Binding(get: { store.value.toggleHotkey },
                                                    set: { store.value.toggleHotkey = $0 ?? .defaultToggle }),
                                     allowsClear: false)
                }
                Toggle("Launch at login", isOn: Binding(get: { model.launchAtLogin }, set: { model.setLaunchAtLogin($0) }))
            }
            Section("Hands") {
                Picker("Dominant hand (moves the cursor)", selection: $store.value.gesture.dominant) {
                    Text("Right").tag(Chirality.right)
                    Text("Left").tag(Chirality.left)
                }
                Button("Calibrate active zone…") { model.openCalibration() }
            }
            Section("Typing") {
                Toggle("Pause while typing", isOn: $store.value.typingPauseEnabled)
                LabeledSlider(title: "Resume after", value: $store.value.typingResumeDelay, range: 0.2...2.0, format: "%.1f s")
                LabeledSlider(title: "Keyboard zone (bottom of camera view)", value: $store.value.gesture.keyboardZoneHeight,
                              range: 0...0.45, format: "%.0f %%", scale: 100)
            }
            Section("Display & power") {
                Toggle("Show reticle", isOn: $store.value.showReticle)
                Toggle("Debug overlay (skeleton, latency, CPU)", isOn: $store.value.debugOverlay)
                Toggle("Battery saver (30 fps on battery)", isOn: $store.value.batterySaver)
            }
            Section {
                Button("Reset all settings to defaults", role: .destructive) { store.resetToDefaults() }
            }
        }
        .formStyle(.grouped)
    }
}

// MARK: - Pointer

private struct PointerTab: View {
    @ObservedObject var store: SettingsStore

    var body: some View {
        Form {
            Section("Mode") {
                Picker("Pointer mode", selection: $store.value.pointer.mode) {
                    Text("Absolute — finger position is screen position").tag(PointerMode.absolute)
                    Text("Relative — like a trackpad, open hand to reposition").tag(PointerMode.relative)
                }
                .pickerStyle(.radioGroup)
            }
            Section("Speed") {
                LabeledSlider(title: "Cursor speed (relative)", value: $store.value.pointer.speed, range: 0.3...3, format: "%.1f×")
                LabeledSlider(title: "Acceleration (relative)", value: $store.value.pointer.acceleration, range: 0...3, format: "%.1f")
                LabeledSlider(title: "Glide to finger (absolute)", value: $store.value.pointer.catchUp, range: 0.05...0.6, format: "%.2f")
            }
            Section("Smoothing") {
                LabeledSlider(title: "Steadiness when still (lower = steadier)", value: $store.value.smoothing.minCutoff,
                              range: 0.2...5, format: "%.1f Hz")
                LabeledSlider(title: "Responsiveness when moving", value: $store.value.smoothing.beta, range: 0...30, format: "%.0f")
            }
            Section("Precision") {
                Toggle("Slow the cursor down as a pinch closes", isOn: $store.value.gesture.precisionEnabled)
                LabeledSlider(title: "Slowest speed", value: $store.value.gesture.precisionMinGain, range: 0.1...1, format: "%.0f %%", scale: 100)
                Toggle("Lock the cursor while pinching (clicks never nudge it)", isOn: $store.value.pointer.lockOnPinch)
            }
            Section("Scrolling") {
                LabeledSlider(title: "Scroll speed", value: $store.value.scrollSpeed, range: 0.2...4, format: "%.1f×")
                Toggle("Natural (content follows your hand)", isOn: $store.value.naturalScroll)
                Toggle("Momentum", isOn: $store.value.scrollMomentum)
            }
        }
        .formStyle(.grouped)
    }
}

// MARK: - Gestures

private struct GesturesTab: View {
    @ObservedObject var store: SettingsStore

    var body: some View {
        Form {
            Section("Gestures — switch off or change what each one does") {
                ForEach(GestureKind.allCases, id: \.self) { g in
                    GestureRow(store: store, gesture: g)
                }
            }
            Section {
                Text("Finger snap needs microphone access. The microphone is only used to hear the snap's click, in memory; nothing is recorded.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
        }
        .formStyle(.grouped)
    }
}

private struct GestureRow: View {
    @ObservedObject var store: SettingsStore
    let gesture: GestureKind

    var body: some View {
        HStack {
            Toggle(gesture.title, isOn: store.enabled(gesture))
            Spacer()
            if gesture.isRemappable {
                Picker("", selection: store.action(gesture)) {
                    ForEach(ActionKind.allCases, id: \.self) { a in Text(a.title).tag(a) }
                }
                .labelsHidden()
                .frame(width: 200)
                .disabled(!store.value.isEnabled(gesture))
                if store.value.binding(for: gesture).action == .customShortcut {
                    ShortcutRecorder(combo: store.shortcut(gesture), allowsClear: false)
                }
            } else {
                Text(fixedAction).foregroundStyle(.secondary).frame(width: 200, alignment: .trailing)
            }
        }
    }

    private var fixedAction: String {
        switch gesture {
        case .pointer: "Move cursor"
        case .pinchClick: "Click / double click"
        case .pinchDrag: "Click and drag"
        case .scroll: "Scroll"
        case .knob: "Volume"
        case .fistGrab: "Move / throw window"
        case .twoHandZoom: "Zoom (⌘= / ⌘-)"
        default: ""
        }
    }
}

// MARK: - Tuning

private struct TuningTab: View {
    @ObservedObject var store: SettingsStore

    var body: some View {
        Form {
            Section("Pinch (distances in hand sizes)") {
                LabeledSlider(title: "Pinch closes at", value: $store.value.gesture.pinchEnter, range: 0.1...0.4, format: "%.2f")
                LabeledSlider(title: "Pinch opens at", value: $store.value.gesture.pinchExit, range: 0.2...0.6, format: "%.2f")
                LabeledSlider(title: "Double-click window", value: $store.value.gesture.doubleClickWindow, range: 0.2...0.8, format: "%.2f s")
                LabeledSlider(title: "Hold to start dragging", value: $store.value.gesture.longPress, range: 0.25...1.5, format: "%.2f s")
                LabeledSlider(title: "Move to start dragging", value: $store.value.gesture.dragThreshold, range: 0.05...0.5, format: "%.2f")
            }
            Section("Hold times") {
                LabeledSlider(title: "Thumbs up", value: $store.value.gesture.thumbsUpHold, range: 0.2...2, format: "%.1f s")
                LabeledSlider(title: "Peace sign", value: $store.value.gesture.peaceHold, range: 0.2...2, format: "%.1f s")
                LabeledSlider(title: "Stop palm", value: $store.value.gesture.stopHold, range: 0.5...3, format: "%.1f s")
                LabeledSlider(title: "Fist grab", value: $store.value.gesture.grabHold, range: 0.1...1, format: "%.2f s")
            }
            Section("Swipes & throws") {
                LabeledSlider(title: "Swipe distance", value: $store.value.gesture.swipeDistance, range: 0.6...3, format: "%.1f hands")
                LabeledSlider(title: "Throw speed", value: $store.value.gesture.throwSpeed, range: 2...10, format: "%.1f")
            }
            Section {
                Text("If a gesture misfires or is hard to trigger, record it (menu → Record Landmarks…) and share the file: thresholds can then be tuned from real data.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
        }
        .formStyle(.grouped)
    }
}

// MARK: - Permissions

struct PermissionsTab: View {
    @ObservedObject var model: AppModel

    var body: some View {
        Form {
            PermissionRows(model: model)
        }
        .formStyle(.grouped)
    }
}

struct PermissionRows: View {
    @ObservedObject var model: AppModel

    var body: some View {
        Section {
            PermissionRow(title: "Camera", detail: "See your hands. Frames stay on this Mac.",
                          state: model.permissions.camera, action: { model.requestCamera() }, pane: .camera)
            PermissionRow(title: "Accessibility", detail: "Move the cursor, click, scroll and move windows.",
                          state: model.permissions.accessibility, action: { PermissionStatus.requestAccessibility() }, pane: .accessibility)
            PermissionRow(title: "Input Monitoring", detail: "Notice key presses so gestures pause while you type.",
                          state: model.permissions.inputMonitoring, action: { PermissionStatus.requestInputMonitoring() }, pane: .inputMonitoring)
            PermissionRow(title: "Microphone (optional)", detail: "Only for the finger-snap gesture.",
                          state: model.permissions.microphone, action: { model.requestMicrophone() }, pane: .microphone)
        } footer: {
            Text("After granting Accessibility or Input Monitoring you may need to quit and reopen AirHands.")
                .font(.footnote).foregroundStyle(.secondary)
        }
    }
}

private struct PermissionRow: View {
    let title: String
    let detail: String
    let state: PermissionState
    let action: () -> Void
    let pane: Permissions.Pane

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Image(systemName: state == .granted ? "checkmark.circle.fill" : "exclamationmark.circle")
                .foregroundStyle(state == .granted ? .green : .orange)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.headline)
                Text(detail).font(.callout).foregroundStyle(.secondary)
            }
            Spacer()
            if state != .granted {
                if state == .notDetermined || title != "Camera" && title != "Microphone (optional)" {
                    Button("Allow…", action: action)
                }
                Button("Open Settings") { Permissions.open(pane) }
            } else {
                Text("Allowed").foregroundStyle(.secondary)
            }
        }
    }
}

// MARK: - Controls

struct LabeledSlider: View {
    let title: String
    @Binding var value: Double
    let range: ClosedRange<Double>
    let format: String
    var scale: Double = 1

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack {
                Text(title)
                Spacer()
                Text(String(format: format, value * scale)).monospacedDigit().foregroundStyle(.secondary)
            }
            Slider(value: $value, in: range)
        }
    }
}

/// Click, then press a key combination.
struct ShortcutRecorder: View {
    @Binding var combo: KeyCombo?
    var allowsClear = true
    @State private var recording = false
    @State private var monitor: Any?

    var body: some View {
        HStack(spacing: 4) {
            Button(recording ? "Press keys…" : (combo?.displayString ?? "Record shortcut")) {
                recording ? stop() : start()
            }
            .frame(minWidth: 120)
            if allowsClear, combo != nil {
                Button { combo = nil } label: { Image(systemName: "xmark.circle.fill") }.buttonStyle(.borderless)
            }
        }
        .onDisappear { stop() }
    }

    private func start() {
        recording = true
        monitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { e in
            if e.keyCode == 53 { stop(); return nil }   // Esc cancels
            var m: KeyCombo.Modifiers = []
            if e.modifierFlags.contains(.command) { m.insert(.command) }
            if e.modifierFlags.contains(.shift) { m.insert(.shift) }
            if e.modifierFlags.contains(.option) { m.insert(.option) }
            if e.modifierFlags.contains(.control) { m.insert(.control) }
            combo = KeyCombo(keyCode: Int(e.keyCode), modifiers: m)
            stop()
            return nil
        }
    }

    private func stop() {
        recording = false
        if let monitor { NSEvent.removeMonitor(monitor) }
        monitor = nil
    }
}
