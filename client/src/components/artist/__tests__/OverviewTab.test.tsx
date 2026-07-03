import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Tabs } from '@/components/ui/tabs';
import { OverviewTab } from '../OverviewTab';
import { mockArtist, mockReleasedSong, mockInsights } from './testFixtures';

// ArtistCard pulls in store/hooks; stub it to a lightweight marker.
vi.mock('@/components/ArtistCard', () => ({
  ArtistCard: ({ artist }: any) => <div data-testid="artist-card">{artist.name}</div>,
  getArchetypeInfo: () => ({ color: '', icon: () => null, description: '' }),
  getRelationshipStatus: () => ({ status: 'Great', color: '' }),
}));

function renderTab(songs = [mockReleasedSong]) {
  return render(
    <Tabs defaultValue="overview">
      <OverviewTab
        artist={mockArtist}
        songs={songs}
        artistId="artist-1"
        avgQuality={88}
        projectCount={1}
        insights={mockInsights}
        roiData={undefined}
        gameState={{ id: 'game-1' }}
        expandedArtist={false}
        onToggleExpand={vi.fn()}
        onMeet={vi.fn()}
        onNavigate={vi.fn()}
      />
    </Tabs>
  );
}

describe('OverviewTab', () => {
  it('renders artist stats, performance metrics and the artist card', () => {
    renderTab();
    expect(screen.getByTestId('artist-card')).toHaveTextContent('Nova Sterling');
    expect(screen.getByText('Artist Stats')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    // avgQuality prop flows into PerformanceMetrics (label present, value rendered)
    expect(screen.getByText('Avg Quality')).toBeInTheDocument();
    expect(screen.getAllByText('88').length).toBeGreaterThan(0);
    // Recent activity shows the released song title
    expect(screen.getByText('Midnight Echoes')).toBeInTheDocument();
  });

  it('renders an empty recent-activity state when there are no songs', () => {
    renderTab([]);
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
  });
});
