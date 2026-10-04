#!/bin/sh
set -eu

image=${RENTALOC_DOCKER_IMAGE:-rentaloc:check}
container="rentaloc-container-check-$$"
port=${RENTALOC_CONTAINER_CHECK_PORT:-}

cleanup() {
  docker rm --force "$container" >/dev/null 2>&1 || true
}
trap cleanup EXIT HUP INT TERM

docker build --build-arg "BUILD_REVISION=${BUILD_REVISION:-local-check}" --tag "$image" .
if [ -n "$port" ]; then
  publish="127.0.0.1:${port}:8080"
else
  publish="127.0.0.1::8080"
fi

docker run --detach --name "$container" --init --read-only --tmpfs /tmp:size=16m,mode=1777 \
  --cap-drop ALL --security-opt no-new-privileges --publish "$publish" "$image" >/dev/null
port=$(docker inspect --format '{{(index (index .NetworkSettings.Ports "8080/tcp") 0).HostPort}}' "$container")

attempt=0
until curl --fail --silent --show-error "http://127.0.0.1:${port}/app.html" >/dev/null; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 20 ]; then
    docker logs "$container"
    exit 1
  fi
  sleep 1
done

health_tmp=$(mktemp -d)
trap 'rm -rf "$health_tmp"; cleanup' EXIT HUP INT TERM

curl --fail --silent --show-error --output "$health_tmp/landing.html" \
  --dump-header "$health_tmp/landing.headers" "http://127.0.0.1:${port}/"
curl --fail --silent --show-error --output "$health_tmp/app.html" \
  --dump-header "$health_tmp/app.headers" "http://127.0.0.1:${port}/app.html"
curl --fail --silent --show-error --output "$health_tmp/manifest.json" \
  --dump-header "$health_tmp/manifest.headers" "http://127.0.0.1:${port}/site.webmanifest"

grep -q "Voyez ce que l'annonce" "$health_tmp/landing.html"
grep -q "ne vous dit pas" "$health_tmp/landing.html"
grep -q "Ce bien vaut-il vraiment le coup" "$health_tmp/app.html"
grep -qi '^content-security-policy:' "$health_tmp/app.headers"
grep -qi '^x-content-type-options: nosniff' "$health_tmp/app.headers"
grep -qi '^content-type: application/manifest+json' "$health_tmp/manifest.headers"
test "$(docker inspect --format '{{.Config.User}}' "$container")" = "nginx"

echo "Container smoke check passed at http://127.0.0.1:${port}"
