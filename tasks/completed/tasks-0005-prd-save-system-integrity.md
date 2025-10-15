## Relevant Files

- `client/src/store/gameStore.ts` - Client-side save/load orchestration and autosave handling that must serialize new snapshot data.
- `client/src/components/SaveGameModal.tsx` - UI entry point for manual save/load/export/import actions.
- `client/src/utils` & `client/src/lib/queryClient.ts` - Networking helpers used during save/export calls (pagination adjustments may be needed).
- `server/routes.ts` - Save/load REST endpoints, including restore transactions and autosave cleanup.
- `server/storage.ts` - Database persistence helpers invoked by the routes.
- `shared/schema.ts` - Shared Drizzle table definitions and `gameSaveSnapshotSchema` contract.
- `tests` directory (integration/E2E suites) - Regression coverage ensuring parity after restore.
- `MANUAL-TEST-GUIDE.md` - Manual QA checklist that may require updates once fixes land.

### Notes

- Follow project testing guidance from `/claude.md`; use Vitest for unit/integration tests and Playwright for E2E if needed.
- Aim for production-ready implementations; avoid introducing new TODO/STUB annotations unless absolutely unavoidable and pre-approved.

## Tasks

- [x] 1.0 Update snapshot serialization to capture complete email, release-song, executive, and mood-event data
- [x] 1.1 Audit current client snapshot payloads (manual save, autosave, export) to map included collections and identify missing data.
  - [x] 1.2 Implement email serialization fix: request full mailbox, store only the `emails` array, and persist unread/total metadata separately if needed.
  - [x] 1.3 Add release-song junction data, executive roster, and mood events to the snapshot payload, ensuring IDs align with server expectations.
  - [x] 1.4 Update client parsing and any dependent selectors/hooks to accommodate the expanded snapshot shape without regressions.

- [x] 2.0 Extend restore flows (overwrite & fork) to repopulate new collections atomically
  - [x] 2.1 Modify overwrite transaction to delete and reinsert collections atomically
    - [x] 2.1.1 Review `shared/schema.ts` to map all foreign key relationships for emails, executives, mood events, and release songs.
    - [x] 2.1.2 Document the dependency-safe deletion order in code comments (delete children before parents, respect FK constraints).
    - [x] 2.1.3 Implement deletion in transaction following the documented order (children first).
    - [x] 2.1.4 Insert collections in reverse order (parents first, children last) to satisfy constraints.
    - [x] 2.1.5 Add inline comments explaining the order of each delete/insert step.
      - FK summary:
        - `game_states` is the root for `music_labels`, `artists`, `roles`, `weekly_actions`, `emails`, `executives`, `mood_events`, `projects`, `releases`, and `songs` (all via `game_id`).
        - `artists` is referenced by `projects.artist_id`, `releases.artist_id`, `songs.artist_id`, and `mood_events.artist_id`.
        - `projects` can be referenced by `songs.project_id` (nullable).
        - `releases` is referenced by `songs.release_id` (nullable) and `release_songs.release_id`.
        - `songs` is referenced by `release_songs.song_id`, `emails.metadata -> songId` (non-FK), and chart data; FK constraints enforce delete cascades on `release_songs`.
        - `release_songs` is a pure junction requiring both release and song rows to exist before insert.
        - `emails`, `executives`, `weekly_actions`, and `music_labels` only depend on `game_states`.
  - [x] 2.2 Update fork mode to seed the new game with snapshot-provided executives, release songs, mood events, and emails while remapping IDs and preserving attributes.
  - [x] 2.3 Add validation/guardrails to fail fast if required collections are missing or malformed in incoming saves.

- [x] 3.0 Synchronize shared schemas/contracts and introduce snapshot versioning safeguards
  - [x] 3.1 Extend `gameSaveSnapshotSchema` and related TypeScript types to cover the new collections and snapshot metadata.
  - [x] 3.2 Introduce a snapshot version field and handling logic so future schema changes can be migrated safely.
  - [x] 3.3 Update server Zod parsing and Drizzle types to use the enhanced schema, ensuring client/server stay in sync.

- [x] 4.0 Align autosave/export logic with new snapshot coverage and pagination requirements
  - [x] 4.1 Ensure autosave triggers reuse the same serialization helpers introduced in Task 1.
  - [x] 4.2 Update export/import JSON flows to validate against the expanded schema and include newly serialized collections.
  - [x] 4.3 Replace any legacy `alert()` usage with project-standard toasts if user feedback changes are required.

- [x] 5.0 Add regression coverage and documentation updates validating end-to-end data integrity
  - [x] 5.1 Add automated tests (unit/integration/E2E) that create saves with emails, release songs, executives, and mood events, then restore and diff state.
  - [x] 5.2 Update `MANUAL-TEST-GUIDE.md` with revised save/load scenarios and add any necessary QA checklist items.
  - [x] 5.3 Document assumptions/limitations in code comments or release notes, avoiding new TODO/STUB markers whenever possible.
