#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="${OREBUNKER_BUILD_ROOT:-$ROOT/build-native}"
VERSION="${LUANTI_REF:-5.17.0}"
mkdir -p "$WORK"
if [ ! -d "$WORK/luanti/.git" ]; then
  git clone --depth 1 --branch "$VERSION" https://github.com/luanti-org/luanti.git "$WORK/luanti"
else
  git -C "$WORK/luanti" fetch --depth 1 origin "$VERSION"
  git -C "$WORK/luanti" checkout FETCH_HEAD
fi
cmake -S "$WORK/luanti" -B "$WORK/engine" -G Ninja \
  -DCMAKE_BUILD_TYPE=Release -DBUILD_CLIENT=ON -DBUILD_SERVER=ON \
  -DBUILD_UNITTESTS=ON -DBUILD_DOCUMENTATION=OFF -DRUN_IN_PLACE=ON
cmake --build "$WORK/engine" --parallel 2
mkdir -p "$WORK/luanti/games"
rm -rf "$WORK/luanti/games/orebunker"
cp -a "$ROOT/game" "$WORK/luanti/games/orebunker"
mkdir -p "$WORK/dist"
tar -C "$WORK" -czf "$WORK/dist/OreBunker-Luanti-linux-source-built.tar.gz" luanti
echo "Native engine/game bundle: $WORK/dist/OreBunker-Luanti-linux-source-built.tar.gz"
echo "Inspect upstream Luanti build logs and licenses before distributing."
