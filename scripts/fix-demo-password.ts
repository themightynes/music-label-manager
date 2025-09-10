import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Simple password hashing (matching the auth.ts implementation)
function hashPassword(password: string): string {
  return Buffer.from(password).toString('base64');
}

async function fixDemoPassword() {
  try {
    console.log('Fixing demo user password...');
    
    // Update demo user password with proper hash
    const hashedPassword = hashPassword('demo-password');
    console.log('New password hash:', hashedPassword);
    
    const result = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.username, 'demo-user'))
      .returning();

    if (result.length > 0) {
      console.log('✅ Demo user password updated successfully!');
      console.log('Username: demo-user');
      console.log('Password: demo-password');
      console.log('User ID:', result[0].id);
    } else {
      console.log('❌ Demo user not found');
    }

  } catch (error) {
    console.error('Error fixing demo password:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

fixDemoPassword();