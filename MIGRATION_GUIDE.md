# Data Migration Guide

This guide explains how to automatically migrate data from the JSON dump file (`timetracking-dump.json`) to the PostgreSQL database on server startup.

## Overview

The backend server now supports automatic data migration through environment variables. When enabled, the server will:

1. Check for the migration file on startup
2. Load projects from the JSON file into the database
3. Load time entries from the JSON file into the database
4. Skip duplicate projects (existing projects won't be overwritten)
5. Log the migration progress and results

## Setup Instructions

### Step 1: Enable Database Storage

Set the storage type to database in your `.env` file:

```env
STORAGE_TYPE=database
```

### Step 2: Configure Database Connection

Ensure your PostgreSQL connection details are correct:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=timetracking
DB_USER=timetracking_user
DB_PASSWORD=timetracking_password
```

### Step 3: Enable Migration

Add these environment variables to your `.env` file:

```env
# Enable migration on startup
MIGRATE_ON_STARTUP=true

# (Optional) Specify the path to your dump file
# Default is: ./timetracking-dump.json
MIGRATION_FILE_PATH=./timetracking-dump.json
```

### Step 4: Prepare Your Data File

Ensure you have the `timetracking-dump.json` file in the location specified by `MIGRATION_FILE_PATH`. The file should contain:

```json
{
  "metadata": {
    "version": "1.0",
    "lastModified": "2026-01-23T14:25:11.674Z",
    "totalEntries": 93
  },
  "timeEntries": [...],
  "projects": [...]
}
```

### Step 5: Start the Server

Start the backend server as usual:

```bash
cd backend
npm run dev
# or
npm start
```

The server will automatically:
- Load and parse the JSON file
- Migrate all projects and time entries to the database
- Log progress and results to the console and log files
- Start serving API requests after migration is complete

## Important Notes

- **Migration happens once per startup**: If you restart the server with `MIGRATE_ON_STARTUP=true`, it will attempt to migrate again
- **Duplicate projects are skipped**: If a project already exists in the database, it won't be recreated
- **File not found is non-fatal**: If the specified file doesn't exist, the server continues normally without migration
- **Error handling**: Any errors during migration are logged but won't prevent the server from starting
- **Large files**: For large data files, migration may take a few seconds. Check the logs for progress

## Environment Variables Summary

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `MIGRATE_ON_STARTUP` | Enable/disable automatic migration | `false` | `true` or `false` |
| `MIGRATION_FILE_PATH` | Path to the JSON dump file | `./timetracking-dump.json` | `./data/timetracking-dump.json` |
| `STORAGE_TYPE` | Storage backend type | `file` | `database` |
| `DB_HOST` | PostgreSQL host | `localhost` | `db.example.com` |
| `DB_PORT` | PostgreSQL port | `5432` | `5432` |
| `DB_NAME` | Database name | `timetracking` | `timetracking` |
| `DB_USER` | Database user | `timetracking_user` | `postgres` |
| `DB_PASSWORD` | Database password | `timetracking_password` | `your_password` |

## Example .env Configuration

```env
# Server
PORT=3010

# Storage
STORAGE_TYPE=database

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=timetracking
DB_USER=timetracking_user
DB_PASSWORD=timetracking_password

# Migration
MIGRATE_ON_STARTUP=true
MIGRATION_FILE_PATH=./timetracking-dump.json
```

## Troubleshooting

### Migration file not found
- Check that `MIGRATION_FILE_PATH` points to the correct location
- Verify the file exists at the specified path
- Use absolute paths if relative paths don't work

### Migration fails with database errors
- Verify PostgreSQL is running and accessible
- Check database connection credentials in `.env`
- Ensure the database and tables have been initialized (run `init-db.sql`)

### Duplicate key errors during migration
- This is normal if you've already migrated the data
- Projects and entries with duplicate IDs will be skipped
- Check the logs for details on which entries were skipped

### Server starts but data wasn't migrated
- Check the server logs for migration status messages
- Verify `MIGRATE_ON_STARTUP` is set to `true`
- Confirm the migration file path is correct
