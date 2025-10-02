import { formatCurrency, formatNumber } from './utils';
import type { EmailTemplateProps } from './types';

export function ArtistDiscoveryEmail({ email }: EmailTemplateProps) {
  const body = email.body as Record<string, any>;

  return (
    <div className="space-y-4 text-sm text-white/85">
      <div>
        <p className="text-white font-semibold">Mac has a new talent recommendation.</p>
        <p>{body?.bio ?? 'This artist fits the A&R brief you set this week.'}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Info label="Artist" value={body?.name ?? 'New Artist'} />
        <Info label="Archetype" value={body?.archetype ?? 'Unknown'} />
        <Info label="Genre" value={body?.genre ?? 'Open Format'} />
        <Info label="Talent" value={body?.talent ? `${formatNumber(body.talent)} / 100` : 'Scouted'} />
      </div>

      <div className="rounded-lg border border-white/10 bg-black/30 p-4 space-y-2">
        <div className="text-xs uppercase tracking-wide text-white/60">Financials</div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Signing Bonus</span>
          <span className="text-white font-semibold">{formatCurrency(body?.signingCost)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Weekly Cost</span>
          <span className="text-white font-semibold">
            {body?.weeklyCost != null ? formatCurrency(body.weeklyCost) : 'TBD'}
          </span>
        </div>
        <div className="text-xs text-white/50">
          Scouted via {body?.sourcingType ?? 'A&R initiative'}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/40 p-4">
      <div className="text-xs uppercase tracking-wide text-white/60">{label}</div>
      <div className="text-white font-semibold">{value}</div>
    </div>
  );
}
