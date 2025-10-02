import { formatCurrency, formatNumber } from './utils';
import type { EmailTemplateProps } from './types';

export function ArtistSigningEmail({ email }: EmailTemplateProps) {
  const body = email.body as Record<string, any>;

  return (
    <div className="space-y-4 text-sm text-white/85">
      <div>
        <p className="text-white font-semibold">Congratulations! Your new artist is officially on the roster.</p>
        <p>The contracts have been signed and {body?.name ?? 'your new artist'} is ready to start creating.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Info label="Artist" value={body?.name ?? 'New Artist'} />
        <Info label="Archetype" value={body?.archetype ?? 'Unknown'} />
        <Info label="Genre" value={body?.genre ?? 'Open Format'} />
        <Info label="Talent" value={body?.talent ? `${formatNumber(body.talent)} / 100` : 'TBD'} />
      </div>

      <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-4 space-y-2">
        <div className="text-xs uppercase tracking-wide text-green-200/80">Contract Terms</div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Signing Bonus Paid</span>
          <span className="text-white font-semibold">{formatCurrency(body?.signingCost)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Weekly Salary</span>
          <span className="text-white font-semibold">
            {body?.weeklyCost != null ? formatCurrency(body.weeklyCost) : 'TBD'}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
        <p className="text-xs text-white/70">
          💡 <span className="font-semibold">Next Steps:</span> Head to the Recording Session or Plan Release to start working on {body?.name ?? 'their'} first project.
        </p>
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
