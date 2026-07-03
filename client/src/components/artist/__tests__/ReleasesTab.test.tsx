import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Tabs } from '@/components/ui/tabs';
import { ReleasesTab } from '../ReleasesTab';
import { mockReleasedSong, mockReleasedRelease, mockPlannedRelease } from './testFixtures';

// ReleaseWorkflowCard pulls in store/hooks; stub it to a lightweight marker.
vi.mock('@/components/ReleaseWorkflowCard', () => ({
  ReleaseWorkflowCard: ({ release }: any) => (
    <div data-testid="release-workflow-card">{release.title}</div>
  ),
}));

function renderTab(releases: any[], onNavigate = vi.fn()) {
  return render(
    <Tabs defaultValue="releases">
      <ReleasesTab
        artistReleases={releases}
        songs={[mockReleasedSong]}
        artistName="Nova Sterling"
        currentWeek={10}
        onNavigate={onNavigate}
      />
    </Tabs>
  );
}

describe('ReleasesTab', () => {
  it('renders upcoming and released sections with workflow cards', () => {
    renderTab([mockPlannedRelease, mockReleasedRelease]);
    expect(screen.getByText('Upcoming Releases')).toBeInTheDocument();
    expect(screen.getByText('Released')).toBeInTheDocument();
    const cards = screen.getAllByTestId('release-workflow-card');
    expect(cards.map(c => c.textContent)).toEqual(
      expect.arrayContaining(['Second Wind Single', 'First Light EP'])
    );
  });

  it('renders empty states when there are no releases', () => {
    renderTab([]);
    expect(screen.getByText('No planned releases')).toBeInTheDocument();
    expect(screen.getByText('No releases yet')).toBeInTheDocument();
  });
});
