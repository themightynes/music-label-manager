# Database Best Practices (Drizzle Kit & Railway PostgreSQL)

**Music Label Manager - Database Management Guide**  
*For Claude Code and Development Teams*

---

## 📚 Overview

This guide covers database schema management, migrations, and best practices for working with **Drizzle Kit** and **Railway PostgreSQL** in the Music Label Manager project. It addresses common issues, emergency procedures, and a proven workflow that avoids pitfalls.

---

## 🎯 What is Drizzle Kit?

**Drizzle Kit** is a migration management tool that:
- **Introspects** your TypeScript schema file (`shared/schema.ts`)
- **Compares** it to your actual PostgreSQL database
- **Generates** SQL migration files for differences
- **Applies** migrations to keep database and schema in sync

```
Your Schema (schema.ts)
    ↓
Drizzle Kit Comparison
    ↓
SQL Migrations Generated
    ↓
PostgreSQL Updated
```

### **When Drizzle Kit Works Well**
✅ Simple column additions  
✅ New table creation  
✅ Index management  
✅ Basic relationship setup  

### **When Drizzle Kit Struggles**
❌ Modifying existing columns with constraints  
❌ Multiple table changes at once  
❌ Complex data type changes  
❌ Foreign key relationship changes  
❌ Cascade delete modifications  

---

## 🚨 Common Drizzle Kit Issues & Why They Happen

### **Issue 1: Incomplete Migrations**
**Problem**: Generated SQL file doesn't include all changes you made to schema.ts

**Why**: Drizzle Kit processes multiple tables sequentially. If it encounters a complex relationship, it sometimes skips later tables.

**Prevention**:
- Make schema changes **one table at a time**
- Generate migrations **incrementally**
- Never modify 3+ tables in a single `db:generate` run

---

### **Issue 2: Schema State Confusion**
**Problem**: Kit thinks database is already updated when it isn't (or vice versa)

**Why**: If a migration partially fails, the `drizzle/schema` metadata gets out of sync with reality.

**Prevention**:
- Always **review generated SQL** before applying
- Check database state with `npm run db:studio` after migrations
- Run validation: `npm run check` before and after

---

### **Issue 3: Data Type Conversion Failures**
**Problem**: Altering a column type fails silently or throws cryptic errors

**Why**: PostgreSQL can't automatically convert some data types. You need explicit `CAST` operations.

**Prevention**:
- For non-trivial type changes, **write migration SQL manually**
- Test in dev environment first
- Keep old columns temporarily if worried about data loss

---

### **Issue 4: Foreign Key & Relation Inference Issues**
**Problem**: Relationships don't get detected or generated correctly

**Why**: Drizzle Kit's relation inference is fragile when dealing with custom configurations.

**Prevention**:
- Define relations **explicitly** in schema.ts
- Don't rely on auto-inference
- Test all relation queries before deploying

---

## ✅ Proven Database Workflow

### **For Adding a New Column**

**Step 1: Update schema.ts**
```typescript
// shared/schema.ts
export const gameStates = pgTable('game_states', {
  id: uuid('id').primaryKey(),
  // ... existing columns ...
  newColumn: varchar('new_column', { length: 255 }).notNull().default(''),  // ← ADD HERE
});
```

**Step 2: Generate migration**
```bash
npm run db:generate
```

**Step 3: Review generated SQL**
```bash
# Check drizzle/migrations/XXXX.sql - ensure it looks right
cat drizzle/migrations/0001_*.sql
```

**Step 4: Apply migration**
```bash
npm run db:push
```

**Step 5: Verify in database**
```bash
npm run db:studio
# Visual check: Open studio, look for new column
```

---

### **For Modifying a Column Type**

**⚠️ Critical**: This is where Drizzle Kit often fails.

**Step 1: DON'T modify in schema.ts yet**

**Step 2: Write manual SQL migration**
```bash
# Create in drizzle/migrations/0002_alter_column_type.sql
ALTER TABLE game_states 
  ALTER COLUMN status TYPE text USING status::text;
```

**Step 3: Apply it**
```bash
psql $DATABASE_URL < drizzle/migrations/0002_alter_column_type.sql
```

**Step 4: Update schema.ts to match**
```typescript
status: text('status').notNull(),  // was: varchar(...)
```

**Step 5: Validate**
```bash
npm run check
npm run db:studio
```

---

### **For Modifying Foreign Keys/Relations**

**Step 1: Check current state**
```bash
npm run db:studio
# Look at current constraints on the table
```

**Step 2: Update schema.ts with new relation**
```typescript
export const artists = pgTable('artists', {
  id: uuid('id').primaryKey(),
  gameId: uuid('game_id')
    .notNull()
    .references(() => gameStates.id, { onDelete: 'cascade' })  // ← MODIFY HERE
});
```

**Step 3: Generate**
```bash
npm run db:generate
```

**Step 4: Review and test SQL**
```bash
# Open the generated migration file
cat drizzle/migrations/XXXX.sql

# Test it (don't apply yet):
psql $DATABASE_URL -n < drizzle/migrations/XXXX.sql
```

**Step 5: Apply only if safe**
```bash
npm run db:push
```

---

## 🚨 Emergency: Migration Stuck or Failed

### **Situation: Migration generated but won't apply**

