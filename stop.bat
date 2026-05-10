@echo off
echo Stopping all services...
taskkill /f /im node.exe > nul 2>&1
echo Done.
