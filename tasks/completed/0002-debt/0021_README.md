# Migration 0021: Align Artist Schema with Game Types

**Date**: 2025-10-09
**Issue**: Schema/Type mismatch causing 70+ TypeScript errors and data loss
**Solution**: Add missing columns and rename properties for consistency

---

## 🎯 What This Migration Does

This migration aligns the database schema with the authoritative game content source (`data/artists.json`) by:

1. **Adding 4 missing columns** that exist in JSON but not in database:
   - `temperament` (artist personality, 0-100)
   - `signing_cost` (one-time signing fee)
   - `bio` (artist biography text)
   - `age` (artist age in years)

2. **Renaming 2 columns** for consistency with GameArtist type:
   - `is_signed` → `signed`
   - `weekly_fee` → `weekly_cost`

---

## 📁 Files in This Migration

1. **[0021_align_artist_schema_with_game_types.sql](0021_align_artist_schema_with_game_types.sql)**
   - Database migration script
   - Idempotent (safe to run multiple times)
   - Includes verification queries and rollback plan

2. **[../scripts/migration-0021-update-code.ts](../scripts/migration-0021-update-code.ts)** (Optional)
   - Automated code update script
   - You can use Cursor find & replace instead

---

## 🚀 How to Apply (3 Steps)

### Prerequisites

✅ **Already completed**:
- `shared/schema.ts` - Updated to use `signed` and `weeklyCost`
- `server/routes.ts` - Removed property mapping workaround

### Step 1: Update Code (Cursor Find & Replace)

Use Cursor's find & replace with **regex mode enabled**:

**Pattern 1**: Property access `isSigned` → `signed`
```
Find:    \.isSigned\b
Replace: .signed
```

**Pattern 2**: Object properties `isSigned:` → `signed:`
```
Find:    \bisSigned:
Replace: signed:
```

**Pattern 3**: Property access `weeklyFee` → `weeklyCost`
```
Find:    \.weeklyFee\b
Replace: .weeklyCost
```

**Pattern 4**: Object properties `weeklyFee:` → `weeklyCost:`
```
Find:    \bweeklyFee:
Replace: weeklyCost:
```

**Review each change** before applying!

**OR** run the automated script (does the same thing):
```bash
npx tsx scripts/migration-0021-update-code.ts
```

### Step 2: Apply Database Migration

```bash
# Syncs database with updated schema.ts
npm run db:push
```

### Step 3: Verify Everything Works

```bash
# TypeScript should now compile without artist schema errors
npm run check

# Run tests
npm run test

# Start dev server and test UI
npm run dev
```

---

## 🔍 What Gets Fixed

### Before Migration ❌

**TypeScript Errors**: ~70 errors
- `Property 'temperament' does not exist on type 'Artist'`
- `Property 'signingCost' does not exist on type 'Artist'`
- `Property 'bio' does not exist on type 'Artist'`
- `Property 'age' does not exist on type 'Artist'`
- `Property 'signed' does not exist on type 'Artist'` (uses `isSigned`)
- `Property 'weeklyCost' does not exist on type 'Artist'` (uses `weeklyFee`)

**Runtime Issues**:
- Data loss: signing an artist drops temperament, signingCost, bio, age
- UI displays undefined for missing properties
- Workaround code in routes.ts mapping property names

### After Migration ✅

**TypeScript Errors**: 0 (or significantly reduced)
**Runtime**: All artist properties preserved and displayed correctly
**Code Quality**: No workarounds needed, clean property names

---

## 📊 Impact Assessment

### Database Changes
- ✅ **Backward Compatible**: New columns are nullable
- ✅ **Existing Data**: Not affected (artists keep existing properties)
- ⚠️ **Lost Data**: Cannot recover temperament/bio/age for already-signed artists
- ✅ **Future Data**: All properties preserved for newly signed artists

### Code Changes
- **14 files** need updating (automated script handles most)
- **~50 occurrences** of `isSigned` → `signed`
- **~15 occurrences** of `weeklyFee` → `weeklyCost`
- **1 workaround removed** in server/routes.ts

### UI Impact
- ✅ Artist cards will show temperament, bio, age
- ✅ Discovery modal will show accurate signing costs
- ✅ Artist detail pages fully functional

---

## 🔧 Troubleshooting

### Migration Fails

**Error**: `column "temperament" already exists`
- **Cause**: Migration already partially applied
- **Fix**: Migration is idempotent, safe to re-run

**Error**: `permission denied`
- **Cause**: Database user lacks ALTER TABLE permission
- **Fix**: Connect as database owner or superuser

### TypeScript Errors Persist

**Issue**: Still seeing `Property 'isSigned' does not exist`
- **Cause**: Code not updated yet
- **Fix**: Run `npx tsx scripts/migration-0021-update-code.ts`

**Issue**: Still seeing `Property 'temperament' does not exist`
- **Cause**: Migration not applied to database yet
- **Fix**: Run `npm run db:push`

### Runtime Errors

**Error**: `Cannot read property 'temperament' of undefined`
- **Cause**: Trying to access property on null artist
- **Fix**: Add null check: `artist?.temperament`

---

## 📚 Related Documentation

### Background Analysis
- **[SCHEMA_TYPE_ANALYSIS.md](../SCHEMA_TYPE_ANALYSIS.md)** - Original issue analysis
- **[SCHEMA_TYPE_DEPENDENCY_ANALYSIS.md](../SCHEMA_TYPE_DEPENDENCY_ANALYSIS.md)** - Complete data flow analysis with dependency graph

### Files Modified
- `shared/schema.ts` - Drizzle schema definition (already updated)
- `server/routes.ts` - Removed workaround (already updated)
- 12 files with `isSigned` → `signed` (you'll update with Cursor)
- 9 files with `weeklyFee` → `weeklyCost` (you'll update with Cursor)

---

## 🎓 Learning: Why This Happened

**Root Cause**: Incomplete database schema implementation

When the database was originally created:
1. Someone looked at `data/artists.json` (the source of truth)
2. They created the Drizzle schema
3. They **forgot** to include `temperament`, `signingCost`, `bio`, `age`
4. They **renamed** `signed` → `isSigned` and `weeklyCost` → `weeklyFee` (unclear why)
5. Code was written to work around these issues

**The Fix**: Align database with the game content source

**The Lesson**: Database schemas should be derived from domain models, not the other way around.

---

## ✅ Success Criteria

Migration is successful when:

- [ ] SQL migration runs without errors
- [ ] `npm run check` shows 0 TypeScript errors (related to artists)
- [ ] `npm run test` passes all tests
- [ ] Artist discovery UI shows temperament, bio, age, signingCost
- [ ] Signing an artist preserves all properties in database
- [ ] Weekly costs calculate correctly using `weeklyCost`
- [ ] No `isSigned` or `weeklyFee` references remain in code

---

## 🆘 Need Help?

1. **Review the analysis**: [SCHEMA_TYPE_DEPENDENCY_ANALYSIS.md](../SCHEMA_TYPE_DEPENDENCY_ANALYSIS.md)
2. **Check the guide**: [MIGRATION_0021_CODE_UPDATE_GUIDE.md](MIGRATION_0021_CODE_UPDATE_GUIDE.md)
3. **Verify database schema**:
   ```sql
   \d artists  -- Shows all columns and constraints
   ```
4. **Check TypeScript errors**: `npm run check 2>&1 | grep -i artist`

---

**Status**: Ready to apply
**Risk Level**: Low (backward compatible, nullable columns)
**Estimated Time**: 10-15 minutes
