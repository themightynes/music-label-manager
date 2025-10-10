#!/usr/bin/env tsx
/**
 * Migration 0021 Code Update Script
 *
 * Automatically updates code references from:
 * - isSigned → signed
 * - weeklyFee → weeklyCost
 *
 * Run with: npx tsx scripts/migration-0021-update-code.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

interface FileChange {
  file: string;
  oldCount: number;
  newCount: number;
  changes: string[];
}

const changes: FileChange[] = [];

// Files to update (excluding migration files and node_modules)
const filesToUpdate = [
  'shared/engine/game-engine.ts',
  'shared/engine/FinancialSystem.ts',
  'shared/schemas/artist.ts',
  'shared/api/contracts.ts',
  'client/src/store/gameStore.ts',
  'client/src/components/executive-meetings/ExecutiveMeetings.tsx',
  'client/src/components/ArtistRoster.tsx',
  'client/src/pages/ArtistPage.tsx',
  'tests/engine/mood-system-unit-tests.test.ts',
  'tests/engine/immediate-mood-effect.test.ts',
  'tests/helpers/test-factories.ts',
];

// Patterns to replace
const replacements = [
  {
    pattern: /\.isSigned\b/g,
    replacement: '.signed',
    description: 'Property access: .isSigned → .signed'
  },
  {
    pattern: /\bisSigned:/g,
    replacement: 'signed:',
    description: 'Object property: isSigned: → signed:'
  },
  {
    pattern: /isSigned\?:/g,
    replacement: 'signed?:',
    description: 'Optional property: isSigned?: → signed?:'
  },
  {
    pattern: /\.weeklyFee\b/g,
    replacement: '.weeklyCost',
    description: 'Property access: .weeklyFee → .weeklyCost'
  },
  {
    pattern: /\bweeklyFee:/g,
    replacement: 'weeklyCost:',
    description: 'Object property: weeklyFee: → weeklyCost:'
  },
  {
    pattern: /weeklyFee\?:/g,
    replacement: 'weeklyCost?:',
    description: 'Optional property: weeklyFee?: → weeklyCost?:'
  },
];

function updateFile(filePath: string): FileChange | null {
  const fullPath = path.join(rootDir, filePath);

  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  File not found: ${filePath}`);
    return null;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  const fileChanges: string[] = [];

  // Apply all replacements
  for (const { pattern, replacement, description } of replacements) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      content = content.replace(pattern, replacement);
      fileChanges.push(`  - ${description}: ${matches.length} replacement(s)`);
    }
  }

  if (content === originalContent) {
    return null; // No changes needed
  }

  // Write updated content
  fs.writeFileSync(fullPath, content, 'utf8');

  // Count occurrences
  const oldCount = (originalContent.match(/\b(isSigned|weeklyFee)\b/g) || []).length;
  const newCount = (content.match(/\b(isSigned|weeklyFee)\b/g) || []).length;

  return {
    file: filePath,
    oldCount,
    newCount,
    changes: fileChanges
  };
}

function main() {
  console.log('🚀 Migration 0021: Updating code references...\n');
  console.log('This script will replace:');
  console.log('  - isSigned → signed');
  console.log('  - weeklyFee → weeklyCost\n');

  let totalFiles = 0;
  let updatedFiles = 0;

  for (const file of filesToUpdate) {
    totalFiles++;
    const result = updateFile(file);

    if (result) {
      updatedFiles++;
      changes.push(result);
      console.log(`✅ ${result.file}`);
      result.changes.forEach(change => console.log(change));
      console.log(`   Old occurrences: ${result.oldCount} → New: ${result.newCount}\n`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary');
  console.log('='.repeat(60));
  console.log(`Total files checked: ${totalFiles}`);
  console.log(`Files updated: ${updatedFiles}`);
  console.log(`Files unchanged: ${totalFiles - updatedFiles}`);

  if (changes.length > 0) {
    console.log('\n✅ Code updates complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Review changes: git diff');
    console.log('2. Run type check: npm run check');
    console.log('3. Run tests: npm run test');
    console.log('4. Apply migration: psql $DATABASE_URL -f migrations/0021_align_artist_schema_with_game_types.sql');
    console.log('   OR: npm run db:push');
  } else {
    console.log('\n✨ No changes needed - all files already up to date!');
  }
}

// Run the script
try {
  main();
} catch (error) {
  console.error('❌ Error during migration:', error);
  process.exit(1);
}
