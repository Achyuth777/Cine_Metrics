#!/usr/bin/env python3
"""
==============================================================================
CineMetrics — Backend Launcher Script
==============================================================================
Initializes data loader and launches Uvicorn server on port 8000.
Listens on 0.0.0.0 to enable local network access and local demonstration.
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

import uvicorn

if __name__ == "__main__":
    print("=" * 60)
    print("  Starting CineMetrics FastAPI Backend on http://localhost:8000")
    print("  Swagger UI Documentation: http://localhost:8000/docs")
    print("=" * 60)

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        app_dir=str(backend_dir)
    )
