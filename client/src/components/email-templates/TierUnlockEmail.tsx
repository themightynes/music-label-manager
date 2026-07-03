import { formatCurrency } from './utils';
import type { EmailTemplateProps } from './types';
import { EmailSignature } from './EmailSignature';

export function TierUnlockEmail({ email }: EmailTemplateProps) {
  const body = email.body as Record<string, any>;
  const amount = typeof body?.amount === 'number' ? body.amount : null;

  return (
    <div className="space-y-4 text-sm text-text-body">
      <p className="text-text-primary font-semibold">New access unlocked for the label.</p>
      <p>{body?.description ?? 'You have unlocked a new strategic tier.'}</p>

      <div className="rounded-xl border border-neon-purple/40 bg-neon-purple/10 p-4 space-y-3">
        <Info label="Unlocked" value={deriveUnlockName(body?.description)} />
        {amount !== null && (
          <Info label="Immediate Value" value={formatCurrency(amount)} highlight />
        )}
      </div>

      <p className="text-xs text-text-muted">
        Keep momentum going by planning complementary actions while the market is excited.
      </p>

      <EmailSignature sender={email.sender} senderRoleId={email.senderRoleId} />
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
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-label">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'font-mono text-money' : 'text-text-primary'}`}>{value}</span>
    </div>
  );
}
