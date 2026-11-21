#!/bin/bash
# Bundles src/export/parts.tsx for Node (with a tiny 'remotion' shim) and runs it.
set -e
cd "$(dirname "$0")/.."
npx esbuild src/export/parts.tsx --bundle --platform=node --format=cjs --jsx=automatic \
  --alias:remotion=./src/export/remotion-shim.ts --outfile=out/.export-parts.cjs --log-level=warning
node out/.export-parts.cjs "${1:-out/parts-kit}"
