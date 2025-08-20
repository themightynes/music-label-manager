#!/usr/bin/env npx tsx

/**
 * Migration Validation Test Runner
 * Runs comprehensive validation checks for single source of truth migration
 */

import { migrationValidator } from './migration-validator';

async function runValidationTest() {
  console.log('🚀 Starting Migration Validation Test...\n');
  
  try {
    // Test with a mock game ID - in real scenario this would be an active game
    const testGameId = 'test-validation-game';
    
    // Run comprehensive validation
    const result = await migrationValidator.runFullValidation(testGameId);
    
    // Generate and display report
    const report = migrationValidator.generateReport(result);
    console.log(report);
    
    // Determine if we can proceed with migration
    if (result.summary.canProceed) {
      console.log('\n🎉 VALIDATION SUCCESSFUL');
      console.log('✅ Safe to proceed with migration phases');
      return true;
    } else {
      console.log('\n❌ VALIDATION FAILED');
      console.log('🛑 Do not proceed with migration until issues are resolved');
      return false;
    }
    
  } catch (error) {
    console.error('\n💥 VALIDATION ERROR:', error);
    console.error('🛑 Cannot proceed with migration due to validation failure');
    return false;
  }
}

// Execute validation test
if (require.main === module) {
  runValidationTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

export { runValidationTest };