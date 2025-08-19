# Individual Song System Migration Guide

**Music Label Manager - Phase 1 Enhancement Migration**  
*Version: 1.0 → 1.1 (Individual Song Revenue System)*

---

## 🎯 Migration Overview

This migration transforms the Music Label Manager from **project-based revenue aggregation** to **individual song tracking**, enabling realistic music industry mechanics where each song has its own performance metrics.

**Key Changes**:
- Database schema enhanced with individual song revenue fields
- GameEngine updated to process songs individually instead of by project
- Frontend components enhanced to display individual song metrics
- Backward compatibility maintained for existing save games

---

## 📋 Prerequisites

### **Development Environment**
- Node.js 18+ with npm
- PostgreSQL database access
- Existing Music Label Manager installation

### **Database Backup**
```bash
# IMPORTANT: Always backup before migration
pg_dump $DATABASE_URL > backup_before_individual_songs_$(date +%Y%m%d_%H%M%S).sql
```

### **Code Preparation**
```bash
# Ensure clean repository state
git status
git add .
git commit -m "Pre-migration checkpoint"
```

---

## 🗃️ Database Schema Migration

### **Step 1: Apply Schema Changes**
The new individual song fields need to be added to the songs table:

```bash
# Apply schema changes via Drizzle
npx drizzle-kit push
```

**New Fields Added**:
```sql
-- Individual Revenue & Streaming Metrics
ALTER TABLE songs ADD COLUMN initial_streams INTEGER DEFAULT 0;
ALTER TABLE songs ADD COLUMN total_streams INTEGER DEFAULT 0;
ALTER TABLE songs ADD COLUMN total_revenue INTEGER DEFAULT 0;
ALTER TABLE songs ADD COLUMN monthly_streams INTEGER DEFAULT 0;
ALTER TABLE songs ADD COLUMN last_month_revenue INTEGER DEFAULT 0;
ALTER TABLE songs ADD COLUMN release_month INTEGER;

-- Performance indexes
CREATE INDEX idx_songs_revenue ON songs(total_revenue) WHERE is_released = true;
CREATE INDEX idx_songs_release_month ON songs(release_month) WHERE is_released = true;
```

### **Step 2: Data Migration for Existing Released Songs**
Populate individual metrics for songs that were released before the migration:

```sql
-- Migrate existing released songs to individual revenue metrics
UPDATE songs 
SET 
  initial_streams = ROUND(quality * 50 * (1 + GREATEST(0, (quality - 40) / 60.0))),
  total_streams = ROUND(quality * 50 * (1 + GREATEST(0, (quality - 40) / 60.0))),
  total_revenue = ROUND(quality * 50 * (1 + GREATEST(0, (quality - 40) / 60.0)) * 0.5),
  monthly_streams = ROUND(quality * 50 * (1 + GREATEST(0, (quality - 40) / 60.0))),
  last_month_revenue = ROUND(quality * 50 * (1 + GREATEST(0, (quality - 40) / 60.0)) * 0.5),
  release_month = COALESCE(created_month, 1)
WHERE is_released = true AND total_revenue = 0;
```

**Migration Formula Explanation**:
- **Base Streams**: `quality * 50` (50 streams per quality point)
- **Quality Bonus**: `(quality - 40) / 60` for quality above 40
- **Initial Revenue**: `streams * $0.50` (50 cents per initial stream)
- **Release Month**: Uses `created_month` as fallback

### **Step 3: Verify Migration**
```sql
-- Check migrated data
SELECT 
  title, 
  quality, 
  total_streams, 
  total_revenue,
  release_month
FROM songs 
WHERE is_released = true 
ORDER BY total_revenue DESC 
LIMIT 10;

-- Verify counts
SELECT 
  COUNT(*) as total_released_songs,
  COUNT(*) FILTER (WHERE total_revenue > 0) as songs_with_revenue,
  AVG(total_revenue) as avg_revenue,
  SUM(total_revenue) as total_catalog_revenue
FROM songs 
WHERE is_released = true;
```

---

## 💻 Code Deployment

### **Step 1: Build and Deploy Updated Code**
```bash
# Install dependencies and build
npm install
npm run build

# Check for compilation errors
npm run check
```

### **Step 2: Server Restart**
The development server must be restarted to pick up:
- New database schema
- Updated TypeScript code
- Enhanced API endpoints

```bash
# Stop current development server
# Restart with: npm run dev
```

### **Step 3: Verify API Endpoints**
```bash
# Test song endpoints return new fields
curl -s "http://localhost:5000/api/game/[GAME_ID]/songs" | jq '.[0] | {title, quality, totalStreams, totalRevenue}'

# Should return individual song metrics
```

---

## 🧪 Testing & Validation

### **Functional Testing Checklist**

#### **Individual Song Display**
- [ ] Artist Info → Song Catalog shows individual song metrics
- [ ] Released songs display streams, revenue, and last month performance
- [ ] Song cards show quality, status badges, and individual metrics
- [ ] Aggregated totals correctly sum individual song performance

#### **Project Aggregation** 
- [ ] Recording session projects show "🎵 Individual song tracking active"
- [ ] Project revenue totals match sum of individual songs
- [ ] Project stream counts aggregate individual song streams
- [ ] Legacy projects without individual songs still display correctly

