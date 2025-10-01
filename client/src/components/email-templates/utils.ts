export function formatCurrency(value: number | null | undefined): string {
  const amount = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number | null | undefined): string {
  const amount = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  return new Intl.NumberFormat('en-US').format(amount);
}

export function formatPercentage(value: number | null | undefined): string {
  const amount = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  return `${amount.toFixed(1)}%`;
}
