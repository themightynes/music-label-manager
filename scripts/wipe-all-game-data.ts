/**
 * Wipe All Game Data
 *
 * DESTRUCTIVE OPERATION: Deletes ALL games and related data from the database.
 * Use this to clean the database before applying CASCADE schema changes.
 *
 * This will DELETE:
 * - All game_states
 * - All artists, songs, projects, releases, emails, executives, etc.
 * - All game saves
 *
 * This will PRESERVE:
 * - User accounts
 * - Static data (dialogue_choices, game_events, etc.)
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function wipeAllGameData() {
  console.log('⚠️  DESTRUCTIVE OPERATION: Wiping all game data...\n');

  try {
    // Delete in dependency order (child tables first)

    console.log('Deleting chart_entries...');
    await db.execute(sql`DELETE FROM chart_entries`);

    console.log('Deleting release_songs...');
    await db.execute(sql`DELETE FROM release_songs`);

    console.log('Deleting weekly_actions...');
    await db.execute(sql`DELETE FROM weekly_actions`);

    console.log('Deleting mood_events...');
    await db.execute(sql`DELETE FROM mood_events`);

    console.log('Deleting emails...');
    await db.execute(sql`DELETE FROM emails`);

    console.log('Deleting executives...');
    await db.execute(sql`DELETE FROM executives`);

    console.log('Deleting music_labels...');
    await db.execute(sql`DELETE FROM music_labels`);

    console.log('Deleting releases...');
    await db.execute(sql`DELETE FROM releases`);

    console.log('Deleting songs...');
    await db.execute(sql`DELETE FROM songs`);

    console.log('Deleting projects...');
    await db.execute(sql`DELETE FROM projects`);

    console.log('Deleting roles...');
    await db.execute(sql`DELETE FROM roles`);

    console.log('Deleting artists...');
    await db.execute(sql`DELETE FROM artists`);

    console.log('Deleting game_saves...');
    await db.execute(sql`DELETE FROM game_saves`);

    console.log('Deleting game_states...');
    await db.execute(sql`DELETE FROM game_states`);

    console.log('\n✅ All game data wiped successfully!');
    console.log('✅ User accounts preserved');
    console.log('\n✅ You can now safely run: npm run db:push');

  } catch (error) {
    console.error('❌ Error during wipe:', error);
    throw error;
  } finally {
    await db.$client.end();
  }
}

// Run wipe
wipeAllGameData();
