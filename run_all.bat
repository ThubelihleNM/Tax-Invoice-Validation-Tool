
@echo off
setlocal
title TaxAudit - Build and Deploy to Vercel

cd /d "%~dp0"

echo ==========================================
echo  TaxAudit - Production Deployment
echo ==========================================

REM Check frontend
if not exist "frontend\package.json" (
    echo ERROR: frontend\package.json not found.
    pause
    exit /b 1
)

REM Check Node and npm
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH.
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not installed or not in PATH.
    pause
    exit /b 1
)

echo.
echo [1/4] Installing frontend dependencies...
cd /d "%~dp0frontend"
call npm install
if errorlevel 1 goto error

echo.
echo [2/4] Building the latest frontend...
call npm run build
if errorlevel 1 goto error

echo.
echo [3/4] Deploying the frontend to Vercel...
echo Make sure this frontend folder is linked to your Vercel project.
call npx vercel --prod
if errorlevel 1 goto error

echo.
echo [4/4] Frontend deployment command completed.
echo Check the deployment URL shown above.
echo.
echo IMPORTANT:
echo Your FastAPI backend must also be deployed online.
echo Configure VITE_API_BASE_URL with its HTTPS URL
echo in your Vercel project environment variables.
echo Redeploy after changing environment variables.
echo.
pause
exit /b 0

:error
echo.
echo ERROR: A step failed. Read the error messages above.
pause
exit /b 1
