#!/usr/bin/env bash
# Builds AirHands (Debug) into ./build.
#   ./scripts/build.sh          sign with your Apple Development identity (Config/Local.xcconfig)
#   ./scripts/build.sh --adhoc  ad-hoc signing; works without a team, but macOS will forget
#                               the Camera/Accessibility/Input Monitoring grants on every rebuild
source "$(dirname "$0")/common.sh"
EXTRA=()
if [[ "${1:-}" == "--adhoc" ]]; then
  EXTRA=(CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM= PROVISIONING_PROFILE_SPECIFIER=)
elif ! grep -qE '^DEVELOPMENT_TEAM *= *[A-Z0-9]{10}' Config/Local.xcconfig 2>/dev/null; then
  echo "No team set. Copy Config/Local.xcconfig.example to Config/Local.xcconfig and set DEVELOPMENT_TEAM," >&2
  echo "or build with --adhoc (permissions then reset on every rebuild)." >&2
  exit 1
fi
./scripts/generate.sh
xcodebuild -project AirHands.xcodeproj -scheme AirHands -configuration Debug \
  -derivedDataPath build -destination 'platform=macOS' \
  ${EXTRA[@]+"${EXTRA[@]}"} build | (command -v xcbeautify >/dev/null && xcbeautify || cat)
echo "Built $APP"
