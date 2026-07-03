import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tabs } from '@/components/ui/tabs';
import { AnalyticsTab } from '../AnalyticsTab';
import { mockReleasedSong, mockUnreleasedSong, mockReleasedRelease } from './testFixtures';

function renderTab(songs = [mockReleasedSong, mockUnreleasedSong], releases = [mockReleasedRelease]) {
  return render(
    <Tabs defaultValue="analytics">
      <AnalyticsTab songs={songs} artistReleases={releases} />
    </Tabs>
  );
}

describe('AnalyticsTab', () => {
  it('renders the streams tables and a released song row', () => {
    renderTab();
    expect(screen.getByText('Total Streams by Song')).toBeInTheDocument();
    expect(screen.getByText('Last Week Streams')).toBeInTheDocument();
    // Released song title shows up in the ranked table
    expect(screen.getAllByText('Midnight Echoes').length).toBeGreaterThan(0);
    // Its release title is resolved from artistReleases
    expect(screen.getByText('First Light EP')).toBeInTheDocument();
  });

  it('renders empty states when there are no released songs', () => {
    renderTab([mockUnreleasedSong], []);
    expect(screen.getByText('No released songs to analyze')).toBeInTheDocument();
    expect(screen.getByText('No streaming data for last week')).toBeInTheDocument();
  });
});
