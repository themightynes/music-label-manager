import { formatNumber } from './utils';
import type { EmailTemplateProps } from './types';

export function NumberOneDebutEmail({ email }: EmailTemplateProps) {
  const body = email.body as Record<string, any>;

  return (
    <div className="space-y-4 text-sm text-white/85">
      <p className="text-white font-semibold text-lg">Historic #1 Debut!</p>
      <p>
        {body?.artistName ?? 'Your artist'} stormed the charts with "{body?.songTitle ?? 'the single'}",
        debuting at #1 this week. The industry will be talking about this for a long time.
      </p>

      <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-yellow-200/80">Debut Position</span>
          <span className="text-2xl font-bold text-yellow-200">#1</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-yellow-200/80">Projected Streams</span>
          <span className="text-xl font-semibold text-yellow-100">
            {formatNumber(body?.streams ?? body?.projectedStreams)}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/40 p-4 space-y-1">
        <div className="text-xs uppercase tracking-wide text-white/50">Momentum Signals</div>
        <ul className="list-disc list-inside space-y-1 text-white/80">
          <li>Massive social engagement across focus platforms</li>
          <li>Press already requesting interviews</li>
          <li>Playlist teams asking for expedited follow-up</li>
        </ul>
      </div>
    </div>
  );
}
