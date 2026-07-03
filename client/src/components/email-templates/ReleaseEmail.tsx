import { formatCurrency } from './utils';
import type { EmailTemplateProps } from './types';
import { EmailSignature } from './EmailSignature';

export function ReleaseEmail({ email }: EmailTemplateProps) {
  const body = email.body as Record<string, any>;
  const metadata = (body?.metadata ?? {}) as Record<string, any>;

  return (
    <div className="space-y-4 text-sm text-text-body">
      <p className="text-text-primary font-semibold">Distribution update for your latest release.</p>
      <p>{body?.description ?? 'Your new release is live across all platforms.'}</p>

      <div className="rounded-xl border border-white/[0.08] bg-surface-inner/60 p-4 space-y-2">
        <InfoRow label="Release Title" value={metadata?.projectTitle ?? metadata?.projectName ?? 'New Release'} />
        <InfoRow label="Primary Artist" value={metadata?.artistName ?? metadata?.artist ?? 'Signed Artist'} />
        <InfoRow label="Project ID" value={body?.projectId ?? metadata?.projectId ?? '—'} />
      </div>

      {typeof metadata?.initialStreams === 'number' && (
        <div className="rounded-xl border border-positive/40 bg-positive/10 p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-positive/80">Launch Highlights</div>
          <div className="text-text-primary text-lg font-semibold">
            {metadata.initialStreams.toLocaleString()} projected streams in the first 24 hours.
          </div>
        </div>
      )}

      {typeof metadata?.launchSpend === 'number' && (
        <div className="font-mono text-xs text-money">
          Launch marketing spend so far: {formatCurrency(metadata.launchSpend)}
        </div>
      )}

      <EmailSignature sender={email.sender} senderRoleId={email.senderRoleId} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="text-text-primary font-medium">{value}</span>
    </div>
  );
}
