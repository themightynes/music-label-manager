# Release Bug Fix - Deployment Checklist

## 🎯 **Overview**
Two-phase deployment to fix releases disappearing from dashboard:
- **PR #1**: Inclusive Query Logic (Critical Fix)  
- **PR #2**: Auto-Fix Migration (User Experience Enhancement)

---

## 📋 **Pre-Deployment Validation**

### **Environment Setup**
- [ ] Development server running on port 5001
- [ ] Test database accessible and clean
- [ ] Node.js validation scripts installed
- [ ] API endpoints responding correctly

### **Run Validation Scripts**
```bash
# Individual PR validation
chmod +x scripts/validate-pr1-query-fix.js
chmod +x scripts/validate-pr2-auto-fix.js
chmod +x scripts/comprehensive-release-test.js

# Run comprehensive validation
node scripts/comprehensive-release-test.js

# Expected output: "🎉 ALL VALIDATIONS PASSED - READY FOR DEPLOYMENT"
```

### **Manual Verification Steps**
- [ ] Create planned release for past month
- [ ] Advance game to current month  
- [ ] Verify release appears in "Released" section, not "Upcoming"
- [ ] Check console logs show overdue release detection
- [ ] Confirm no performance degradation

---

## 🚀 **PR #1 Deployment: Inclusive Query Logic**

### **Files to Modify**
- `server/storage.ts` (lines 12, 371, 375)

### **Changes Required**
1. **Update import statement** (line 12):
   ```typescript
   // ADD 'lte' to imports
   import { eq, and, desc, inArray, sql, lte } from "drizzle-orm";
   ```

2. **Change query logic** (line 371):
   ```typescript
   // BEFORE:
   eq(releases.releaseMonth, month)
   
   // AFTER:
   lte(releases.releaseMonth, month)
   ```

3. **Add logging** (after line 375):
   ```typescript
   const overdueCount = result.filter(r => r.releaseMonth && r.releaseMonth < month).length;
   if (overdueCount > 0) {
     console.log(`[STORAGE] getPlannedReleases: found ${overdueCount} overdue releases`);
   }
   ```

### **Deployment Steps**
1. [ ] Stop development server
2. [ ] Apply code changes to `server/storage.ts`
3. [ ] Restart development server
4. [ ] Run PR #1 validation: `node scripts/validate-pr1-query-fix.js`
5. [ ] Verify validation passes: **✅ PR #1 VALIDATION PASSED**
6. [ ] Check server logs for overdue release detection

### **Rollback Procedure**
If issues occur:
1. Revert `server/storage.ts` changes:
   - Change `lte(releases.releaseMonth, month)` back to `eq(releases.releaseMonth, month)`
   - Remove logging code
   - Remove `lte` from imports if not used elsewhere
2. Restart server
3. Verify original functionality restored

---

## 🔧 **PR #2 Deployment: Auto-Fix Migration**

### **Files to Modify**
- `shared/engine/game-engine.ts` (add new method after line 1000)
- `server/routes.ts` (add call around line 200)

### **Changes Required**
1. **Add auto-fix method** in `shared/engine/game-engine.ts`:
   ```typescript
   /**
    * Auto-fixes stuck releases during game load
    */
   async autoFixStuckReleases(dbTransaction?: any): Promise<void> {
     console.log('[AUTO-FIX] Checking for stuck planned releases...');
     
     const currentMonth = this.gameState.currentMonth || 1;
     const stuckReleases = await this.gameData.getPlannedReleases(
       this.gameState.id, 
       currentMonth - 1,
       dbTransaction
     );
     
     if (stuckReleases.length > 0) {
       console.log(`[AUTO-FIX] Found ${stuckReleases.length} stuck releases, migrating...`);
       
       for (const release of stuckReleases) {
         await this.gameData.updateReleaseStatus(
           release.id, 
           'released',
           { autoFixed: true, originalMonth: release.releaseMonth },
           dbTransaction
         );
         
         const songs = await this.gameData.getSongsByRelease(release.id, dbTransaction);
         const songUpdates = songs.map(song => ({
           songId: song.id,
           isReleased: true,
           releaseMonth: release.releaseMonth || currentMonth - 1,
           metadata: { ...song.metadata, autoFixed: true }
         }));
         
         await this.gameData.updateSongs(songUpdates, dbTransaction);
       }
     }
   }
   ```

