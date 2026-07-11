/**
 * Mandatory Side Events ("Crisis on the Desk") — the crisis card.
 *
 * Rendered in the action-selection UI (SelectionSummary) when a side event is
 * pending. It occupies ONE focus slot and is MANDATORY: no dismiss control. The
 * player must pick how to handle it before the week can advance.
 *
 * Deliberately distinct from executive meeting cards — this is the world landing
 * on the player's desk, not an exec's agenda: urgent in-world copy, a
 * negative/magenta alert palette, an alert glyph. v2 tokens throughout.
 */
import { AlertTriangle, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/store/gameStore';
import { ChoiceEffects } from './executive-meetings/DialogueInterface';
import type { SideEventCategory } from '@shared/types/gameTypes';
import type { PendingCrisis } from '@/hooks/useCrisisSideEvent';

const CATEGORY_LABEL: Record<SideEventCategory, string> = {
  sync_licensing: 'Sync Licensing',
  copyright_issues: 'Copyright Issue',
  platform_opportunities: 'Platform Opportunity',
  industry_drama: 'Industry Drama',
  technical_problems: 'Technical Problem',
  business_opportunities: 'Business Opportunity',
  artist_personal: 'Artist Moment',
};

interface CrisisSideEventCardProps {
  crisis: PendingCrisis;
  chosenChoiceId: string | null;
  /** Position label for the occupied focus slot (e.g. the slot number). */
  slotNumber?: number;
}

export function CrisisSideEventCard({ crisis, chosenChoiceId, slotNumber }: CrisisSideEventCardProps) {
  const setSideEventChoice = useGameStore((s) => s.setSideEventChoice);
  const choices = crisis.choices ?? [];
  const categoryLabel = crisis.category ? CATEGORY_LABEL[crisis.category] : 'Crisis';

  return (
    <div className="relative overflow-hidden rounded-card border border-negative/40 bg-gradient-to-br from-negative/[0.10] to-neon-magenta/[0.06] p-4">
      {/* urgent hairline */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-negative/70 to-transparent"
        aria-hidden
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {slotNumber != null && (
            <div className="flex h-8 w-8 items-center justify-center rounded-button bg-gradient-to-br from-negative to-neon-magenta font-mono text-sm font-bold text-white">
              {slotNumber}
            </div>
          )}
          <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-negative">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            On Your Desk
          </span>
        </div>
        <Badge variant="outline" className="rounded-pill border-negative/40 font-mono text-[10px] text-negative">
          {categoryLabel}
        </Badge>
      </div>

      <p className="mt-3 text-sm font-medium text-white/90">
        {crisis.prompt ? `Landed on your desk: ${crisis.prompt}` : 'A crisis has landed on your desk.'}
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
        Handling this takes the whole week — it costs one focus slot. Choose before you advance.
      </p>

      <div className="mt-3 space-y-2">
        {choices.map((choice) => {
          const isChosen = chosenChoiceId === choice.id;
          return (
            <div
              key={choice.id}
              className={`rounded-[12px] border p-3 transition-all ${
                isChosen
                  ? 'border-positive/40 bg-positive/[0.07]'
                  : 'border-white/10 bg-surface-inner/40'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-white/90">{choice.label}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSideEventChoice(crisis.eventId, choice.id)}
                  className={
                    isChosen
                      ? 'shrink-0 border-positive/50 text-positive hover:bg-positive/10'
                      : 'shrink-0 border-negative/40 text-negative hover:bg-negative/10'
                  }
                >
                  {isChosen ? (
                    <>
                      <Check className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      Chosen
                    </>
                  ) : (
                    'Choose'
                  )}
                </Button>
              </div>
              <ChoiceEffects choice={choice} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
