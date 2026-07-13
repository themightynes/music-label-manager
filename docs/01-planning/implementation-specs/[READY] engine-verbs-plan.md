# [READY] Engine Verbs — Tier 1 + Tier 2 mechanism arc

> **Status:** READY — designer-authorized 2026-07-12 ("Execute ALL TIER 1 and TIER 2"), same session as the v3 content authoring. Root cause: 60% of the 98 authored v3 scenarios ship a compromised "honest version" because the 13-effect-key ceiling can't cash their fictions (Mac 87%, CEO 83%, escalations ~100% compromised; Pat 36%, side events 25%). Full analysis: three-agent Opus panel (demand census / stakes-impact ranking / feasibility+blast-radius), synthesized in this doc.
> **Related:** `[FUTURE] meeting-content-working-session-agenda.md` (the session this grew from), the v3 pool review surface (`/admin/mac-pool-review`, 7 pools), `v3-content-design-bible.md` §4 wishlist (scratchpad; content module in `client/src/admin/` is the canonical transcription).

## Design principles (bind all slices)

- **No new key without the tax paid**: `LIVE_EFFECT_KEYS` case in `ActionProcessor.applyEffects`, `EFFECT_CHANNEL_DESCRIPTIONS` entry (parity test enforces), data-lint update, doc-sync.
- **flags JSONB is the substrate** — additive keys need NO SNAPSHOT_VERSION bump (restore checks the version integer only). Nothing in this arc bumps the version; if a slice thinks it must, stop and escalate.
- **Isolated seeds only** (`seededRandom`/`seededRandomPick`) — never `ctx.getRandom`, or unrelated GM scenarios re-bless.
- **GM policy**: byte-identical where the slice adds unused capability; audited re-bless only where fixtures exercise it. Agents must NOT commit snapshot changes — orchestrator re-blesses serially.
- **All tunables are config knobs**; qualitative player copy; conditional-spread for any WeekSummary additions.

## Tier 1 slices

1. **M4 chained/scheduled events** — generalize `flags.pending_side_event` (written by `applyEscalation`/`checkForEvents`, resolved by `processPendingSideEventResolution`, game-engine.ts ~943–970/1476–1589): add `deferWeeks`/target-week scheduling + a `flags.scheduled_events[]` queue (earliest-first, max 1 lands per week, escalations keep priority). Verdict events = normal events with isolated-seed gamble choices. Demand: 7 scenarios + designer's 3AM-Demo note.
2. **M2 spawns_artist (prospect-pool MVP)** — new effect key injects a prospect descriptor into the EXISTING `flags.ar_office_discovered_artists` pool (AROfficeProcessor.ts ~204–220); the existing sign-from-discovery flow does the rest. Demand: 8 scenarios.
3. **M3 story flags** — WRITE: `story_flag` effect key → `flags.story[key]=true`. READ: `requires` can demand/exclude story flags (shares plumbing with M16). Demand: 7.
4. **M16 requires-gates** — thread cash + flags into `deriveRelevanceState` (meetingSelection.ts ~137–280; executives.ts route loads only artists/projects/releases/songs today); extend `requires` grammar with threshold objects (`{stat:'cash'|'week'|…, gte/lte}`) + per-artist-state tags. Zero GM risk (selection is route-side). Demand: 9 (CEO lane's rarity contract).
5. **M13 exec-mood targeting** — `executive_mood` today applies only via `processExecutiveActions` + `metadata.executiveId` (role meetings only; CEO returns null ~580–584; events drop the key). Add `target_executive: roleId | 'all'` resolver usable from CEO meetings + events. Unblocks CEO "The Counter-Offer" + 4 key-held CEO meetings + 3 escalation wounds. Demand: 8 (1 hard-blocked).
6. **M1a grant_song** — effect key grants a real recorded song via existing `ctx.gameData.createSong` (SongGenerationProcessor pattern), deterministic fields (no ctx.getRandom name draw). Demand path to Wall of Misses etc.

## Tier 2 slices

7. **M1b spawns_release** — engine-callable release creation (lift from `releasePlanningService.ts` ~328–370 or wrap `gameData.createRelease`+`createReleaseSong`), flowing into `processReleasedProjects`. L-size.
8. **M5 current-release promotion + M12 catalog_damage** — shared "locate a released song/release row" targeting; promotion adds clamped awareness to an OUT release (the economy is forward-only today); damage reduces awareness/future revenue. M–L.
9. **M6 project cancel** — `cancel_project` effect soft-cancels the active recording project (mirror the tour route's soft-cancel: `completionStatus:'cancelled'`, stage advance stops). Restart/delay explicitly deferred (fights the monotonic stage model).
10. **M9 physical_inventory + M11 revenue_stream_transfer (flags-ledger MVPs)** — inventory: a flags ledger (units, cost basis) with weekly sell-through vs. demand at the streaming/financial site; transfer: a flags ledger deducting a sold release's weekly revenue. NO new tables (avoids the one snapshot-bump risk in the census).
11. **M7 exec absence** — `set_exec_absence` key writes `flags.execAbsence[roleId]=untilWeek`; read in the route candidate filter + `resolveAutonomousExecMeetings` candidates (~727–729).
12. **M10 persistent label modifier (one)** — `distribution_efficiency` flags pool (bank/decay like pressMomentum, ActionProcessor ~1084–1090/1214–1229) read as a multiplier at the streaming-revenue site.
13. **M15 negative press flag** — `press_scrutiny_flag` banks a next-release liability (press_story_flag is positive-only).
14. **M12b escalation last-seen** — `flags.escalationHistory[roleId]` filters `pickEscalationEventId`'s pool (mirrors `flags.side_event_history`, game-engine ~1405/1418; TODO already in executiveDelegation.ts).

## Deferred (post-arc, logged)
M8 multi-version releases; M6 restart/delay; full inventory tables; M14 {artistName} threading through pending_side_event (ride on slice 1 if trivial, else defer); M17 new happening types; M18 mood prompt variants; M19 meeting cooldowns.

## Wave/merge plan
Parallel worktree agents, each merging `content/meeting-content-session` first. Merge order (orchestrator resolves ActionProcessor/game-engine switch conflicts): chained-events → flags-keys → tangible-catalog → exec-targeting → live-economy → gates-and-memory. No agent runs the full suite (shared-DB lesson); orchestrator runs serial double-run + GM audit at integration.

## Next phase (to discuss post-review)
Content integration wave: re-author the compromised v3 scenarios against the new verbs (upgrade specs become real effects), add the 4 new escalation events (router arrays already shipped), then the v3 JSON commit + round-4 playtest.
