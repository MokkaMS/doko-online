@echo off
echo Starting Docker containers for Doppelkopf Online...
echo This will build the container if it doesn't exist or is outdated.

set /p SHARE_NETWORK="Do you want to share the game on your local network? (y/n): "
if /i "%SHARE_NETWORK%"=="y" (
    set HOST_ON_NETWORK=true
    echo Network sharing enabled. Server will allow connections from local network.
) else (
    set HOST_ON_NETWORK=false
    echo Network sharing disabled. Server will allow connections from localhost only.
)

docker-compose up --build

echo.
echo Docker containers have been stopped.
pause
