#!/bin/bash
# Change to the directory where this script is located
cd "$(dirname "$0")"

echo "Starting Backend API Server..."
cd backend
npm run dev