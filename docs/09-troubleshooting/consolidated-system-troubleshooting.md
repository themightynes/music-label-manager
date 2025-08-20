# Troubleshooting Guide - Consolidated Song Revenue System

**Music Label Manager - Post-Consolidation Troubleshooting**  
*Updated: August 20, 2025 - After Architectural Consolidation*

---

## 🚨 Critical System Changes

**IMPORTANT**: This troubleshooting guide covers issues specific to the **consolidated song revenue system** where GameEngine is the SINGLE source of truth for all song processing.

### **Architecture Summary**
- **Routes.ts**: Handles ONLY project stage advancement
- **GameEngine**: Handles ALL song revenue processing, releases, monthly decay
- **Configuration**: All calculations use balance.json values
- **No Duplicate Logic**: Eliminated conflicting systems

---

## 🔧 Common Issues After Consolidation

### **Issue 1: Songs Not Generating Revenue**

**Symptoms**: Released songs show 0 revenue or streams

**Likely Causes**:
1. GameEngine not processing newly released projects
2. balance.json configuration missing or incorrect
3. Songs not marked as `isReleased: true`

**Debugging Steps**:
```bash
# Check if songs are marked as released
psql $DATABASE_URL -c "SELECT title, is_released, release_month, total_revenue FROM songs WHERE game_id = 'YOUR_GAME_ID';"

# Verify balance.json configuration
curl http://localhost:5000/api/test-data | jq '.ongoing_streams'

# Check GameEngine processing logs
# Look for: "[SONG PROCESSING]" in console logs
```

**Solutions**:
1. Verify `processNewlyReleasedProjects()` is being called in GameEngine
2. Check that balance.json contains `ongoing_streams.revenue_per_stream: 0.05`
3. Ensure project advancement sets `releaseMonth` correctly

### **Issue 2: Double Revenue Processing**

**Symptoms**: Songs generating revenue twice, inflated totals

**Likely Causes**:
1. Legacy code still calling old revenue processing
2. Both GameEngine methods running simultaneously

**Debugging Steps**:
```bash
# Check for duplicate processing in logs
grep -i "revenue" logs/server.log | grep -v "GameEngine"

# Verify no routes.ts song processing
grep -n "song.*revenue\|stream" server/routes.ts
```

**Solutions**:
1. Ensure ALL song processing logic removed from routes.ts (lines 917-941)
2. Verify only GameEngine methods process revenue
3. Check that `processReleasedProjects()` doesn't duplicate `processNewlyReleasedProjects()`

### **Issue 3: Configuration Not Found**

**Symptoms**: Error messages about missing streaming configuration

**Likely Causes**:
1. balance.json missing `ongoing_streams` section
2. `getStreamingConfigSync()` not finding configuration
3. File path issues with balance.json

**Debugging Steps**:
```bash
# Verify balance.json structure
cat data/balance.json | jq '.ongoing_streams'

# Check ServerGameData initialization
curl http://localhost:5000/api/validate-types | jq '.balance_valid'
```

**Solutions**:
1. Ensure balance.json contains:
   ```json
   {
     "ongoing_streams": {
       "revenue_per_stream": 0.05,
       "monthly_decay_rate": 0.85
     }
   }
   ```
2. Restart server after balance.json changes
3. Verify file permissions on data/balance.json

### **Issue 4: Monthly Decay Not Working**

**Symptoms**: Songs maintain same revenue month after month

**Likely Causes**:
1. `monthsSinceRelease` calculation incorrect
2. Decay formula using wrong values
3. `release_month` not set properly

**Debugging Steps**:
```bash
# Check release months and current month
psql $DATABASE_URL -c "SELECT title, release_month, last_month_revenue FROM songs WHERE is_released = true AND game_id = 'YOUR_GAME_ID';"

# Verify current game month
psql $DATABASE_URL -c "SELECT current_month FROM game_states WHERE id = 'YOUR_GAME_ID';"
```

**Solutions**:
1. Verify release_month is set when songs are released
2. Check decay formula: `Math.pow(0.85, monthsSinceRelease)`
3. Ensure monthly processing updates `last_month_revenue`

---

## 🔍 Debugging Workflow

### **Step 1: Verify System State**
```bash
# Check if consolidation is complete
grep -r "song.*revenue" server/routes.ts | wc -l  # Should be 0
grep -r "processNewlyReleasedProjects" shared/engine/game-engine.ts  # Should exist
```

### **Step 2: Test Individual Components**
```bash
# Test GameEngine directly
curl -X POST http://localhost:5000/api/advance-month \
  -H "Content-Type: application/json" \
  -d '{"gameId":"YOUR_GAME_ID","selectedActions":[]}'
```

### **Step 3: Monitor Processing**
```bash
# Watch logs during month advancement
tail -f logs/server.log | grep -E "(SONG|GameEngine|processNewly)"
```

### **Step 4: Validate Results**
```bash
# Check song revenue updates
psql $DATABASE_URL -c "SELECT title, total_revenue, last_month_revenue, monthly_streams FROM songs WHERE is_released = true ORDER BY total_revenue DESC LIMIT 10;"
```

---

## ⚠️ Known Issues & Workarounds

### **Issue: Transaction Context**
**Problem**: GameEngine methods need database transaction context to see uncommitted changes

**Workaround**: Pass `dbTransaction` parameter to GameEngine methods:
```typescript
const result = await gameEngine.processNewlyReleasedProjects(summary, tx);
```

### **Issue: Legacy Data**
**Problem**: Songs created before consolidation missing new revenue fields

**Workaround**: Run data migration:
```sql
UPDATE songs 
SET initial_streams = quality * 50,
    total_streams = quality * 50,
    release_month = COALESCE(created_month, 1)
WHERE is_released = true AND total_revenue = 0;
```

---

## 🔄 Performance Monitoring

### **Key Metrics to Watch**
1. **Monthly Processing Time**: Should be <500ms for month advancement
2. **Database Query Count**: Monitor for N+1 query issues
3. **Memory Usage**: Individual song processing should scale linearly

### **Performance Queries**
```sql
-- Check for slow song processing
EXPLAIN ANALYZE SELECT * FROM songs WHERE is_released = true AND game_id = 'YOUR_GAME_ID';

-- Monitor revenue calculation consistency
SELECT COUNT(*), AVG(total_revenue), SUM(total_revenue) 
FROM songs 
WHERE is_released = true;
```

---

## 📞 Emergency Procedures

### **If System is Completely Broken**
1. Check server logs for GameEngine errors
2. Verify balance.json is valid JSON
3. Restart server and check initialization
4. Run database integrity checks
5. Contact development team with specific error messages

### **Quick Health Check**
```bash
# Verify all systems working
curl http://localhost:5000/api/test-data && echo "✅ Data loading works"
curl http://localhost:5000/api/validate-types && echo "✅ Types valid"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM songs;" && echo "✅ Database accessible"
```

---

**Remember**: After the consolidation, GameEngine is the ONLY place that processes song revenue. Any duplicate processing indicates incomplete migration.