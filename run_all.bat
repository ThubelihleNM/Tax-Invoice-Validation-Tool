@echo off
title Smart Tax Invoice Validation Tool - All Services
echo ========================================================
echo  Smart Tax Invoice Validation Tool
echo  React Frontend -^> FastAPI Backend -^> SQLite Database
echo ========================================================

cd /d "%~dp0"

REM --------------------------------------------------------
REM Kill any stale processes on ports 8000 and 3000
REM --------------------------------------------------------
echo [CLEANUP] Checking for stale processes on ports 8000 and 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo [CLEANUP] Done.

REM --------------------------------------------------------
REM [1/2] Start FastAPI Backend (SQLite - no MySQL required)
REM --------------------------------------------------------
echo [1/2] Starting FastAPI Backend on port 8000 (LAN enabled) ...
start "TaxAudit - FastAPI Backend (Port 8000)" cmd /k "cd /d ""%~dp0backend"" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

REM Wait for backend to initialize (5 seconds)
echo Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

REM --------------------------------------------------------
REM [2/2] Start React Frontend
REM --------------------------------------------------------
echo [2/2] Starting React Frontend on port 3000 (LAN enabled) ...
set "PATH=%~dp0tools\node;%PATH%"
start "TaxAudit - React Frontend (Port 3000)" cmd /k "cd /d ""%~dp0frontend"" && npm run dev -- --host 0.0.0.0"

REM Wait for frontend to initialize (5 seconds)
echo Waiting for frontend to initialize...
timeout /t 5 /nobreak >nul

echo ========================================================
echo  All services launched!
echo  React App:       http://localhost:3000
echo  FastAPI Backend: http://localhost:8000
echo  Swagger Docs:    http://localhost:8000/docs
echo  Health Check:    http://localhost:8000/health
echo  For another device on this Wi-Fi/LAN, open the Network URL shown by Vite.
echo  If blocked, allow inbound TCP port 3000 through Windows Firewall (Private).
echo ========================================================
echo  NOTE: Database is SQLite (no MySQL server needed)
echo  DB file: backend\invoice_db.db
echo ========================================================
echo Opening browser...
start http://localhost:3000
pause
