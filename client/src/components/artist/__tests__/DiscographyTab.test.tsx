import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tabs } from '@/components/ui/tabs';
import { DiscographyTab } from '../DiscographyTab';
import {
  mockReleasedSong,
  mockUnreleasedSong,
  mockReleasedRelease,
} from './testFixtures';

function renderTab(songs = [mockReleasedSong, mockUnreleasedSong], releases = [mockReleasedRelease]) {
  return render(
    <Tabs defaultValue="discography">
      <DiscographyTab songs={songs} artistReleases={releases} />
    </Tabs>
  );
}

describe('DiscographyTab', () => {
  it('renders released songs grouped under their release', () => {
    renderTab();
    expect(screen.getByText('Complete Discography')).toBeInTheDocument();
    expect(screen.getByText('First Light EP')).toBeInTheDocument();
    // A released song title appears in the release table
    expect(screen.getByText('Midnight Echoes')).toBeInTheDocument();
  });

  it('renders unreleased songs in their own section', () => {
    renderTab();
    expect(screen.getByText('Unreleased Songs')).toBeInTheDocument();
    expect(screen.getByText('Draft Idea')).toBeInTheDocument();
  });

  it('renders the career totals summary when there are released songs', () => {
    renderTab();
    expect(screen.getByText('Career Totals')).toBeInTheDocument();
    expect(screen.getByText('2 Total Songs')).toBeInTheDocument();
  });

  it('renders an empty state when there are no songs', () => {
    renderTab([], []);
    expect(screen.getByText('No songs recorded yet')).toBeInTheDocument();
  });
});
