# Windows Quick Start Guide - Docker PostgreSQL Testing

## ✅ Step 1: Install Docker Desktop

1. Download Docker Desktop: https://www.docker.com/products/docker-desktop
2. Install and start Docker Desktop
3. Wait for Docker to fully start (look for green icon in system tray)

## ✅ Step 2: Start Test Database

Open PowerShell or Command Prompt and run:

```powershell
npm run test:db:start
```

**Expected output:**
```
🐘 Starting PostgreSQL test database...
📦 Creating new test database container...
⏳ Waiting for database to be ready...
✅ Test database created and started!

🔗 Connection details:
   Host: localhost
   Port: 5433
   Database: music_label_test
   User: testuser
   Password: testpassword
```

## ✅ Step 3: Verify It's Running

**Check Docker Desktop:**
- Open Docker Desktop
- Look for container named `music-label-test-db`
- Should show status: "Running"

**Or check via command line:**
```powershell
docker ps
```

Look for `music-label-test-db` in the list.

## ✅ Step 4: Run Tests

```powershell
npm run test:integration
```

## 🔧 Common Commands

### Start Database
```powershell
npm run test:db:start
```

### Stop Database
```powershell
npm run test:db:stop
```

### Reset Database (Fresh Start)
```powershell
npm run test:db:reset
```

### View Database Logs
```powershell
docker logs music-label-test-db
```

### Connect to Database (psql)
```powershell
docker exec -it music-label-test-db psql -U testuser -d music_label_test
```

## 🔍 Inspect Test Data

### Option 1: TablePlus (Recommended for Windows)

1. Download: https://tableplus.com/
2. Create new connection:
   - **Connection:** PostgreSQL
   - **Host:** localhost
   - **Port:** 5433
   - **Database:** music_label_test
   - **User:** testuser
   - **Password:** testpassword
3. Click "Connect"

### Option 2: Command Line (PowerShell)

```powershell
# Connect to database
docker exec -it music-label-test-db psql -U testuser -d music_label_test

# Once connected, run SQL:
\dt                         # List all tables
\d game_states              # Describe table
SELECT * FROM game_states;  # Query data
\q                          # Quit
```

### Option 3: Azure Data Studio

1. Download: https://aka.ms/azuredatastudio
2. Install PostgreSQL extension
3. Add connection with details above

## ❌ Troubleshooting

### "Docker is not running"

**Solution:**
1. Open Docker Desktop
2. Wait for it to fully start (green whale icon)
3. Try command again

### "port is already allocated"

**Solution:**

**Option A - Find what's using port 5433:**
```powershell
netstat -ano | findstr :5433
```

Kill that process or:

**Option B - Use different port:**

Edit `tests/start-test-db.ps1` and change:
```powershell
-p 5433:5432    # Change 5433 to 5434 or another port
```

### "container already exists"

**Solution:**
```powershell
npm run test:db:reset
```

### "Access Denied" when running PowerShell script

**Solution:**

**Option A - Run with bypass (recommended):**
```powershell
powershell -ExecutionPolicy Bypass -File tests/start-test-db.ps1
```

**Option B - Change execution policy (permanent):**
```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Tests failing with "ECONNREFUSED"

**Solution:**

1. **Check database is running:**
   ```powershell
   docker ps | Select-String music-label-test-db
   ```

2. **If not running, start it:**
   ```powershell
   npm run test:db:start
   ```

3. **If still failing, reset it:**
   ```powershell
   npm run test:db:reset
   ```

## 📊 Database Management

### View Container Status
```powershell
# List all containers
docker ps -a

# View specific container
docker ps | Select-String music-label-test-db
```

### View Logs
```powershell
# View all logs
docker logs music-label-test-db

# Follow logs in real-time
docker logs -f music-label-test-db

# Last 50 lines
docker logs --tail 50 music-label-test-db
```

### Container Resource Usage
```powershell
docker stats music-label-test-db
```

### Restart Database
```powershell
docker restart music-label-test-db
```

### Remove Container Completely
```powershell
docker rm -f music-label-test-db
```

## 🎯 Daily Workflow

### Morning (Start Work)
```powershell
# 1. Open Docker Desktop (if not running)
# 2. Start test database
npm run test:db:start

# 3. Run tests
npm run test:integration
```

### During Development
```powershell
# Run specific test file
npm run test -- game-engine-advance-week.integration.test.ts

# Run tests in watch mode
npm run test:integration -- --watch

# If database state gets messy, reset it
npm run test:db:reset
```

### Evening (End Work)
```powershell
# Optional: Stop database to free resources
npm run test:db:stop
```

## 💡 Pro Tips

1. **Leave it running:** The database uses minimal resources, you can leave it running between work sessions

2. **Reset when weird:** If tests start failing unexpectedly, reset the database:
   ```powershell
   npm run test:db:reset
   ```

3. **Check Docker Desktop:** Always verify Docker Desktop is running before starting tests

4. **Use TablePlus:** Best GUI for inspecting test data on Windows

5. **PowerShell ISE:** For better script editing, use Windows PowerShell ISE

## 🆘 Still Having Issues?

1. Check Docker Desktop is running (green whale icon)
2. Check port 5433 is free: `netstat -ano | findstr :5433`
3. Try resetting: `npm run test:db:reset`
4. Check logs: `docker logs music-label-test-db`
5. Restart Docker Desktop

## 📝 Next Steps

1. ✅ Install Docker Desktop
2. ✅ Run `npm run test:db:start`
3. ✅ Verify with `docker ps`
4. ✅ Run `npm run test:integration`
5. ✅ Install TablePlus for data inspection

Happy testing! 🚀
