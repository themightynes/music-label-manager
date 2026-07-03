import { formatCurrency, formatNumber } from './utils';
import type { EmailTemplateProps } from './types';
import { EmailSignature } from './EmailSignature';

export function TourCompletionEmail({ email }: EmailTemplateProps) {
  const body = email.body as Record<string, any>;
  const metadata = (body?.metadata ?? {}) as Record<string, any>;

  return (
    <div className="space-y-4 text-sm text-text-body">
      <p className="text-text-primary font-semibold">Tour recap from the road team.</p>
      <p>
        {body?.description ?? 'Your tour has wrapped for the week. Here is how the dates performed.'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/[0.08] bg-surface-inner/50 p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-label">Gross Revenue</div>
          <div className="font-mono text-lg font-semibold text-money mt-1">{formatCurrency(body?.grossRevenue ?? body?.amount ?? metadata?.amount)}</div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-surface-inner/50 p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-label">Project</div>
          <div className="text-text-primary font-medium mt-1">
            {metadata?.projectName ?? metadata?.projectId ?? body?.projectId ?? 'Tour'}
          </div>
        </div>
      </div>

      {Array.isArray(metadata?.cities) && metadata.cities.length > 0 && (
        <div className="rounded-xl border border-white/[0.08] bg-surface-inner/40">
          <div className="border-b border-white/[0.08] px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-text-label">
            City Highlights
          </div>
          <div className="divide-y divide-white/[0.08]">
            {metadata.cities.map((city: any, index: number) => (
              <div key={city?.name ?? index} className="px-4 py-2 flex items-center justify-between">
                <div>
                  <div className="text-text-primary font-medium">{city?.name ?? 'Tour Stop'}</div>
                  <div className="text-text-muted text-xs">{city?.venue ?? 'Venue TBD'}</div>
                </div>
                <div className="font-mono text-text-body font-semibold">{formatNumber(city?.attendance)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <EmailSignature sender={email.sender} senderRoleId={email.senderRoleId} />
    </div>
  );
}
