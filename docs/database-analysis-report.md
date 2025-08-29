# Database Schema Analysis Report

Generated: 2025-08-28T18:04:07.110Z

## Executive Summary

**Health Score: 67%** ❌

- **Critical Issues:** 0
- **Warnings:** 11
- **Information:** 0

## Database Overview

- **Total Tables in Database:** 13
- **Total Tables in Schema:** 13
- **Total Constraints:** 26
- **Total Indexes:** 31

## Critical Issues ✅

*No critical issues found*

## Warnings ⚠️


### MISSING INDEX

- **Table:** game_saves
- **Column:** user_id
- **Issue:** Foreign key 'user_id' in table 'game_saves' lacks an index
- **Recommendation:** CREATE INDEX idx_game_saves_user_id ON game_saves(user_id)


### MISSING INDEX

- **Table:** game_states
- **Column:** user_id
- **Issue:** Foreign key 'user_id' in table 'game_states' lacks an index
- **Recommendation:** CREATE INDEX idx_game_states_user_id ON game_states(user_id)


### MISSING INDEX

- **Table:** monthly_actions
- **Column:** game_id
- **Issue:** Foreign key 'game_id' in table 'monthly_actions' lacks an index
- **Recommendation:** CREATE INDEX idx_monthly_actions_game_id ON monthly_actions(game_id)


### MISSING INDEX

- **Table:** projects
- **Column:** artist_id
- **Issue:** Foreign key 'artist_id' in table 'projects' lacks an index
- **Recommendation:** CREATE INDEX idx_projects_artist_id ON projects(artist_id)


### MISSING INDEX

- **Table:** release_songs
- **Column:** release_id
- **Issue:** Foreign key 'release_id' in table 'release_songs' lacks an index
- **Recommendation:** CREATE INDEX idx_release_songs_release_id ON release_songs(release_id)


### MISSING INDEX

- **Table:** release_songs
- **Column:** song_id
- **Issue:** Foreign key 'song_id' in table 'release_songs' lacks an index
- **Recommendation:** CREATE INDEX idx_release_songs_song_id ON release_songs(song_id)


### MISSING INDEX

- **Table:** releases
- **Column:** artist_id
- **Issue:** Foreign key 'artist_id' in table 'releases' lacks an index
- **Recommendation:** CREATE INDEX idx_releases_artist_id ON releases(artist_id)


### MISSING INDEX

- **Table:** releases
- **Column:** game_id
- **Issue:** Foreign key 'game_id' in table 'releases' lacks an index
- **Recommendation:** CREATE INDEX idx_releases_game_id ON releases(game_id)


### MISSING INDEX

- **Table:** songs
- **Column:** artist_id
- **Issue:** Foreign key 'artist_id' in table 'songs' lacks an index
- **Recommendation:** CREATE INDEX idx_songs_artist_id ON songs(artist_id)


### MISSING INDEX

- **Table:** songs
- **Column:** game_id
- **Issue:** Foreign key 'game_id' in table 'songs' lacks an index
- **Recommendation:** CREATE INDEX idx_songs_game_id ON songs(game_id)


### MISSING INDEX

- **Table:** songs
- **Column:** release_id
- **Issue:** Foreign key 'release_id' in table 'songs' lacks an index
- **Recommendation:** CREATE INDEX idx_songs_release_id ON songs(release_id)


## Information ℹ️

*No additional information*

## Recommended Actions

2. **Performance Optimization:** Add missing indexes on foreign key columns

## Migration Script Template

```sql
-- Auto-generated migration suggestions
-- Review carefully before executing

CREATE INDEX idx_game_saves_user_id ON game_saves(user_id);
CREATE INDEX idx_game_states_user_id ON game_states(user_id);
CREATE INDEX idx_monthly_actions_game_id ON monthly_actions(game_id);
CREATE INDEX idx_projects_artist_id ON projects(artist_id);
CREATE INDEX idx_release_songs_release_id ON release_songs(release_id);
CREATE INDEX idx_release_songs_song_id ON release_songs(song_id);
CREATE INDEX idx_releases_artist_id ON releases(artist_id);
CREATE INDEX idx_releases_game_id ON releases(game_id);
CREATE INDEX idx_songs_artist_id ON songs(artist_id);
CREATE INDEX idx_songs_game_id ON songs(game_id);
CREATE INDEX idx_songs_release_id ON songs(release_id);
```

## Table Details


