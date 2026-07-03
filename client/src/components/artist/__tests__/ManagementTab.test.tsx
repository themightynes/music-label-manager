import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Tabs } from '@/components/ui/tabs';
import { ManagementTab } from '../ManagementTab';
import { mockArtist, mockMoodStatus, mockArchetypeInfo } from './testFixtures';

function renderTab(onNavigate = vi.fn()) {
  return render(
    <Tabs defaultValue="management">
      <ManagementTab
        artist={mockArtist}
        moodStatus={mockMoodStatus}
        archetypeInfo={mockArchetypeInfo}
        onNavigate={onNavigate}
      />
    </Tabs>
  );
}

describe('ManagementTab', () => {
  it('renders relationship status and archetype info', () => {
    renderTab();
    expect(screen.getByText('Artist Relationship')).toBeInTheDocument();
    expect(screen.getByText('Happy')).toBeInTheDocument();
    expect(screen.getByText('Archetype: Visionary')).toBeInTheDocument();
    expect(screen.getByText('Creative and experimental')).toBeInTheDocument();
  });

  it('renders quick actions with the weekly cost', () => {
    renderTab();
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Plan New Release')).toBeInTheDocument();
    // weeklyCost 1200 -> $1,200
    expect(screen.getByText('$1,200')).toBeInTheDocument();
  });
});
