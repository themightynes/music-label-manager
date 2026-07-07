/**
 * TourStatusStrip tests (tour-tier1 slice 3).
 *
 * Pure-module tests for deriveTourStatuses (planning-stage tour, mid-tour,
 * final-city week, completed/cancelled/non-tour exclusion, missing-tourStats
 * tolerance) plus a light render test of the presentational strip.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TourStatusStrip, deriveTourStatuses } from '@/components/TourStatusStrip';

const getArtistName = (artistId: string) =>
  ({ 'artist-nova': 'Nova', 'artist-mac': 'Mac' } as Record<string, string>)[artistId] ||
  'Unknown Artist';

function playedCity(cityNumber: number, attendanceRate: number, revenue: number) {
  return { cityNumber, venue: 'Theater Venues', capacity: 800, attendanceRate, revenue };
}

function tourProject(overrides: Record<string, any> = {}) {
  return {
    id: 'tour-1',
    type: 'Mini-Tour',
    artistId: 'artist-nova',
    stage: 'production',
    metadata: { cities: 3, venueAccess: 'theaters', tourStats: { cities: [] } },
    ...overrides,
  };
}

describe('deriveTourStatuses', () => {
  it('reports a planning-stage tour as booked', () => {
    const statuses = deriveTourStatuses([tourProject({ stage: 'planning' })], getArtistName);
    expect(statuses).toEqual([
      { kind: 'booked', projectId: 'tour-1', artistName: 'Nova' },
    ]);
  });

  it('reports a mid-tour project (1 of 3 played) with next city, venue name, and last result', () => {
    const project = tourProject({
      metadata: {
        cities: 3,
        venueAccess: 'theaters',
        tourStats: { cities: [playedCity(1, 72, 15400)] },
      },
    });

    const statuses = deriveTourStatuses([project], getArtistName);
    expect(statuses).toEqual([
      {
        kind: 'mid-tour',
        projectId: 'tour-1',
        artistName: 'Nova',
        venueName: 'Theater Venues',
        cityNumber: 2,
        citiesTotal: 3,
        lastCity: { attendanceRate: 72, revenue: 15400 },
      },
    ]);
  });

  it('on the final-city week (2 of 3 played) reports city 3 of 3 with the latest result', () => {
    const project = tourProject({
      metadata: {
        cities: 3,
        venueAccess: 'clubs',
        tourStats: { cities: [playedCity(1, 72, 15400), playedCity(2, 85, 18100)] },
      },
    });

    const [status] = deriveTourStatuses([project], getArtistName);
    expect(status).toMatchObject({
      kind: 'mid-tour',
      venueName: 'Club Venues',
      cityNumber: 3,
      citiesTotal: 3,
      lastCity: { attendanceRate: 85, revenue: 18100 },
    });
  });

  it('excludes completed tours (all cities played in production, or stage recorded)', () => {
    const allPlayed = tourProject({
      metadata: {
        cities: 2,
        venueAccess: 'theaters',
        tourStats: { cities: [playedCity(1, 70, 9000), playedCity(2, 75, 9500)] },
      },
    });
    const recorded = tourProject({ id: 'tour-2', stage: 'recorded' });
    const cancelled = tourProject({ id: 'tour-3', stage: 'cancelled' });

    expect(deriveTourStatuses([allPlayed, recorded, cancelled], getArtistName)).toEqual([]);
  });

  it('excludes non-tour projects', () => {
    const single = { id: 'proj-1', type: 'Single', artistId: 'artist-nova', stage: 'production' };
    expect(deriveTourStatuses([single], getArtistName)).toEqual([]);
  });

  it('tolerates missing tourStats/metadata (city 1, no last-night detail, Small Venues fallback)', () => {
    const bare = { id: 'tour-4', type: 'Mini-Tour', artistId: 'artist-mac', stage: 'production', metadata: { cities: 4 } };

    expect(deriveTourStatuses([bare], getArtistName)).toEqual([
      {
        kind: 'mid-tour',
        projectId: 'tour-4',
        artistName: 'Mac',
        venueName: 'Small Venues',
        cityNumber: 1,
        citiesTotal: 4,
        lastCity: null,
      },
    ]);
    expect(deriveTourStatuses(undefined, getArtistName)).toEqual([]);
  });
});

describe('TourStatusStrip', () => {
  it('renders one line per status with venue, city progress, and last-night detail', () => {
    const project = tourProject({
      metadata: {
        cities: 4,
        venueAccess: 'theaters',
        tourStats: { cities: [playedCity(1, 72, 15400)] },
      },
    });
    const statuses = deriveTourStatuses(
      [project, tourProject({ id: 'tour-2', stage: 'planning', artistId: 'artist-mac' })],
      getArtistName,
    );

    render(<TourStatusStrip statuses={statuses} />);

    const strip = screen.getByTestId('tour-status-strip');
    expect(strip.textContent).toContain('Nova on tour — plays Theater Venues this week (city 2 of 4)');
    expect(strip.textContent).toContain('last night: 72% attendance, $15,400');
    expect(strip.textContent).toContain('Mac — tour booked, crew prepping this week');
  });

  it('renders nothing when there are no live tours', () => {
    const { container } = render(<TourStatusStrip statuses={[]} />);
    expect(container.innerHTML).toBe('');
  });
});
