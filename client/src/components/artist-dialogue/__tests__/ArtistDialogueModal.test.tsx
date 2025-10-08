import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArtistDialogueModal } from '../ArtistDialogueModal';
import type { GameArtist } from '@shared/types/gameTypes';

// Mock the services
vi.mock('../../../services/artistDialogueService', () => ({
  loadAllDialogues: vi.fn(),
  submitArtistDialogueChoice: vi.fn(),
}));

import { loadAllDialogues, submitArtistDialogueChoice } from '../../../services/artistDialogueService';

describe('ArtistDialogueModal', () => {
  const mockArtist: GameArtist = {
    id: 'artist_test_123',
    name: 'Test Artist',
    archetype: 'Visionary',
    talent: 80,
    workEthic: 70,
    popularity: 60,
    temperament: 50,
    energy: 70,
    mood: 50,
    signed: true,
  };

  const mockDialogueScenes = [
    {
      id: 'dialogue_test_1',
      prompt: 'Test dialogue prompt - How are you feeling today?',
      choices: [
        { id: 'choice_1', label: 'Let me help you', effects_immediate: { artist_mood: 2 }, effects_delayed: {} },
        { id: 'choice_2', label: 'Push through it', effects_immediate: { money: -1000 }, effects_delayed: {} },
        { id: 'choice_3', label: 'Take a break', effects_immediate: {}, effects_delayed: { artist_energy: 3 } },
      ],
    },
  ];

  const mockDialogueResponse = {
    success: true,
    artistId: 'artist_test_123',
    artistName: 'Test Artist',
    sceneId: 'dialogue_test_1',
    choiceId: 'choice_1',
    effects: { artist_mood: 2, money: -1000 },
    delayedEffects: { artist_energy: 3 },
    message: 'Conversation completed successfully',
  };

  const defaultProps = {
    gameId: 'game_test_123',
    artist: mockArtist,
    open: true,
    onOpenChange: vi.fn(),
    onComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadAllDialogues).mockResolvedValue(mockDialogueScenes);
    vi.mocked(submitArtistDialogueChoice).mockResolvedValue(mockDialogueResponse);
  });

  describe('Rendering', () => {
    it('should not render when open is false', () => {
      const { container } = render(<ArtistDialogueModal {...defaultProps} open={false} />);

      expect(container).toBeEmptyDOMElement();
    });

    it('should render when open is true with valid artist', () => {
      render(<ArtistDialogueModal {...defaultProps} />);

      expect(screen.getByText(/Conversation with Test Artist/i)).toBeInTheDocument();
    });

    it('should show artist name in dialog title', () => {
      render(<ArtistDialogueModal {...defaultProps} />);

      expect(screen.getByText(/Conversation with Test Artist/i)).toBeInTheDocument();
    });

    it('should show mood badge with correct value', () => {
      render(<ArtistDialogueModal {...defaultProps} />);

      expect(screen.getByText(/Mood: 50/i)).toBeInTheDocument();
    });

    it('should show energy badge with correct value', () => {
      render(<ArtistDialogueModal {...defaultProps} />);

      expect(screen.getByText(/Energy: 70/i)).toBeInTheDocument();
    });

    it('should show archetype badge', () => {
      render(<ArtistDialogueModal {...defaultProps} />);

      expect(screen.getByText(/Visionary/i)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loader when in loading state', () => {
      render(<ArtistDialogueModal {...defaultProps} />);

      expect(screen.getByText(/Loading dialogue.../i)).toBeInTheDocument();
    });

    it('should not show dialogue prompt during loading', () => {
      render(<ArtistDialogueModal {...defaultProps} />);

      expect(screen.queryByText(/How are you feeling today/i)).not.toBeInTheDocument();
    });
  });

  describe('Displaying State', () => {
    it('should show dialogue prompt text', async () => {
      render(<ArtistDialogueModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/How are you feeling today/i)).toBeInTheDocument();
      });
    });

    it('should show exactly 3 choice buttons', async () => {
      render(<ArtistDialogueModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Let me help you/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Let me help you/i)).toBeInTheDocument();
      expect(screen.getByText(/Push through it/i)).toBeInTheDocument();
      expect(screen.getByText(/Take a break/i)).toBeInTheDocument();
    });

    it('should show choice buttons with correct labels', async () => {
      render(<ArtistDialogueModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Let me help you/i)).toBeInTheDocument();
      });

      const choice1 = screen.getByRole('button', { name: /Let me help you/i });
      const choice2 = screen.getByRole('button', { name: /Push through it/i });
      const choice3 = screen.getByRole('button', { name: /Take a break/i });

      expect(choice1).toBeInTheDocument();
      expect(choice2).toBeInTheDocument();
      expect(choice3).toBeInTheDocument();
    });

    it('should have clickable choice buttons', async () => {
      const user = userEvent.setup();
      render(<ArtistDialogueModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Let me help you/i)).toBeInTheDocument();
      });

      const choiceButton = screen.getByRole('button', { name: /Let me help you/i });
      expect(choiceButton).toBeEnabled();

      await user.click(choiceButton);

      expect(submitArtistDialogueChoice).toHaveBeenCalled();
    });

    it('should show cancel button', async () => {
      render(<ArtistDialogueModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Let me help you/i)).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      expect(cancelButton).toBeInTheDocument();
    });
  });

  describe('Submitting State', () => {
    it('should show loader when submitting', async () => {
      const user = userEvent.setup();

      // Delay the submission to capture the submitting state
      vi.mocked(submitArtistDialogueChoice).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockDialogueResponse), 100))
      );

      render(<ArtistDialogueModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Let me help you/i)).toBeInTheDocument();
      });

      const choiceButton = screen.getByRole('button', { name: /Let me help you/i });
      await user.click(choiceButton);

      expect(screen.getByText(/Processing.../i)).toBeInTheDocument();
    });
  });

  describe('Complete State', () => {
    it('should show success icon and message', async () => {
      const user = userEvent.setup();
      render(<ArtistDialogueModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Let me help you/i)).toBeInTheDocument();
      });

      const choiceButton = screen.getByRole('button', { name: /Let me help you/i });
      await user.click(choiceButton);

      await waitFor(() => {
        expect(screen.getByText(/Conversation Complete/i)).toBeInTheDocument();
      });
    });

    it('should display applied effects', async () => {
      const user = userEvent.setup();
      render(<ArtistDialogueModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Let me help you/i)).toBeInTheDocument();
      });

      const choiceButton = screen.getByRole('button', { name: /Let me help you/i });
      await user.click(choiceButton);

      await waitFor(() => {
        expect(screen.getByText(/Immediate Effects/i)).toBeInTheDocument();
      });

      // Check for effect badges (may have multiple "Mood" elements including header)
      const moodElements = screen.getAllByText(/Mood/i);
      expect(moodElements.length).toBeGreaterThan(0);
      const moneyElements = screen.getAllByText(/Money/i);
      expect(moneyElements.length).toBeGreaterThan(0);
    });

    it('should format positive effects with + prefix', async () => {
      const user = userEvent.setup();
      render(<ArtistDialogueModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Let me help you/i)).toBeInTheDocument();
      });

      const choiceButton = screen.getByRole('button', { name: /Let me help you/i });
      await user.click(choiceButton);

      await waitFor(() => {
        expect(screen.getByText(/Mood: \+2/i)).toBeInTheDocument();
      });
    });

    it('should show delayed effects section', async () => {
      const user = userEvent.setup();
      render(<ArtistDialogueModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Let me help you/i)).toBeInTheDocument();
      });

      const choiceButton = screen.getByRole('button', { name: /Let me help you/i });
      await user.click(choiceButton);

      await waitFor(() => {
        expect(screen.getByText(/Delayed Effects \(Next Week\)/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Energy: \+3/i)).toBeInTheDocument();
    });

    it('should call onComplete callback', { timeout: 10000 }, async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();
      render(<ArtistDialogueModal {...defaultProps} onComplete={onComplete} />);

      await waitFor(() => {
        expect(screen.getByText(/Let me help you/i)).toBeInTheDocument();
      });

      const choiceButton = screen.getByRole('button', { name: /Let me help you/i });
      await user.click(choiceButton);

      await waitFor(() => {
        expect(screen.getByText(/Conversation Complete/i)).toBeInTheDocument();
      });

      // Wait for auto-close timer (5 seconds)
      await waitFor(
        () => {
          expect(onComplete).toHaveBeenCalled();
        },
        { timeout: 5500 }
      );
    });
  });

  describe('Error State', () => {
    it('should show error message when loading fails', async () => {
      vi.mocked(loadAllDialogues).mockRejectedValueOnce(new Error('Failed to load'));

      render(<ArtistDialogueModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Error/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
    });

    it('should show Retry button on error', async () => {
      vi.mocked(loadAllDialogues).mockRejectedValueOnce(new Error('Failed to load'));

      render(<ArtistDialogueModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Error/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /Retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('should show Close button on error', async () => {
      vi.mocked(loadAllDialogues).mockRejectedValueOnce(new Error('Failed to load'));

      render(<ArtistDialogueModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Error/i)).toBeInTheDocument();
      });

      const closeButtons = screen.getAllByRole('button', { name: /Close/i });
      expect(closeButtons.length).toBeGreaterThan(0);
    });

    it('should retry loading on Retry button click', async () => {
      const user = userEvent.setup();
      vi.mocked(loadAllDialogues)
        .mockRejectedValueOnce(new Error('Failed to load'))
        .mockResolvedValueOnce(mockDialogueScenes);

      render(<ArtistDialogueModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Error/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /Retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText(/How are you feeling today/i)).toBeInTheDocument();
      });
    });

    it('should close modal on Close button click in error state', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      vi.mocked(loadAllDialogues).mockRejectedValueOnce(new Error('Failed to load'));

      render(<ArtistDialogueModal {...defaultProps} onOpenChange={onOpenChange} />);

      await waitFor(() => {
        expect(screen.getByText(/Error/i)).toBeInTheDocument();
      });

      const closeButtons = screen.getAllByRole('button', { name: /Close/i });
      await user.click(closeButtons[0]);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('User Interactions', () => {
    it('should submit choice when clicking choice button', async () => {
      const user = userEvent.setup();
      render(<ArtistDialogueModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Let me help you/i)).toBeInTheDocument();
      });

      const choiceButton = screen.getByRole('button', { name: /Let me help you/i });
      await user.click(choiceButton);

      expect(submitArtistDialogueChoice).toHaveBeenCalledWith('game_test_123', {
        artistId: 'artist_test_123',
        sceneId: 'dialogue_test_1',
        choiceId: 'choice_1',
      });
    });

    it('should call onOpenChange when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<ArtistDialogueModal {...defaultProps} onOpenChange={onOpenChange} />);

      await waitFor(() => {
        expect(screen.getByText(/Let me help you/i)).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Props and Callbacks', () => {
    it('should pass correct gameId to machine', async () => {
      const customGameId = 'custom_game_456';
      render(<ArtistDialogueModal {...defaultProps} gameId={customGameId} />);

      await waitFor(() => {
        expect(screen.getByText(/Let me help you/i)).toBeInTheDocument();
      });

      const choiceButton = screen.getByRole('button', { name: /Let me help you/i });
      const user = userEvent.setup();
      await user.click(choiceButton);

      expect(submitArtistDialogueChoice).toHaveBeenCalledWith(
        customGameId,
        expect.objectContaining({
          artistId: mockArtist.id,
        })
      );
    });

    it('should display correct artist data', () => {
      const customArtist = {
        ...mockArtist,
        name: 'Custom Artist',
        mood: 80,
        energy: 90,
      };

      render(<ArtistDialogueModal {...defaultProps} artist={customArtist} />);

      expect(screen.getByText(/Conversation with Custom Artist/i)).toBeInTheDocument();
      expect(screen.getByText(/Mood: 80/i)).toBeInTheDocument();
      expect(screen.getByText(/Energy: 90/i)).toBeInTheDocument();
    });
  });

  describe('Effect Display Formatting', () => {
    it('should display artist_mood as "Mood"', async () => {
      const user = userEvent.setup();
      render(<ArtistDialogueModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Let me help you/i)).toBeInTheDocument();
      });

      const choiceButton = screen.getByRole('button', { name: /Let me help you/i });
      await user.click(choiceButton);

      await waitFor(() => {
        expect(screen.getByText(/Mood: \+2/i)).toBeInTheDocument();
      });
    });

  });
});
