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
      <div className="border border-brand-burgundy/30 rounded-lg p-4 bg-brand-dark-card/40">
        <h3 className="text-sm font-semibold text-brand-burgundy mb-4 text-center">
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
                  "w-12 h-8 rounded text-[10px] font-medium transition-all duration-150 relative",
                  // Base styles - uniform plum burgundy theme
                  "border border-white/10 bg-brand-burgundy/10",
                  // Selection state
                  isSelected && "ring-2 ring-brand-burgundy/70 bg-brand-burgundy text-white font-bold z-10",
                  // Current week
                  isCurrent && !isSelected && "border-brand-burgundy/50 bg-brand-burgundy/20",
                  // Past weeks
                  isPast && "opacity-30 cursor-not-allowed bg-gray-600/20",
                  // Future weeks (clickable)
                  !isPast && !isSelected && "hover:bg-brand-burgundy/20 hover:border-brand-burgundy/40 hover:scale-110"
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
                    <TooltipContent className="bg-brand-dark-card border-brand-burgundy/30 text-white/90">
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
