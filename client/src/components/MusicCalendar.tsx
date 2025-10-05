import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Music, Mic2, Clock } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';
import { getCompletedCities, getTourMetadata } from '@/utils/tourHelpers';

interface CalendarEvent {
  id: string;
  title: string;
  type: 'release' | 'tour' | 'recording';
  from: string;
  to: string;
  week: number;
  artistName?: string;
  releaseType?: string;
  status?: string;
}

interface MusicCalendarProps {
  className?: string;
  // Week selection mode props
  selectionMode?: boolean;
  selectedWeek?: number;
  onWeekSelect?: (week: number) => void;
  maxWeek?: number;
  minWeek?: number;
  // Simple week picker mode (grid only, no calendar)
  weekPickerMode?: boolean;
}

export function MusicCalendar({
  className,
  selectionMode = false,
  selectedWeek,
  onWeekSelect,
  maxWeek = 52,
  minWeek = 1,
  weekPickerMode = false
}: MusicCalendarProps) {
  const { gameState, releases, projects, artists } = useGameStore();

  // Fast lookup of artist names by ID
  const artistNameById = useMemo(() => {
    const map: Record<string, string> = {};
    (artists ?? []).forEach((a: any) => {
      if (a?.id) map[a.id] = a?.name ?? 'Unknown Artist';
    });
    return map;
  }, [artists]);

  // Calculate the start year from the game state or use current year
  const startYear = useMemo(() => {
    const foundedYear = (gameState as any)?.musicLabel?.foundedYear;
    return foundedYear || new Date().getFullYear();
  }, [gameState]);

  // Calculate all 7 days for the selected week (Sunday to Saturday)
  const getWeekDates = useCallback((weekNumber: number): Date[] => {
    if (!startYear) return [];
    // Start from Jan 1st of the start year
    const yearStart = new Date(startYear, 0, 1);

    // Find the first Sunday of the year
    const firstSunday = new Date(yearStart);
    const dayOfWeek = yearStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
    if (dayOfWeek !== 0) {
      firstSunday.setDate(yearStart.getDate() + (7 - dayOfWeek));
    }

    // Calculate the start of the selected week (weeks start on Sunday)
    const weekStartDate = new Date(firstSunday);
    weekStartDate.setDate(firstSunday.getDate() + (weekNumber - 1) * 7);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate);
      date.setDate(weekStartDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [startYear]);

  // Convert week numbers to actual dates (using Sunday-based weeks)
  const weekToDate = useCallback((weekNumber: number): Date => {
    if (!startYear) return new Date();
    // Use the same logic as getWeekDates but return the week ending date (Saturday)
    const weekDates = getWeekDates(weekNumber);
    return weekDates.length > 0 ? weekDates[6] : new Date(); // Return Saturday (end of week)
  }, [startYear, getWeekDates]);

  // Week picker mode helper functions
  const formatWeekLabel = useCallback((week: number) => {
    if (!startYear) return String(week);
    const weekDates = getWeekDates(week);
    if (weekDates.length === 0) return String(week);

    const date = weekDates[0]; // Sunday (start of week)
    const month = date.getMonth() + 1; // 1-12
    const dayOfMonth = date.getDate();
    const weekOfMonth = Math.floor((dayOfMonth - 1) / 7) + 1;
    return `M${month}W${weekOfMonth}`;
  }, [startYear, getWeekDates]);

  const getWeekEndingDate = useCallback((week: number) => {
    if (!startYear) return null;
    const weekDates = getWeekDates(week);
    if (weekDates.length === 0) return null;

    const weekEndDate = weekDates[6]; // Saturday (end of week)
    const month = String(weekEndDate.getMonth() + 1).padStart(2, '0');
    const day = String(weekEndDate.getDate()).padStart(2, '0');
    const year = String(weekEndDate.getFullYear()).slice(-2);

    return `${month}/${day}/${year}`;
  }, [startYear, getWeekDates]);

  // Get current game week and calculate the date for that week
  const currentGameWeek = gameState?.currentWeek || 1;
  const currentWeekDate = useMemo(() => weekToDate(currentGameWeek), [currentGameWeek, weekToDate]);

  const [internalSelectedWeek, setInternalSelectedWeek] = useState<number>(currentGameWeek);

  // Use external selectedWeek prop in selection mode, otherwise use internal state
  const activeSelectedWeek = selectionMode ? (selectedWeek || currentGameWeek) : internalSelectedWeek;

  // Derive all 7 dates for the active week (Sunday-Saturday)
  const selectedWeekDates = useMemo(() => getWeekDates(activeSelectedWeek), [activeSelectedWeek, getWeekDates]);

  // Update internal selected week when current week changes (only in display mode)
  useEffect(() => {
    if (!selectionMode) {
      setInternalSelectedWeek(currentGameWeek);
    }
  }, [currentGameWeek, selectionMode]);


  // Get events from game state
  const events = useMemo(() => {
    const calendarEvents: CalendarEvent[] = [];


    // Add ALL release events (planned, released, etc.)
    releases?.forEach((release: any) => {

      // Add lead single event if it exists and has a different release week
      // Lead single strategy is stored in metadata field by the backend
      const leadSingleStrategy = release.metadata?.leadSingleStrategy;

      // Only show lead single events for unreleased releases
      if (leadSingleStrategy && leadSingleStrategy.leadSingleReleaseWeek &&
          release.status !== 'released' && release.status !== 'catalog') {
        const leadSingleWeek = leadSingleStrategy.leadSingleReleaseWeek;
        const leadSingleDate = weekToDate(leadSingleWeek);

        // Find the lead single song title from the release data
        let leadSingleTitle = 'Lead Single';


        if (leadSingleStrategy.leadSingleId) {
          // Try to find the song in release.songs first
          if (release.songs && Array.isArray(release.songs)) {
            const leadSong = release.songs.find((song: any) => song.id === leadSingleStrategy.leadSingleId);
            if (leadSong && leadSong.title) {
              leadSingleTitle = leadSong.title;
            }
          }

          // Try to find in releaseSongs junction table data
          if (leadSingleTitle === 'Lead Single' && release.releaseSongs && Array.isArray(release.releaseSongs)) {
            const leadReleaseSong = release.releaseSongs.find((rs: any) => rs.songId === leadSingleStrategy.leadSingleId || rs.song?.id === leadSingleStrategy.leadSingleId);
            if (leadReleaseSong && leadReleaseSong.song && leadReleaseSong.song.title) {
              leadSingleTitle = leadReleaseSong.song.title;
            }
          }

          // If still not found, create a fallback title
          if (leadSingleTitle === 'Lead Single') {
          }
        }

        // Clean title format - artist name will appear in subtitle
        const displayTitle = leadSingleTitle === 'Lead Single'
          ? `🎵 ${release.title} (Lead Single)`
          : `🎵 ${leadSingleTitle} (Lead Single)`;

        // Get artist name for lead single
        const releaseArtistName = artistNameById[release.artistId] || 'Unknown Artist';

        calendarEvents.push({
          id: `lead-single-${release.id}`,
          title: displayTitle,
          type: 'release',
          from: leadSingleDate.toISOString(),
          to: leadSingleDate.toISOString(),
          week: leadSingleWeek,
          artistName: releaseArtistName,
          releaseType: 'single',
          status: release.status
        });
      } else {
      }

      // Add main release event (only for unreleased releases)
      if (release.releaseWeek && release.releaseWeek > 0 &&
          release.status !== 'released' && release.status !== 'catalog') {
        const releaseDate = weekToDate(release.releaseWeek);
        let eventTitle = release.title;

        // Add release type indicator
        if (release.type) {
          const typeMap: Record<string, string> = {
            'single': '🎵 Single',
            'ep': '💿 EP',
            'album': '💽 Album',
            'compilation': '📀 Compilation'
          };
          eventTitle = `${typeMap[release.type] || release.type} - ${release.title}`;
        }

        // Get artist name for main release
        const mainReleaseArtistName = artistNameById[release.artistId] || 'Unknown Artist';

        calendarEvents.push({
          id: `release-${release.id}`,
          title: eventTitle,
          type: 'release',
          from: releaseDate.toISOString(),
          to: releaseDate.toISOString(),
          week: release.releaseWeek,
          artistName: mainReleaseArtistName,
          releaseType: release.type,
          status: release.status
        });
      } else {
      }
    });

    // Add project due dates (recordings in progress)
    projects?.forEach((project: any) => {
      if (project.type === 'Mini-Tour') {
        // Tours don't have specific week scheduling like releases
        // They are processed during week advancement based on stage

        // Get artist name for all tour events
        const tourArtistName = artistNameById[project.artistId] || 'Unknown Artist';

        // For completed cities, show actual performance weeks if available
        const completedCities = getCompletedCities(project);
        if (completedCities.length > 0) {
          completedCities.forEach((city, index) => {
            if (city.week && city.week > 0) {
              const cityDate = weekToDate(city.week);
              const cityName = city.cityName || `City ${city.cityNumber || index + 1}`;

              calendarEvents.push({
                id: `tour-${project.id}-city-${city.cityNumber || index}`,
                title: `🎤 ${project.title} - ${cityName}`,
                type: 'tour',
                from: cityDate.toISOString(),
                to: cityDate.toISOString(),
                week: city.week,
                artistName: tourArtistName,
                status: 'completed'
              });
            }
          });
        }

        // For planning/active tours, show across multiple weeks based on city count
        if (project.stage === 'planning' || project.stage === 'production') {
          const currentWeek = gameState?.currentWeek || 1;
          const tourMetadata = getTourMetadata(project);
          const plannedCities = tourMetadata.cities || 1;
          const completedCitiesCount = getCompletedCities(project).length;

          // Tours ALWAYS have startWeek set during creation (see gameStore.createProject)
          // Tour timeline: startWeek = planning week, startWeek+1 = first city, etc.
          let startWeek = project.startWeek;

          if (!startWeek) {
            // Emergency fallback only - tours should always have startWeek
            startWeek = currentWeek;
          }

          // Artist name already set as tourArtistName above

          // Create calendar events for tour progression
          // Tour timeline: startWeek = planning, startWeek+1 = city 1, startWeek+2 = city 2, etc.

          if (project.stage === 'planning') {
            // Show planning week
            const planningDate = weekToDate(startWeek);
            calendarEvents.push({
              id: `tour-${project.id}-planning-${startWeek}`,
              title: `📅 ${project.title} (Planning)`,
              type: 'tour',
              from: planningDate.toISOString(),
              to: planningDate.toISOString(),
              week: startWeek,
              artistName: tourArtistName,
              status: 'planning'
            });

            // Show planned cities starting from startWeek + 1
            for (let i = 0; i < plannedCities; i++) {
              const weekNumber = startWeek + 1 + i; // Cities start after planning week
              const tourDate = weekToDate(weekNumber);
              const cityNumber = i + 1;

              calendarEvents.push({
                id: `tour-${project.id}-city-${cityNumber}-planned`,
                title: `📅 ${project.title} - City ${cityNumber} (Planned)`,
                type: 'tour',
                from: tourDate.toISOString(),
                to: tourDate.toISOString(),
                week: weekNumber,
                artistName: tourArtistName,
                status: 'planning'
              });
            }
          } else {
            // Production stage: show actual progression
            // Cities start from startWeek + 1 (after planning week)
            for (let i = 0; i < plannedCities; i++) {
              const weekNumber = startWeek + 1 + i; // Cities start after planning week
              const tourDate = weekToDate(weekNumber);
              const cityNumber = i + 1;

              let tourIcon, tourTitle;

              // For production tours, show which cities are completed vs upcoming
              if (i < completedCitiesCount) {
                tourIcon = '✅';
                tourTitle = `${project.title} - City ${cityNumber} (Completed)`;
              } else if (i === completedCitiesCount) {
                tourIcon = '🎤';
                tourTitle = `${project.title} - City ${cityNumber} (Current)`;
              } else {
                tourIcon = '⏳';
                tourTitle = `${project.title} - City ${cityNumber} (Upcoming)`;
              }

              calendarEvents.push({
                id: `tour-${project.id}-city-${cityNumber}-production`,
                title: `${tourIcon} ${tourTitle}`,
                type: 'tour',
                from: tourDate.toISOString(),
                to: tourDate.toISOString(),
                week: weekNumber,
                artistName: tourArtistName,
                status: project.stage
              });
            }
          }
        }
      } else if (project.type === 'Single' || project.type === 'EP') {
        // Handle recording projects (Singles and EPs)
        const artistName = artistNameById[project.artistId] || 'Unknown Artist';
        const projectStartWeek = project.startWeek;

        if (!projectStartWeek) {
          return; // Skip projects without proper timing data
        }

        if (project.stage === 'planning') {
          // Show planning week
          const planningDate = weekToDate(projectStartWeek);
          calendarEvents.push({
            id: `recording-${project.id}-planning`,
            title: `📋 ${project.title} (Planning)`,
            type: 'recording',
            from: planningDate.toISOString(),
            to: planningDate.toISOString(),
            week: projectStartWeek,
            artistName: artistName,
            status: 'planning'
          });
        } else if (project.stage === 'production') {
          // Show recording weeks (estimate 2-4 weeks based on typical recording flow)
          const recordingStartWeek = projectStartWeek + 1; // Recording starts after planning
          const maxRecordingWeeks = 4; // Maximum recording duration per game engine

          for (let i = 0; i < maxRecordingWeeks; i++) {
            const weekNumber = recordingStartWeek + i;
            const recordingDate = weekToDate(weekNumber);

            calendarEvents.push({
              id: `recording-${project.id}-recording-${i + 1}`,
              title: `🎤 ${project.title} (Recording)`,
              type: 'recording',
              from: recordingDate.toISOString(),
              to: recordingDate.toISOString(),
              week: weekNumber,
              artistName: artistName,
              status: 'production'
            });
          }
        } else if (project.stage === 'recorded') {
          // Show completed recording (optional - could skip if you don't want historical data)
          const completionWeek = project.metadata?.recordingCompletedWeek || projectStartWeek + 3;
          const completionDate = weekToDate(completionWeek);

          calendarEvents.push({
            id: `recording-${project.id}-completed`,
            title: `✅ ${project.title} (Completed)`,
            type: 'recording',
            from: completionDate.toISOString(),
            to: completionDate.toISOString(),
            week: completionWeek,
            artistName: artistName,
            status: 'completed'
          });
        }

      }
    });

    return calendarEvents;
  }, [releases, projects, weekToDate, artistNameById, gameState]);

  // Get events for selected week
  const eventsForSelectedWeek = useMemo(() => {
    return events.filter(event => event.week === activeSelectedWeek);
  }, [events, activeSelectedWeek]);

  const formatDateRange = (from: string, to: string) => {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (fromDate.toDateString() === toDate.toDateString()) {
      return fromDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }

    return `${fromDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })} - ${toDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })}`;
  };

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'release':
        return <Music className="h-3 w-3" />;
      case 'tour':
        return <Mic2 className="h-3 w-3" />;
      case 'recording':
        return <Clock className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  function WeekHeader({ week, dates }: { week: number; dates: Date[] }) {
    return (
      <div className="text-sm font-medium text-white">
        Week {week}
        {dates.length > 0 && (
          <span className="text-xs text-white/70 block">
            {dates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {dates[6]?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        )}
      </div>
    );
  }

  function EventList({ events }: { events: CalendarEvent[] }) {
    return (
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
        {events.length > 0 ? (
          events.map((event) => (
            <div
              key={event.id}
              className="bg-brand-purple/30 after:bg-brand-burgundy relative rounded-md p-2 pl-6 text-sm after:absolute after:inset-y-2 after:left-2 after:w-1 after:rounded-full"
            >
              <div className="font-medium text-white flex items-center gap-2">
                {getEventIcon(event.type)}
                {event.title}
              </div>
              <div className="text-white/50 text-xs">
                {formatDateRange(event.from, event.to)}
                {event.artistName && ` • ${event.artistName}`}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-white/50 flex-1 flex flex-col justify-center">
            <p className="text-sm">No events this week</p>
            <p className="text-xs">Plan releases and sessions</p>
          </div>
        )}
      </div>
    );
  }

  // Week picker mode renders a simple grid with events on the right
  if (weekPickerMode) {
    return (
      <TooltipProvider>
        <Card className={cn("py-4 bg-brand-dark-card border-brand-purple h-full", className)}>
          <CardContent className="px-4 h-full flex flex-col">
            <div className="flex gap-4 flex-1">
              {/* Week picker grid on the left */}
              <div className="flex-shrink-0">
                <div className="border border-brand-burgundy/30 rounded-lg p-4 bg-brand-dark-card/40">
                  <h3 className="text-sm font-semibold text-brand-burgundy mb-4 text-center">
                    Select Week
                  </h3>

                  {/* Week Grid - All weeks in rows */}
                  <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
                    {Array.from({ length: maxWeek - minWeek + 1 }, (_, i) => {
                      const week = minWeek + i;
                      const isPast = week <= currentGameWeek;
                      const isSelected = week === activeSelectedWeek;
                      const isCurrent = week === currentGameWeek;

                      const weekEndingDate = getWeekEndingDate(week);
                      const weekButton = (
                        <button
                          onClick={() => {
                            if (!isPast) {
                              if (selectionMode && onWeekSelect) {
                                onWeekSelect(week);
                              } else {
                                setInternalSelectedWeek(week);
                              }
                            }
                          }}
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

              {/* Events on the right */}
              <div className="flex-1 border-l border-brand-purple pl-4 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <WeekHeader week={activeSelectedWeek} dates={selectedWeekDates} />
                </div>

                <EventList events={eventsForSelectedWeek} />
              </div>
            </div>
          </CardContent>
        </Card>
      </TooltipProvider>
    );
  }

  return (
    <Card className={cn("py-4 bg-brand-dark-card border-brand-purple h-full", className)}>
      <CardContent className="px-4 h-full flex flex-col">
        <div className="flex gap-4 flex-1">
          {/* Calendar on the left */}
          <div className="flex-shrink-0">
            <Calendar
              mode="single"
              selected={undefined} // Don't select individual days, only highlight weeks
              defaultMonth={currentWeekDate} // Default to current game week's month
              onSelect={(clickedDate) => {
                // When a date is clicked, calculate which week it belongs to
                if (clickedDate) {

                  // Find which week this date belongs to by checking all weeks
                  for (let week = minWeek; week <= maxWeek; week++) {
                    const weekDates = getWeekDates(week);
                    const isInThisWeek = weekDates.some(date =>
                      date.toDateString() === clickedDate.toDateString()
                    );
                    if (isInThisWeek) {

                      if (selectionMode && onWeekSelect) {
                        // In selection mode, call the callback
                        onWeekSelect(week);
                      } else {
                        // In display mode, update internal state
                        setInternalSelectedWeek(week);
                      }
                      break;
                    }
                  }
                }
              }}
              className="bg-transparent p-0 [&_.rdp-day]:text-white/90 [&_.rdp-day_selected]:bg-brand-burgundy [&_.rdp-day_selected]:text-white [&_.rdp-day_today]:bg-brand-burgundy/20 [&_.rdp-day_today]:text-brand-burgundy [&_.rdp-caption]:text-white [&_.rdp-nav_button]:text-white/70 [&_.rdp-nav_button:hover]:text-white [&_.rdp-head_cell]:text-white/50"
              modifiers={{
                selected_week: selectedWeekDates,
              }}
              modifiersClassNames={{
                selected_week: 'bg-brand-burgundy/40 text-white border border-brand-burgundy/60'
              }}
              required
            />
          </div>

          {/* Events on the right (display mode) or Week info (selection mode) */}
          <div className="flex-1 border-l border-brand-purple pl-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <WeekHeader week={activeSelectedWeek} dates={selectedWeekDates} />
              {!selectionMode && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-white/70 hover:text-white hover:bg-brand-burgundy/20"
                  title="Add Event"
                >
                  <Plus className="h-4 w-4" />
                  <span className="sr-only">Add Event</span>
                </Button>
              )}
            </div>

            <EventList events={eventsForSelectedWeek} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}