@echo off
echo Preparing to start Doppelkopf servers...

echo Checking frontend dependencies...
if not exist "node_modules\" (
    echo Installing frontend dependencies (this might take a moment)...
    call npm install
)

echo Checking backend dependencies...
if not exist "server\node_modules\" (
    echo Installing backend dependencies (this might take a moment)...
    cd server
    call npm install
    cd ..
)

set /p SHARE_NETWORK="Do you want to share the game on your local network? (y/n): "
if /i "%SHARE_NETWORK%"=="y" (
    set HOST_ON_NETWORK=true
    echo Network sharing enabled. Server will listen on all interfaces.
) else (
    set HOST_ON_NETWORK=false
    echo Network sharing disabled. Server will listen on localhost only.
)

echo Starting Doppelkopf Backend Server...
start "Doppelkopf Backend" cmd /k "set HOST_ON_NETWORK=%HOST_ON_NETWORK%&& npm run server"

echo Starting Doppelkopf Frontend Server...
start "Doppelkopf Frontend" cmd /k "set HOST_ON_NETWORK=%HOST_ON_NETWORK%&& npm run dev"

echo Successfully initiated startup sequences!
echo Close this window at any time. The servers are running in the newly opened windows.
pause
