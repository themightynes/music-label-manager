import { formatNumber } from './utils';
import type { EmailTemplateProps } from './types';
import { EmailSignature } from './EmailSignature';

export function NumberOneDebutEmail({ email }: EmailTemplateProps) {
  const body = email.body as Record<string, any>;

  return (
    <div className="space-y-4 text-sm text-text-body">
      <p className="text-text-primary font-semibold text-lg">Historic #1 Debut!</p>
      <p>
        {body?.artistName ?? 'Your artist'} stormed the charts with "{body?.songTitle ?? 'the single'}",
        debuting at #1 this week. The industry will be talking about this for a long time.
      </p>

      <div className="rounded-xl border border-neon-amber/40 bg-neon-amber/10 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon-amber/80">Debut Position</span>
          <span className="font-mono text-2xl font-bold text-neon-amber">#1</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon-amber/80">Projected Streams</span>
          <span className="font-mono text-xl font-semibold text-neon-amber">
            {formatNumber(body?.streams ?? body?.projectedStreams)}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-surface-inner/60 p-4 space-y-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-label">Momentum Signals</div>
        <ul className="list-disc list-inside space-y-1 text-text-body">
          <li>Massive social engagement across focus platforms</li>
          <li>Press already requesting interviews</li>
          <li>Playlist teams asking for expedited follow-up</li>
        </ul>
      </div>

      <EmailSignature sender={email.sender} senderRoleId={email.senderRoleId} />
    </div>
  );
}
