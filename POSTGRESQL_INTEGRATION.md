# PostgreSQL Integration - Implementation Summary

## Overview

The time tracking application now supports two storage backends:
1. **File Storage** (default): JSON file-based storage
2. **Database Storage**: PostgreSQL database storage

You can easily switch between them using the `STORAGE_TYPE` environment variable.

## What Was Added

### 1. Configuration Files

#### [`backend/.env`](backend/.env)
Added new configuration options:
- `STORAGE_TYPE`: Switch between 'file' or 'database'
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: PostgreSQL connection settings

#### [`backend/.env.example`](backend/.env.example)
Template configuration file with documentation

#### [`docker-compose-postgresql.yml`](docker-compose-postgresql.yml)
Docker Compose configuration for:
- PostgreSQL 16 database
- pgAdmin 4 web interface (optional)
- Automatic schema initialization
- Persistent data volumes

### 2. Backend Services

#### [`backend/services/storage.ts`](backend/services/storage.ts)
Storage abstraction layer that provides a unified interface for both file and database storage:
- `IStorage` interface defining all storage operations
- `FileStorage` class for JSON file operations
- `DatabaseStorage` class for PostgreSQL operations
- Factory function `createStorage()` to instantiate the correct storage type

#### [`backend/services/database.ts`](backend/services/database.ts)
PostgreSQL-specific implementation:
- Connection pool management
- CRUD operations for time entries
- CRUD operations for projects
- Metadata management
- Graceful error handling

#### [`backend/init-db.sql`](backend/init-db.sql)
Database schema definition:
- `metadata` table: System information
- `time_entries` table: Time tracking entries
- `time_entry_projects` table: Project allocations (many-to-many)
- `projects` table: Available projects
- Indexes for performance
- Triggers for automatic timestamp updates

### 3. Migration Tools

#### [`backend/migrate-to-db.ts`](backend/migrate-to-db.ts)
Migration script to transfer data from JSON file to PostgreSQL:
- Reads existing JSON data file
- Creates all projects in database
- Migrates all time entries with their project allocations
- Provides progress feedback and error handling
- Generates migration summary

Usage: `npm run migrate [path/to/file.json]`

### 4. Modified Files

#### [`backend/server.ts`](backend/server.ts)
Updated to use the storage abstraction:
- Removed direct file system operations
- Uses `storage` interface for all data operations
- Added graceful shutdown handlers
- Improved error logging

#### [`backend/package.json`](backend/package.json)
Added dependencies:
- `pg`: PostgreSQL client for Node.js
- `@types/pg`: TypeScript definitions
- New script: `npm run migrate`

### 5. Documentation

#### [`DATABASE_SETUP.md`](DATABASE_SETUP.md)
Comprehensive guide covering:
- Storage options comparison
- Configuration instructions
- Docker Compose setup
- Manual PostgreSQL installation
- Migration procedures
- Troubleshooting tips
- Production deployment considerations

#### [`setup-database.sh`](setup-database.sh)
Quick setup script for launching PostgreSQL with Docker

## Quick Start

### Using File Storage (Default)

No changes needed! The application continues to work with file storage by default.

```env
STORAGE_TYPE=file
DATA_PATH=/path/to/your/data.json
```

### Using Database Storage

1. **Start PostgreSQL:**
   ```bash
   ./setup-database.sh
   ```
   Or manually:
   ```bash
   docker-compose -f docker-compose-postgresql.yml up -d
   ```

2. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment:**
   Edit `backend/.env`:
   ```env
   STORAGE_TYPE=database
   ```

4. **Migrate existing data (optional):**
   ```bash
   npm run migrate
   ```

5. **Start the backend:**
   ```bash
   npm run dev
   ```

## Database Schema

### Time Entries
- UUID primary key
- Date, start/end times, hours away, total hours
- Created/updated timestamps
- Imported flag

### Projects (within entries)
- Stored in `time_entry_projects` table
- Links to parent time entry via foreign key
- Project ID, name, billable flag
- Hours allocated per project
- Comments

### Projects (global)
- Project name (unique)
- Billable flag
- Total hours tracked
- Last used date
- Last saved timestamp

## Benefits of Database Storage

1. **Scalability**: Better handling of large datasets
2. **Concurrency**: Multiple users can access simultaneously
3. **Transactions**: ACID guarantees for data consistency
4. **Querying**: More flexible data retrieval options
5. **Backup**: Standard database backup tools
6. **Performance**: Indexed queries for faster access

## Architecture

```
┌─────────────┐
│   Frontend  │
│   (Vue.js)  │
└──────┬──────┘
       │ HTTP API
       ▼
┌─────────────────────────────────┐
│  Backend (Express.js)           │
│  ┌───────────────────────────┐  │
│  │  Storage Interface (IStorage)│
│  └───────┬───────────────────┘  │
│          │                       │
│    ┌─────┴─────┐                │
│    ▼           ▼                │
│ ┌──────┐   ┌──────────┐         │
│ │ File │   │ Database │         │
│ │Storage│  │ Storage  │         │
│ └──────┘   └────┬─────┘         │
│                 │                │
└─────────────────┼────────────────┘
                  │
            ┌─────▼─────┐
            │PostgreSQL │
            │  Database │
            └───────────┘
```

## Testing

1. **Test file storage:**
   ```bash
   cd backend
   STORAGE_TYPE=file npm run dev
   ```

2. **Test database storage:**
   ```bash
   docker-compose -f docker-compose-postgresql.yml up -d
   cd backend
   STORAGE_TYPE=database npm run dev
   ```

3. **Test migration:**
   ```bash
   npm run migrate path/to/test-data.json
   ```

## pgAdmin Access

pgAdmin provides a web interface for database management:
- URL: http://localhost:5050
- Login: admin@timetracking.local / admin
- Add server connection using the database credentials

## Maintenance

### View logs:
```bash
docker logs timetracking-postgres
docker logs timetracking-pgadmin
```

### Stop services:
```bash
docker-compose -f docker-compose-postgresql.yml down
```

### Backup database:
```bash
docker exec timetracking-postgres pg_dump -U timetracking_user timetracking > backup.sql
```

### Restore database:
```bash
docker exec -i timetracking-postgres psql -U timetracking_user timetracking < backup.sql
```

## Future Enhancements

Potential improvements:
- [ ] Automatic bidirectional sync between file and database
- [ ] Database connection pooling optimization
- [ ] Query result caching
- [ ] Database migration versioning
- [ ] Read replicas for scalability
- [ ] Full-text search capabilities
- [ ] Automated backups

## Notes

- File and database storage are completely independent
- Switching storage types does not automatically migrate data
- Both storage types implement the same `IStorage` interface
- The migration script is a one-time, one-way operation
- Database requires installation of `pg` npm package

## Support

For issues or questions:
1. Check [DATABASE_SETUP.md](DATABASE_SETUP.md) for detailed instructions
2. Review Docker logs for connection issues
3. Verify environment variables in `.env`
4. Ensure PostgreSQL is running and accessible
