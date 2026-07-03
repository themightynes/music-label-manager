import { formatCurrency, formatNumber } from './utils';
import type { EmailTemplateProps } from './types';
import { EmailSignature } from './EmailSignature';

export function ArtistDiscoveryEmail({ email }: EmailTemplateProps) {
  const body = email.body as Record<string, any>;

  // Dynamic avatar function based on artist name
  const getAvatarUrl = (artistName: string) => {
    const filename = artistName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      + '_full.png';
    return `/avatars/${filename}`;
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.target as HTMLImageElement;
    if (img.src !== '/avatars/blank_full.png') {
      img.src = '/avatars/blank_full.png';
    }
  };

  return (
    <div className="space-y-4 text-sm text-text-body">
      <div>
        <p className="text-text-primary font-semibold">Mac has a new talent recommendation.</p>
        <p>{body?.bio ?? 'This artist fits the A&R brief you set this week.'}</p>
      </div>

      <div className="flex items-start gap-4">
        {/* Avatar Box */}
        <div className="flex-shrink-0 w-24 h-36 bg-surface-inner border border-white/[0.08] rounded-xl overflow-hidden relative">
          <img
            src={getAvatarUrl(body?.name ?? '')}
            alt={`${body?.name ?? 'Artist'} avatar`}
            className="absolute w-full object-cover"
            style={{
              height: '450px',
              top: '-14px',
              objectPosition: 'center top'
            }}
            onError={handleImageError}
          />
        </div>

        {/* Artist Info Grid */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Info label="Artist" value={body?.name ?? 'New Artist'} />
          <Info label="Archetype" value={body?.archetype ?? 'Unknown'} />
          <Info label="Genre" value={body?.genre ?? 'Open Format'} />
          <Info label="Talent" value={body?.talent ? `${formatNumber(body.talent)} / 100` : 'Scouted'} />
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-surface-inner/60 p-4 space-y-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-label">Financials</div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-muted">Signing Bonus</span>
          <span className="font-mono font-semibold text-money">{formatCurrency(body?.signingCost)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-muted">Weekly Cost</span>
          <span className="font-mono font-semibold text-money">
            {body?.weeklyCost != null ? formatCurrency(body.weeklyCost) : 'TBD'}
          </span>
        </div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-text-label">
          Scouted via {body?.sourcingType ?? 'A&R initiative'}
        </div>
      </div>

      <EmailSignature sender={email.sender} senderRoleId={email.senderRoleId} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-surface-inner/60 p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-label">{label}</div>
      <div className="text-text-primary font-semibold">{value}</div>
    </div>
  );
}
