import 'dotenv/config';
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkCategories() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    const result = await client.query(`
      SELECT id, subject, category, week, created_at
      FROM emails
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('Recent emails:');
    console.table(result.rows);

    const categoryCount = await client.query(`
      SELECT category, COUNT(*) as count
      FROM emails
      GROUP BY category
      ORDER BY count DESC
    `);

    console.log('\nCategory counts:');
    console.table(categoryCount.rows);

  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkCategories();
