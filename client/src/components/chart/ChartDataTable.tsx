import * as React from 'react';

import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type SortDirection = 'asc' | 'desc';

export interface ChartColumn<TEntry> {
  id: string;
  header: (props: { direction: SortDirection | null; toggleSort: () => void }) => React.ReactNode;
  cell: (entry: TEntry) => React.ReactNode;
  sortable?: boolean;
  sortAccessor?: (entry: TEntry) => string | number | null | undefined;
  headerClassName?: string;
  cellClassName?: string;
}

interface SortState {
  columnId: string;
  direction: SortDirection;
}

interface ChartDataTableProps<TData> {
  columns: ChartColumn<TData>[];
  data: TData[];
  rowHighlight?: (row: TData) => boolean;
  emptyMessage?: string;
  className?: string;
  initialSort?: SortState;
  getRowKey?: (row: TData, index: number) => React.Key;
}

export function ChartDataTable<TData>({
  columns,
  data,
  rowHighlight,
  emptyMessage = 'No chart entries available.',
  className,
  initialSort,
  getRowKey
}: ChartDataTableProps<TData>) {
  const [sortState, setSortState] = React.useState<SortState | null>(initialSort ?? null);

  const sortedData = React.useMemo(() => {
    if (!sortState) {
      return data;
    }

    const column = columns.find(col => col.id === sortState.columnId);

    if (!column || !column.sortable || !column.sortAccessor) {
      return data;
    }

    const directionMultiplier = sortState.direction === 'asc' ? 1 : -1;

    return [...data].sort((a, b) => {
      const aValue = column.sortAccessor?.(a);
      const bValue = column.sortAccessor?.(b);

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * directionMultiplier;
      }

      const aString = (aValue ?? '').toString().toLowerCase();
      const bString = (bValue ?? '').toString().toLowerCase();

      return aString.localeCompare(bString) * directionMultiplier;
    });
  }, [columns, data, sortState]);

  const handleToggleSort = React.useCallback(
    (columnId: string) => {
      const column = columns.find(col => col.id === columnId);
      if (!column || !column.sortable) {
        return;
      }

      setSortState(prev => {
        if (!prev || prev.columnId !== columnId) {
          return { columnId, direction: 'asc' };
        }

        return {
          columnId,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      });
    },
    [columns]
  );

  return (
    <div className={cn('glass-panel chromatic-hairline rounded-card', className)}>
      <Table>
        <TableHeader className="bg-white/[0.02]">
          <TableRow className="border-white/[0.06] hover:bg-transparent">
            {columns.map(column => {
              const direction = sortState?.columnId === column.id ? sortState.direction : null;

              return (
                <TableHead
                  key={column.id}
                  className={cn(
                    'px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-label',
                    column.headerClassName
                  )}
                >
                  {column.header({
                    direction,
                    toggleSort: () => handleToggleSort(column.id)
                  })}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.length ? (
            sortedData.map((row, index) => {
              const rank = (row as { position?: number }).position;
              const isTopTen = typeof rank === 'number' && rank >= 1 && rank <= 10;

              return (
                <TableRow
                  key={getRowKey ? getRowKey(row, index) : index}
                  className={cn(
                    'border-white/[0.06] transition-colors',
                    rowHighlight?.(row)
                      ? 'bg-neon-lilac/10 hover:bg-neon-lilac/20'
                      : isTopTen
                        ? 'bg-neon-lilac/[0.04] hover:bg-white/[0.045]'
                        : 'hover:bg-white/[0.045]'
                  )}
                >
                  {columns.map(column => (
                    <TableCell
                      key={column.id}
                      className={cn('px-4 py-3 text-sm text-text-body', column.cellClassName)}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          ) : (
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-text-muted">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
