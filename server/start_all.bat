@echo off
title NutriLens - Master Launcher
color 0A

echo ============================================================
echo            NutriLens - Starting All Services
echo ============================================================
echo.

REM ── Resolve project root (parent of server/) ──
set "PROJECT_ROOT=%~dp0.."
set "SERVER_DIR=%~dp0"
set "PYTHON_DIR=%~dp0python_service"
set "NGROK_EXE=C:\tools\ngrok.exe"
set "NGROK_DOMAIN=protozoological-boldfacedly-aliza.ngrok-free.dev"

REM ── 1. Python Flask + ChromaDB Service (port 5000) ──
echo [1/4] Starting Python service (Flask + ChromaDB)...
start "NutriScore Python Service" cmd /k "call %PYTHON_DIR%\start_service.bat"
echo       Waiting for ChromaDB vectors to load...
timeout /t 10 /nobreak >nul

REM ── 2. Node.js Express Backend (port 3000) ──
echo [2/4] Starting Node.js backend server...
start "NutriLens Node.js Server" cmd /k "cd /d %SERVER_DIR% && npm start"
timeout /t 5 /nobreak >nul

REM ── 3. Ngrok Tunnel (exposes port 3000) ──
echo [3/4] Starting ngrok tunnel...
if exist "%NGROK_EXE%" (
    start "Ngrok Tunnel" cmd /k "%NGROK_EXE% http 3000 --domain %NGROK_DOMAIN%"
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Get-Command ngrok -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>&1
    if not errorlevel 1 (
        start "Ngrok Tunnel" powershell -NoExit -ExecutionPolicy Bypass -Command "ngrok http 3000 --domain %NGROK_DOMAIN%"
    ) else (
        echo       WARNING: ngrok not found at %NGROK_EXE% and not available in PowerShell PATH.
        echo       Run setup.bat first, or update NGROK_EXE in this file if you use a custom install.
    )
)
timeout /t 3 /nobreak >nul

REM ── 4. Expo Dev Server (Metro bundler) ──
echo [4/4] Starting Expo dev server...
start "Expo Dev Server" cmd /k "cd /d %PROJECT_ROOT% && npx expo start"

echo.
echo ============================================================
echo            All Services Launched
echo ============================================================
echo.
echo   Python Service : http://localhost:5000  (Flask + ChromaDB)
echo   Node Backend   : http://localhost:3000  (Express + MongoDB)
echo   Ngrok Tunnel   : https://%NGROK_DOMAIN%
echo   Expo DevServer : http://localhost:8081  (Metro bundler)
echo.
echo   Scan the QR code from the Expo window to open on phone.
echo   Close each service window individually to stop them.
echo ============================================================
echo.
echo Press any key to close this launcher (services keep running)...
pause >nul

