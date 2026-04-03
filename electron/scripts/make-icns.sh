#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/build/icon.png"
ICONSET="$ROOT/build/icon.iconset"
DEST="$ROOT/build/icon.icns"
[ -f "$DEST" ] && echo "icon.icns exists" && exit 0
command -v iconutil &>/dev/null || { echo "iconutil not found (non-macOS)"; exit 0; }
mkdir -p "$ICONSET"
for size in 16 32 64 128 256 512 1024; do
  sips -z $size $size "$SRC" --out "$ICONSET/icon_${size}x${size}.png" &>/dev/null
done
sips -z 32   32   "$SRC" --out "$ICONSET/icon_16x16@2x.png"   &>/dev/null
sips -z 64   64   "$SRC" --out "$ICONSET/icon_32x32@2x.png"   &>/dev/null
sips -z 256  256  "$SRC" --out "$ICONSET/icon_128x128@2x.png" &>/dev/null
sips -z 512  512  "$SRC" --out "$ICONSET/icon_256x256@2x.png" &>/dev/null
sips -z 1024 1024 "$SRC" --out "$ICONSET/icon_512x512@2x.png" &>/dev/null
iconutil -c icns "$ICONSET" -o "$DEST"
rm -rf "$ICONSET"
echo "✓ icon.icns created"
