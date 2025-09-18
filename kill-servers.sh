#!/bin/bash
echo "Killing Time Tracking Application Servers..."
echo

# Kill processes on port 3001 (frontend default)
echo "Checking port 3001..."
PID=$(lsof -ti:3001)
if [ ! -z "$PID" ]; then
    echo "Killing process $PID on port 3001"
    kill -9 $PID 2>/dev/null
else
    echo "No process found on port 3001"
fi

# Kill processes on port 3010 (backend)
echo "Checking port 3010..."
PID=$(lsof -ti:3010)
if [ ! -z "$PID" ]; then
    echo "Killing process $PID on port 3010"
    kill -9 $PID 2>/dev/null
else
    echo "No process found on port 3010"
fi

# Kill processes on port 5173 (Vite default)
echo "Checking port 5173..."
PID=$(lsof -ti:5173)
if [ ! -z "$PID" ]; then
    echo "Killing process $PID on port 5173"
    kill -9 $PID 2>/dev/null
else
    echo "No process found on port 5173"
fi

# Kill any Node.js processes that might be running the project
echo "Killing Node.js processes related to timetracking..."
pkill -f "timetracking" 2>/dev/null

echo
echo "All servers have been terminated."
echo "You can now restart the servers using: npm run start:both"