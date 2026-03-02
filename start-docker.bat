@echo off
echo Starting Docker containers for Doppelkopf Online...
echo This will build the container if it doesn't exist or is outdated.

docker-compose up --build

echo.
echo Docker containers have been stopped.
pause
