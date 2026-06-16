@echo off
setlocal EnableExtensions

cd /d "%~dp0"

if /I "%~1"=="--help" goto :usage
if /I "%~1"=="-h" goto :usage

if not exist "node_modules\" (
  echo Installing npm dependencies...
  call npm install
  if errorlevel 1 goto :failed
)

echo Starting Cocos Resource Audit desktop UI...
call npm run desktop:dev
if errorlevel 1 goto :failed

exit /b 0

:usage
echo Cocos Resource Audit Desktop UI
echo.
echo Usage:
echo   Double-click run-desktop.bat
echo   run-desktop.bat
echo.
exit /b 0

:failed
echo.
echo Desktop UI failed to start. Check the error output above.
echo.
pause
exit /b 1
