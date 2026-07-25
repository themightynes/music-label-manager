/**
 * v3 pool content-review — generic entry types shared by all seven pool
 * modules (Mac, Sam, Dante, Pat, CEO, side events, escalations).
 *
 * The shape generalizes the original Mac module (v3MacPoolReview.ts):
 * - `bandPredictions` is a heading + verbatim lines (the exec pools carry
 *   loyal/committed/disloyal band math; the CEO/events/escalations pools have
 *   no bands and carry `designNotes` lines instead — LAPSE COST / WHY GATED /
 *   SHOCK LOGIC / CHAIN LOGIC).
 * - `upgradeSpecs` is an array (several CEO meetings carry more than one
 *   UPGRADE SPEC line).
 *
 * All authored text in the content modules is transcribed VERBATIM from the
 * scratchpad hand-off files — designer-facing copy under review; markdown
 * emphasis markers are dropped as formatting, the words/numbers/⚑ flags and
 * effect values are preserved exactly.
 */

export interface PoolReviewChoiceRow {
  id: string;
  label: string;
  gist: string;
  immediate: string;
  delayed: string;
  outcomeSummary: string;
}

export interface PoolReviewBandPredictions {
  /** Source heading, e.g. "Bands (target)" / "Band arithmetic (verify offline)". */
  heading: string;
  /** One verbatim line per band / flag / sub-bullet from the source. */
  lines: string[];
}

export interface PoolReviewEntry {
  id: string;
  title: string;
  /** Authoring status carried from the source file heading ('' if none). */
  status: string;
  /** True only for Wall of Misses — rendered as "FINALIZED (baseline)". */
  finalized: boolean;
  /** True when the authored content is missing from the hand-off. */
  contentPending: boolean;
  tier: string;
  gating: string;
  prompt: string;
  description: string;
  choices: PoolReviewChoiceRow[];
  bandPredictions: PoolReviewBandPredictions | null;
  /**
   * Pool-specific labeled lines rendered distinctly: LAPSE COST / WHY GATED
   * (CEO), SHOCK LOGIC (events), CHAIN LOGIC (escalations).
   */
  designNotes: string[];
  notes: string[];
  upgradeSpecs: string[];
  sourceFile: string;
}
