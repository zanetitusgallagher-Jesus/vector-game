import AirHandsCore
import AppKit
import QuartzCore

/// What the overlay should show this frame. Points are in Quartz global coordinates.
struct OverlayState {
    var reticle: CGPoint?
    /// Mode / status label shown under the reticle ("tracking", "paused", ...).
    var modeLabel: String?
    var debug: DebugState?
}

struct DebugState {
    var frame: HandFrame
    var raw: HandFrame?
    var activeZone: Rect
    var keyboardZoneHeight: Double
    var lines: [String]
}

/// Layer-based drawing (cheap to update at camera rate; no SwiftUI diffing per frame).
final class OverlayView: NSView {
    /// This view's screen rect in Quartz global coordinates.
    var screenRect: CGRect = .zero
    var showsHUD = false

    private let root = CALayer()
    private let reticleRing = CAShapeLayer()
    private let reticleDot = CAShapeLayer()
    private let modeText = CATextLayer()

    private let hud = CALayer()
    private let hudCamera = CALayer()
    private let zoneLayer = CAShapeLayer()
    private let keyboardLayer = CAShapeLayer()
    private let rawLayer = CAShapeLayer()
    private var boneLayers: [CAShapeLayer] = []
    private var jointLayers: [CAShapeLayer] = []
    private let hudText = CATextLayer()

    static let hudSize = CGSize(width: 360, height: 270)   // 4:3 camera box
    static let hudTextHeight: CGFloat = 92
    static let cyan = NSColor(calibratedRed: 0.2, green: 0.95, blue: 1.0, alpha: 1)
    static let magenta = NSColor(calibratedRed: 1.0, green: 0.35, blue: 0.85, alpha: 1)

    override init(frame: NSRect) {
        super.init(frame: frame)
        wantsLayer = true
        layer?.backgroundColor = .clear
        root.isGeometryFlipped = true      // top-left origin for everything below
        root.frame = bounds
        root.autoresizingMask = [.layerWidthSizable, .layerHeightSizable]
        layer?.addSublayer(root)
        buildReticle()
        buildHUD()
        let scale = NSScreen.main?.backingScaleFactor ?? 2
        for l in [modeText, hudText] { l.contentsScale = scale }
    }

    @available(*, unavailable) required init?(coder: NSCoder) { fatalError() }

    override func layout() {
        super.layout()
        root.frame = bounds
    }

    override func viewDidChangeBackingProperties() {
        super.viewDidChangeBackingProperties()
        let scale = window?.backingScaleFactor ?? 2
        for l in [modeText, hudText] { l.contentsScale = scale }
    }

    private func buildReticle() {
        let r: CGFloat = 16
        reticleRing.path = CGPath(ellipseIn: CGRect(x: -r, y: -r, width: 2 * r, height: 2 * r), transform: nil)
        reticleRing.fillColor = Self.cyan.withAlphaComponent(0.08).cgColor
        reticleRing.strokeColor = Self.cyan.cgColor
        reticleRing.lineWidth = 2.5
        reticleRing.shadowColor = Self.cyan.cgColor
        reticleRing.shadowRadius = 8
        reticleRing.shadowOpacity = 0.9
        reticleRing.shadowOffset = .zero
        reticleDot.path = CGPath(ellipseIn: CGRect(x: -3, y: -3, width: 6, height: 6), transform: nil)
        reticleDot.fillColor = NSColor.white.cgColor
        modeText.fontSize = 11
        modeText.font = NSFont.systemFont(ofSize: 11, weight: .semibold)
        modeText.foregroundColor = Self.cyan.cgColor
        modeText.alignmentMode = .center
        modeText.bounds = CGRect(x: 0, y: 0, width: 160, height: 16)
        for l in [reticleRing, reticleDot, modeText] as [CALayer] { l.isHidden = true; root.addSublayer(l) }
    }

