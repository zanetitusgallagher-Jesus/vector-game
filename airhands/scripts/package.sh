#!/usr/bin/env bash
# Builds a Release AirHands.app (universal: Apple Silicon + Intel) and zips it to
# build/dist/AirHands.zip. Used by CI to publish downloads — no Xcode needed by users.
#   ./scripts/package.sh [--adhoc]
source "$(dirname "$0")/common.sh"
EXTRA=()
[[ "${1:-}" == "--adhoc" ]] && EXTRA=(CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM= PROVISIONING_PROFILE_SPECIFIER=)
./scripts/generate.sh
xcodebuild -project AirHands.xcodeproj -scheme AirHands -configuration Release \
  -derivedDataPath build -destination 'generic/platform=macOS' \
  ARCHS="arm64 x86_64" ONLY_ACTIVE_ARCH=NO \
  ${EXTRA[@]+"${EXTRA[@]}"} build | (command -v xcbeautify >/dev/null && xcbeautify || cat)
REL="$ROOT/build/Build/Products/Release/AirHands.app"
mkdir -p build/dist
rm -f build/dist/AirHands.zip
# ditto keeps the bundle's symlinks, permissions and code signature intact.
ditto -c -k --sequesterRsrc --keepParent "$REL" build/dist/AirHands.zip
codesign -dv "$REL" 2>&1 | grep -E 'Identifier|Signature' || true
lipo -archs "$REL/Contents/MacOS/AirHands"
echo "Packaged build/dist/AirHands.zip"