### artists

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO | NULL |
| archetype | text | NO | NULL |
| mood | integer | YES | 50 |
| loyalty | integer | YES | 50 |
| popularity | integer | YES | 0 |
| signed_month | integer | YES | NULL |
| is_signed | boolean | YES | false |
| game_id | uuid | YES | NULL |
| talent | integer | YES | 50 |
| work_ethic | integer | YES | 50 |
| stress | integer | YES | 0 |
| creativity | integer | YES | 50 |
| mass_appeal | integer | YES | 50 |
| last_attention_month | integer | YES | 1 |
| experience | integer | YES | 0 |
| monthly_fee | integer | YES | 1200 |
| mood_history | jsonb | YES | '[]'::jsonb |
| last_mood_event | text | YES | NULL |
| mood_trend | integer | YES | 0 |

**Constraints:**
- PRIMARY KEY: id -> artists.id

**Indexes:**
- artists_pkey on id (UNIQUE) (PRIMARY)
- idx_artists_game on is_signed  
- idx_artists_game on game_id  
- idx_artists_mood_analytics on mood_trend  
- idx_artists_mood_analytics on mood  
- idx_artists_mood_analytics on game_id  
- idx_artists_psychology on stress  
- idx_artists_psychology on creativity  
- idx_artists_psychology on mood  
- idx_artists_psychology on popularity  
- idx_artists_psychology on game_id  


### dialogue_choices

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| role_type | text | NO | NULL |
| scene_id | text | NO | NULL |
| choice_text | text | NO | NULL |
| immediate_effects | jsonb | YES | NULL |
| delayed_effects | jsonb | YES | NULL |
| requirements | jsonb | YES | NULL |

**Constraints:**
- PRIMARY KEY: id -> dialogue_choices.id

**Indexes:**
- dialogue_choices_pkey on id (UNIQUE) (PRIMARY)


### game_events

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| title | text | NO | NULL |
| description | text | NO | NULL |
| type | text | YES | 'side_story'::text |
| trigger_conditions | jsonb | YES | NULL |
| choices | jsonb | YES | NULL |
| one_time | boolean | YES | true |

**Constraints:**
- PRIMARY KEY: id -> game_events.id

**Indexes:**
- game_events_pkey on id (UNIQUE) (PRIMARY)


### game_saves

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | NULL |
| name | text | NO | NULL |
| game_state | jsonb | NO | NULL |
| month | integer | NO | NULL |
| is_autosave | boolean | YES | false |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

**Constraints:**
- FOREIGN KEY: user_id -> users.id
- PRIMARY KEY: id -> game_saves.id

**Indexes:**
- game_saves_pkey on id (UNIQUE) (PRIMARY)


### game_states

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | YES | NULL |
| current_month | integer | YES | 1 |
| money | integer | YES | 75000 |
| reputation | integer | YES | 0 |
| creative_capital | integer | YES | 0 |
| focus_slots | integer | YES | 3 |
| used_focus_slots | integer | YES | 0 |
| playlist_access | text | YES | 'None'::text |
| press_access | text | YES | 'None'::text |
| venue_access | text | YES | 'None'::text |
| campaign_type | text | YES | 'Balanced'::text |
| rng_seed | text | YES | NULL |
| flags | jsonb | YES | '{}'::jsonb |
| monthly_stats | jsonb | YES | '{}'::jsonb |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| campaign_completed | boolean | YES | false |

**Constraints:**
- FOREIGN KEY: user_id -> users.id
- PRIMARY KEY: id -> game_states.id

**Indexes:**
- game_states_pkey on id (UNIQUE) (PRIMARY)


### monthly_actions

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| game_id | uuid | YES | NULL |
| month | integer | NO | NULL |
| action_type | text | NO | NULL |
| target_id | uuid | YES | NULL |
| choice_id | uuid | YES | NULL |
| results | jsonb | YES | NULL |
| created_at | timestamp without time zone | YES | now() |

**Constraints:**
- FOREIGN KEY: game_id -> game_states.id
- PRIMARY KEY: id -> monthly_actions.id

**Indexes:**
- monthly_actions_pkey on id (UNIQUE) (PRIMARY)


### mood_events

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| artist_id | uuid | YES | NULL |
| game_id | uuid | YES | NULL |
| event_type | text | NO | NULL |
| mood_change | integer | NO | NULL |
| mood_before | integer | NO | NULL |
| mood_after | integer | NO | NULL |
| description | text | NO | NULL |
| month_occurred | integer | NO | NULL |
| metadata | jsonb | YES | '{}'::jsonb |
| created_at | timestamp without time zone | YES | now() |

**Constraints:**
- FOREIGN KEY: game_id -> game_states.id
- FOREIGN KEY: artist_id -> artists.id
- PRIMARY KEY: id -> mood_events.id

**Indexes:**
- idx_mood_events_artist_month on artist_id  
- idx_mood_events_artist_month on month_occurred  
- idx_mood_events_game_month on game_id  
- idx_mood_events_game_month on month_occurred  
- idx_mood_events_significant_changes on mood_change  
- idx_mood_events_significant_changes on artist_id  
- idx_mood_events_type on event_type  
- idx_mood_events_type on month_occurred  
- mood_events_pkey on id (UNIQUE) (PRIMARY)


