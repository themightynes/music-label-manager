import { gameDataLoader } from '../../shared/utils/dataLoader';

async function testDataLoader() {
  console.log('Testing data loader directly...\n');
  
  try {
    console.log('Loading balance data...');
    const balance = await gameDataLoader.loadBalanceData();
    console.log('✅ Balance loaded successfully');
    console.log('   Starting money:', balance.economy.starting_money);
    console.log('   Version:', balance.version);
  } catch (error) {
    console.log('❌ Failed to load balance data');
    console.log('   Error:', error.message);
    console.log('   Stack:', error.stack);
  }

  console.log('\n---\n');

  try {
    console.log('Loading all data...');
    const allData = await gameDataLoader.loadAllData();
    console.log('✅ All data loaded successfully');
    console.log('   Artists:', allData.artists?.artists?.length || 0);
    console.log('   Roles:', allData.roles?.roles?.length || 0);
    console.log('   Events:', allData.events?.events?.length || 0);
  } catch (error) {
    console.log('❌ Failed to load all data');
    console.log('   Error:', error.message);
    console.log('   Stack:', error.stack);
  }
}

testDataLoader();