@echo off
setlocal EnableExtensions

cd /d "%~dp0"

if /I "%~1"=="--help" goto :usage
if /I "%~1"=="-h" goto :usage

set "PROJECT_DIR=%~1"
if not defined PROJECT_DIR (
  echo.
  echo Cocos Resource Audit Tool
  echo Enter the Cocos Creator project folder. It must contain an assets folder.
  echo You can also drag a project folder onto run-audit.bat next time.
  echo.
  set /p PROJECT_DIR=Project path: 
)

if not defined PROJECT_DIR goto :missing_project
if not exist "%PROJECT_DIR%\assets\" goto :invalid_project

set "OUT_DIR=%~2"
if not defined OUT_DIR set "OUT_DIR=reports"

echo.
echo Project: "%PROJECT_DIR%"
echo Output: "%OUT_DIR%"
echo.

if not exist "node_modules\" (
  echo Installing npm dependencies...
  call npm install
  if errorlevel 1 goto :failed
)

echo Building CLI...
call npm run build
if errorlevel 1 goto :failed

echo Running audit...
node dist\cli.js --project "%PROJECT_DIR%" --out "%OUT_DIR%"
if errorlevel 1 goto :failed

set "REPORT_HTML=%OUT_DIR%\resource-audit.html"
if exist "%REPORT_HTML%" (
  echo Opening report: "%REPORT_HTML%"
  start "" "%REPORT_HTML%"
) else (
  echo Report finished, but "%REPORT_HTML%" was not found.
)

echo.
echo Audit finished.
pause
exit /b 0

:usage
echo Cocos Resource Audit Tool
echo.
echo Usage:
echo   Double-click run-audit.bat and enter a Cocos project path.
echo   Drag a Cocos project folder onto run-audit.bat.
echo   run-audit.bat "D:\GameProject" [reports]
echo.
exit /b 0

:missing_project
echo.
echo Error: project path is required.
echo.
goto :usage

:invalid_project
echo.
echo Error: "%PROJECT_DIR%" does not look like a Cocos Creator project source folder.
echo Expected to find: "%PROJECT_DIR%\assets"
echo.
pause
exit /b 1

:failed
echo.
echo Audit failed. Check the error output above.
echo.
pause
exit /b 1