### projects

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| title | text | NO | NULL |
| type | text | NO | NULL |
| artist_id | uuid | YES | NULL |
| stage | text | YES | 'planning'::text |
| quality | integer | YES | 0 |
| budget | integer | YES | 0 |
| budget_used | integer | YES | 0 |
| due_month | integer | YES | NULL |
| start_month | integer | YES | NULL |
| game_id | uuid | YES | NULL |
| metadata | jsonb | YES | NULL |
| song_count | integer | YES | 1 |
| songs_created | integer | YES | 0 |
| budget_per_song | integer | YES | 0 |
| producer_tier | text | YES | 'local'::text |
| time_investment | text | YES | 'standard'::text |
| total_cost | integer | YES | 0 |
| cost_used | integer | YES | 0 |

**Constraints:**
- FOREIGN KEY: artist_id -> artists.id
- PRIMARY KEY: id -> projects.id

**Indexes:**
- projects_pkey on id (UNIQUE) (PRIMARY)


### release_songs

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| release_id | uuid | NO | NULL |
| song_id | uuid | NO | NULL |
| track_number | integer | NO | NULL |
| is_single | boolean | YES | false |

**Constraints:**
- FOREIGN KEY: release_id -> releases.id
- FOREIGN KEY: song_id -> songs.id

**Indexes:**



### releases

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| title | text | NO | NULL |
| type | text | NO | NULL |
| artist_id | uuid | NO | NULL |
| game_id | uuid | NO | NULL |
| release_month | integer | YES | NULL |
| total_quality | integer | YES | 0 |
| marketing_budget | integer | YES | 0 |
| status | text | YES | 'planned'::text |
| revenue_generated | integer | YES | 0 |
| streams_generated | integer | YES | 0 |
| peak_chart_position | integer | YES | NULL |
| metadata | jsonb | YES | '{}'::jsonb |
| created_at | timestamp without time zone | YES | now() |

**Constraints:**
- FOREIGN KEY: artist_id -> artists.id
- FOREIGN KEY: game_id -> game_states.id
- PRIMARY KEY: id -> releases.id

**Indexes:**
- releases_pkey on id (UNIQUE) (PRIMARY)


### roles

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO | NULL |
| title | text | NO | NULL |
| type | text | NO | NULL |
| relationship | integer | YES | 50 |
| access_level | integer | YES | 0 |
| game_id | uuid | YES | NULL |

**Constraints:**
- PRIMARY KEY: id -> roles.id

**Indexes:**
- roles_pkey on id (UNIQUE) (PRIMARY)


### songs

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| title | text | NO | NULL |
| artist_id | uuid | NO | NULL |
| game_id | uuid | NO | NULL |
| quality | integer | NO | NULL |
| genre | text | YES | NULL |
| mood | text | YES | NULL |
| created_month | integer | YES | NULL |
| producer_tier | text | YES | 'local'::text |
| time_investment | text | YES | 'standard'::text |
| is_recorded | boolean | YES | false |
| is_released | boolean | YES | false |
| release_id | uuid | YES | NULL |
| metadata | jsonb | YES | '{}'::jsonb |
| created_at | timestamp without time zone | YES | now() |
| initial_streams | integer | YES | 0 |
| total_streams | integer | YES | 0 |
| total_revenue | integer | YES | 0 |
| monthly_streams | integer | YES | 0 |
| last_month_revenue | integer | YES | 0 |
| release_month | integer | YES | NULL |
| recorded_at | timestamp without time zone | YES | NULL |
| released_at | timestamp without time zone | YES | NULL |

**Constraints:**
- FOREIGN KEY: artist_id -> artists.id
- FOREIGN KEY: game_id -> game_states.id
- FOREIGN KEY: release_id -> releases.id
- PRIMARY KEY: id -> songs.id

**Indexes:**
- songs_pkey on id (UNIQUE) (PRIMARY)


### users

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| username | text | NO | NULL |
| password | text | NO | NULL |
| created_at | timestamp without time zone | YES | now() |

**Constraints:**
- PRIMARY KEY: id -> users.id
- UNIQUE: username -> users.username

**Indexes:**
- users_pkey on id (UNIQUE) (PRIMARY)
- users_username_unique on username (UNIQUE) 


## Next Steps

1. Review critical issues and apply necessary migrations
2. Consider implementing suggested indexes for performance
3. Update schema definitions to match database reality
4. Run validation tests after any changes
5. Document any intentional discrepancies

---

*This report was generated automatically by the Database Schema Analyzer*
