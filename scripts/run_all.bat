@echo off
REM ==============================================================================
REM CineMetrics - Quick Launch Batch File (Windows CMD)
REM SRM Ramapuram | Big Data Essentials (21CSC314P) | Achyuth PV
REM ==============================================================================

echo ======================================================================
echo   Starting CineMetrics: Movie Ratings Analytics Using Hadoop MapReduce
echo ======================================================================

cd /d "%~dp0\.."

set "PY_CMD=python"
if exist "%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe" (
    set "PY_CMD=%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe"
)

REM Check if data exists
if not exist "data\processed\avgrating\part-r-00000" (
    echo Processing MovieLens dataset via Python reference pipeline...
    "%PY_CMD%" scripts\process_dataset.py
)

REM Launch backend in a new window
echo Launching FastAPI Backend...
start "CineMetrics Backend API" cmd /k ""%PY_CMD%" scripts\start_backend.py"

REM Launch frontend
cd frontend
echo Starting Frontend Dashboard at http://localhost:5173
npm run dev
