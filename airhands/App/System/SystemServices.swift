import AppKit
import ApplicationServices
import AVFoundation
import Carbon.HIToolbox
import CoreGraphics
import IOKit.ps
import QuartzCore
import ServiceManagement

// MARK: - Permissions

enum PermissionState { case granted, denied, notDetermined }

enum PermissionStatus {
    static var camera: PermissionState {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: .granted
        case .notDetermined: .notDetermined
        default: .denied
        }
    }
    static var microphone: PermissionState {
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized: .granted
        case .notDetermined: .notDetermined
        default: .denied
        }
    }
    /// Needed to post mouse/keyboard events and move windows.
    static var accessibility: PermissionState { AXIsProcessTrusted() ? .granted : .denied }
    /// Needed to notice key presses (typing auto-pause).
    static var inputMonitoring: PermissionState { CGPreflightListenEventAccess() ? .granted : .denied }

    static func requestAccessibility() {
        let key = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
        _ = AXIsProcessTrustedWithOptions([key: true] as CFDictionary)
    }
    static func requestInputMonitoring() { _ = CGRequestListenEventAccess() }
}

// MARK: - Keyboard monitor (typing auto-pause)

/// Notices every key press system-wide without seeing what is typed (listen-only event tap;
/// only the fact that a key went down is used). Falls back to an NSEvent global monitor.
final class KeyboardMonitor {
    var onKeyDown: (() -> Void)?
    private var tap: CFMachPort?
    private var runLoopSource: CFRunLoopSource?
    private var fallbackMonitor: Any?

    var isRunning: Bool { tap != nil || fallbackMonitor != nil }

    func start() {
        guard !isRunning else { return }
        let mask = CGEventMask(1 << CGEventType.keyDown.rawValue)
        let callback: CGEventTapCallBack = { _, type, event, refcon in
            guard let refcon else { return Unmanaged.passUnretained(event) }
            let me = Unmanaged<KeyboardMonitor>.fromOpaque(refcon).takeUnretainedValue()
            if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
                if let tap = me.tap { CGEvent.tapEnable(tap: tap, enable: true) }
            } else if type == .keyDown, event.getIntegerValueField(.eventSourceUserData) != InputSynth.marker {
                me.onKeyDown?()
            }
            return Unmanaged.passUnretained(event)
        }
        if let tap = CGEvent.tapCreate(tap: .cgSessionEventTap, place: .headInsertEventTap, options: .listenOnly,
                                       eventsOfInterest: mask, callback: callback,
                                       userInfo: Unmanaged.passUnretained(self).toOpaque()) {
            self.tap = tap
            runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
            CFRunLoopAddSource(CFRunLoopGetMain(), runLoopSource, .commonModes)
            CGEvent.tapEnable(tap: tap, enable: true)
        } else {
            fallbackMonitor = NSEvent.addGlobalMonitorForEvents(matching: .keyDown) { [weak self] e in
                if e.cgEvent?.getIntegerValueField(.eventSourceUserData) != InputSynth.marker { self?.onKeyDown?() }
            }
        }
    }

    func stop() {
        if let tap { CGEvent.tapEnable(tap: tap, enable: false) }
        if let runLoopSource { CFRunLoopRemoveSource(CFRunLoopGetMain(), runLoopSource, .commonModes) }
        if let fallbackMonitor { NSEvent.removeMonitor(fallbackMonitor) }
        tap = nil; runLoopSource = nil; fallbackMonitor = nil
    }

    /// Restart (e.g. after Input Monitoring was granted, to upgrade from the fallback).
    func restart() { stop(); start() }
}

// MARK: - Global hotkey (Carbon; needs no permission)

final class HotKey {
    var onPress: (() -> Void)?
    private var ref: EventHotKeyRef?
    private var handler: EventHandlerRef?

