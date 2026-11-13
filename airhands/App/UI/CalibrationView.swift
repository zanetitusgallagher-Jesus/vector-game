import AirHandsCore
import AVFoundation
import SwiftUI

/// Drives the 4-corner calibration from pipeline outputs.
@MainActor
final class CalibrationModel: ObservableObject {
    @Published private(set) var session = CalibrationSession()
    @Published private(set) var fingertip: Vec2?
    @Published private(set) var hands: [HandObservation] = []
    @Published private(set) var aspect: Double = 4.0 / 3.0

    func feed(_ out: PipelineOutput) {
        fingertip = out.fingertip
        hands = out.frame.hands
        aspect = out.frame.aspectRatio
        session.feed(out.fingertip, at: out.captureTime)
    }

    func restart() { session.restart() }
}

struct CalibrationView: View {
    @ObservedObject var calib: CalibrationModel
    let captureSession: AVCaptureSession?
    let onSave: (Rect) -> Void
    let onCancel: () -> Void

    var body: some View {
        VStack(spacing: 14) {
            Text(instruction).font(.title3.weight(.semibold)).multilineTextAlignment(.center)
            Text("Hold your hand in the POINT pose (index finger out, other fingers curled) and point at each corner of your screen in turn. Hold still until the ring fills.")
                .font(.callout).foregroundStyle(.secondary).multilineTextAlignment(.center)

            ZStack {
                CameraPreview(session: captureSession)
                Canvas { ctx, size in
                    func pt(_ v: Vec2) -> CGPoint { CGPoint(x: v.x * size.width, y: v.y * size.height) }
                    for hand in calib.hands {
                        var path = Path()
                        for (a, b) in HandSkeleton.bones where hand[a].confidence > 0 && hand[b].confidence > 0 {
                            path.move(to: pt(hand[a].position)); path.addLine(to: pt(hand[b].position))
                        }
                        ctx.stroke(path, with: .color(.cyan), lineWidth: 2)
                    }
                    for (i, c) in calib.session.captured.enumerated() {
                        let p = pt(c)
                        ctx.fill(Path(ellipseIn: CGRect(x: p.x - 7, y: p.y - 7, width: 14, height: 14)), with: .color(.green))
                        ctx.draw(Text("\(i + 1)").font(.caption.bold()), at: CGPoint(x: p.x + 14, y: p.y))
                    }
                    if calib.session.captured.count == 4 {
                        var z = Path()
                        z.addLines(calib.session.captured.map(pt) + [pt(calib.session.captured[0])])
                        ctx.stroke(z, with: .color(.green), style: StrokeStyle(lineWidth: 2, dash: [6, 4]))
                    }
                    if let f = calib.fingertip {
                        let p = pt(f)
                        let r = 16.0
                        ctx.stroke(Path(ellipseIn: CGRect(x: p.x - r, y: p.y - r, width: 2 * r, height: 2 * r)), with: .color(.white), lineWidth: 2)
                        var arc = Path()
                        arc.addArc(center: p, radius: r + 5, startAngle: .degrees(-90),
                                   endAngle: .degrees(-90 + 360 * calib.session.holdProgress), clockwise: false)
                        ctx.stroke(arc, with: .color(.cyan), lineWidth: 4)
                    }
                }
            }
            .aspectRatio(calib.aspect, contentMode: .fit)
            .clipShape(RoundedRectangle(cornerRadius: 10))

            CornerMap(done: calib.session.captured.count)

            HStack {
                Button("Cancel", action: onCancel)
                Spacer()
                Button("Start over") { calib.restart() }
                Button("Save") { if let r = calib.session.result { onSave(r) } }
                    .keyboardShortcut(.defaultAction)
                    .disabled(calib.session.result == nil)
            }
        }
        .padding(20)
        .frame(minWidth: 560, minHeight: 600)
    }

    private var instruction: String {
        if let c = calib.session.current { return "Point at the \(c.title) corner of your screen" }
        return calib.session.result == nil
            ? "Those corners are too close together — start over and point further apart."
            : "Done! Save to use this active zone."
    }
}

/// Little screen diagram with the corner to point at highlighted.
private struct CornerMap: View {
    let done: Int
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 4).stroke(.secondary, lineWidth: 1.5).frame(width: 120, height: 76)
            ForEach(0..<4, id: \.self) { i in
                Circle()
                    .fill(i < done ? Color.green : (i == done ? Color.cyan : Color.secondary.opacity(0.4)))
                    .frame(width: 12, height: 12)
                    .offset(x: i == 0 || i == 3 ? -60 : 60, y: i < 2 ? -38 : 38)
            }
        }
        .frame(width: 140, height: 90)
    }
}

/// Live, mirrored camera preview (shares AirHands' capture session; nothing is stored).
struct CameraPreview: NSViewRepresentable {
    let session: AVCaptureSession?

    func makeNSView(context: Context) -> NSView {
        let v = NSView()
        v.wantsLayer = true
        v.layer?.backgroundColor = NSColor.black.cgColor
        if let session {
            let layer = AVCaptureVideoPreviewLayer(session: session)
            layer.videoGravity = .resize
            if let c = layer.connection, c.isVideoMirroringSupported {
                c.automaticallyAdjustsVideoMirroring = false
                c.isVideoMirrored = true
            }
            layer.frame = v.bounds
            layer.autoresizingMask = [.layerWidthSizable, .layerHeightSizable]
            v.layer?.addSublayer(layer)
        }
        return v
    }

    func updateNSView(_ nsView: NSView, context: Context) {}
}

// MARK: - Onboarding

struct OnboardingView: View {
    @ObservedObject var model: AppModel
    let onDone: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 12) {
                Image(systemName: "hand.point.up.left.fill").font(.system(size: 38)).foregroundStyle(.cyan)
                VStack(alignment: .leading) {
                    Text("Welcome to AirHands").font(.title.bold())
                    Text("Control your Mac with your hands. Everything runs on this Mac — camera frames are never saved or sent anywhere.")
                        .foregroundStyle(.secondary)
                }
            }
            Form { PermissionRows(model: model) }.formStyle(.grouped).frame(minHeight: 300)
            VStack(alignment: .leading, spacing: 4) {
                Text("Quick start").font(.headline)
                Text("☝️  Point (index out) to move the cursor · 🤏 pinch thumb + index to click · ✋ open hand to stop the cursor · ⌃⌥Space turns AirHands on and off.")
                    .font(.callout)
            }
            HStack {
                Button("Calibrate later in Settings") {}.hidden()
                Spacer()
                Button("Start AirHands") { onDone() }.keyboardShortcut(.defaultAction)
            }
        }
        .padding(24)
        .frame(width: 640)
    }
}
