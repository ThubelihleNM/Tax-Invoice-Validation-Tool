@echo off
title Smart Tax Invoice Validation Tool - Stop Services
echo Stopping React Frontend, FastAPI Backend, and MySQL...

taskkill /F /IM mariadbd.exe 2>nul
taskkill /F /IM uvicorn.exe 2>nul
taskkill /F /IM node.exe 2>nul

echo All services stopped successfully.
pause
