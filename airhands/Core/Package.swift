// swift-tools-version:5.10
// AirHandsCore: the platform-independent half of AirHands.
// Pure Swift + Foundation only (no AVFoundation / Vision / AppKit), so it builds
// and tests with `swift test` on macOS *and* Linux.
import PackageDescription

let package = Package(
    name: "AirHandsCore",
    platforms: [.macOS(.v14)],
    products: [
        .library(name: "AirHandsCore", targets: ["AirHandsCore"]),
        .executable(name: "airhands-synth", targets: ["airhands-synth"]),
    ],
    targets: [
        .target(name: "AirHandsCore"),
        // Generates synthetic landmark recordings (test fixtures / demos).
        .executableTarget(name: "airhands-synth", dependencies: ["AirHandsCore"]),
        .testTarget(
            name: "AirHandsCoreTests",
            dependencies: ["AirHandsCore"],
            resources: [.copy("Fixtures")]
        ),
    ]
)
