#!/usr/bin/env node
/**
 * Color Refactoring Script
 * Replaces hex color values with Tailwind brand classes
 *
 * Usage: node scripts/replace-colors.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Color replacement mappings (in order of specificity - most specific first)
const replacements = [
  // Opacity variants (do these first!)
  { find: 'bg-[#A75A5B]/10', replace: 'bg-brand-burgundy/10' },
  { find: 'bg-[#A75A5B]/20', replace: 'bg-brand-burgundy/20' },
  { find: 'bg-[#2C222A]/10', replace: 'bg-brand-dark-card/10' },
  { find: 'bg-[#3c252d]/[0.66]', replace: 'bg-brand-dark-card/65' },
  { find: 'bg-[#3c252d]/20', replace: 'bg-brand-dark-card/20' },
  { find: 'bg-[#3c252d]/30', replace: 'bg-brand-dark-card/30' },
  { find: 'bg-[#4e324c]/20', replace: 'bg-brand-purple/20' },
  { find: 'bg-[#4e324c]/50', replace: 'bg-brand-purple/50' },
  { find: 'border-[#A75A5B]/30', replace: 'border-brand-burgundy/30' },
  { find: 'border-[#A75A5B]/40', replace: 'border-brand-burgundy/40' },
  { find: 'border-[#4e324c]/50', replace: 'border-brand-purple/50' },
  { find: 'border-[#4e324c]/80', replace: 'border-brand-purple/80' },
  { find: 'border-[#d99696]/30', replace: 'border-brand-rose/30' },
  { find: 'border-[#D99696]/30', replace: 'border-brand-rose/30' },

  // Hover states
  { find: 'hover:bg-[#4e324c]', replace: 'hover:bg-brand-purple' },
  { find: 'hover:bg-[#4E324C]', replace: 'hover:bg-brand-purple' },
  { find: 'hover:bg-[#8a4a4b]', replace: 'hover:bg-brand-burgundy' },
  { find: 'hover:bg-[#9B7B80]', replace: 'hover:bg-brand-mauve-light' },
  { find: 'hover:bg-[#A75A5B]', replace: 'hover:bg-brand-burgundy' },
  { find: 'hover:bg-[#B86B6C]', replace: 'hover:bg-brand-burgundy-light' },
  { find: 'hover:border-[#4e324c]', replace: 'hover:border-brand-purple' },
  { find: 'hover:border-[#65557c]', replace: 'hover:border-brand-purple-light' },
  { find: 'hover:border-[#A75A5B]', replace: 'hover:border-brand-burgundy' },
  { find: 'hover:text-[#A75A5B]', replace: 'hover:text-brand-burgundy' },

  // Focus states
  { find: 'focus:bg-[#A75A5B]', replace: 'focus:bg-brand-burgundy' },
  { find: 'focus:border-[#A75A5B]', replace: 'focus:border-brand-burgundy' },
  { find: 'focus:ring-[#A75A5B]', replace: 'focus:ring-brand-burgundy' },

  // Data states
  { find: 'data-[state=open]:bg-[#B86B6C]', replace: 'data-[state=open]:bg-brand-burgundy-light' },

  // Gradients
  { find: 'from-[#28131d]', replace: 'from-brand-dark-mid' },
  { find: 'from-[#A75A5B]', replace: 'from-brand-burgundy' },
  { find: 'to-[#120910]', replace: 'to-brand-dark' },
  { find: 'to-[#2C222A]', replace: 'to-brand-dark-card' },
  { find: 'to-[#8B4A6C]', replace: 'to-brand-burgundy' },
  { find: 'via-[#28131d]', replace: 'via-brand-dark-mid' },

  // Background colors
  { find: 'bg-[#120910]', replace: 'bg-brand-dark' },
  { find: 'bg-[#28131d]', replace: 'bg-brand-dark-mid' },
  { find: 'bg-[#2C222A]', replace: 'bg-brand-dark-card' },
  { find: 'bg-[#4e324c]', replace: 'bg-brand-purple' },
  { find: 'bg-[#4E324C]', replace: 'bg-brand-purple' },
  { find: 'bg-[#65557c]', replace: 'bg-brand-purple-light' },
  { find: 'bg-[#791014]', replace: 'bg-brand-burgundy-dark' },
  { find: 'bg-[#8B6B70]', replace: 'bg-brand-mauve' },
  { find: 'bg-[#9B7B80]', replace: 'bg-brand-mauve-light' },
  { find: 'bg-[#A75A5B]', replace: 'bg-brand-burgundy' },
  { find: 'bg-[#B86B6C]', replace: 'bg-brand-burgundy-light' },
  { find: 'bg-[#D99696]', replace: 'bg-brand-rose' },

  // Text colors
  { find: 'text-[#65557c]', replace: 'text-brand-purple-light' },
  { find: 'text-[#791014]', replace: 'text-brand-burgundy-dark' },
  { find: 'text-[#A75A5B]', replace: 'text-brand-burgundy' },
  { find: 'text-[#D4A373]', replace: 'text-brand-gold' },
  { find: 'text-[#D99696]', replace: 'text-brand-rose' },
  { find: 'text-[#F6B5B6]', replace: 'text-brand-pink' },

  // Border colors
  { find: 'border-[#4e324c]', replace: 'border-brand-purple' },
  { find: 'border-[#65557c]', replace: 'border-brand-purple-light' },
  { find: 'border-[#791014]', replace: 'border-brand-burgundy-dark' },
  { find: 'border-[#A75A5B]', replace: 'border-brand-burgundy' },
  { find: 'border-[#d99696]', replace: 'border-brand-rose' },
  { find: 'border-[#D99696]', replace: 'border-brand-rose' },

  // Ring colors
  { find: 'ring-[#A75A5B]', replace: 'ring-brand-burgundy' },
];

// Statistics
let stats = {
  filesProcessed: 0,
  filesModified: 0,
  totalReplacements: 0,
  replacementsByType: {}
};

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let fileReplacements = 0;

  replacements.forEach(({ find, replace }) => {
    const regex = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = (content.match(regex) || []).length;

    if (matches > 0) {
      content = content.replace(regex, replace);
      fileReplacements += matches;
      stats.totalReplacements += matches;

      // Track by type
      if (!stats.replacementsByType[replace]) {
        stats.replacementsByType[replace] = 0;
      }
      stats.replacementsByType[replace] += matches;
    }
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    stats.filesModified++;
    console.log(`✓ ${filePath}: ${fileReplacements} replacements`);
  }

  stats.filesProcessed++;
}

function main() {
  console.log('🎨 Starting color refactoring...\n');

  // Find all TSX/TS files in client/src
  const files = glob.sync('client/src/**/*.{ts,tsx}', {
    ignore: ['**/node_modules/**', '**/dist/**']
  });

  console.log(`Found ${files.length} files to process\n`);

  files.forEach(replaceInFile);

  console.log('\n✅ Color refactoring complete!\n');
  console.log('Statistics:');
  console.log(`  Files processed: ${stats.filesProcessed}`);
  console.log(`  Files modified: ${stats.filesModified}`);
  console.log(`  Total replacements: ${stats.totalReplacements}\n`);

  if (Object.keys(stats.replacementsByType).length > 0) {
    console.log('Replacements by color:');
    Object.entries(stats.replacementsByType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([color, count]) => {
        console.log(`  ${color}: ${count}`);
      });
  }
}

main();
