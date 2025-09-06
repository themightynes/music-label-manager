import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enhanced pool configuration with reconnection and error handling
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return error after 10 seconds if connection cannot be acquired
});

// Add error handler for the pool
pool.on('error', (err, client) => {
  console.error('[Database Pool Error]', err.message || err);
  console.error('Connection will be automatically recovered by the pool');
});

// Add connect event handler
pool.on('connect', (client) => {
  console.log('[Database] New connection established to pool');
});

// Add remove event handler for debugging
pool.on('remove', (client) => {
  console.log('[Database] Connection removed from pool');
});

export const db = drizzle({ client: pool, schema });

// Helper function to test database connectivity
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    // Use a timeout to prevent hanging on connection issues
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 5000)
    );
    
    const connectionPromise = (async () => {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        return true;
      } finally {
        client.release();
      }
    })();
    
    await Promise.race([connectionPromise, timeoutPromise]);
    return true;
  } catch (error: any) {
    // Handle the specific Neon serverless error gracefully
    if (error.message && error.message.includes('Cannot set property message')) {
      console.error('[Database] Known Neon serverless connection issue - this is usually temporary');
      return false;
    }
    console.error('[Database] Connection test failed:', error?.message || error);
    return false;
  }
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('[Database] SIGTERM received, closing pool...');
  await pool.end();
});

process.on('SIGINT', async () => {
  console.log('[Database] SIGINT received, closing pool...');
  await pool.end();
  process.exit(0);
});
