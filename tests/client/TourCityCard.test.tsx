/**
 * Tour-tier1 slice 2: tour city card + change categorization.
 *
 * Pure-module tests (house preference — no full WeekSummary mount): the
 * bucket routing lives in categorizeWeekChanges and the card is its own
 * component, so both are exercised directly with fixture GameChange entries
 * shaped like slice 1's TourProcessor output.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  categorizeWeekChanges,
  findTourCompletion,
} from '@/components/week-summary/categorizeChanges';
import { TourCityCard, formatTourReaction } from '@/components/week-summary/TourCityCard';
import type { GameChange } from '@shared/types/gameTypes';

// Fixture mirroring TourProcessor's per-city tour_performance change entry.
const TOUR_CITY: GameChange = {
  type: 'revenue',
  source: 'tour_performance',
  description: 'Neon Skyline Tour - City 2 performance: strong turnout at the Regency',
  amount: 38500,
  venue: 'The Regency',
  attendanceRate: 80,
  ticketsSold: 1200,
  capacity: 1500,
  cityNumber: 2,
  citiesTotal: 3,
  costs: 21000,
  netProfit: 17500,
  artistId: 'artist-1',
  artistName: 'Aurora',
  moodChange: 8,
  popularityChange: 1,
  projectId: 'proj-tour-1',
};

const TOUR_COMPLETE: GameChange = {
  type: 'project_complete',
  description: 'Neon Skyline Tour completed',
  projectId: 'proj-tour-1',
  grossRevenue: 110000,
  totalCosts: 63000,
  netProfit: 47000,
};

const TOUR_PLANNING: GameChange = {
  type: 'tour_planning',
  description: '🎤 Neon Skyline Tour hits the road next week — 3 cities booked at The Regency',
  projectId: 'proj-tour-1',
};

describe('categorizeWeekChanges (tour routing)', () => {
  it('routes tour_performance revenue into tourCities, NOT the generic revenue bucket', () => {
    const plainRevenue: GameChange = {
      type: 'revenue',
      description: 'Streaming revenue',
      amount: 5000,
    };
    const categories = categorizeWeekChanges([TOUR_CITY, plainRevenue]);

    expect(categories.tourCities).toEqual([TOUR_CITY]);
    expect(categories.revenue).toEqual([plainRevenue]);
  });

  it('routes tour_planning into its own rendered bucket instead of other', () => {
    const categories = categorizeWeekChanges([TOUR_PLANNING]);

    expect(categories.tourPlanning).toEqual([TOUR_PLANNING]);
    expect(categories.other).toEqual([]);
  });

  it('leaves non-tour routing untouched (ongoing_revenue/release stay in revenue, project_complete in other)', () => {
    const ongoing: GameChange = { type: 'ongoing_revenue', description: 'Catalog streams', amount: 900 };
    const release: GameChange = { type: 'release', description: 'Single release', amount: 3000 };
    const categories = categorizeWeekChanges([ongoing, release, TOUR_COMPLETE]);

    expect(categories.revenue).toEqual([ongoing, release]);
    expect(categories.other).toEqual([TOUR_COMPLETE]);
    expect(categories.tourCities).toEqual([]);
  });

  it('findTourCompletion matches project_complete by projectId (and tolerates missing ids)', () => {
    const changes = [TOUR_CITY, TOUR_COMPLETE];
    expect(findTourCompletion(changes, 'proj-tour-1')).toBe(TOUR_COMPLETE);
    expect(findTourCompletion(changes, 'proj-other')).toBeUndefined();
    expect(findTourCompletion(changes, undefined)).toBeUndefined();
  });
});

describe('TourCityCard', () => {
  it('renders venue, city progress, attendance, money row, and artist reaction from the entry', () => {
    render(<TourCityCard entry={TOUR_CITY} />);

    // Header: tour title (description prefix) + city progress + venue line
    expect(screen.getByText('Neon Skyline Tour')).toBeInTheDocument();
    expect(screen.getByText('City 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('Aurora — The Regency')).toBeInTheDocument();

    // Attendance label
    expect(screen.getByText('1,200 / 1,500 (80%)')).toBeInTheDocument();

    // Money row: gross / costs / net (net signed + colored)
    expect(screen.getByText('$38,500')).toBeInTheDocument();
    expect(screen.getByText('$21,000')).toBeInTheDocument();
    const net = screen.getByText('+$17,500');
    expect(net.className).toContain('text-positive');
    expect(net.className).toContain('font-mono');

    // Artist reaction line
    expect(screen.getByText('Aurora: +8 mood · +1 popularity')).toBeInTheDocument();

    // No completion footer without a matching project_complete
    expect(screen.queryByText(/Tour complete/)).not.toBeInTheDocument();
  });

  it('appends the completion footer when the matching project_complete entry exists', () => {
    render(<TourCityCard entry={{ ...TOUR_CITY, cityNumber: 3 }} completion={TOUR_COMPLETE} />);

    expect(screen.getByText('Tour complete — 3 cities')).toBeInTheDocument();
    const completionNet = screen.getByText('net +$47,000');
    expect(completionNet.className).toContain('text-positive');
    expect(completionNet.className).toContain('font-mono');
  });

  it('colors a negative city net with text-negative', () => {
    render(
      <TourCityCard
        entry={{ ...TOUR_CITY, amount: 10000, costs: 21000, netProfit: -11000, moodChange: -4 }}
      />
    );

    const net = screen.getByText('-$11,000');
    expect(net.className).toContain('text-negative');
    expect(screen.getByText('Aurora: -4 mood · +1 popularity')).toBeInTheDocument();
  });

  it('omits the reaction line when both deltas are 0', () => {
    render(<TourCityCard entry={{ ...TOUR_CITY, moodChange: 0, popularityChange: 0 }} />);

    expect(screen.queryByText(/Aurora:/)).not.toBeInTheDocument();
  });

  it('formatTourReaction drops zero terms and returns null when both are zero', () => {
    expect(formatTourReaction(8, 1)).toBe('+8 mood · +1 popularity');
    expect(formatTourReaction(0, 2)).toBe('+2 popularity');
    expect(formatTourReaction(-3, 0)).toBe('-3 mood');
    expect(formatTourReaction(0, 0)).toBeNull();
    expect(formatTourReaction(undefined, undefined)).toBeNull();
  });
});
