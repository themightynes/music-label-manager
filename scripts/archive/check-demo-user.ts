import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function checkDemoUser() {
  try {
    console.log('Connecting to database...');
    
    // Check all users
    const allUsers = await db.select().from(users);
    console.log(`\nTotal users in database: ${allUsers.length}`);
    
    // Check specifically for demo user
    const [demoUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, 'demo-user'));

    if (demoUser) {
      console.log('\n✅ Demo user found:');
      console.log('  ID:', demoUser.id);
      console.log('  Username:', demoUser.username);
      console.log('  Password hash:', demoUser.password);
      console.log('  Created at:', demoUser.createdAt);
      
      // Test password hash
      const testPassword = Buffer.from('demo-password').toString('base64');
      console.log('\nExpected password hash:', testPassword);
      console.log('Passwords match:', testPassword === demoUser.password);
    } else {
      console.log('\n❌ Demo user NOT found in database');
      console.log('All existing users:');
      allUsers.forEach(user => {
        console.log(`  - ${user.username} (${user.id})`);
      });
    }

  } catch (error) {
    console.error('Error checking demo user:', error);
  } finally {
    process.exit(0);
  }
}

checkDemoUser();