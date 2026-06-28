#!/bin/bash
# Double-click this file on macOS (Finder) to launch Agent Empire.
# It installs dependencies on first run, starts the backend + UI, and opens
# your browser. Close the Terminal window to stop it.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install it from https://nodejs.org (LTS), then re-run."
  read -r -p "Press Enter to close…" _
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies (first run only)…"
  npm install || { read -r -p "Install failed. Press Enter…" _; exit 1; }
fi

# Open the UI once the dev server has had a moment to boot.
( sleep 3; open "http://localhost:5173" ) &

echo "Starting Agent Empire — open http://localhost:5173"
echo "Tip: recruit Claude with launch command 'claude' (the CLI must be on your PATH)."
npm run dev
