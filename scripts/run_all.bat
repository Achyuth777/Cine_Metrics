@echo off
REM ==============================================================================
REM CineMetrics — Quick Launch Batch File (Windows CMD)
REM SRM Ramapuram | Big Data Essentials (21CSC314P) | Achyuth PV
REM ==============================================================================

echo ======================================================================
echo   Starting CineMetrics: Movie Ratings Analytics Using Hadoop MapReduce
echo ======================================================================

cd /d "%~dp0\.."

REM Check if data exists
if not exist "data\processed\movies.json" (
    echo Processing MovieLens dataset...
    python scripts\process_dataset.py
)

REM Launch backend in a new window
start "CineMetrics Backend API" cmd /k "python scripts\start_backend.py"

REM Launch frontend
cd frontend
echo Starting Frontend Dashboard at http://localhost:5173
npm run dev
