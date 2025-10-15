## PRD: Save/Load Data Integrity Remediation

### 1. Introduction / Overview
Music Label Manager’s save/load system currently loses critical data (emails, release-song mappings, executives, mood history) when saves are created, imported, or restored. This PRD defines the remediation work needed so every restored game mirrors the active session, allowing players and QA to continue seamlessly as if play never paused.

### 2. Goals
1. Ensure manual saves, autosaves, exports, and imports capture the full game state without omissions.
2. Guarantee overwrite and fork restores faithfully repopulate all dependent records.
3. Provide confidence through automated regression coverage and manual validation guidance.

### 3. User Stories
- **As a player**, I want a restored save to retain every email, release configuration, and executive so I can resume exactly where I left off.
- **As a QA tester**, I need deterministic imports/exports so I can reproduce production issues with identical state.
- **As a developer**, I need schema-verified snapshots and restore routines so future changes don’t silently corrupt saves.

### 4. Functional Requirements
1. **Email Snapshot Correctness**: Update client save/export flows to serialize only the email array (`emails`) while separately retaining total/unread metadata if needed. Schema validation must enforce the correct shape.
2. **Email Restore Completeness**: Restore logic must reinsert every saved email and reconcile unread counts. Validation should fail fast when payloads are malformed.
3. **Email Pagination Coverage**: Saving (manual, autosave, export) must request the full mailbox (paginate or request high limit) to avoid truncating older messages.
4. **Release-Song Mapping Preservation**: Snapshot payloads must include `release_songs` junction data; overwrite and fork restores must delete existing mappings and reinsert the saved associations in-order, preserving lead-single flags and track numbers.
5. **Executive Roster Persistence**: Serialize executives into the snapshot with their full state (loyalty, mood, level, salary). Although executives are the same five roles in every game, their attributes vary during gameplay and must be preserved for both overwrite and fork restores.
6. **Mood Event History**: Capture mood event records in snapshots and restore them so historical analyses and weekly summaries remain intact.
7. **Schema & Contract Updates**: Extend `gameSaveSnapshotSchema` (shared) to cover new collections, version metadata, and backward compatibility handling. Update server Zod parsing accordingly.
8. **Autosave Consistency**: Ensure autosave logic shares the same serialization improvements as manual saves, including full email pagination and new data sections.
9. **Regression Safeguards**: Add automated tests (unit/integration/E2E) that create saves with the affected entities, restore them in both overwrite and fork modes, and assert data parity. Include manual checklist updates in `MANUAL-TEST-GUIDE.md` if required by QA process.

### 5. Non-Goals (Out of Scope)
- Redesigning the Save Game modal UI or altering slot counts beyond what is necessary for data integrity.
- Introducing new gameplay systems or email categories unrelated to persistence.
- Modifying unrelated database tables or transport protocols beyond the save/load workflow.

### 6. Design Considerations (Optional)
- Preserve existing shadcn/ui patterns and notification styles (per `CLAUDE.md`), replacing blocking `alert()` calls with project-standard toasts where messaging changes are required.
- Keep snapshot schema changes transparent to the user; no new UI inputs are expected.

### 7. Technical Considerations (Optional)
- Follow `CLAUDE.md` guidance: maintain shared Zod contracts, avoid new dependencies, and respect monorepo architecture.
- Ensure database transactions keep the documented delete/insert order; add release-song and mood-event steps into the same transaction to maintain atomicity.
- Target fully implemented solutions; only introduce TODO/STUB annotations if a blocker is explicitly documented and approved.
- Coordinate with existing analytics or balance logic to confirm additional tables (e.g., mood events) can be reinserted without violating constraints.

### 8. Success Metrics
- Restoring any save created after this fix reproduces 100% of emails, release metadata, executives, and mood history (verified via automated parity checks).
- Manual regression scenario (“create save → advance weeks → restore → compare state”) passes without discrepancies.
- No new data-integrity bugs reported for save/load within one release cycle.

### Assumptions & References
- Implementation must align with the architecture, auth, and testing standards outlined in `/claude.md`.
- Any new manual testing steps should reference `MANUAL-TEST-GUIDE.md` for consistency.
- Legacy saves created before this fix are unsupported and may fail to load; players must create fresh saves after deployment.
- Current email volumes are within limits, so pagination can remain request-based without chunked streaming.
- No migration tooling is required; no detection, warnings, or backfills will be implemented for legacy saves.
