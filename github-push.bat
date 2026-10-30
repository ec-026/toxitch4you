@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
set "REPO=https://github.com/ec-026/toxitch4you.git"

echo.
echo  toxitch4you - Publish to GitHub
 echo  Destination: %REPO%
echo.
where git >nul 2>&1
if errorlevel 1 (
  echo ERROR: Install Git for Windows first: https://git-scm.com/downloads/win
  exit /b 1
)
where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js LTS is required for the safety check.
  exit /b 1
)

rem Never auto-add secrets or push until the safety check passes.
node scripts\check-secrets.cjs
if errorlevel 1 (
  echo ERROR: Publish cancelled. Remove sensitive files and retry.
  exit /b 1
)

if not exist ".git" (
  git init -b main
  if errorlevel 1 exit /b 1
)

rem Refuse to change a repository pointing to a different destination.
for /f "delims=" %%R in ('git remote get-url origin 2^>nul') do set "CURRENT_ORIGIN=%%R"
if defined CURRENT_ORIGIN (
  if /i not "%CURRENT_ORIGIN%"=="%REPO%" (
    echo ERROR: This folder already has a different origin: %CURRENT_ORIGIN%
    echo Resolve this manually. Nothing has been pushed.
    exit /b 1
  )
) else (
  git remote add origin "%REPO%"
  if errorlevel 1 exit /b 1
)

git add -A
if errorlevel 1 exit /b 1
node scripts\check-secrets.cjs --staged
if errorlevel 1 (
  git reset -q
  echo ERROR: Staged-file check failed. Nothing has been pushed.
  exit /b 1
)

git diff --cached --quiet
if errorlevel 2 exit /b 1
if errorlevel 1 (
  git -c user.useConfigOnly=true commit -m "Prepare toxitch4you Cloudflare deployment"
  if errorlevel 1 (
    echo ERROR: Commit failed. If this is your first Git commit, configure:
    echo   git config --global user.name "Your Name"
    echo   git config --global user.email "your-github-email@example.com"
    exit /b 1
  )
) else (
  echo No new changes to commit.
)

rem Push main without force. Existing unrelated history must be reconciled manually.
git branch -M main
if errorlevel 1 exit /b 1
echo.
echo GitHub may open a browser for sign-in. Use your own account.
git push -u origin main
if errorlevel 1 (
  echo.
  echo ERROR: GitHub push failed. Existing remote history may need merging.
  echo No forced push was attempted; existing remote files are safe.
  echo See README.md for how to handle non-empty repositories.
  exit /b 1
)
echo.
echo GitHub push completed.
exit /b 0
