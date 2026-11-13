import Foundation

/// Smooths every landmark of every hand with a One Euro filter and gives each hand a stable
/// `trackID` across frames, so downstream state machines can follow "the same hand".
///
/// Matching: a detection joins the existing track with the nearest wrist (same chirality
/// preferred) within `maxMatchDistance`; otherwise it starts a new track. Tracks unseen for
/// `lostTimeout` seconds are dropped, which also resets their filters (no "swoosh" from the
/// old position when a hand reappears elsewhere).
public final class HandSmoother {
    public var parameters: SmoothingParameters {
        didSet { for i in tracks.indices { tracks[i].setParameters(parameters) } }
    }
    public var lostTimeout: Double
    /// In normalized camera units.
    public var maxMatchDistance: Double

    private struct Track {
        var id: Int
        var chirality: Chirality
        var lastSeen: Double
        var lastWrist: Vec2
        var filters: [OneEuroFilter2D]

        init(id: Int, chirality: Chirality, t: Double, wrist: Vec2, parameters: SmoothingParameters) {
            self.id = id; self.chirality = chirality; lastSeen = t; lastWrist = wrist
            filters = Array(repeating: OneEuroFilter2D(parameters), count: HandJoint.count)
        }

        mutating func setParameters(_ p: SmoothingParameters) {
            for i in filters.indices { filters[i].parameters = p }
        }
    }

    private var tracks: [Track] = []
    private var nextID = 1

    public init(parameters: SmoothingParameters = .default, lostTimeout: Double = 0.3, maxMatchDistance: Double = 0.25) {
        self.parameters = parameters; self.lostTimeout = lostTimeout; self.maxMatchDistance = maxMatchDistance
    }

    public func reset() { tracks.removeAll() }

    public var activeTrackCount: Int { tracks.count }

    public func smooth(_ frame: HandFrame) -> HandFrame {
        let t = frame.timestamp
        tracks.removeAll { t - $0.lastSeen > lostTimeout || t < $0.lastSeen }

        var used = Set<Int>()   // indices into `tracks` already claimed this frame
        var out: [HandObservation] = []

        // Confident hands claim tracks first.
        let order = frame.hands.indices.sorted { frame.hands[$0].confidence > frame.hands[$1].confidence }
        var results = [HandObservation?](repeating: nil, count: frame.hands.count)

        for hi in order {
            var hand = frame.hands[hi]
            let wrist = hand[.wrist].position

            var best: (index: Int, score: Double)?
            for (ti, track) in tracks.enumerated() where !used.contains(ti) {
                let d = track.lastWrist.distance(to: wrist)
                guard d <= maxMatchDistance else { continue }
                let chiralityMismatch = hand.chirality != .unknown && track.chirality != .unknown && hand.chirality != track.chirality
                let score = d + (chiralityMismatch ? 1.0 : 0)   // mismatch only wins if nothing else fits
                if best == nil || score < best!.score { best = (ti, score) }
            }

            let ti: Int
            if let b = best {
                ti = b.index
            } else {
                tracks.append(Track(id: nextID, chirality: hand.chirality, t: t, wrist: wrist, parameters: parameters))
                nextID += 1
                ti = tracks.count - 1
            }
            used.insert(ti)

            for j in 0..<HandJoint.count where hand.landmarks[j].confidence > 0 {
                hand.landmarks[j].position = tracks[ti].filters[j].filter(hand.landmarks[j].position, at: t)
            }
            tracks[ti].lastSeen = t
            tracks[ti].lastWrist = wrist
            if hand.chirality != .unknown { tracks[ti].chirality = hand.chirality }
            hand.trackID = tracks[ti].id
            results[hi] = hand
        }

        out = results.compactMap { $0 }
        return HandFrame(timestamp: frame.timestamp, aspectRatio: frame.aspectRatio, hands: out)
    }
}
