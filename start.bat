@echo off
cd /d "%~dp0"

echo ========================================
echo   Exam Review Website - Start All
echo ========================================
echo.

echo [1/2] Starting Backend (FastAPI :8000)...
start "Backend" /d "%~dp0backend" cmd /k "C:\PROGRA~1\LibreOffice\program\python.exe -m uvicorn main:app --port 8000"

echo [2/2] Starting Frontend (Vite :5173)...
start "Frontend" /d "%~dp0frontend" cmd /k "npm run dev"

echo.
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:8000/docs
echo.
echo   Close each cmd window to stop its service.
echo ========================================
pause