#### **Month Advancement**
- [ ] Advancing month processes individual songs for ongoing revenue
- [ ] Monthly summary shows individual song ongoing revenue entries
- [ ] Song metrics update individually (not as project aggregates)
- [ ] Revenue decay applies per song with individual calculations

#### **Backward Compatibility**
- [ ] Existing save games load without errors
- [ ] Projects without individual songs fall back to legacy display
- [ ] Mixed games (some projects with individual songs, some without) work correctly

### **Performance Testing**
```bash
# Monitor database performance with individual song queries
psql $DATABASE_URL -c "EXPLAIN ANALYZE SELECT * FROM songs WHERE is_released = true AND game_id = '[GAME_ID]';"

# Check memory usage with large song catalogs
# Advance multiple months to verify ongoing revenue processing scales
```

---

## 🔄 Rollback Procedures

### **Emergency Rollback (If Issues Occur)**

#### **Step 1: Restore Code**
```bash
# Revert to previous commit
git log --oneline -n 5
git checkout [PREVIOUS_COMMIT_HASH]
npm run build
# Restart server
```

#### **Step 2: Database Rollback (If Necessary)**
```sql
-- Remove new columns (only if absolutely necessary)
ALTER TABLE songs DROP COLUMN IF EXISTS initial_streams;
ALTER TABLE songs DROP COLUMN IF EXISTS total_streams;
ALTER TABLE songs DROP COLUMN IF EXISTS total_revenue;
ALTER TABLE songs DROP COLUMN IF EXISTS monthly_streams;
ALTER TABLE songs DROP COLUMN IF EXISTS last_month_revenue;
ALTER TABLE songs DROP COLUMN IF EXISTS release_month;

-- Drop new indexes
DROP INDEX IF EXISTS idx_songs_revenue;
DROP INDEX IF EXISTS idx_songs_release_month;
```

#### **Step 3: Full Database Restore (Last Resort)**
```bash
# Only if data corruption occurs
psql $DATABASE_URL < backup_before_individual_songs_[TIMESTAMP].sql
```

---

## 📊 Post-Migration Monitoring

### **Key Metrics to Monitor**

#### **Database Performance**
- Query response times for song-related endpoints
- Index usage on new song revenue fields
- Transaction completion rates for month advancement

#### **Application Performance**
- Frontend load times for Song Catalog component
- Memory usage during individual song processing
- API response times for aggregated project metrics

#### **Data Integrity**
```sql
-- Daily data integrity checks
SELECT 
  COUNT(*) as released_songs,
  COUNT(*) FILTER (WHERE total_revenue IS NULL) as songs_missing_revenue,
  COUNT(*) FILTER (WHERE total_streams IS NULL) as songs_missing_streams
FROM songs WHERE is_released = true;

-- Revenue consistency check
SELECT 
  project_id,
  COUNT(*) as song_count,
  SUM(total_revenue) as calculated_project_revenue
FROM songs s
JOIN projects p ON (s.metadata->>'projectId') = p.id
WHERE s.is_released = true
GROUP BY project_id
ORDER BY calculated_project_revenue DESC;
```

---

## 🏁 Migration Success Criteria

### **Technical Success**
- [ ] All database schema changes applied successfully
- [ ] Existing released songs have individual revenue metrics populated
- [ ] New song endpoints return complete individual metrics
- [ ] Server compiles and runs without errors
- [ ] All tests pass

### **User Experience Success**
- [ ] Individual song metrics visible in Artist Info → Song Catalog
- [ ] Project boxes show aggregated metrics with individual song indicators
- [ ] Month advancement processes individual songs correctly
- [ ] Performance is acceptable with large song catalogs
- [ ] Existing save games continue to work

### **Business Logic Success**
- [ ] Individual songs generate realistic revenue patterns
- [ ] Monthly decay applies per song (not per project)
- [ ] Hit songs can carry projects (quality distribution effect)
- [ ] Total revenue calculations are accurate and consistent

---

## 📚 Additional Resources

### **Troubleshooting Common Issues**

#### **"Songs not showing individual metrics"**
- Verify server restart completed
- Check API endpoint returns new fields: `curl /api/game/[ID]/artists/[ARTIST_ID]/songs`
- Ensure migration SQL completed without errors

#### **"Double-counting revenue in monthly advancement"**
- Verify GameEngine is using individual song processing
- Check that legacy fallback isn't running simultaneously
- Monitor console logs for "[INDIVIDUAL SONG DECAY]" messages

#### **"Project totals don't match individual song sums"**
- Check that songs have correct `metadata.projectId` values
- Verify aggregation logic in `calculateProjectMetrics()`
- Ensure all songs from project are included in calculation

### **Development Resources**
- **Database Schema**: `/shared/schema.ts` - Enhanced songs table definition
- **GameEngine**: `/shared/engine/game-engine.ts` - Individual song processing logic
- **Frontend Components**: `/client/src/components/SongCatalog.tsx`, `ActiveProjects.tsx`
- **API Endpoints**: `/server/routes.ts` - Song management endpoints
- **Migration Script**: Available as SQL commands above

---

**Migration Complete! The Music Label Manager now features realistic individual song tracking with quality-based performance, monthly decay, and aggregated project metrics.**