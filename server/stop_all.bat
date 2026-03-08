@echo off
title NutriLens - Stop All Services
color 0C

echo ============================================================
echo            NutriLens - Stopping All Services
echo ============================================================
echo.

REM ── Stop Python service (port 5000) ──
echo [1/4] Stopping Python service...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    echo       Killed PID %%a (port 5000)
)

REM ── Stop Node.js server (port 3000) ──
echo [2/4] Stopping Node.js backend...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    echo       Killed PID %%a (port 3000)
)

REM ── Stop ngrok ──
echo [3/4] Stopping ngrok...
taskkill /IM ngrok.exe /F >nul 2>&1 && echo       ngrok stopped || echo       ngrok was not running

REM ── Stop Expo / Metro bundler (port 8081) ──
echo [4/4] Stopping Expo dev server...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8081 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    echo       Killed PID %%a (port 8081)
)

echo.
echo ============================================================
echo            All Services Stopped
echo ============================================================
echo.
echo Press any key to close...
pause >nul
