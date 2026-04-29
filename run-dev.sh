#!/usr/bin/env bash
set -euo pipefail

# Start from repo root regardless of invocation location.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
  echo
  echo "Stopping backend and frontend..."
  kill "${BACKEND_PID:-}" "${FRONTEND_PID:-}" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

echo "Starting backend (uvicorn)..."
(
  cd "$SCRIPT_DIR/backend"
  uvicorn main:app --reload
) &
BACKEND_PID=$!

echo "Starting frontend (vite)..."
(
  cd "$SCRIPT_DIR/frontend"
  npm run dev
) &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Press Ctrl+C to stop both."

wait "$BACKEND_PID" "$FRONTEND_PID"
