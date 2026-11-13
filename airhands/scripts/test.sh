#!/usr/bin/env bash
# Runs the AirHandsCore unit tests (pure Swift; also works on Linux).
#   ./scripts/test.sh          swift test in Core/
#   ./scripts/test.sh --xcode [--adhoc]  the same tests through the Xcode scheme
source "$(dirname "$0")/common.sh"
if [[ "${1:-}" == "--xcode" ]]; then
  EXTRA=()
  [[ "${2:-}" == "--adhoc" ]] && EXTRA=(CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM=)
  ./scripts/generate.sh
  xcodebuild -project AirHands.xcodeproj -scheme AirHands -derivedDataPath build \
    -destination 'platform=macOS' ${EXTRA[@]+"${EXTRA[@]}"} test | (command -v xcbeautify >/dev/null && xcbeautify || cat)
else
  (cd Core && swift test)
fi
