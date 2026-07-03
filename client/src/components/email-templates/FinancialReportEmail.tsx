import { formatCurrency } from './utils';
import type { EmailTemplateProps } from './types';
import { EmailSignature } from './EmailSignature';

export function FinancialReportEmail({ email }: EmailTemplateProps) {
  const body = email.body as Record<string, any>;
  const expenseBreakdown = (body?.expenseBreakdown ?? {}) as Record<string, number>;

  return (
    <div className="space-y-4 text-sm text-text-body">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SummaryCard label="Revenue" value={formatCurrency(body?.revenue)} positive />
        <SummaryCard label="Expenses" value={formatCurrency(body?.expenses)} negative />
        <SummaryCard label="Net" value={formatCurrency((body?.revenue ?? 0) - (body?.expenses ?? 0))} />
        <SummaryCard label="Streams" value={(body?.streams ?? 0).toLocaleString()} />
      </div>

      {Object.keys(expenseBreakdown).length > 0 && (
        <div className="rounded-xl border border-white/[0.08] bg-surface-inner/60 overflow-hidden">
          <div className="border-b border-white/[0.08] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-label">
            Expense Breakdown
          </div>
          <div className="divide-y divide-white/[0.08]">
            {Object.entries(expenseBreakdown).map(([category, value]) => (
              <div key={category} className="px-4 py-2 flex items-center justify-between text-sm">
                <span className="capitalize text-text-muted">{category.replace(/([A-Z])/g, ' $1')}</span>
                <span className="font-mono font-medium text-money">{formatCurrency(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {typeof body?.financialBreakdown === 'string' && (
        <div className="rounded-xl border border-white/[0.08] bg-surface-inner/50 p-4 text-text-body whitespace-pre-wrap text-xs">
          {body.financialBreakdown}
        </div>
      )}

      <EmailSignature sender={email.sender} senderRoleId={email.senderRoleId} />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className={`rounded-xl border bg-surface-inner/60 p-4 ${positive ? 'border-positive/40' : negative ? 'border-negative/40' : 'border-white/[0.08]'}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-label">{label}</div>
      <div className={`font-mono text-lg font-semibold ${positive ? 'text-positive' : negative ? 'text-negative' : 'text-money'}`}>{value}</div>
    </div>
  );
}
