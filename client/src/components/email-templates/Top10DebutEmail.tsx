import { formatNumber } from './utils';
import type { EmailTemplateProps } from './types';
import { EmailSignature } from './EmailSignature';

export function Top10DebutEmail({ email }: EmailTemplateProps) {
  const body = email.body as Record<string, any>;

  return (
    <div className="space-y-4 text-sm text-text-body">
      <div>
        <p className="text-text-primary font-semibold">Your marketing blitz is paying off.</p>
        <p>
          "{body?.songTitle ?? 'The single'}" debuted in the Top 10 with
          {' '}#{body?.position ?? '?'} on the national charts.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Debut Position" value={`#${body?.position ?? '?'}`} />
        <Stat label="Movement" value={formatMovement(body?.movement)} />
        <Stat label="Weeks on Chart" value={formatNumber(body?.weeksOnChart)} />
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-surface-inner/60 p-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-label">Artist</div>
        <div className="text-text-primary font-medium">{body?.artistName ?? 'Artist'}</div>
        {body?.peakPosition && (
          <div className="text-xs text-text-muted mt-1">
            Peak position to date: #{body.peakPosition}
          </div>
        )}
      </div>

      <EmailSignature sender={email.sender} senderRoleId={email.senderRoleId} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-surface-inner/50 p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-label">{label}</div>
      <div className="font-mono text-lg font-semibold text-text-primary mt-1">{value}</div>
    </div>
  );
}

function formatMovement(movement: number | null | undefined): string {
  if (typeof movement !== 'number') return '—';
  if (movement === 0) return 'Flat';
  const direction = movement > 0 ? '▲' : '▼';
  return `${direction} ${Math.abs(movement)} spots`;
}
