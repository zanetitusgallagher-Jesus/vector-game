#!/usr/bin/env bash
# Regenerates AirHands.xcodeproj from project.yml.
source "$(dirname "$0")/common.sh"
if ! command -v xcodegen >/dev/null; then
  echo "xcodegen not found. Install it with: brew install xcodegen" >&2
  exit 1
fi
xcodegen generate --spec project.yml
