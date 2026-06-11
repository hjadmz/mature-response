@echo off
REM Mature Response - double-click launcher (Windows)
REM Installs/builds on first run, then starts the app and opens your browser.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Get it at https://nodejs.org ^(the LTS version^), then run this again.
  pause
  exit /b 1
)

where ollama >nul 2>nul
if errorlevel 1 (
  echo Ollama is not installed.
  echo Get it at https://ollama.com, then run this again.
  pause
  exit /b 1
)

REM The marker file is written by npm only when an install COMPLETES, so an
REM interrupted first install self-repairs on the next launch.
if not exist node_modules\.package-lock.json ( call npm install )

REM Build when there is no completed build, or when any source file is newer
REM than it - so pulling an update never serves a stale build.
powershell -NoProfile -Command "$b='.next/BUILD_ID'; if(!(Test-Path $b)){exit 1}; $bt=(Get-Item $b).LastWriteTime; if(Get-ChildItem app,components,lib,public,package.json,next.config.mjs -Recurse -File | Where-Object {$_.LastWriteTime -gt $bt} | Select-Object -First 1){exit 1}; exit 0"
if errorlevel 1 (
  if exist .next ( rmdir /s /q .next )
  call npm run build
)

start "" http://localhost:3000
echo Starting Mature Response at http://localhost:3000  (close this window to stop)
call npm run start
