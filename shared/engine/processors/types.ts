/**
 * WeekContext — the shared dependency bundle passed to every engine processor.
 *
 * Phase 2 (engine seams) decomposes `GameEngine.advanceWeek` into a fixed-order
 * sequence of domain processors (AROfficeProcessor, ProgressionProcessor, ...).
 * Each processor receives a `WeekContext` instead of reaching into `GameEngine`
 * internals, so processors never construct their own dependencies and the call
 * sites in `advanceWeek` stay thin and uniform.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RNG INVARIANT (see phase-2-engine-seams-plan §6 "RNG stream order = behavior"):
 *   `getRandom` MUST be the GameEngine's own bound seeded function
 *   (`this.getRandom.bind(this)` — or an arrow closing over `this`). The whole
 *   game shares a SINGLE seeded RNG stream, and outcomes for a given seed depend
 *   on the exact ORDER of draws from it. Processors must therefore draw only
 *   through this `getRandom`, and the engine must call processors in the exact
 *   pipeline order. Never hand a processor a fresh/unseeded RNG — that would fork
 *   the stream and change behavior (and break the golden master).
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `gameState` and `summary` are the engine's live objects — processors mutate
 * them in place (flags, arOffice columns, summary.changes, summary.arOffice),
 * exactly as the pre-extraction methods did.
 */
import type { GameState } from '../../schema';
import type { WeekSummary } from '../../types/gameTypes';
import type { ServerGameData } from '../../../server/data/gameData';

export interface WeekContext {
  /** Live game state, mutated in place (flags, arOffice columns, money, etc.). */
  gameState: GameState;
  /** The week's accumulating summary; processors push changes / set sections. */
  summary: WeekSummary;
  /** Content + persistence-backed game data (getAllArtists, etc.). */
  gameData: ServerGameData;
  /** Storage interface for DB reads/writes. Optional, mirroring GameEngine. */
  storage: any;
  /**
   * The engine's single seeded RNG draw — `min + rng() * (max - min)`.
   * MUST be bound from GameEngine so the one seeded stream and its draw order
   * are preserved. See the RNG INVARIANT note above.
   */
  getRandom: (min: number, max: number) => number;
  /** Optional per-step DB transaction handle, threaded verbatim (D6). */
  dbTransaction?: any;
}
