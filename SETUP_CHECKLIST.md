# Quick Start Checklist

## ✅ Installation Checklist

### Prerequisites
- [ ] Docker installed and running
- [ ] Node.js and npm installed

### Setup Steps

#### Option 1: Continue with File Storage (No changes needed)
- [x] Application works as before
- [x] Data stored in JSON file
- [x] No additional setup required

#### Option 2: Switch to Database Storage

1. **Install PostgreSQL**
   ```bash
   ./setup-database.sh
   ```
   - [ ] PostgreSQL container running
   - [ ] pgAdmin accessible at http://localhost:5050

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```
   - [ ] `pg` package installed
   - [ ] `@types/pg` package installed

3. **Configure Environment**
   Edit `backend/.env`:
   ```env
   STORAGE_TYPE=database
   ```
   - [ ] STORAGE_TYPE set to 'database'
   - [ ] Database credentials configured

4. **Migrate Data (Optional)**
   ```bash
   cd backend
   npm run migrate
   ```
   - [ ] Existing data migrated successfully
   - [ ] Migration summary reviewed

5. **Start Application**
   ```bash
   npm run dev
   ```
   - [ ] Backend starts without errors
   - [ ] Can connect to database
   - [ ] API endpoints working

## 🧪 Testing

### Test File Storage
```bash
cd backend
# Edit .env: STORAGE_TYPE=file
npm run dev
```
- [ ] Server starts successfully
- [ ] Can read/write time entries
- [ ] Can read/write projects

### Test Database Storage
```bash
cd backend
# Edit .env: STORAGE_TYPE=database
npm run dev
```
- [ ] Server starts successfully
- [ ] Database connection successful
- [ ] Can read/write time entries
- [ ] Can read/write projects

### Test Migration
```bash
cd backend
npm run migrate /path/to/timetracking-data.json
```
- [ ] Migration completes successfully
- [ ] All projects migrated
- [ ] All time entries migrated
- [ ] No errors in console

## 🔍 Verification

### Verify PostgreSQL is Running
```bash
docker ps
```
Should show `timetracking-postgres` container

### Verify Database Connection
```bash
docker exec -it timetracking-postgres psql -U timetracking_user -d timetracking -c "SELECT COUNT(*) FROM time_entries;"
```
Should return count of entries

### Verify pgAdmin Access
- [ ] Navigate to http://localhost:5050
- [ ] Login with admin@timetracking.local / admin
- [ ] Can connect to timetracking database

## 📝 Common Issues

### Issue: "Cannot find module 'pg'"
**Solution:** Run `npm install` in the backend directory

### Issue: "Database pool not initialized"
**Solution:** 
1. Check if PostgreSQL is running: `docker ps`
2. Verify credentials in `.env` match docker-compose-postgresql.yml
3. Check logs: `docker logs timetracking-postgres`

### Issue: "ECONNREFUSED"
**Solution:**
1. Ensure PostgreSQL container is running
2. Wait a few seconds for database to be ready
3. Check port 5432 is not in use by another service

### Issue: "relation does not exist"
**Solution:** Schema not initialized
```bash
docker exec -i timetracking-postgres psql -U timetracking_user -d timetracking < backend/init-db.sql
```

## 📚 Documentation

- **[DATABASE_SETUP.md](DATABASE_SETUP.md)** - Complete database setup guide
- **[POSTGRESQL_INTEGRATION.md](POSTGRESQL_INTEGRATION.md)** - Technical implementation details
- **[backend/.env.example](backend/.env.example)** - Configuration template

## 🎯 Quick Commands Reference

```bash
# Start PostgreSQL
docker-compose -f docker-compose-postgresql.yml up -d

# Stop PostgreSQL
docker-compose -f docker-compose-postgresql.yml down

# View logs
docker logs timetracking-postgres

# Install dependencies
cd backend && npm install

# Migrate data
cd backend && npm run migrate

# Start backend (development)
cd backend && npm run dev

# Build backend (production)
cd backend && npm run build

# Start backend (production)
cd backend && npm start
```

## ✨ Next Steps

After successful setup:

1. **Backup Strategy**
   - Set up regular database backups if using production
   - Keep your JSON file as backup even when using database

2. **Monitoring**
   - Use pgAdmin to monitor database performance
   - Check application logs regularly

3. **Optimization**
   - Review database indexes if dataset grows large
   - Consider connection pool settings for high traffic

4. **Security**
   - Change default passwords in production
   - Enable SSL/TLS for database connections
   - Restrict network access to database

5. **Scaling**
   - Consider managed database services (AWS RDS, Azure Database)
   - Implement database read replicas for read-heavy workloads
   - Set up automated backups and point-in-time recovery
