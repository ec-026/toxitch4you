@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
title toxitch4you - Publish and Deploy

echo ==================================================
echo   toxitch4you - GitHub + Cloudflare Publisher
echo ==================================================
echo.
echo Step 1: Install and check dependencies before committing.
where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: Install Node.js LTS from https://nodejs.org/
  pause
  exit /b 1
)
call npm install
if errorlevel 1 (
  echo ERROR: npm install failed.
  pause
  exit /b 1
)
call npm run check
if errorlevel 1 (
  echo ERROR: Source checks failed.
  pause
  exit /b 1
)

echo.
echo Step 2: Check files, commit and push to GitHub.
call "%~dp0github-push.bat"
if errorlevel 1 (
  echo.
  echo STOPPED: GitHub publishing failed. Cloudflare has NOT been deployed.
  pause
  exit /b 1
)

echo.
echo Step 3: Deploy the same source to Cloudflare Workers.
rem Wrangler can reuse your saved login; login will not require a new Cloudflare account.
call npx wrangler whoami >nul 2>&1
if errorlevel 1 (
  call npx wrangler login
  if errorlevel 1 (
    echo ERROR: Cloudflare login failed.
    pause
    exit /b 1
  )
)
call npm run deploy
if errorlevel 1 (
  echo ERROR: Cloudflare deploy failed. GitHub push was completed.
  pause
  exit /b 1
)
echo.
echo SUCCESS: GitHub updated and Cloudflare deployment completed.
pause
exit /b 0
