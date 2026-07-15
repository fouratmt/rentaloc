set dotenv-load := true

port := env_var_or_default("PORT", "8000")

# List available recipes.
default:
    @just --list

# Run lightweight project checks.
check:
    node --check src/app.js
    node --check sw.js
    node --test tests/*.test.cjs

# Serve the static app locally.
serve:
    python3 -m http.server --bind 127.0.0.1 {{port}}

# Show repository status.
status:
    git status --short

# Remove common local-only generated files.
clean:
    find . -name ".DS_Store" -delete
