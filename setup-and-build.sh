#!/usr/bin/env bash
set -euo pipefail

# Setup Node (nvm fallback) and run install + build for this project.
# Run: bash setup-and-build.sh

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

echo "==> Starting setup in $REPO_DIR"

if command -v brew >/dev/null 2>&1; then
  echo "Homebrew detected — installing node via brew..."
  brew install node || true
else
  echo "Homebrew not found. Installing nvm and Node LTS..."
  if [ -d "$HOME/.nvm" ]; then
    echo "nvm already installed"
  else
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  fi
  # shellcheck source=/dev/null
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  nvm install --lts
  nvm use --lts
fi

echo "==> Installing dependencies"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "==> Running build"
npm run build

echo "==> Build finished"
