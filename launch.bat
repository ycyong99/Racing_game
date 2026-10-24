@echo off
setlocal
cd /d "%~dp0"

echo ===================================================================
echo     ANTIGRAVITY APEX - HIGH-FIDELITY 3D HYPERCAR RACING GAME
echo ===================================================================
echo  Starting game in your preferred browser...

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "%~dp0index.html"
    exit /b 0
)

if exist "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" (
    start "" "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" "%~dp0index.html"
    exit /b 0
)

if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" "%~dp0index.html"
    exit /b 0
)

start "" "%~dp0index.html"
