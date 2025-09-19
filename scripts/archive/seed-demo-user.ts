import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Simple password hashing (matching the auth.ts implementation)
function hashPassword(password: string): string {
  return Buffer.from(password).toString('base64');
}

async function seedDemoUser() {
  try {
    console.log('Checking for existing demo user...');
    
    // Check if demo user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, 'demo-user'));

    if (existingUser) {
      console.log('Demo user already exists:', existingUser.id);
      return;
    }

    // Create demo user
    console.log('Creating demo user...');
    const [demoUser] = await db
      .insert(users)
      .values({
        username: 'demo-user',
        password: hashPassword('demo-password')
      })
      .returning();

    console.log('Demo user created successfully!');
    console.log('Username: demo-user');
    console.log('Password: demo-password');
    console.log('User ID:', demoUser.id);

  } catch (error) {
    console.error('Error seeding demo user:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the seed function
seedDemoUser();