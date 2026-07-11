#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
build_dir=${1:-"$root/build-web"}
output_dir=${2:-"$root/dist-web"}

case "$output_dir" in
    ""|"/")
        echo "Refusing unsafe output directory: $output_dir" >&2
        exit 1
        ;;
esac

html="$build_dir/Pepsiman_Recompiled.html"
javascript="$build_dir/Pepsiman_Recompiled.js"
wasm="$build_dir/Pepsiman_Recompiled.wasm"

for file in "$html" "$javascript" "$wasm"; do
    if [ ! -f "$file" ]; then
        echo "Missing browser build artifact: $file" >&2
        exit 1
    fi
done

rm -rf "$output_dir"
mkdir -p "$output_dir"
cp "$html" "$output_dir/index.html"
cp "$javascript" "$output_dir/Pepsiman_Recompiled.js"
cp "$wasm" "$output_dir/Pepsiman_Recompiled.wasm"
cp "$root/web/_headers" "$output_dir/_headers"

echo "Packaged asset-free browser release in $output_dir"
