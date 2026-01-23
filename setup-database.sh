#!/bin/bash

# Quick setup script for PostgreSQL database

echo "🚀 Starting PostgreSQL database setup..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://www.docker.com/get-started"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "✅ Docker is installed and running"
echo ""

# Start PostgreSQL with docker-compose
echo "📦 Starting PostgreSQL container..."
docker-compose -f docker-compose-postgresql.yml up -d

if [ $? -ne 0 ]; then
    echo "❌ Failed to start PostgreSQL container"
    exit 1
fi

echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."

# Wait for PostgreSQL to be ready (max 30 seconds)
for i in {1..30}; do
    if docker exec timetracking-postgres pg_isready -U timetracking_user -d timetracking &> /dev/null; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    echo -n "."
    sleep 1
    
    if [ $i -eq 30 ]; then
        echo ""
        echo "❌ PostgreSQL failed to start within 30 seconds"
        echo "Check logs with: docker logs timetracking-postgres"
        exit 1
    fi
done

echo ""
echo "🎉 PostgreSQL setup completed successfully!"
echo ""
echo "📊 Database Information:"
echo "  - Host: localhost"
echo "  - Port: 5432"
echo "  - Database: timetracking"
echo "  - User: timetracking_user"
echo "  - Password: timetracking_password"
echo ""
echo "🔧 pgAdmin is available at: http://localhost:5050"
echo "  - Email: admin@timetracking.local"
echo "  - Password: admin"
echo ""
echo "📝 Next steps:"
echo "  1. Edit backend/.env and set STORAGE_TYPE=database"
echo "  2. Run: cd backend && npm install"
echo "  3. (Optional) Migrate data: npm run migrate"
echo "  4. Start backend: npm run dev"
echo ""
echo "📚 For more information, see DATABASE_SETUP.md"
