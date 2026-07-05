import { describe, expect, it } from 'vitest';
import { getArtistStatus } from '../tourHelpers';

// C51: ActiveTours marks a Mini-Tour COMPLETE the week its last city plays
// (metadata city-count check), but the engine only advances the project
// stage from 'production' to 'recorded' one week later. getArtistStatus
// must mirror ActiveTours' completion check so the artist badge and the
// tour card agree on "is the tour done?" in that overlap week.

describe('getArtistStatus', () => {
  const baseTourProject = (overrides: Record<string, any> = {}) => ({
    id: 'project-1',
    artistId: 'artist-1',
    type: 'Mini-Tour',
    stage: 'production',
    startWeek: 1,
    metadata: {
      cities: 3,
      tourStats: {
        cities: [{ cityName: 'City A' }],
      },
    },
    ...overrides,
  });

  it('returns ON TOUR when in production and cities are incomplete', () => {
    const project = baseTourProject();
    const status = getArtistStatus('artist-1', 5, [project]);
    expect(status).toBe('ON TOUR');
  });

  it('returns IDLE (not ON TOUR) when in production and all cities are completed (the C51 case)', () => {
    const project = baseTourProject({
      metadata: {
        cities: 3,
        tourStats: {
          cities: [{ cityName: 'City A' }, { cityName: 'City B' }, { cityName: 'City C' }],
        },
      },
    });

    const status = getArtistStatus('artist-1', 5, [project]);
    expect(status).toBe('IDLE');
  });

  it('falls back to stage-based ON TOUR when city-count metadata is missing', () => {
    const project = baseTourProject({ metadata: {} });
    const status = getArtistStatus('artist-1', 5, [project]);
    expect(status).toBe('ON TOUR');
  });

  it('falls back to stage-based ON TOUR when metadata itself is missing', () => {
    const project = baseTourProject({ metadata: undefined });
    const status = getArtistStatus('artist-1', 5, [project]);
    expect(status).toBe('ON TOUR');
  });

  it('does not affect non-tour project types (Single in production is RECORDING)', () => {
    const project = {
      id: 'project-2',
      artistId: 'artist-1',
      type: 'Single',
      stage: 'production',
      startWeek: 1,
      metadata: {},
    };

    const status = getArtistStatus('artist-1', 5, [project]);
    expect(status).toBe('RECORDING');
  });

  it('EP in production with completed tour for a different project is unaffected', () => {
    const tourProject = baseTourProject({
      artistId: 'artist-2',
      metadata: {
        cities: 2,
        tourStats: { cities: [{ cityName: 'A' }, { cityName: 'B' }] },
      },
    });
    const epProject = {
      id: 'project-3',
      artistId: 'artist-1',
      type: 'EP',
      stage: 'production',
      startWeek: 1,
      metadata: {},
    };

    const status = getArtistStatus('artist-1', 5, [tourProject, epProject]);
    expect(status).toBe('RECORDING');
  });

  it('returns IDLE when there are no matching projects', () => {
    expect(getArtistStatus('artist-1', 5, [])).toBe('IDLE');
  });

  it('returns IDLE when projects is not an array', () => {
    expect(getArtistStatus('artist-1', 5, undefined as any)).toBe('IDLE');
  });

  it('ignores projects that have not started yet', () => {
    const project = baseTourProject({ startWeek: 10 });
    const status = getArtistStatus('artist-1', 5, [project]);
    expect(status).toBe('IDLE');
  });

  it('ignores projects not in production stage', () => {
    const project = baseTourProject({ stage: 'recorded' });
    const status = getArtistStatus('artist-1', 5, [project]);
    expect(status).toBe('IDLE');
  });
});