    private func buildHUD() {
        hud.backgroundColor = NSColor.black.withAlphaComponent(0.62).cgColor
        hud.cornerRadius = 12
        hud.borderColor = NSColor.white.withAlphaComponent(0.15).cgColor
        hud.borderWidth = 1
        hud.isHidden = true
        root.addSublayer(hud)

        hudCamera.frame = CGRect(origin: CGPoint(x: 0, y: 0), size: Self.hudSize)
        hudCamera.masksToBounds = true
        hud.addSublayer(hudCamera)

        zoneLayer.fillColor = nil
        zoneLayer.strokeColor = NSColor.white.withAlphaComponent(0.35).cgColor
        zoneLayer.lineDashPattern = [4, 4]
        keyboardLayer.fillColor = NSColor.systemOrange.withAlphaComponent(0.12).cgColor
        keyboardLayer.strokeColor = NSColor.systemOrange.withAlphaComponent(0.6).cgColor
        keyboardLayer.lineDashPattern = [2, 3]
        rawLayer.fillColor = NSColor.white.withAlphaComponent(0.35).cgColor
        for l in [zoneLayer, keyboardLayer, rawLayer] { hudCamera.addSublayer(l) }

        for i in 0..<2 {
            let color = i == 0 ? Self.cyan : Self.magenta
            let bones = CAShapeLayer()
            bones.strokeColor = color.cgColor
            bones.fillColor = nil
            bones.lineWidth = 2.5
            bones.lineCap = .round
            bones.lineJoin = .round
            let joints = CAShapeLayer()
            joints.fillColor = NSColor.white.cgColor
            joints.strokeColor = color.cgColor
            joints.lineWidth = 1
            hudCamera.addSublayer(bones); hudCamera.addSublayer(joints)
            boneLayers.append(bones); jointLayers.append(joints)
        }

        hudText.fontSize = 11
        hudText.font = NSFont.monospacedSystemFont(ofSize: 11, weight: .regular)
        hudText.foregroundColor = NSColor.white.cgColor
        hudText.isWrapped = true
        hud.addSublayer(hudText)
    }

    func render(_ state: OverlayState) {
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        defer { CATransaction.commit() }

        // Reticle: only on the screen it lands on.
        if let p = state.reticle, screenRect.contains(p) {
            let local = CGPoint(x: p.x - screenRect.minX, y: p.y - screenRect.minY)
            reticleRing.position = local
            reticleDot.position = local
            modeText.position = CGPoint(x: local.x, y: local.y + 30)
            modeText.string = state.modeLabel
            reticleRing.isHidden = false
            reticleDot.isHidden = false
            modeText.isHidden = state.modeLabel == nil
        } else {
            reticleRing.isHidden = true; reticleDot.isHidden = true; modeText.isHidden = true
        }

        guard showsHUD, let debug = state.debug else { hud.isHidden = true; return }
        hud.isHidden = false
        let size = CGSize(width: Self.hudSize.width, height: Self.hudSize.height + Self.hudTextHeight)
        hud.frame = CGRect(x: bounds.width - size.width - 20, y: bounds.height - size.height - 20, width: size.width, height: size.height)
        hudCamera.frame = CGRect(origin: .zero, size: Self.hudSize)
        hudText.frame = CGRect(x: 10, y: Self.hudSize.height + 6, width: size.width - 20, height: Self.hudTextHeight - 10)
        drawCamera(debug)
        hudText.string = debug.lines.joined(separator: "\n")
    }

    private func drawCamera(_ debug: DebugState) {
        let w = Double(Self.hudSize.width), h = Double(Self.hudSize.height)
        func pt(_ v: Vec2) -> CGPoint { CGPoint(x: v.x * w, y: v.y * h) }

        let z = debug.activeZone
        zoneLayer.path = CGPath(rect: CGRect(x: z.x * w, y: z.y * h, width: z.width * w, height: z.height * h), transform: nil)
        let kb = debug.keyboardZoneHeight
        keyboardLayer.path = CGPath(rect: CGRect(x: 0, y: (1 - kb) * h, width: w, height: kb * h), transform: nil)

        let rawPath = CGMutablePath()
        for hand in debug.raw?.hands ?? [] {
            for lm in hand.landmarks where lm.confidence > 0 {
                let p = pt(lm.position)
                rawPath.addEllipse(in: CGRect(x: p.x - 1.5, y: p.y - 1.5, width: 3, height: 3))
            }
        }
        rawLayer.path = rawPath

        for i in 0..<2 {
            guard i < debug.frame.hands.count else { boneLayers[i].path = nil; jointLayers[i].path = nil; continue }
            let hand = debug.frame.hands[i]
            boneLayers[i].strokeColor = (hand.chirality == .left ? Self.magenta : Self.cyan).cgColor
            jointLayers[i].strokeColor = boneLayers[i].strokeColor
            let bones = CGMutablePath()
            for (a, b) in HandSkeleton.bones where hand[a].confidence > 0 && hand[b].confidence > 0 {
                bones.move(to: pt(hand[a].position)); bones.addLine(to: pt(hand[b].position))
            }
            boneLayers[i].path = bones
            let joints = CGMutablePath()
            for lm in hand.landmarks where lm.confidence > 0 {
                let p = pt(lm.position)
                let r = CGFloat(2 + 2.5 * lm.confidence)   // bigger dot = more confident
                joints.addEllipse(in: CGRect(x: p.x - r, y: p.y - r, width: 2 * r, height: 2 * r))
            }
            jointLayers[i].path = joints
        }
    }
}
