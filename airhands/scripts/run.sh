#!/usr/bin/env bash
# Builds, (re)launches AirHands, optionally takes a screenshot.
#   ./scripts/run.sh [--adhoc] [--screenshot]
source "$(dirname "$0")/common.sh"
BUILD_ARGS=(); SHOT=0
for a in "$@"; do
  case "$a" in
    --adhoc) BUILD_ARGS+=(--adhoc) ;;
    --screenshot) SHOT=1 ;;
  esac
done
./scripts/build.sh ${BUILD_ARGS[@]+"${BUILD_ARGS[@]}"}
pkill -x AirHands 2>/dev/null || true
sleep 0.5
open "$APP"
if [[ $SHOT == 1 ]]; then
  sleep 3
  mkdir -p build/screenshots
  OUT="build/screenshots/$(date +%Y%m%d-%H%M%S).png"
  screencapture -x "$OUT" && echo "Screenshot: $OUT"
fi
