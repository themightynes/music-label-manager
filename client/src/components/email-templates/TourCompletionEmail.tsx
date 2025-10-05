import { formatCurrency, formatNumber } from './utils';
import type { EmailTemplateProps } from './types';

export function TourCompletionEmail({ email }: EmailTemplateProps) {
  const body = email.body as Record<string, any>;
  const metadata = (body?.metadata ?? {}) as Record<string, any>;

  return (
    <div className="space-y-4 text-sm text-white/80">
      <p className="text-white font-semibold">Tour recap from the road team.</p>
      <p>
        {body?.description ?? 'Your tour has wrapped for the week. Here is how the dates performed.'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-white/10 bg-black/40 p-4">
          <div className="text-white/60 text-xs uppercase tracking-wide">Gross Revenue</div>
          <div className="text-lg font-semibold text-green-300">{formatCurrency(body?.grossRevenue ?? body?.amount ?? metadata?.amount)}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/40 p-4">
          <div className="text-white/60 text-xs uppercase tracking-wide">Project</div>
          <div className="text-white font-medium">
            {metadata?.projectName ?? metadata?.projectId ?? body?.projectId ?? 'Tour'}
          </div>
        </div>
      </div>

      {Array.isArray(metadata?.cities) && metadata.cities.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-black/20">
          <div className="border-b border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/60">
            City Highlights
          </div>
          <div className="divide-y divide-white/10">
            {metadata.cities.map((city: any, index: number) => (
              <div key={city?.name ?? index} className="px-4 py-2 flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">{city?.name ?? 'Tour Stop'}</div>
                  <div className="text-white/60 text-xs">{city?.venue ?? 'Venue TBD'}</div>
                </div>
                <div className="text-white/80 font-semibold">{formatNumber(city?.attendance)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
