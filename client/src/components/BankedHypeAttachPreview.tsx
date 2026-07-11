import React from 'react';
import { Sparkles } from 'lucide-react';
import {
  summarizeHypeAttachPreview,
  type HypeAttachPreview,
} from '@/lib/releaseBuzz';

/**
 * Hype-board UX arc, Task 1 — banked-hype attach preview on the release
 * planning page.
 *
 * The buzz-v2 arc attaches banked pools at PLAN time (the selected artist's
 * pool + the entire label pool drain onto the release the moment you confirm
 * — releasePlanningService, fork B "first-planned takes all"). Before this
 * component, the player only learned that AFTER confirming (the plan toast's
 * "Hype applied" line). This preview shows, BEFORE the confirm button, which
 * pool(s) will convert and a qualitative strength band.
 *
 * DISPLAY-ONLY: reads the same client-visible flag fields the dashboard chip
 * reads (flags.pendingAwarenessBoost + flags.hypeArtistPools) via the pure
 * summarizeHypeAttachPreview helper — no engine math re-derived, and the
 * server's returned hypeApplied remains the source of truth at confirm time.
 * Fork E standing rule: a point value ("+N Hype") is fine, NO multiplier
 * numbers anywhere.
 */
export function BankedHypeAttachPreview({
  flags,
  artistId,
  artistNameById = {},
}: {
  flags: Record<string, any> | undefined | null;
  artistId: string | null | undefined;
  artistNameById?: Record<string, string>;
}) {
  if (!artistId) return null;
  const preview: HypeAttachPreview = summarizeHypeAttachPreview(
    flags,
    artistId,
    artistNameById
  );
  if (preview.pools.length === 0) return null;

  const headline = preview.suppressed
    ? 'Banked buzz: suppressed — this hype works against the launch.'
    : preview.strength
      ? `Banked buzz: ${preview.strength} — converts into this release's launch.`
      : 'Banked buzz converts into this release’s launch.';

  return (
    <section
      data-testid="banked-hype-attach-preview"
      className="glass-panel chromatic-hairline p-4"
    >
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-neon-cyan" />
        <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-text-label">
          Banked Hype — attaches when you confirm
        </h3>
      </div>
      <ul className="space-y-1">
        {preview.pools.map((pool) => (
          <li
            key={pool.scope === 'label' ? 'label' : pool.artistId}
            data-testid="attach-preview-pool"
            className="flex items-baseline justify-between gap-3 text-[12px]"
          >
            <span className="text-text-body truncate">
              {pool.scope === 'label' ? 'Label pool' : `${pool.name}'s pool`}
            </span>
            <span
              className={`font-mono whitespace-nowrap ${pool.amount > 0 ? 'text-money' : 'text-negative'}`}
            >
              {pool.amount > 0 ? '+' : ''}
              {pool.amount} Hype
            </span>
          </li>
        ))}
      </ul>
      <p
        data-testid="attach-preview-headline"
        className={`mt-2 text-[11.5px] ${preview.suppressed ? 'text-negative' : 'text-neon-cyan'}`}
      >
        {headline}
      </p>
      <p className="mt-1 text-[10.5px] text-text-muted">
        Planning this release drains these pools into its starting Buzz — they
        stop fading and stop being available to other releases.
      </p>
    </section>
  );
}
