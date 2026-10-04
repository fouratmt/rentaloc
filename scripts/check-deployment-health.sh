#!/bin/sh
set -eu

production_url=${1:-}
case "$production_url" in
  https://*) ;;
  *)
    echo "Usage: scripts/check-deployment-health.sh https://production.example" >&2
    exit 2
    ;;
esac
production_url=${production_url%/}

health_tmp=$(mktemp -d)
trap 'rm -rf "$health_tmp"' EXIT HUP INT TERM

curl --fail --silent --show-error --location --max-time 20 \
  --output "$health_tmp/landing.html" --dump-header "$health_tmp/landing.headers" "$production_url/"
curl --fail --silent --show-error --location --max-time 20 \
  --output "$health_tmp/app.html" --dump-header "$health_tmp/app.headers" "$production_url/app.html"
curl --fail --silent --show-error --location --max-time 20 \
  --output "$health_tmp/manifest.json" --dump-header "$health_tmp/manifest.headers" "$production_url/site.webmanifest"

grep -q "Voyez ce que l'annonce" "$health_tmp/landing.html"
grep -q "ne vous dit pas" "$health_tmp/landing.html"
grep -q "Ce bien vaut-il vraiment le coup" "$health_tmp/app.html"
grep -qi '^content-security-policy:' "$health_tmp/app.headers"
grep -qi '^x-content-type-options: nosniff' "$health_tmp/app.headers"
grep -qi '^content-type:.*application/manifest+json' "$health_tmp/manifest.headers"

echo "RentaLoc health check passed for $production_url"