2. **Add auto-fix call** in `server/routes.ts` (game loading route):
   ```typescript
   // After game state is loaded:
   await gameEngine.autoFixStuckReleases();
   ```

### **Deployment Steps**
1. [ ] Apply code changes to `shared/engine/game-engine.ts`
2. [ ] Apply code changes to `server/routes.ts`  
3. [ ] Restart development server
4. [ ] Run PR #2 validation: `node scripts/validate-pr2-auto-fix.js`
5. [ ] Verify validation passes: **✅ PR #2 VALIDATION PASSED**
6. [ ] Test game loading with stuck releases

### **Rollback Procedure**
If issues occur:
1. Remove `autoFixStuckReleases` method from GameEngine
2. Remove auto-fix call from routes.ts
3. Restart server
4. Verify game loading works without auto-fix

---

## ✅ **Post-Deployment Validation**

### **Comprehensive Testing**
```bash
# Run full validation suite
node scripts/comprehensive-release-test.js

# Expected results:
# ✅ PR1 (Query Fix) - PASSED
# ✅ PR2 (Auto-Fix) - PASSED  
# ✅ INTEGRATION - PASSED
# ✅ PERFORMANCE - PASSED
# ✅ USEREXPERIENCE - PASSED
```

### **User Acceptance Testing**
- [ ] Create new game
- [ ] Plan releases for different months
- [ ] Advance through multiple months
- [ ] Verify all releases appear in correct dashboard sections
- [ ] Check no releases disappear from UI
- [ ] Confirm console logs show proper processing

### **Performance Monitoring**
- [ ] Game loading time < 2 seconds
- [ ] Query execution time < 1 second
- [ ] Memory usage stable (no leaks)
- [ ] No increase in API response times

### **Data Consistency Checks**
- [ ] All releases have valid status values
- [ ] No orphaned planned releases in database
- [ ] Song-release relationships maintained
- [ ] Auto-fix metadata properly set

---

## 🚨 **Troubleshooting Guide**

### **Common Issues**

**Issue**: Validation scripts fail with "Connection refused"
**Solution**: Ensure dev server running on port 5001
```bash
npm run dev  # or your dev server command
```

**Issue**: "No releases found" in validation
**Solution**: Check database has test data, or validation script creates it properly

**Issue**: TypeScript errors after changes
**Solution**: Verify imports are correct and types match schema definitions

**Issue**: Performance degradation
**Solution**: 
1. Check query execution plans
2. Verify database indexes exist
3. Consider query optimization

### **Emergency Rollback**
If critical issues occur in production:
1. Revert all code changes immediately
2. Restart services
3. Run validation to confirm rollback successful
4. Investigate issues in development environment

---

## 📊 **Success Metrics**

### **Technical Metrics**
- [ ] 0 releases stuck in "planned" status after deployment
- [ ] 100% of overdue releases processed correctly
- [ ] <1 second query response time maintained
- [ ] 0 critical errors in server logs

### **User Experience Metrics**  
- [ ] 0 user reports of disappearing releases
- [ ] Dashboard shows accurate release status
- [ ] Seamless game loading experience
- [ ] No user action required for bug resolution

### **Code Quality Metrics**
- [ ] All validation tests passing
- [ ] Code changes minimal and targeted  
- [ ] Comprehensive logging for debugging
- [ ] Proper error handling and rollback procedures

---

**Deployment Owner**: _[Your Name]_  
**Deployment Date**: _[Date]_  
**Validation Status**: _[ ] Complete_