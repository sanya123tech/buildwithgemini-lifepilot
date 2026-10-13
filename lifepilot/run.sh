#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================================="
echo "  🚀 Starting LifePilot AI — Your Personal AI Command Center"
echo "  • Protocol: Model Context Protocol (MCP 2.3.0)"
echo "  • Persistent Storage: SQLite WAL mode"
echo "  • API & Orchestrator: FastAPI"
echo "=========================================================="

VENV_PYTHON="/config/lifepilot-venv/bin/python"
if [ ! -f "$VENV_PYTHON" ]; then
    VENV_PYTHON="python3"
fi

# Run the unified FastAPI server which serves both the REST/SSE API and the React SPA
echo "Starting LifePilot Command Center on http://0.0.0.0:8000 ..."
exec "$VENV_PYTHON" -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --app-dir "$DIR"
