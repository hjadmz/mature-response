#!/bin/bash
# Mature Response — double-click launcher (macOS)
# Installs/builds on first run, then starts the app and opens your browser.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed."
  echo "Get it at https://nodejs.org (the LTS version), then run this again."
  read -n 1 -s -r -p "Press any key to close."
  exit 1
fi

if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama is not installed."
  echo "Get it at https://ollama.com, then run this again."
  read -n 1 -s -r -p "Press any key to close."
  exit 1
fi

# Make sure Ollama is running.
ollama list >/dev/null 2>&1 || (ollama serve >/dev/null 2>&1 &)

# First-run install + build. The marker file is written by npm only when an
# install COMPLETES, so an interrupted first install self-repairs on the next
# launch instead of leaving a broken half-tree behind a passing directory check.
[ -f node_modules/.package-lock.json ] || npm install

# Build when there is no completed build (BUILD_ID is written by a finished
# build) or when any source file is newer than it — so pulling an update or
# editing the app never serves a stale build.
if [ ! -f .next/BUILD_ID ] || [ -n "$(find app components lib public package.json next.config.mjs -newer .next/BUILD_ID -print -quit 2>/dev/null)" ]; then
  rm -rf .next
  npm run build || exit 1
fi

# Open the browser once the server is up, then run it.
( sleep 3; open http://localhost:3000 ) &
echo "Starting Mature Response at http://localhost:3000  (close this window to stop)"
npm run start
