@echo off
setlocal EnableExtensions
rem ScreenTinker — Windows kiosk-browser setup.
rem Creates an Edge or Chrome kiosk shortcut and starts the player at login.
rem Usage: windows-setup.bat [https://your-server]

set "SERVER=%~1"
if "%SERVER%"=="" set /p SERVER=ScreenTinker server URL (example https://screentinker.example): 
if "%SERVER%"=="" (
  echo A server URL is required.
  exit /b 1
)
if "%SERVER:~-1%"=="/" set "SERVER=%SERVER:~0,-1%"
set "PLAYER=%SERVER%/player"
set "PROFILE=%LOCALAPPDATA%\ScreenTinker\kiosk"
set "DIR=%LOCALAPPDATA%\ScreenTinker"
set "LAUNCH=%DIR%\start-kiosk.cmd"

if not exist "%DIR%" mkdir "%DIR%"
if not exist "%PROFILE%" mkdir "%PROFILE%"

set "BROWSER="
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "BROWSER=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER (
  echo Edge or Chrome was not found. Install one, then run this script again.
  exit /b 1
)

> "%LAUNCH%" echo @echo off
>> "%LAUNCH%" echo start "" "%BROWSER%" --kiosk "%PLAYER%" --no-first-run --disable-session-crashed-bubble --user-data-dir="%PROFILE%"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$w = New-Object -ComObject WScript.Shell; $s = $w.CreateShortcut([Environment]::GetFolderPath('Startup') + '\ScreenTinker Kiosk.lnk'); $s.TargetPath = '%LAUNCH%'; $s.WorkingDirectory = '%DIR%'; $s.Save()"

echo Player: %PLAYER%
echo Launcher: %LAUNCH%
echo A startup shortcut will open the kiosk browser at the next login.
start "" "%LAUNCH%"
exit /b 0
