set dotenv-load := true

port := env_var_or_default("PORT", "8000")

# List available recipes.
default:
    @just --list

# Run lightweight project checks.
check:
    npm run check

# Format repository source and documentation.
format:
    npm run format

# Install the Chromium runtime used by E2E tests.
install-browser:
    npm run test:e2e:install

# Run browser end-to-end tests.
test-e2e:
    npm run test:e2e

# Run every production release gate, including qualified fiscal approval.
release-check:
    npm run release:check

# Stage the static Cloudflare Pages artifact.
stage-site:
    sh scripts/stage-static-site.sh

# Serve the static app locally.
serve:
    python3 -m http.server --bind 127.0.0.1 {{port}}

# Show repository status.
status:
    git status --short

# Remove common local-only generated files.
clean:
    find . -name ".DS_Store" -delete
