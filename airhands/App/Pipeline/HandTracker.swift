import AirHandsCore
import CoreVideo
import Foundation
import ImageIO
import Vision

/// Runs Vision hand-pose detection on camera frames. Not thread-safe: call from one queue
/// (the camera output queue). The request and handler objects are reused across frames.
final class HandTracker {
    /// Mirror X so moving your hand right moves things right, like a mirror.
    var mirrorX = true

    private let request: VNDetectHumanHandPoseRequest = {
        let r = VNDetectHumanHandPoseRequest()
        r.maximumHandCount = 2
        return r
    }()
    private let handler = VNSequenceRequestHandler()

    /// Vision joint names in `HandJoint` order.
    private static let jointNames: [VNHumanHandPoseObservation.JointName] = [
        .wrist,
        .thumbCMC, .thumbMP, .thumbIP, .thumbTip,
        .indexMCP, .indexPIP, .indexDIP, .indexTip,
        .middleMCP, .middlePIP, .middleDIP, .middleTip,
        .ringMCP, .ringPIP, .ringDIP, .ringTip,
        .littleMCP, .littlePIP, .littleDIP, .littleTip,
    ]

    /// Points Vision reports below this are treated as undetected (confidence 0).
    var minimumJointConfidence: Float = 0.2

    /// Returns nil only if Vision failed; a frame with no hands has `hands == []`.
    func process(_ pixelBuffer: CVPixelBuffer, timestamp: Double) -> HandFrame? {
        let width = Double(CVPixelBufferGetWidth(pixelBuffer))
        let height = Double(CVPixelBufferGetHeight(pixelBuffer))
        do {
            try handler.perform([request], on: pixelBuffer, orientation: .up)
        } catch {
            return nil
        }
        let observations = request.results ?? []
        let hands = observations.compactMap(convert)
        return HandFrame(timestamp: timestamp, aspectRatio: width / max(height, 1), hands: hands)
    }

    private func convert(_ obs: VNHumanHandPoseObservation) -> HandObservation? {
        guard let points = try? obs.recognizedPoints(.all) else { return nil }
        var landmarks: [Landmark] = []
        landmarks.reserveCapacity(HandJoint.count)
        for name in Self.jointNames {
            guard let p = points[name], p.confidence >= minimumJointConfidence else {
                landmarks.append(Landmark(.zero, confidence: 0))
                continue
            }
            // Vision: normalized, origin bottom-left. Core: origin top-left, mirrored.
            let x = mirrorX ? 1 - Double(p.location.x) : Double(p.location.x)
            let y = 1 - Double(p.location.y)
            landmarks.append(Landmark(Vec2(x, y), confidence: Double(p.confidence)))
        }
        // Without a wrist and middle MCP there is no hand size: unusable for gestures.
        guard landmarks[HandJoint.wrist.rawValue].confidence > 0,
              landmarks[HandJoint.middleMCP.rawValue].confidence > 0 else { return nil }

        // Vision's chirality names the person's actual hand; mirroring the image for display
        // does not change which hand it is, so it is passed through unchanged.
        let chirality: Chirality = switch obs.chirality {
        case .left: .left
        case .right: .right
        default: .unknown
        }
        return HandObservation(chirality: chirality, confidence: Double(obs.confidence), landmarks: landmarks)
    }
}
