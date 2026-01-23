# README Section Addition - Storage Options

Add this section to the README.md after the Tech Stack section:

---

## 💾 Storage Options

The application supports two storage backends:

### File Storage (Default)
- Uses a JSON file for data storage
- Simple setup, no database required
- Perfect for single-user scenarios
- Can store file in cloud storage (Dropbox, iCloud) for backup and sync

### PostgreSQL Database (New!)
- Production-ready database storage
- Better for multi-user deployments
- Improved performance for large datasets
- ACID transactions and data integrity
- Standard database backup and recovery tools

**Quick Switch:**
```bash
# Edit backend/.env
STORAGE_TYPE=file      # for JSON file storage (default)
STORAGE_TYPE=database  # for PostgreSQL database
```

**See [DATABASE_SETUP.md](DATABASE_SETUP.md) for complete PostgreSQL setup instructions.**

---

## 📚 Additional Documentation

After the installation section, add this:

### Documentation Files

- **[DATABASE_SETUP.md](DATABASE_SETUP.md)** - Complete guide for PostgreSQL database setup
- **[POSTGRESQL_INTEGRATION.md](POSTGRESQL_INTEGRATION.md)** - Technical implementation details
- **[SETUP_CHECKLIST.md](SETUP_CHECKLIST.md)** - Step-by-step setup verification
- **[backend/.env.example](backend/.env.example)** - Configuration template with descriptions

---

## Updated Backend Section

Replace the existing Backend tech stack section with:

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **TypeScript** - Type-safe JavaScript
- **Joi** - Data validation
- **CORS** - Cross-origin resource sharing
- **fs-extra** - File system operations (for file storage)
- **pg** - PostgreSQL client (for database storage)
- **dotenv** - Environment variable management

## Storage Architecture
- Abstracted storage layer supporting both file and database
- Unified interface for all data operations
- Easy switching between storage backends
- Migration tool for data transfer

---

## Dependencies Update Section

Add this new section after Prerequisites:

## 📦 Installing Database Dependencies (Optional)

If you plan to use PostgreSQL database storage:

```bash
# Install Docker (if not already installed)
# Visit: https://www.docker.com/get-started

# Quick setup with provided script
./setup-database.sh

# Or manually
docker-compose -f docker-compose-postgresql.yml up -d

# Install Node.js dependencies
cd backend
npm install
```

The `pg` package will be installed automatically with `npm install`.

---

## Configuration Section

Add this new section before Quick Start:

## ⚙️ Configuration

### File Storage (Default)
1. Copy the example configuration:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. Edit `backend/.env`:
   ```env
   STORAGE_TYPE=file
   DATA_PATH=/path/to/your/timetracking-data.json
   ```

### Database Storage
1. Set up PostgreSQL (see [DATABASE_SETUP.md](DATABASE_SETUP.md))

2. Edit `backend/.env`:
   ```env
   STORAGE_TYPE=database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=timetracking
   DB_USER=timetracking_user
   DB_PASSWORD=timetracking_password
   ```

3. (Optional) Migrate existing data:
   ```bash
   cd backend
   npm run migrate /path/to/existing-data.json
   ```
