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

echo Starting Doppelkopf Backend Server...
start "Doppelkopf Backend" cmd /k "npm run server"

echo Starting Doppelkopf Frontend Server...
start "Doppelkopf Frontend" cmd /k "npm run dev"

echo Successfully initiated startup sequences!
echo Close this window at any time. The servers are running in the newly opened windows.
pause
