import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getWeekDates as getWeekDatesForYear, formatWeekEndDate } from '@shared/utils/seasonalCalculations';

interface WeekPickerProps {
  selectedWeek: number;
  currentWeek: number;
  onWeekSelect: (week: number) => void;
  maxWeek?: number;
  minWeek?: number;
  className?: string;
  renderWeekTooltip?: (week: number) => React.ReactNode;
  renderSelectedInfo?: (week: number) => React.ReactNode;
  startYear?: number; // Optional real calendar start year to render month/week labels
}

export const WeekPicker = ({
  selectedWeek,
  currentWeek,
  onWeekSelect,
  maxWeek = 52,
  minWeek = 1,
  className,
  renderWeekTooltip,
  renderSelectedInfo,
  startYear
}: WeekPickerProps) => {
  // Sunday-based week calculation to match MusicCalendar
  const resolvedStartYear = startYear ?? new Date().getFullYear();

  const getWeekDates = (weekNumber: number): Date[] => {
    return getWeekDatesForYear(resolvedStartYear, weekNumber);
  };

  const formatWeekLabel = (week: number) => {
    const weekDates = getWeekDates(week);
    if (weekDates.length === 0) return String(week);

    const date = weekDates[0]; // Sunday (start of week)
    const month = date.getMonth() + 1; // 1-12
    const dayOfMonth = date.getDate();
    const weekOfMonth = Math.floor((dayOfMonth - 1) / 7) + 1;
    return `M${month}W${weekOfMonth}`;
  };

  const getWeekEndingDate = (week: number) => formatWeekEndDate(resolvedStartYear, week);
  return (
    <TooltipProvider>
      <div className={cn("space-y-4", className)}>
      {/* Optional Selected Week Info */}
      {renderSelectedInfo && renderSelectedInfo(selectedWeek)}

      {/* Pure 52-Week Grid */}
      <div className="border border-white/[0.08] rounded-[14px] p-4 bg-surface-inner/40">
        <h3 className="font-mono text-xs font-semibold text-text-accent uppercase tracking-[0.2em] mb-4 text-center">
          Select Week
        </h3>

        {/* Week Grid - All weeks in rows */}
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
          {Array.from({ length: maxWeek - minWeek + 1 }, (_, i) => {
            const week = minWeek + i;
            const isPast = week <= currentWeek;
            const isSelected = week === selectedWeek;
            const isCurrent = week === currentWeek;

            const weekEndingDate = getWeekEndingDate(week);
            const weekButton = (
              <button
                onClick={() => !isPast && onWeekSelect(week)}
                disabled={isPast}
                className={cn(
                  "w-12 h-8 rounded-chip font-mono text-[10px] font-medium transition-all duration-150 relative",
                  // Base styles - v2 glass chip
                  "border border-white/10 bg-neon-purple/10 text-text-body",
                  // Selection state
                  isSelected && "ring-2 ring-neon-purple/70 bg-[rgba(160,90,240,0.26)] border-neon-purple/55 text-text-primary font-bold z-10",
                  // Current week
                  isCurrent && !isSelected && "border-neon-purple/50 bg-neon-purple/20",
                  // Past weeks
                  isPast && "opacity-30 cursor-not-allowed bg-white/[0.02]",
                  // Future weeks (clickable)
                  !isPast && !isSelected && "hover:bg-neon-purple/20 hover:border-neon-purple/40 hover:scale-110"
                )}
              >
                {formatWeekLabel(week)}
                {/* Quarter boundary indicators */}
                {(week === 13 || week === 26 || week === 39) && (
                  <div className="absolute -right-0.5 top-0 bottom-0 w-0.5 bg-white/30" />
                )}
              </button>
            );

            // If tooltip renderer provided, wrap with tooltip
            if (renderWeekTooltip && !isPast) {
              return (
                <div key={week} className="relative">
                  {weekButton}
                  <div className="absolute inset-0 pointer-events-none">
                    {renderWeekTooltip(week)}
                  </div>
                </div>
              );
            }

            // Standard week ending tooltip for all non-past weeks
            if (!isPast && weekEndingDate) {
              return (
                <div key={week}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        {weekButton}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-surface-tooltip border-white/[0.12] text-text-primary">
                      <div className="text-xs">Week ending {weekEndingDate}</div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              );
            }

            return <div key={week}>{weekButton}</div>;
          })}
        </div>
      </div>
      </div>
    </TooltipProvider>
  );
};
