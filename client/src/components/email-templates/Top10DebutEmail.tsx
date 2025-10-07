import { formatNumber } from './utils';
import type { EmailTemplateProps } from './types';
import { EmailSignature } from './EmailSignature';

export function Top10DebutEmail({ email }: EmailTemplateProps) {
  const body = email.body as Record<string, any>;

  return (
    <div className="space-y-4 text-sm text-white/80">
      <div>
        <p className="text-white font-semibold">Your marketing blitz is paying off.</p>
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

      <div className="rounded-lg border border-white/10 bg-black/30 p-4">
        <div className="text-xs uppercase tracking-wide text-white/50">Artist</div>
        <div className="text-white font-medium">{body?.artistName ?? 'Artist'}</div>
        {body?.peakPosition && (
          <div className="text-xs text-white/60 mt-1">
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
    <div className="rounded-lg border border-white/10 bg-black/40 p-4">
      <div className="text-white/60 text-xs uppercase tracking-wide">{label}</div>
      <div className="text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function formatMovement(movement: number | null | undefined): string {
  if (typeof movement !== 'number') return '—';
  if (movement === 0) return 'Flat';
  const direction = movement > 0 ? '▲' : '▼';
  return `${direction} ${Math.abs(movement)} spots`;
}
