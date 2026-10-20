# ==============================================================================
# CineMetrics — Master Startup Script for Windows PowerShell
# ==============================================================================
# Developer: Achyuth PV | SRM Ramapuram | Big Data Essentials (21CSC314P)
# ==============================================================================

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  CineMetrics — Movie Intelligence & Ratings Analytics" -ForegroundColor Cyan
Write-Host "  SRM Institute of Science and Technology, Ramapuram" -ForegroundColor DarkCyan
Write-Host "  Course: Big Data Essentials (21CSC314P) | Developer: Achyuth PV" -ForegroundColor DarkCyan
Write-Host "======================================================================" -ForegroundColor Cyan

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# Step 1: Ensure MapReduce data outputs exist
Write-Host "`n[1/3] Checking MapReduce Processed Datasets..." -ForegroundColor Yellow
if (-not (Test-Path "$projectRoot\data\processed\movies.json")) {
    Write-Host "  → Processing MovieLens dataset via local MapReduce pipeline..." -ForegroundColor Gray
    python "$projectRoot\scripts\process_dataset.py"
} else {
    Write-Host "  ✓ Processed MapReduce datasets verified." -ForegroundColor Green
}

# Step 2: Start Backend API in background job or process
Write-Host "`n[2/3] Launching FastAPI Backend on http://localhost:8000..." -ForegroundColor Yellow
$backendProcess = Start-Process -FilePath "python" -ArgumentList "$projectRoot\scripts\start_backend.py" -PassThru
Write-Host "  ✓ Backend started (PID: $($backendProcess.Id)). Swagger UI at http://localhost:8000/docs" -ForegroundColor Green

# Step 3: Start React Frontend in dev mode
Write-Host "`n[3/3] Launching React Analytics Dashboard on http://localhost:5173..." -ForegroundColor Yellow
Set-Location "$projectRoot\frontend"
npm run dev
