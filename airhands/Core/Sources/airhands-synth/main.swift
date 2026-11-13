import Foundation
import AirHandsCore

// Writes synthetic landmark recordings (same JSON as the in-app Recorder) for tests/fixtures.
// Usage: swift run airhands-synth <sequence> <output.json>
// Sequences: open_palm_still, point_sweep

let args = CommandLine.arguments
guard args.count == 3 else {
    FileHandle.standardError.write("usage: airhands-synth <open_palm_still|point_sweep> <out.json>\n".data(using: .utf8)!)
    exit(2)
}
var noise = SeededNoise(seed: 42)
var frames: [HandFrame] = []
switch args[1] {
case "open_palm_still":
    for i in 0..<30 { frames.append(noise.jitter(SyntheticHand.openPalm().frame(at: Double(i) / 30), sigma: 0.002)) }
case "point_sweep":
    for i in 0..<60 {
        let x = 0.3 + 0.4 * Double(i) / 59
        frames.append(noise.jitter(SyntheticHand.point(at: Vec2(x, 0.65)).frame(at: Double(i) / 30), sigma: 0.002))
    }
default:
    FileHandle.standardError.write("unknown sequence \(args[1])\n".data(using: .utf8)!)
    exit(2)
}
let rec = LandmarkRecording(label: "synthetic:\(args[1])", createdAt: Date(timeIntervalSince1970: 1_763_000_000), frames: frames)
try rec.save(to: URL(fileURLWithPath: args[2]))
print("wrote \(frames.count) frames to \(args[2])")
