@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo ==================================================
echo    Hong Kong Ninja - Phase 1 SWF Bridge Builder
echo ==================================================
echo.
set "FFDEC="
where ffdec-cli.exe >nul 2>nul && set "FFDEC=ffdec-cli.exe"
if not defined FFDEC (
  echo Enter the FULL path to ffdec-cli.exe inside your JPEXS installation.
  set /p "FFDEC=FFDec CLI path: "
)
if not exist "%FFDEC%" (
  where "%FFDEC%" >nul 2>nul
  if errorlevel 1 (echo ERROR: FFDec CLI not found. & pause & exit /b 1)
)
set "SWF="
echo.
echo Enter the FULL path to the latest VERIFIED WORKING hongkongninja.swf
set /p "SWF=Source SWF: "
if not exist "%SWF%" (echo ERROR: File not found. & pause & exit /b 1)
set "OUT=%~dp0hongkongninja_phase1_test.swf"
if exist "%OUT%" (echo Please move or rename existing test output first. & pause & exit /b 1)
echo.
echo Compiling one replacement class into a NEW SWF...
"%FFDEC%" -replace "%SWF%" "%OUT%" com.macrojoy.zgd.UserControl "%~dp0replacement_sources\com\macrojoy\zgd\UserControl.as"
if errorlevel 1 (echo ERROR: JPEXS compilation failed. No production file changed. & pause & exit /b 1)
if not exist "%OUT%" (echo ERROR: No output SWF produced. & pause & exit /b 1)
echo.
echo Created: %OUT%
echo VERIFY the callback names in JPEXS, then test locally with two browsers.
echo DO NOT replace the production SWF without testing.
pause
