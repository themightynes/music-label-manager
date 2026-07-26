/**
 * Chart Utilities
 *
 * Shared utility functions for chart-related operations
 * Used by Song model and UI components for consistent chart data handling
 */

/**
 * Calculates chart movement between positions with proper null handling
 */
export function calculateChartMovement(
  currentPosition: number | null,
  previousPosition: number | null
): number {
  // If no current position, no movement
  if (currentPosition === null) {
    return 0;
  }

  // If no previous position, this is a new entry (debut)
  if (previousPosition === null) {
    return 0; // Debuts show no movement
  }

  // Calculate movement (lower number = higher position, so subtract reversed)
  return previousPosition - currentPosition; // Positive = moved up, negative = moved down
}

/**
 * Returns CSS color class for chart position badges
 */
// v2 note (Design System v2 §6): returns tinted-chip recipes (hue bg at low alpha +
// matching border + matching text) built from v2 tokens only, so badges read correctly
// on the dark glass surfaces. Pure string returns — this file stays server-safe.
export function getChartPositionColor(position: number | null): string {
  if (position === null) {
    return 'bg-surface-inner text-text-muted border border-white/[0.08]'; // Non-charting — subdued ghost chip
  }

  if (position >= 1 && position <= 10) {
    return 'bg-brand-gold/15 text-brand-gold border border-brand-gold/40'; // Gold tier (#1-10) — gold highlight
  }

  if (position >= 11 && position <= 40) {
    return 'bg-white/10 text-text-primary border border-white/20'; // Silver tier (#11-40) — elevated neutral
  }

  if (position >= 41 && position <= 100) {
    return 'bg-surface-inner text-text-body border border-white/10'; // Bronze tier (#41-100) — subdued
  }

  return 'bg-surface-inner text-text-muted border border-white/[0.08]'; // Outside chart
}

/**
 * Formats chart movement display with arrows and numbers
 */
export function formatChartMovement(movement: number): string {
  if (movement === 0) {
    return '—'; // No change
  }

  if (movement > 0) {
    return `↑${movement}`; // Moved up
  }

  return `↓${Math.abs(movement)}`; // Moved down
}

/**
 * Validates chart position values
 */
export function isValidChartPosition(position: number | null): boolean {
  if (position === null) {
    return true; // Null is valid (non-charting)
  }

  return Number.isInteger(position) && position >= 1 && position <= 100;
}

/**
 * Gets chart tier name for position
 */
export function getChartTier(position: number | null): string {
  if (position === null) {
    return 'Not Charting';
  }

  if (position >= 1 && position <= 10) {
    return 'Top 10';
  }

  if (position >= 11 && position <= 40) {
    return 'Top 40';
  }

  if (position >= 41 && position <= 100) {
    return 'Top 100';
  }

  return 'Bubbling Under';
}

/**
 * Formats chart position display
 */
export function formatChartPosition(position: number | null): string {
  if (position === null) {
    return 'NC'; // Not Charting
  }

  return `#${position}`;
}

/**
 * Gets movement arrow indicator
 */
export function getMovementArrow(movement: number): string {
  if (movement > 0) {
    return '↗️'; // Up arrow
  }

  if (movement < 0) {
    return '↘️'; // Down arrow
  }

  return '➡️'; // No change arrow
}

/**
 * Determines if movement is significant (>= 5 positions)
 */
export function isSignificantMovement(movement: number): boolean {
  return Math.abs(movement) >= 5;
}

/**
 * Gets movement color class for styling
 */
export function getMovementColor(movement: number): string {
  if (movement > 0) {
    return 'text-positive'; // Positive movement (up) — v2 mint
  }

  if (movement < 0) {
    return 'text-negative'; // Negative movement (down) — v2 pink
  }

  return 'text-text-muted'; // No movement
}

/**
 * Returns appropriate badge variant for chart positions
 */
export function getChartPositionBadgeVariant(position: number | null): string {
  if (position === null) {
    return 'secondary'; // Not charting
  }

  if (position >= 1 && position <= 10) {
    return 'default'; // Gold tier (#1-10) - use default for prominence
  }

  if (position >= 11 && position <= 40) {
    return 'secondary'; // Silver tier (#11-40)
  }

  if (position >= 41 && position <= 100) {
    return 'outline'; // Bronze tier (#41-100)
  }

  return 'secondary'; // Outside chart
}

/**
 * Formats weeks on chart display
 */
export function formatWeeksOnChart(weeks: number | null | undefined): string {
  if (!weeks || weeks <= 0) {
    return '';
  }

  if (weeks === 1) {
    return '1 week';
  }

  return `${weeks} weeks`;
}

/**
 * Gets chart position with ordinal formatting
 */
export function getChartPositionOrdinal(position: number | null): string {
  if (position === null) {
    return 'NC'; // Not Charting
  }

  const ordinalSuffix = (n: number): string => {
    const lastDigit = n % 10;
    const lastTwoDigits = n % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      return 'th';
    }

    switch (lastDigit) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  return `${position}${ordinalSuffix(position)}`;
}

/**
 * Determines if a player song should be highlighted in chart display
 */
export function isPlayerSongHighlight(isPlayerSong: boolean, position: number | null): boolean {
  return isPlayerSong && position !== null && position <= 100;
}

/**
 * Calculates chart exit risk based on movement trends
 */
export function getChartExitRisk(movement: number, weeksOnChart: number): 'low' | 'medium' | 'high' {
  // High risk: Falling more than 10 positions or been on charts for more than 20 weeks with negative movement
  if (movement < -10 || (weeksOnChart > 20 && movement < 0)) {
    return 'high';
  }

  // Medium risk: Falling 5-10 positions or long chart tenure with no growth
  if (movement < -5 || (weeksOnChart > 15 && movement <= 0)) {
    return 'medium';
  }

  // Low risk: Stable or growing
  return 'low';
}

/**
 * Gets risk color class for chart exit risk
 */
export function getChartExitRiskColor(risk: 'low' | 'medium' | 'high'): string {
  switch (risk) {
    case 'high': return 'text-negative';
    case 'medium': return 'text-warning';
    case 'low': return 'text-positive';
    default: return 'text-text-muted';
  }
}

/**
 * Gets background color class for chart exit risk indicators
 */
export function getChartExitRiskBgColor(risk: 'low' | 'medium' | 'high'): string {
  switch (risk) {
    case 'high': return 'bg-negative';
    case 'medium': return 'bg-warning';
    case 'low': return 'bg-positive';
    default: return 'bg-white/30';
  }
}

/**
 * Formats streaming numbers for display with appropriate suffixes
 */
export function formatStreamCount(streams: number): string {
  if (streams >= 1000000) {
    return `${(streams / 1000000).toFixed(1)}M`;
  }
  if (streams >= 1000) {
    return `${(streams / 1000).toFixed(0)}K`;
  }
  return streams.toLocaleString();
}

/**
 * Formats last week position display (handles null/undefined for debuts/non-charting)
 */
export function formatLastWeekPosition(position: number | null | undefined): string {
  if (position === null || position === undefined) {
    return '—'; // En dash for no previous position
  }
  return `#${position}`;
}