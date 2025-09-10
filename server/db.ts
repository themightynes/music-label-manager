import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Railway PostgreSQL configuration
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return error after 10 seconds if connection cannot be acquired
  ssl: {
    rejectUnauthorized: false // Required for Railway's SSL certificates
  }
});

// Add error handler for the pool
pool.on('error', (err: any, client: any) => {
  console.error('[Database Pool Error]', err.message || err);
  console.error('Connection will be automatically recovered by the pool');
});

// Add connect event handler
pool.on('connect', (client: any) => {
  console.log('[Database] New connection established to pool');
});

// Add remove event handler for debugging
pool.on('remove', (client: any) => {
  console.log('[Database] Connection removed from pool');
});

export const db = drizzle(pool, { schema });

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