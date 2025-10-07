import { formatCurrency } from './utils';
import type { EmailTemplateProps } from './types';
import { EmailSignature } from './EmailSignature';

export function ReleaseEmail({ email }: EmailTemplateProps) {
  const body = email.body as Record<string, any>;
  const metadata = (body?.metadata ?? {}) as Record<string, any>;

  return (
    <div className="space-y-4 text-sm text-white/85">
      <p className="text-white font-semibold">Distribution update for your latest release.</p>
      <p>{body?.description ?? 'Your new release is live across all platforms.'}</p>

      <div className="rounded-lg border border-white/10 bg-black/30 p-4 space-y-2">
        <InfoRow label="Release Title" value={metadata?.projectTitle ?? metadata?.projectName ?? 'New Release'} />
        <InfoRow label="Primary Artist" value={metadata?.artistName ?? metadata?.artist ?? 'Signed Artist'} />
        <InfoRow label="Project ID" value={body?.projectId ?? metadata?.projectId ?? '—'} />
      </div>

      {typeof metadata?.initialStreams === 'number' && (
        <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-4">
          <div className="text-xs uppercase tracking-wide text-green-200/80">Launch Highlights</div>
          <div className="text-white text-lg font-semibold">
            {metadata.initialStreams.toLocaleString()} projected streams in the first 24 hours.
          </div>
        </div>
      )}

      {typeof metadata?.launchSpend === 'number' && (
        <div className="text-xs text-white/60">
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
      <span className="text-white/60">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}
