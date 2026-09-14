# Portable one-command setup for the EXO-RANK backend (Windows PowerShell).
# Run from the backend/ directory:  powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")     # backend/

Write-Host "[1/4] Creating virtual environment (.venv)"
python -m venv .venv
$py = ".\.venv\Scripts\python.exe"

Write-Host "[2/4] Installing dependencies"
& $py -m pip install --upgrade pip | Out-Null
& $py -m pip install -r requirements.txt

Write-Host "[3/4] Preparing data (env + index + manifest)"
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }
& $py scripts\build_structure_index.py
& $py scripts\build_manifest.py

Write-Host "[4/4] Verifying data integrity"
& $py scripts\verify_data.py

Write-Host ""
Write-Host "Setup complete. Start the API with:"
Write-Host "  .\.venv\Scripts\Activate.ps1 ; uvicorn app.main:app --reload"
