import { serverGameData } from '../../shared/utils/dataLoader';

async function testRoleLookup() {
  console.log('\n=== Testing Role Lookup ===\n');
  
  try {
    await serverGameData.initialize();
    
    // Test looking up roles as the game engine does
    const testIds = [
      'head_ar',
      'cmo',
      'cco',
      'head_distribution',
      'ceo',
      'head_ar_mgr_priorities_studio_first'  // This is what targetId might be
    ];
    
    for (const id of testIds) {
      const role = await serverGameData.getRoleById(id);
      if (role) {
        console.log(`✅ Found role '${id}': ${role.name}`);
        console.log(`   Has ${role.meetings?.length || 0} meetings`);
      } else {
        console.log(`❌ Role '${id}' NOT FOUND`);
      }
    }
    
    // Check what role IDs actually exist
    console.log('\n📋 All available role IDs:');
    const allRoles = await serverGameData.getRoles();
    allRoles.forEach(role => {
      console.log(`  - ${role.id}: ${role.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testRoleLookup();