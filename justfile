set dotenv-load := true

port := env_var_or_default("PORT", "8000")

# List available recipes.
default:
    @just --list

# Run lightweight project checks.
check:
    node --check src/app.js
    node --check sw.js
    node --check worker/index.js

# Build the Cloudflare Worker-compatible static bundle.
build:
    rm -rf dist
    mkdir -p dist/server dist/client
    cp worker/index.js dist/server/index.js
    cp index.html site.webmanifest sw.js dist/client/
    cp -R src assets dist/client/

# Serve the static app locally.
serve:
    python3 -m http.server {{port}}

# Show repository status.
status:
    git status --short

# Remove common local-only generated files.
clean:
    find . -name ".DS_Store" -delete
