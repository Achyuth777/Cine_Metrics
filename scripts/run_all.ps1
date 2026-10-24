# ==============================================================================
# CineMetrics - Master Startup Script for Windows PowerShell
# ==============================================================================
# Developer: Achyuth PV | SRM Ramapuram | Big Data Essentials (21CSC314P)
# ==============================================================================

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  CineMetrics - Movie Intelligence and Ratings Analytics" -ForegroundColor Cyan
Write-Host "  SRM Institute of Science and Technology, Ramapuram" -ForegroundColor DarkCyan
Write-Host "  Course: Big Data Essentials (21CSC314P) | Developer: Achyuth PV" -ForegroundColor DarkCyan
Write-Host "======================================================================" -ForegroundColor Cyan

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# Locate Python executable
$pythonExe = "python"
if (Test-Path "$env:LOCALAPPDATA\Python\pythoncore-3.14-64\python.exe") {
    $pythonExe = "$env:LOCALAPPDATA\Python\pythoncore-3.14-64\python.exe"
}

# Step 1: Ensure MapReduce data outputs exist
Write-Host ""
Write-Host "[1/3] Checking MapReduce Processed Datasets..." -ForegroundColor Yellow
if (-not (Test-Path "$projectRoot\data\processed\avgrating\part-r-00000")) {
    Write-Host "  -> Processing MovieLens dataset via Python reference pipeline..." -ForegroundColor Gray
    & $pythonExe "$projectRoot\scripts\process_dataset.py"
} else {
    Write-Host "  [OK] Verified MapReduce output partitions present in data/processed/." -ForegroundColor Green
}

# Step 2: Start Backend API in a separate background window
Write-Host ""
Write-Host "[2/3] Launching FastAPI Backend on http://localhost:8000..." -ForegroundColor Yellow
$backendProcess = Start-Process -FilePath $pythonExe -ArgumentList "$projectRoot\scripts\start_backend.py" -PassThru
Write-Host "  [OK] Backend started (PID: $($backendProcess.Id)). Swagger UI: http://localhost:8000/docs" -ForegroundColor Green

# Step 3: Start React Frontend in dev mode
Write-Host ""
Write-Host "[3/3] Launching React Analytics Dashboard on http://localhost:5173..." -ForegroundColor Yellow
Set-Location "$projectRoot\frontend"
npm run dev
