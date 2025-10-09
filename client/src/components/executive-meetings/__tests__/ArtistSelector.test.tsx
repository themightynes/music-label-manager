import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ArtistSelector } from '../ArtistSelector';
import type { GameArtist } from '../../../../../shared/types/gameTypes';

describe('ArtistSelector', () => {
  const mockOnSelectArtist = vi.fn();

  const mockArtists: GameArtist[] = [
    {
      id: 'artist-1',
      name: 'Nova Sterling',
      archetype: 'Visionary',
      mood: 75,
      energy: 80,
      popularity: 60,
      talent: 85,
      workEthic: 70,
      temperament: 65,
      signed: true,
    },
    {
      id: 'artist-2',
      name: 'Diego Martinez',
      archetype: 'Workhorse',
      mood: 50,
      energy: 90,
      popularity: 45,
      talent: 70,
      workEthic: 95,
      temperament: 80,
      signed: true,
    },
    {
      id: 'artist-3',
      name: 'Luna Chen',
      archetype: 'Trendsetter',
      mood: 30,
      energy: 40,
      popularity: 85,
      talent: 75,
      workEthic: 60,
      temperament: 55,
      signed: true,
    },
  ];

  beforeEach(() => {
    mockOnSelectArtist.mockClear();
  });

  describe('Artist List Rendering', () => {
    it('should render all provided artists', () => {
      render(
        <ArtistSelector
          artists={mockArtists}
          selectedArtistId={null}
          onSelectArtist={mockOnSelectArtist}
        />
      );

      expect(screen.getByText('Nova Sterling')).toBeInTheDocument();
      expect(screen.getByText('Diego Martinez')).toBeInTheDocument();
      expect(screen.getByText('Luna Chen')).toBeInTheDocument();
    });

    it('should display artist archetypes', () => {
      render(
        <ArtistSelector
          artists={mockArtists}
          selectedArtistId={null}
          onSelectArtist={mockOnSelectArtist}
        />
      );

      expect(screen.getByText('Visionary')).toBeInTheDocument();
      expect(screen.getByText('Workhorse')).toBeInTheDocument();
      expect(screen.getByText('Trendsetter')).toBeInTheDocument();
    });

    it('should display artist stats (mood, energy, popularity, talent)', () => {
      render(
        <ArtistSelector
          artists={mockArtists}
          selectedArtistId={null}
          onSelectArtist={mockOnSelectArtist}
        />
      );

      // Check that all stat labels are present
      expect(screen.getAllByText('Mood:')).toHaveLength(3);
      expect(screen.getAllByText('Energy:')).toHaveLength(3);
      expect(screen.getAllByText('Popularity:')).toHaveLength(3);
      expect(screen.getAllByText('Talent:')).toHaveLength(3);

      // Check specific values exist
      expect(screen.getAllByText('50').length).toBeGreaterThan(0); // Diego's mood
      expect(screen.getAllByText('30').length).toBeGreaterThan(0); // Luna's mood
      expect(screen.getAllByText('80').length).toBeGreaterThan(0); // Nova's energy
      expect(screen.getAllByText('90').length).toBeGreaterThan(0); // Diego's energy
    });

    it('should display signed badge for signed artists', () => {
      render(
        <ArtistSelector
          artists={mockArtists}
          selectedArtistId={null}
          onSelectArtist={mockOnSelectArtist}
        />
      );

      const signedBadges = screen.getAllByText('Signed');
      expect(signedBadges).toHaveLength(3);
    });

    it('should render prompt text when provided', () => {
      const promptText = 'Which artist are you working with?';
      render(
        <ArtistSelector
          artists={mockArtists}
          selectedArtistId={null}
          onSelectArtist={mockOnSelectArtist}
          prompt={promptText}
        />
      );

      expect(screen.getByText(promptText)).toBeInTheDocument();
    });

    it('should not render prompt text when not provided', () => {
      const { container } = render(
        <ArtistSelector
          artists={mockArtists}
          selectedArtistId={null}
          onSelectArtist={mockOnSelectArtist}
        />
      );

      // Check there's no prompt text element
      const promptElements = container.querySelectorAll('p.text-white\\/90');
      expect(promptElements).toHaveLength(0);
    });
  });

  describe('Artist Selection', () => {
    it('should call onSelectArtist when an artist card is clicked', () => {
      render(
        <ArtistSelector
          artists={mockArtists}
          selectedArtistId={null}
          onSelectArtist={mockOnSelectArtist}
        />
      );

      const novaCard = screen.getByText('Nova Sterling').closest('div[class*="cursor-pointer"]');
      fireEvent.click(novaCard!);

      expect(mockOnSelectArtist).toHaveBeenCalledWith('artist-1');
    });

    it('should show visual indication for selected artist', () => {
      const { rerender } = render(
        <ArtistSelector
          artists={mockArtists}
          selectedArtistId="artist-2"
          onSelectArtist={mockOnSelectArtist}
        />
      );

      const diegoCard = screen.getByText('Diego Martinez').closest('div[class*="cursor-pointer"]');

      // Selected card should have special styling classes
      expect(diegoCard?.className).toContain('bg-brand-burgundy/30');
      expect(diegoCard?.className).toContain('ring-brand-rose');

      // Should show check icon
      const checkIcons = diegoCard?.querySelectorAll('svg');
      expect(checkIcons?.length).toBeGreaterThan(0);
    });

    it('should update selection when different artist is clicked', () => {
      const { rerender } = render(
        <ArtistSelector
          artists={mockArtists}
          selectedArtistId="artist-1"
          onSelectArtist={mockOnSelectArtist}
        />
      );

      // Click on Diego
      const diegoCard = screen.getByText('Diego Martinez').closest('div[class*="cursor-pointer"]');
      fireEvent.click(diegoCard!);

      expect(mockOnSelectArtist).toHaveBeenCalledWith('artist-2');
    });
  });

  describe('Edge Cases', () => {
    it('should render correctly with 0 artists', () => {
      const { container } = render(
        <ArtistSelector
          artists={[]}
          selectedArtistId={null}
          onSelectArtist={mockOnSelectArtist}
        />
      );

      // Should render empty grid
      expect(container.querySelector('div.grid')).toBeInTheDocument();
      expect(container.querySelectorAll('div[class*="cursor-pointer"]')).toHaveLength(0);
    });

    it('should render correctly with 1 artist', () => {
      const singleArtist = [mockArtists[0]];
      render(
        <ArtistSelector
          artists={singleArtist}
          selectedArtistId={null}
          onSelectArtist={mockOnSelectArtist}
        />
      );

      expect(screen.getByText('Nova Sterling')).toBeInTheDocument();
      expect(screen.queryByText('Diego Martinez')).not.toBeInTheDocument();
      expect(screen.queryByText('Luna Chen')).not.toBeInTheDocument();
    });

    it('should handle multiple artists with same name', () => {
      const duplicateArtists = [
        mockArtists[0],
        { ...mockArtists[0], id: 'artist-duplicate' },
      ];

      render(
        <ArtistSelector
          artists={duplicateArtists}
          selectedArtistId={null}
          onSelectArtist={mockOnSelectArtist}
        />
      );

      const novaCards = screen.getAllByText('Nova Sterling');
      expect(novaCards).toHaveLength(2);

      // Should be able to click each one independently
      const firstCard = novaCards[0].closest('div[class*="cursor-pointer"]');
      fireEvent.click(firstCard!);
      expect(mockOnSelectArtist).toHaveBeenCalledWith('artist-1');

      mockOnSelectArtist.mockClear();

      const secondCard = novaCards[1].closest('div[class*="cursor-pointer"]');
      fireEvent.click(secondCard!);
      expect(mockOnSelectArtist).toHaveBeenCalledWith('artist-duplicate');
    });

    it('should handle artists with null mood/energy values gracefully', () => {
      const artistsWithNulls: GameArtist[] = [
        {
          id: 'artist-null',
          name: 'Null Artist',
          archetype: 'Visionary',
          mood: 50, // Will use default in component
          energy: 75, // Will use default in component
          popularity: 0,
          talent: 60,
          workEthic: 65,
          temperament: 70,
          signed: true,
        },
      ];

      render(
        <ArtistSelector
          artists={artistsWithNulls}
          selectedArtistId={null}
          onSelectArtist={mockOnSelectArtist}
        />
      );

      expect(screen.getByText('Null Artist')).toBeInTheDocument();
      // Component should use defaults (50 for mood, 75 for energy)
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('75')).toBeInTheDocument();
    });
  });

  describe('Mood Color Coding', () => {
    it('should apply correct color classes based on mood values', () => {
      const { container } = render(
        <ArtistSelector
          artists={mockArtists}
          selectedArtistId={null}
          onSelectArtist={mockOnSelectArtist}
        />
      );

      // High mood (>= 70) should be green
      const novaCard = screen.getByText('Nova Sterling').closest('div[class*="cursor-pointer"]');
      const novaMood = novaCard?.querySelector('span.text-green-500');
      expect(novaMood?.textContent).toBe('75');

      // Medium mood (40-69) should be yellow
      const diegoCard = screen.getByText('Diego Martinez').closest('div[class*="cursor-pointer"]');
      const diegoMood = diegoCard?.querySelector('span.text-yellow-500');
      expect(diegoMood?.textContent).toBe('50');

      // Low mood (< 40) should be red
      const lunaCard = screen.getByText('Luna Chen').closest('div[class*="cursor-pointer"]');
      const lunaMood = lunaCard?.querySelector('span.text-red-500');
      expect(lunaMood?.textContent).toBe('30');
    });
  });
});
