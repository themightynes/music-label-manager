import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SaveGroupList } from './SaveGroupList';
import { groupSaves, type SaveSummary } from './groupSaves';

let idCounter = 0;
function makeSave(overrides: Partial<SaveSummary> = {}): SaveSummary {
  idCounter += 1;
  return {
    id: `save-${idCounter}`,
    name: `Save ${idCounter}`,
    week: 1,
    isAutosave: false,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    money: 1000,
    reputation: 10,
    gameId: 'game-a',
    musicLabelName: 'Label A',
    ...overrides,
  };
}

function renderList(saves: SaveSummary[], currentGameId: string | null) {
  const groups = groupSaves(saves, currentGameId);
  const handlers = {
    loading: false,
    deletingId: null,
    onLoad: vi.fn(),
    onFork: vi.fn(),
    onDelete: vi.fn(),
    onRename: vi.fn().mockResolvedValue(undefined),
    onDeleteGroup: vi.fn(),
  };
  return { ...render(<SaveGroupList groups={groups} {...handlers} />), handlers, groups };
}

describe('SaveGroupList', () => {
  it('renders a group header per playthrough', () => {
    renderList(
      [
        makeSave({ gameId: 'g1', musicLabelName: 'Neon Owl' }),
        makeSave({ gameId: 'g2', musicLabelName: 'Static Bloom' }),
      ],
      null
    );
    expect(screen.getByText('Neon Owl')).toBeInTheDocument();
    expect(screen.getByText('Static Bloom')).toBeInTheDocument();
  });

  it('marks the current playthrough and expands only it by default', () => {
    renderList(
      [
        makeSave({ gameId: 'g1', musicLabelName: 'Neon Owl', name: 'Current save' }),
        makeSave({ gameId: 'g2', musicLabelName: 'Static Bloom', name: 'Other save' }),
      ],
      'g1'
    );
    expect(screen.getByText('Current')).toBeInTheDocument();
    // Current group's saves visible; collapsed group's saves not rendered.
    expect(screen.getByText('Current save')).toBeInTheDocument();
    expect(screen.queryByText('Other save')).not.toBeInTheDocument();
  });

  it('renders a flat body without group chrome for a single playthrough', () => {
    renderList([makeSave({ musicLabelName: 'Only Label', name: 'Solo save' })], 'game-a');
    expect(screen.getByText('Solo save')).toBeInTheDocument();
    // No collapsible header label rendered in single-group mode.
    expect(screen.queryByText('Only Label')).not.toBeInTheDocument();
    expect(screen.queryByText('Current')).not.toBeInTheDocument();
  });

  it('shows the autosave sub-cluster header when a group has autosaves', () => {
    renderList(
      [
        makeSave({ isAutosave: false }),
        makeSave({ isAutosave: true, name: 'Label A - Week 5', week: 5 }),
      ],
      'game-a'
    );
    expect(screen.getByText('Autosaves')).toBeInTheDocument();
    expect(screen.getByText('Label A - Week 5')).toBeInTheDocument();
  });

  it('offers playthrough delete for real groups but not the unknown bucket', () => {
    renderList(
      [
        makeSave({ gameId: 'g1', musicLabelName: 'Neon Owl' }),
        makeSave({ gameId: null, musicLabelName: null }),
      ],
      null
    );
    expect(screen.getByLabelText('Delete playthrough Neon Owl')).toBeInTheDocument();
    expect(screen.queryByLabelText('Delete playthrough Unknown Label')).not.toBeInTheDocument();
  });

  it('buckets null-gameId saves under Unknown Label', () => {
    renderList(
      [
        makeSave({ gameId: 'g1', musicLabelName: 'Neon Owl' }),
        makeSave({ gameId: null, musicLabelName: null }),
      ],
      null
    );
    expect(screen.getByText('Unknown Label')).toBeInTheDocument();
  });
});
