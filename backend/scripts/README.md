# 📜 SCRIPTS DIRECTORY - README

**Organized Scripts for Backend Management**

All utility scripts for backend operations, monitoring, and deployment.

---

## 📁 Scripts Overview

```
scripts/
├── cleanup.sh                    # Clean temp files (Linux/Mac)
├── cleanup.ps1                   # Clean temp files (Windows)
├── migrate-db.js                 # MongoDB data migration
├── status.js                     # System health & status
├── start-production.sh           # Start production (Linux/Mac)
├── start-production.ps1          # Start production (Windows)
├── verify-production.sh          # Verify production setup (Linux/Mac)
└── verify-production.ps1         # Verify production setup (Windows)
```

---

## 🧹 Cleanup Scripts

### Linux/Mac: `cleanup.sh`

**Purpose:** Remove temporary files and free up disk space

**Usage:**
```bash
cd backend
bash scripts/cleanup.sh
```

**What it cleans:**
- Temporary files in `/tmp`
- Old logs
- Cache directories
- Upload temp files
- Node_modules cache

**Output:**
```
✅ Cleanup Started...
✅ Removed temporary files
✅ Cleared cache
✅ Cleanup Complete!
```

---

### Windows: `cleanup.ps1`

**Purpose:** Remove temporary files and free up disk space (Windows)

**Usage:**
```powershell
cd backend
.\scripts\cleanup.ps1
```

**Execution Policy (if needed):**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**What it cleans:**
- Temp directory
- Old logs
- Cache files
- Upload temp files

---

## 🗄️ Database Migration: `migrate-db.js`

**Purpose:** Migrate data from JSON file to MongoDB

**Requirements:**
- MongoDB running (local or cloud)
- `DATABASE_URL` environment variable set

**Usage:**
```bash
cd backend
node scripts/migrate-db.js
```

**Example with MongoDB Atlas:**
```bash
DATABASE_URL="mongodb+srv://user:password@cluster.mongodb.net/onderdenetim" \
node scripts/migrate-db.js
```

**What it migrates:**
- Blog posts
- Contact messages
- Subscribers
- Regulations
- Admin users
- Audit logs

**Output:**
```
🔄 Migration Starting...
✅ Migrating Blog Posts: 15 documents
✅ Migrating Contacts: 42 documents
✅ Migrating Subscribers: 128 documents
✅ Migrating Regulations: 8 documents
✅ Migrating Admin Users: 1 documents
✅ Migrating Logs: 247 documents

✅ Migration Complete!
📊 Total Documents Migrated: 441
```

**Troubleshooting:**
```bash
# Connection error?
# Check DATABASE_URL is valid and MongoDB is running

# Permission denied?
# Make sure script has read access to db.json

# Duplicate key error?
# MongoDB already has data - backup first then clear collections
```

---

## 📊 System Status: `status.js`

**Purpose:** Check backend health, memory, CPU, and database status

**Usage:**
```bash
cd backend
node scripts/status.js
```

**What it shows:**
- Server running status
- Memory usage (%)
- CPU usage
- Uptime
- Database connection
- Environment variables
- API endpoints status

**Output:**
```
╭────────────────────────────────────────╮
│   BACKEND STATUS REPORT                │
├────────────────────────────────────────┤
│ ✅ Server Running
│ 📍 Port: 5000
│ ⏱️  Uptime: 12h 45m
│ 💾 Memory: 45 MB (35%)
│ ⚙️  CPU: 15%
│ 🗄️  Database: Connected (MongoDB)
│ 📊 Requests Today: 1,245
├────────────────────────────────────────┤
│ ✅ API: Healthy
│ ✅ Database: Connected
│ ✅ Cache: Active
│ ⚠️  Disk Space: 45% used
╰────────────────────────────────────────╯
```

**Real-time monitoring:**
```bash
# Watch status every 5 seconds
watch -n 5 'node scripts/status.js'
```

---

## 🚀 Production Startup Scripts

### Linux/Mac: `start-production.sh`

**Purpose:** Start backend in production mode with optimization

**Usage:**
```bash
cd backend
bash scripts/start-production.sh
```

**Features:**
- Sets `NODE_ENV=production`
- Allocates 1GB heap memory
- Enables garbage collection
- Exports production NODE_OPTIONS
- Starts server on port 5000

**Output:**
```
🚀 Starting Backend in Production Mode...
💾 Memory Allocation: 1GB
🔧 NODE_ENV: production
⏱️  Starting server on port 5000...
✅ Backend running in production mode
```

**Stop the server:**
```bash
# Press Ctrl+C or in another terminal:
pkill -f "node server.js"
```

---

### Windows: `start-production.ps1`

**Purpose:** Start backend in production mode (Windows)

**Usage:**
```powershell
cd backend
.\scripts\start-production.ps1
```

**Features:**
- Sets `NODE_ENV=production`
- Memory optimization
- Garbage collection
- Starts on port 5000

**Execution Policy (if needed):**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Stop the server:**
```powershell
# Press Ctrl+C or in another PowerShell:
Stop-Process -Name "node" -Force
```

---

## ✅ Production Verification Scripts

### Linux/Mac: `verify-production.sh`

**Purpose:** Verify production setup is complete and working

**Usage:**
```bash
cd backend
bash scripts/verify-production.sh
```