    func register(_ combo: KeyCombo) {
        unregister()
        var spec = EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyPressed))
        InstallEventHandler(GetApplicationEventTarget(), { _, _, userData -> OSStatus in
            guard let userData else { return noErr }
            let me = Unmanaged<HotKey>.fromOpaque(userData).takeUnretainedValue()
            DispatchQueue.main.async { me.onPress?() }
            return noErr
        }, 1, &spec, Unmanaged.passUnretained(self).toOpaque(), &handler)
        var mods: UInt32 = 0
        if combo.modifiers.contains(.command) { mods |= UInt32(cmdKey) }
        if combo.modifiers.contains(.shift) { mods |= UInt32(shiftKey) }
        if combo.modifiers.contains(.option) { mods |= UInt32(optionKey) }
        if combo.modifiers.contains(.control) { mods |= UInt32(controlKey) }
        let id = EventHotKeyID(signature: OSType(0x4148_4B59), id: 1)   // "AHKY"
        RegisterEventHotKey(UInt32(combo.keyCode), mods, id, GetApplicationEventTarget(), 0, &ref)
    }

    func unregister() {
        if let ref { UnregisterEventHotKey(ref) }
        if let handler { RemoveEventHandler(handler) }
        ref = nil; handler = nil
    }
}

// MARK: - Power

enum Power {
    static var isOnBattery: Bool {
        guard let info = IOPSCopyPowerSourcesInfo()?.takeRetainedValue(),
              let type = IOPSGetProvidingPowerSourceType(info)?.takeUnretainedValue() else { return false }
        return (type as String) == kIOPSBatteryPowerValue
    }
}

// MARK: - Launch at login

enum LaunchAtLogin {
    static var isEnabled: Bool { SMAppService.mainApp.status == .enabled }

    static func set(_ on: Bool) throws {
        if on { try SMAppService.mainApp.register() } else { try SMAppService.mainApp.unregister() }
    }
}

// MARK: - Snap listener (microphone)

/// Listens for sharp transients (a finger snap). Only runs while the snap gesture is on;
/// audio is analysed in memory buffer by buffer and never stored.
final class SnapListener {
    private let engine = AVAudioEngine()
    private var detector = TransientDetector()
    private(set) var isRunning = false
    /// Called on the audio thread with the host time of the transient.
    var onTransient: ((Double) -> Void)?

    func start() throws {
        guard !isRunning else { return }
        let input = engine.inputNode
        let format = input.outputFormat(forBus: 0)
        input.installTap(onBus: 0, bufferSize: 256, format: format) { [weak self] buffer, _ in
            guard let self, let ch = buffer.floatChannelData?[0] else { return }
            let n = Int(buffer.frameLength)
            var peak: Float = 0, sum: Float = 0
            for i in 0..<n {
                let v = abs(ch[i])
                if v > peak { peak = v }
                sum += v * v
            }
            let rms = (sum / Float(max(n, 1))).squareRoot()
            let t = CACurrentMediaTime()
            if self.detector.process(peak: Double(peak), rms: Double(rms), at: t) { self.onTransient?(t) }
        }
        try engine.start()
        isRunning = true
    }

    func stop() {
        guard isRunning else { return }
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        isRunning = false
    }
}

// MARK: - CPU usage

/// Process CPU time as a percentage of one core, sampled between calls.
struct CPUMeter {
    private var lastWall = CACurrentMediaTime()
    private var lastCPU = CPUMeter.processCPUSeconds()
    private(set) var percent = 0.0

    static func processCPUSeconds() -> Double {
        var u = rusage()
        getrusage(RUSAGE_SELF, &u)
        func s(_ t: timeval) -> Double { Double(t.tv_sec) + Double(t.tv_usec) / 1e6 }
        return s(u.ru_utime) + s(u.ru_stime)
    }

    mutating func sample() {
        let now = CACurrentMediaTime(), cpu = Self.processCPUSeconds()
        if now - lastWall >= 0.5 {
            percent = (cpu - lastCPU) / (now - lastWall) * 100
            lastWall = now; lastCPU = cpu
        }
    }
}