**Option 1: Manual SQL Fix**
```bash
# Find what went wrong:
psql $DATABASE_URL
# \d table_name   (describe table)
# SELECT * FROM drizzle_migrations;

# Fix manually:
psql $DATABASE_URL -c "ALTER TABLE users ADD COLUMN email VARCHAR(255);"

# Then update schema.ts to match reality
```

**Option 2: Rollback & Regenerate**
```bash
# Remove the bad migration file
rm drizzle/migrations/XXXX.sql

# Update schema.ts back to current reality
# (sync with what's actually in database)

# Regenerate from scratch
npm run db:generate
npm run db:push
```

---

### **Situation: Database and schema.ts are completely out of sync**

**Nuclear Option: Reset (DEV ONLY, DANGEROUS IN PRODUCTION)**

⚠️ **WARNING**: This deletes all data. Only use in development.

```bash
# 1. Drop all tables (caution!)
npm run db:drop

# 2. Verify schema.ts represents desired state
# Make sure schema.ts is correct

# 3. Reapply migrations fresh
npm run db:push

# 4. Reseed data (if you have a seed script)
npm run db:seed
```

**Safe Alternative: Introspect Current State**
```bash
# Let Drizzle Kit read the actual database
npm run db:introspect

# This updates schema.ts to match reality
# Then you can make your changes from a known good state
```

---

## 📋 Database Validation Checklist

### **After Every Migration**

- [ ] `npm run check` passes (TypeScript errors?)
- [ ] `npm run db:studio` opens successfully
- [ ] Visual inspection: New columns/tables exist in studio
- [ ] No foreign key constraint errors in studio
- [ ] Data from before migration is still intact
- [ ] All queries in game engine still work

### **Before Deploying to Production (Railway)**

- [ ] All migrations applied successfully in dev
- [ ] Tested in at least 2 full game runs
- [ ] No console errors when advancing months
- [ ] All player actions still work
- [ ] Game state persists correctly after restart
- [ ] Migration has been manually reviewed

---

## 🔧 Useful Commands

### **Common Operations**

```bash
# Generate migrations from schema.ts
npm run db:generate

# Apply pending migrations to database
npm run db:push

# Visual database browser (web UI)
npm run db:studio

# Read actual database and sync schema.ts
npm run db:introspect

# Drop all tables (⚠️ DANGEROUS - dev only)
npm run db:drop

# TypeScript validation
npm run check

# Run tests
npm run test:run
```

### **PostgreSQL Direct Access**

```bash
# Connect directly to database
psql $DATABASE_URL

# Common commands once connected:
\d                    # List all tables
\d table_name         # Describe specific table
\dt                   # List tables only
SELECT * FROM drizzle_migrations;  # See migration history
```

---

## ⚡ Advanced: Manual Migration Workflow

### **When You Want Full Control**

Instead of relying on `db:generate`, you can write SQL directly:

**Step 1: Create migration file**
```bash
touch drizzle/migrations/0005_custom_migration.sql
```

**Step 2: Write your SQL**
```sql
-- drizzle/migrations/0005_custom_migration.sql
ALTER TABLE artists ADD COLUMN genre VARCHAR(100);
CREATE INDEX idx_artists_genre ON artists(genre);
```

**Step 3: Apply it**
```bash
psql $DATABASE_URL -f drizzle/migrations/0005_custom_migration.sql
```

**Step 4: Update schema.ts**
```typescript
export const artists = pgTable('artists', {
  // ... existing ...
  genre: varchar('genre', { length: 100 }),  // ← Add to match SQL
});
```

**Step 5: Mark migration as applied**
```sql
INSERT INTO drizzle_migrations (name, execution_time)
VALUES ('0005_custom_migration', 0);
```

---

## 🎯 Best Practices Summary

### **DO:**
✅ Make schema changes **one table at a time**  
✅ Generate and review migrations **before applying**  
✅ Use `db:studio` to visually verify changes  
✅ Write SQL manually for complex changes  
✅ Test migrations in dev before production  
✅ Keep schema.ts in sync with database reality  
✅ Commit migration files to git  

### **DON'T:**
❌ Modify 3+ tables in one schema update  
❌ Trust auto-generated migrations without review  
❌ Apply migrations without testing first  
❌ Ignore TypeScript errors after schema changes  
❌ Try to fix database state without schema.ts update  
❌ Skip the validation checklist  
❌ Apply migrations directly to production without testing in dev  

---

## 🔗 Related Documentation

- **Schema Design**: [Database Design](../02-architecture/database-design.md)
- **API Contracts**: [API Design](../02-architecture/api-design.md)
- **Troubleshooting**: [System Troubleshooting](../09-troubleshooting/consolidated-system-troubleshooting.md)
- **Development Setup**: [CLAUDE.md](../../CLAUDE.md)

---

## 📞 Quick Reference: When to Use What

| Situation | Action |
|-----------|--------|
| Adding a new column | Use `db:generate` then review |
| Changing column type | Write manual SQL migration |
| Adding/removing foreign key | Use `db:generate` but review carefully |
| Complex multi-table change | Write manual SQL for that part |
| Schema got corrupted | Use `db:introspect` to reset to reality |
| Need to drop everything | `npm run db:drop` + `npm run db:push` (dev only!) |
| Stuck migration won't apply | Extract SQL, fix it, apply manually |

---

**Last Updated**: October 2025  
**Status**: Current and Tested  
**Audience**: Development Team & Claude Code Sessions

