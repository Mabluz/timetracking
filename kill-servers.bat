@echo off
echo Killing Time Tracking Application Servers...
echo.

REM Kill processes on port 3001 (frontend default)
echo Checking port 3001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    echo Killing process %%a on port 3001
    taskkill /f /pid %%a >nul 2>&1
)

REM Kill processes on port 3010 (frontend/backend alternate)
echo Checking port 3010...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3010') do (
    echo Killing process %%a on port 3010
    taskkill /f /pid %%a >nul 2>&1
)

REM Kill processes on port 5173 (Vite default)
echo Checking port 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    echo Killing process %%a on port 5173
    taskkill /f /pid %%a >nul 2>&1
)

REM Kill any Node.js processes that might be running the project
echo Killing Node.js processes related to timeforing...
wmic process where "name='node.exe' and commandline like '%%timeforing%%'" delete >nul 2>&1

echo.
echo All servers have been terminated.
echo You can now restart the servers using: npm run start:both
pause