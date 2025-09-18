#!/bin/bash
echo "Starting Time Tracking App..."
echo
echo "Starting backend server..."
cd backend && npm run dev &
BACKEND_PID=$!
echo "Backend server started on port 3010 (PID: $BACKEND_PID)"
echo
echo "Waiting 3 seconds for backend to initialize..."
sleep 3
echo
echo "Starting frontend server..."
cd ../frontend
npm run dev