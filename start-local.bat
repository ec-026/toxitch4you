@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (echo Install Node.js LTS: https://nodejs.org & pause & exit /b 1)
start "toxitch4you" cmd /k node local\server.cjs
timeout /t 2 >nul
start "" http://localhost:8765/
