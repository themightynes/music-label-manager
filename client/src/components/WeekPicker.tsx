import { cn } from '@/lib/utils';

interface WeekPickerProps {
  selectedWeek: number;
  currentWeek: number;
  onWeekSelect: (week: number) => void;
  maxWeek?: number;
  minWeek?: number;
  className?: string;
  renderWeekTooltip?: (week: number) => React.ReactNode;
  renderSelectedInfo?: (week: number) => React.ReactNode;
}

export const WeekPicker = ({
  selectedWeek,
  currentWeek,
  onWeekSelect,
  maxWeek = 52,
  minWeek = 1,
  className,
  renderWeekTooltip,
  renderSelectedInfo
}: WeekPickerProps) => {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Optional Selected Week Info */}
      {renderSelectedInfo && renderSelectedInfo(selectedWeek)}

      {/* Pure 52-Week Grid */}
      <div className="border border-[#A75A5B]/30 rounded-lg p-4 bg-[#23121c]/40">
        <h3 className="text-sm font-semibold text-[#A75A5B] mb-4 text-center">
          Select Week
        </h3>

        {/* Week Grid - All weeks in rows */}
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
          {Array.from({ length: maxWeek - minWeek + 1 }, (_, i) => {
            const week = minWeek + i;
            const isPast = week <= currentWeek;
            const isSelected = week === selectedWeek;
            const isCurrent = week === currentWeek;

            const weekButton = (
              <button
                onClick={() => !isPast && onWeekSelect(week)}
                disabled={isPast}
                className={cn(
                  "w-8 h-8 rounded text-xs font-medium transition-all duration-150 relative",
                  // Base styles - uniform plum burgundy theme
                  "border border-white/10 bg-[#A75A5B]/10",
                  // Selection state
                  isSelected && "ring-2 ring-[#A75A5B]/70 bg-[#A75A5B] text-white font-bold z-10",
                  // Current week
                  isCurrent && !isSelected && "border-[#A75A5B]/50 bg-[#A75A5B]/20",
                  // Past weeks
                  isPast && "opacity-30 cursor-not-allowed bg-gray-600/20",
                  // Future weeks (clickable)
                  !isPast && !isSelected && "hover:bg-[#A75A5B]/20 hover:border-[#A75A5B]/40 hover:scale-110"
                )}
              >
                {week}
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

            return <div key={week}>{weekButton}</div>;
          })}
        </div>
      </div>
    </div>
  );
};