#!/bin/sh
set -eu

output_dir="dist"

rm -rf dist
mkdir -p "$output_dir/src" "$output_dir/assets/icons"

cp index.html app.html site.webmanifest sw.js _headers "$output_dir/"
cp src/*.js src/styles.css "$output_dir/src/"
cp assets/og.png "$output_dir/assets/"
cp assets/icons/* "$output_dir/assets/icons/"

test -f "$output_dir/index.html"
test -f "$output_dir/app.html"
test -f "$output_dir/sw.js"
test -f "$output_dir/_headers"
