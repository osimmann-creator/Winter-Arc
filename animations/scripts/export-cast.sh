#!/bin/bash
# Renders Flexander's poses for the HyperFrames clips (src/export/cast-poses.tsx) into
# hyperframes/assets/cast/flex-*.svg plus flex.json (hand, head and face positions per pose).
set -e
cd "$(dirname "$0")/.."
npx esbuild src/export/cast.tsx --bundle --platform=node --format=cjs --jsx=automatic \
  --alias:remotion=./src/export/remotion-shim.ts --outfile=out/.export-cast.cjs --log-level=warning
node out/.export-cast.cjs "${1:-hyperframes/assets/cast}"
