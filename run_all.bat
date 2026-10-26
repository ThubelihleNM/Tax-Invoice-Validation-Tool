@echo off
echo ===================================================
echo Starting Tax Invoice Validation Tool...
echo ===================================================

:: 1. Start the Node.js Backend Server in a separate window
echo Starting Node.js backend server...
start "Invoice Backend Server" node app.js

:: 2. Wait 3 seconds to let the database and backend spin up safely
timeout /t 3 /nobreak > nul

:: 3. Navigate into frontend folder and launch the Vite Development Server
echo Starting Vite frontend development server...
cd frontend
npm run dev

pause
