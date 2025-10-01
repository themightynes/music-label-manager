import { formatCurrency } from './utils';
import type { EmailTemplateProps } from './types';

export function TierUnlockEmail({ email }: EmailTemplateProps) {
  const body = email.body as Record<string, any>;
  const amount = typeof body?.amount === 'number' ? body.amount : null;

  return (
    <div className="space-y-4 text-sm text-white/85">
      <p className="text-white font-semibold">New access unlocked for the label.</p>
      <p>{body?.description ?? 'You have unlocked a new strategic tier.'}</p>

      <div className="rounded-lg border border-purple-500/40 bg-purple-500/10 p-4 space-y-3">
        <Info label="Unlocked" value={deriveUnlockName(body?.description)} />
        {amount !== null && (
          <Info label="Immediate Value" value={formatCurrency(amount)} highlight />
        )}
      </div>

      <p className="text-xs text-white/60">
        Keep momentum going by planning complementary actions while the market is excited.
      </p>
    </div>
  );
}

function deriveUnlockName(description: string | undefined): string {
  if (!description) return 'Access Tier';
  if (description.toLowerCase().includes('playlist')) return 'Playlist Access';
  if (description.toLowerCase().includes('press')) return 'Press Access';
  if (description.toLowerCase().includes('venue')) return 'Venue Access';
  if (description.toLowerCase().includes('producer')) return 'Producer Network';
  if (description.toLowerCase().includes('focus slot')) return 'Additional Focus Slot';
  return description;
}

function Info({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/60 text-xs uppercase tracking-wide">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-purple-100' : 'text-white'}`}>{value}</span>
    </div>
  );
}
