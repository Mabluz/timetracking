# PostgreSQL Database Setup Guide

This guide explains how to switch from file-based storage to PostgreSQL database storage for the time tracking application.

## Storage Options

The application supports two storage modes:
- **File Storage** (default): Stores data in a JSON file
- **Database Storage**: Stores data in PostgreSQL database

## Configuration

### Environment Variables

Edit `backend/.env` to configure storage:

```env
# Storage configuration
STORAGE_TYPE=file  # Options: 'file' or 'database'

# File storage (when STORAGE_TYPE=file)
DATA_PATH=/path/to/your/timetracking-data.json

# Database storage (when STORAGE_TYPE=database)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=timetracking
DB_USER=timetracking_user
DB_PASSWORD=timetracking_password
```

## Setting Up PostgreSQL with Docker

### Option 1: Using Docker Compose (Recommended)

1. **Start PostgreSQL and pgAdmin:**
   ```bash
   docker-compose -f docker-compose-postgresql.yml up -d
   ```

2. **Verify containers are running:**
   ```bash
   docker ps
   ```

3. **Check database is ready:**
   ```bash
   docker logs timetracking-postgres
   ```

4. **Switch to database storage:**
   Edit `backend/.env`:
   ```env
   STORAGE_TYPE=database
   ```

5. **Install dependencies and start backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

### Accessing pgAdmin

pgAdmin is available at http://localhost:5050

- **Email:** admin@timetracking.local
- **Password:** admin

To add a server in pgAdmin:
1. Right-click "Servers" → "Register" → "Server"
2. General Tab:
   - Name: TimeTracking
3. Connection Tab:
   - Host: postgres
   - Port: 5432
   - Database: timetracking
   - Username: timetracking_user
   - Password: timetracking_password

### Stop PostgreSQL

```bash
docker-compose -f docker-compose-postgresql.yml down
```

To remove all data:
```bash
docker-compose -f docker-compose-postgresql.yml down -v
```

## Option 2: Manual PostgreSQL Installation

If you prefer installing PostgreSQL directly:

### macOS
```bash
brew install postgresql@16
brew services start postgresql@16
```

### Create Database and User
```bash
psql postgres
```

```sql
CREATE DATABASE timetracking;
CREATE USER timetracking_user WITH PASSWORD 'timetracking_password';
GRANT ALL PRIVILEGES ON DATABASE timetracking TO timetracking_user;
\q
```

### Initialize Schema
```bash
psql -U timetracking_user -d timetracking -f backend/init-db.sql
```

## Database Schema

The PostgreSQL schema includes:

### Tables
- **metadata**: System-level information (version, last modified, total entries)
- **time_entries**: Main time tracking entries
- **time_entry_projects**: Project allocations within time entries
- **projects**: Available projects

### Features
- UUID primary keys for time entries
- Automatic timestamp updates
- Foreign key relationships with cascade delete
- Indexes for performance optimization
- Triggers for metadata synchronization

## Migrating from File to Database

To migrate existing data from JSON file to PostgreSQL:

1. **Backup your existing data file:**
   ```bash
   cp /path/to/timetracking-data.json /path/to/timetracking-data-backup.json
   ```

2. **Start PostgreSQL:**
   ```bash
   docker-compose -f docker-compose-postgresql.yml up -d
   ```

3. **Wait for database to be ready:**
   ```bash
   docker logs -f timetracking-postgres
   # Wait until you see "database system is ready to accept connections"
   ```

4. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

5. **Run the migration script:**
   ```bash
   # Option 1: Use DATA_PATH from .env
   npm run migrate
   
   # Option 2: Specify file path
   npm run migrate /path/to/timetracking-data.json
   ```

6. **Verify migration:**
   The script will show a summary:
   ```
   === Migration Summary ===
   Projects: X created, Y skipped
   Time Entries: X created, Y failed
   =========================
   ```

7. **Switch to database storage:**
   Edit `backend/.env`:
   ```env
   STORAGE_TYPE=database
   ```

8. **Start the backend:**
   ```bash
   npm run dev
   ```

9. **Test the application** to ensure all data was migrated correctly

## Switching Between Storage Types

You can switch between file and database storage at any time:

1. Stop the backend server
2. Change `STORAGE_TYPE` in `backend/.env`
3. Restart the backend server

**Note:** Data is NOT automatically synchronized between file and database. They are independent storage systems.

## Troubleshooting

### Connection Issues

If you see "Database pool not initialized":
- Verify PostgreSQL is running: `docker ps`
- Check connection settings in `.env`
- Check logs: `docker logs timetracking-postgres`

### Permission Issues

```bash
# Grant all permissions
docker exec -it timetracking-postgres psql -U timetracking_user -d timetracking
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO timetracking_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO timetracking_user;
```

### Reset Database

```bash
docker-compose -f docker-compose-postgresql.yml down -v
docker-compose -f docker-compose-postgresql.yml up -d
```

## Production Deployment

For production deployment:

1. **Update environment variables** with production database credentials
2. **Use strong passwords**
3. **Enable SSL/TLS** for database connections
4. **Set up regular backups:**
   ```bash
   pg_dump -U timetracking_user -d timetracking > backup.sql
   ```
5. **Consider managed database services** (AWS RDS, Azure Database, etc.)

## Performance

Database storage offers several advantages:
- Better concurrent access handling
- ACID transactions
- Better scalability for large datasets
- Built-in backup and recovery tools
- Query optimization with indexes

File storage is simpler but has limitations:
- Single-user/low-concurrency scenarios
- Entire file must be loaded into memory
- Risk of file corruption
- Limited query capabilities
