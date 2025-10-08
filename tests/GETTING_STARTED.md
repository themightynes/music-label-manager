# Getting Started with Integration Testing

## Prerequisites

- **Docker Desktop** installed and running ([Download](https://www.docker.com/products/docker-desktop))
- **PowerShell** (included with Windows 10/11)
- Port **5433** available (check with: `netstat -ano | findstr :5433`)

## Step-by-Step Setup

### 1. Start the Test Database

Run this command **once** to start the PostgreSQL test database:

```powershell
npm run test:db:start
```

**Or run PowerShell script directly:**
```powershell
powershell -ExecutionPolicy Bypass -File tests/start-test-db.ps1
```

**What this does:**
- Starts a Docker container with PostgreSQL
- Creates a database called `music_label_test`
- Makes it available on port `5433`

**You should see:**
```
🐘 Starting PostgreSQL test database...
📦 Creating new test database container...
✅ Test database created and started!

🔗 Connection details:
   Host: localhost
   Port: 5433
   Database: music_label_test
   User: testuser
   Password: testpassword
```

### 2. Verify It's Running

#### Option A: Check with Docker

```bash
docker ps | grep music-label-test-db
```

You should see a running container.

#### Option B: Test Connection

```bash
docker exec -it music-label-test-db psql -U testuser -d music_label_test -c "SELECT version();"
```

You should see PostgreSQL version information.

### 3. Run the Integration Tests

```bash
npm run test:integration
```

This will run all `*.integration.test.ts` files using the Docker database.

## Daily Workflow

### Starting Your Work Session

```bash
# 1. Start the test database
npm run test:db:start

# 2. Run tests
npm run test:integration
```

### Stopping Your Work Session

```bash
# Stop the database (optional - you can leave it running)
npm run test:db:stop
```

### If Tests Are Acting Weird

```bash
# Reset the database to a fresh state
npm run test:db:reset

# Then run tests again
npm run test:integration
```

## Inspecting Test Data

### Method 1: Using `psql` in Terminal

```bash
# Connect to the database
docker exec -it music-label-test-db psql -U testuser -d music_label_test

# Common commands:
\dt                          # List all tables
\d game_states               # Describe game_states table
SELECT * FROM game_states;   # Query all game states
\q                           # Quit
```

### Method 2: Using TablePlus or DBeaver

**Connection Settings:**
- **Type:** PostgreSQL
- **Host:** localhost
- **Port:** 5433
- **Database:** music_label_test
- **User:** testuser
- **Password:** testpassword

Click "Test Connection" then "Connect"

### Method 3: Using VS Code Extension

1. Install **PostgreSQL** extension by Chris Kolkman
2. Add a new connection:
   - Host: `localhost`
   - Port: `5433`
   - Database: `music_label_test`
   - Username: `testuser`
   - Password: `testpassword`

## Troubleshooting

### "docker: command not found"

**Solution:** Install Docker Desktop
- Windows: https://docs.docker.com/desktop/install/windows-install/
- Mac: https://docs.docker.com/desktop/install/mac-install/

### "port is already allocated"

**Solution:** Either:

1. Stop whatever is using port 5433, or
2. Edit the start script to use a different port (e.g., 5434)

### Tests failing with "connection refused"

**Solution:**

```bash
# Check if database is running
docker ps | grep music-label-test-db

# If not running, start it
npm run test:db:start

# If running but still failing, restart it
npm run test:db:reset
```

### "container already exists"

**Solution:**

```bash
# Remove the old container and create fresh
npm run test:db:reset
```

## Advanced Usage

### View Database Logs

```bash
docker logs music-label-test-db

# Or follow logs in real-time
docker logs -f music-label-test-db
```

### Execute Custom SQL

```bash
# One-line query
docker exec music-label-test-db psql -U testuser -d music_label_test -c "SELECT COUNT(*) FROM artists;"

# Interactive session
docker exec -it music-label-test-db psql -U testuser -d music_label_test
```

### Backup Test Data

```bash
# Create backup
docker exec music-label-test-db pg_dump -U testuser music_label_test > backup.sql

# Restore backup
docker exec -i music-label-test-db psql -U testuser -d music_label_test < backup.sql
```

## Quick Reference

```bash
# Database Management
npm run test:db:start    # Start database
npm run test:db:stop     # Stop database
npm run test:db:reset    # Reset database

# Running Tests
npm run test:integration # Run integration tests
npm run test:ui          # Run tests with UI
npm run test             # Run all tests

# Docker Commands
docker ps                                    # List running containers
docker logs music-label-test-db              # View logs
docker exec -it music-label-test-db psql ... # Connect to database
docker restart music-label-test-db           # Restart database
```

## Next Steps

1. ✅ Start the database: `npm run test:db:start`
2. ✅ Run the tests: `npm run test:integration`
3. ✅ Inspect results in your favorite database client

Happy testing! 🧪
