import Foundation
import AirHandsCore

// Writes synthetic landmark recordings (same JSON as the in-app Recorder) for tests/fixtures.
// Usage: swift run airhands-synth <sequence> <output.json>
// Sequences: open_palm_still, point_sweep

let args = CommandLine.arguments
if args.count == 2, args[1] == "probe" {
    // Prints the features of each named synthetic pose (for threshold tuning).
    let poses: [(String, SyntheticHand)] = [
        ("open", .openPalm()), ("stop", .stopPalm()), ("point", .point()), ("fist", .fist()),
        ("peace", .peace()), ("two", .twoFingers()), ("thumbsUp", .thumbsUp()),
        ("pinch", SyntheticHand(curl: [0, 0, 1, 1, 1], pinch: 1)),
        ("midPinch", SyntheticHand(curl: [0, 0, 0, 1, 1], pinch: 1, pinchFinger: .middle)),
    ]
    for (name, h) in poses {
        let f = HandFeatures(h.observation(), aspectRatio: 4.0 / 3.0)
        var st = FingerStates(); st.update(f); st.update(f)
        let e = f.extension_.map { String(format: "%.2f", $0) }.joined(separator: " ")
        print(String(format: "%-9@ ext[%@] pinchI %.2f pinchM %.2f gap %.2f fan %.2f thumbDir (%.2f,%.2f) top %@ -> %@",
                     name as NSString, e as NSString, f.pinchIndex, f.pinchMiddle, f.indexMiddleGap, f.fanWidth,
                     f.thumbDirection.x, f.thumbDirection.y, (f.thumbIsTopmost ? "y" : "n") as NSString, st.pose(f).rawValue as NSString))
    }
    exit(0)
}
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
