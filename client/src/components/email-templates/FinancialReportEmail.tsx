import { formatCurrency } from './utils';
import type { EmailTemplateProps } from './types';

export function FinancialReportEmail({ email }: EmailTemplateProps) {
  const body = email.body as Record<string, any>;
  const expenseBreakdown = (body?.expenseBreakdown ?? {}) as Record<string, number>;

  return (
    <div className="space-y-4 text-sm text-white/85">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SummaryCard label="Revenue" value={formatCurrency(body?.revenue)} positive />
        <SummaryCard label="Expenses" value={formatCurrency(body?.expenses)} negative />
        <SummaryCard label="Net" value={formatCurrency((body?.revenue ?? 0) - (body?.expenses ?? 0))} />
        <SummaryCard label="Streams" value={(body?.streams ?? 0).toLocaleString()} />
      </div>

      {Object.keys(expenseBreakdown).length > 0 && (
        <div className="rounded-lg border border-white/10 bg-black/30">
          <div className="border-b border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-white/60">
            Expense Breakdown
          </div>
          <div className="divide-y divide-white/10">
            {Object.entries(expenseBreakdown).map(([category, value]) => (
              <div key={category} className="px-4 py-2 flex items-center justify-between text-sm">
                <span className="capitalize text-white/70">{category.replace(/([A-Z])/g, ' $1')}</span>
                <span className="text-white font-medium">{formatCurrency(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {typeof body?.financialBreakdown === 'string' && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-white/70 whitespace-pre-wrap text-xs">
          {body.financialBreakdown}
        </div>
      )}
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
    <div className={`rounded-lg border bg-black/40 p-4 ${positive ? 'border-green-500/40' : negative ? 'border-red-500/40' : 'border-white/10'}`}>
      <div className="text-xs uppercase tracking-wide text-white/60">{label}</div>
      <div className={`text-lg font-semibold ${positive ? 'text-green-300' : negative ? 'text-red-300' : 'text-white'}`}>{value}</div>
    </div>
  );
}
