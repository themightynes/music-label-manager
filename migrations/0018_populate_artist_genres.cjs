// Migration script to populate genre field for existing artists
// based on artist names from artists.json

require('dotenv/config');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Artist name to genre mapping from artists.json
const artistGenreMap = {
  'Nova Sterling': 'Pop',
  'Mason Rivers': 'Folk',
  'Luna Vee': 'Electronic',
  'Diego Morales': 'Jazz',
  'Riley Thompson': 'Country',
  'Zara Chen': 'R&B'
};

async function migrateArtistGenres() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Get all artists without genres
    const result = await client.query(
      'SELECT id, name, genre FROM artists WHERE genre IS NULL OR genre = \'\''
    );

    console.log(`Found ${result.rows.length} artists without genres`);

    // Update each artist with their genre
    let updated = 0;
    for (const artist of result.rows) {
      const genre = artistGenreMap[artist.name];

      if (genre) {
        await client.query(
          'UPDATE artists SET genre = $1 WHERE id = $2',
          [genre, artist.id]
        );
        console.log(`✓ Updated "${artist.name}" -> ${genre}`);
        updated++;
      } else {
        console.log(`⚠ No genre mapping found for "${artist.name}"`);
      }
    }

    console.log(`\n✅ Migration complete! Updated ${updated} artists.`);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the migration
migrateArtistGenres();