**Checks:**
- Node.js version
- Backend files present
- Scripts directory exists
- .env file configured
- Package dependencies
- Server can start
- API endpoints responding
- Database connection
- All required scripts present

**Output:**
```
🔍 Backend Production Verification
════════════════════════════════════

✅ Node.js installed: v22.20.0
✅ Backend directory: Found
✅ Scripts directory: Found
✅ .env file: Configured
✅ Dependencies: Installed
✅ Server port 5000: Available
✅ Database: Connected
✅ API endpoints: Responding
✅ All scripts: Present

════════════════════════════════════
✅ Production Ready! Ready to Deploy
```

---

### Windows: `verify-production.ps1`

**Purpose:** Verify production setup (Windows)

**Usage:**
```powershell
cd backend
.\scripts\verify-production.ps1
```

**Checks:**
- Node.js installation
- Backend structure
- Environment variables
- Dependencies
- Port availability
- Database connectivity
- API endpoints

**Output:** Similar to Linux version

---

## 🛠️ Common Usage Patterns

### Development Workflow

```bash
# 1. Start development server
npm run dev

# 2. Check status
node scripts/status.js

# 3. When done, clean up
bash scripts/cleanup.sh
```

### Production Deployment

```bash
# 1. Verify everything is ready
bash scripts/verify-production.sh

# 2. If migrating from JSON to MongoDB:
DATABASE_URL="mongodb://..." node scripts/migrate-db.js

# 3. Start production server
bash scripts/start-production.sh

# 4. Monitor status
watch -n 10 'node scripts/status.js'
```

### Before Deploying

```bash
# 1. Verify production setup
bash scripts/verify-production.sh

# 2. Check current status
node scripts/status.js

# 3. Clean up old files
bash scripts/cleanup.sh

# 4. Ready to deploy!
```

---

## 🐳 Docker Usage

If using Docker, scripts can be run from container:

```bash
# Build Docker image
docker build -t onder-backend .

# Run container
docker run -p 5000:5000 --env-file .env onder-backend

# Or with docker-compose:
docker-compose up

# Run script inside container:
docker exec onder-backend node scripts/status.js
```

---

## 🖥️ PM2 Usage (Recommended for Production)

**Install PM2:**
```bash
npm install -g pm2
```

**Start with PM2:**
```bash
pm2 start scripts/start-production.sh --name "onder-backend"
```

**Monitor:**
```bash
pm2 monit
pm2 logs
pm2 status
```

**Auto-restart on reboot:**
```bash
pm2 startup
pm2 save
```

**Restart service:**
```bash
pm2 restart onder-backend
```

---

## 📋 Recommended Cron Jobs

Add these to your crontab for automated maintenance:

```bash
# Edit crontab
crontab -e

# Add these lines:

# Daily cleanup at 2 AM
0 2 * * * cd /path/to/backend && bash scripts/cleanup.sh

# Hourly status check
0 * * * * cd /path/to/backend && node scripts/status.js >> logs/status.log

# Weekly backup (if using MongoDB)
0 3 * * 0 cd /path/to/backend && mongodump -u user -p password --uri mongodb://...
```

---

## 🔍 Troubleshooting Scripts

### Script won't run on Linux/Mac

**Problem:** `Permission denied`

**Solution:**
```bash
chmod +x scripts/*.sh
```

---

### Script won't run on Windows

**Problem:** `cannot be loaded because running scripts is disabled`

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

### MongoDB migration fails

**Problem:** `Connection refused`

**Solution:**
1. Make sure MongoDB is running
2. Check DATABASE_URL is correct
3. Test connection: `mongosh <DATABASE_URL>`

---

### Port 5000 already in use

**Problem:** `EADDRINUSE: address already in use`

**Solution:**
```bash
# Find process using port 5000
lsof -i :5000

# Kill process (on Mac/Linux)
kill -9 <PID>

# Or change port in .env
PORT=5001
```

---

## 📊 Script Output Locations

```
Backend Directory:
├── logs/                          # Application logs
│   ├── app.log                    # Main application log
│   ├── error.log                  # Error log
│   └── status.log                 # Status check log (if using cron)
│
├── data/
│   └── db.json                    # JSON database (before migration)
│
├── uploads/
│   ├── images/                    # Uploaded images
│   ├── documents/                 # Uploaded documents
│   └── temp/                      # Temporary files (cleaned by cleanup.sh)
```

---

## ✨ Best Practices

1. **Always verify before production:**
   ```bash
   bash scripts/verify-production.sh
   ```

2. **Check status regularly:**
   ```bash
   node scripts/status.js
   ```

3. **Keep scripts updated:**
   - Review scripts monthly
   - Update paths if directory structure changes

4. **Monitor production:**
   ```bash
   pm2 logs
   watch -n 10 'node scripts/status.js'
   ```

5. **Backup before migration:**
   ```bash
   cp data/db.json data/db.backup.json
   ```

---

## 📞 Script-Related Issues

**Getting help:**
- Check logs: `tail -f logs/app.log`
- Run verification: `bash scripts/verify-production.sh`
- Check status: `node scripts/status.js`
- Contact: emir@onderdenetim.com

---

**Last Updated:** 14 Ocak 2026  
**Version:** 2.0.0  
**Status:** ✅ Production Ready
