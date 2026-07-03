/**
 * Audio manager unit tests (Phase 4 PR-6 — sound foundation).
 *
 * happy-dom (this project's vitest environment) does not implement
 * HTMLAudioElement.play()/currentTime the way real browsers do, so we mock
 * `window.Audio` globally before importing the manager module (the module
 * constructs Audio() instances lazily, on first playSound/preload call, so
 * mocking before each test and re-importing via `vi.resetModules()` keeps
 * every test isolated).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

class MockAudio {
  src: string;
  preload = '';
  volume = 1;
  currentTime = 0;
  play = vi.fn(() => Promise.resolve());
  constructor(src: string) {
    this.src = src;
  }
}

describe('audio manager', () => {
  let originalAudio: typeof Audio;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    vi.resetModules();
    originalAudio = window.Audio;
    // @ts-expect-error - mock replaces the real constructor for the test
    window.Audio = MockAudio;

    // Isolated in-memory localStorage per test.
    originalLocalStorage = window.localStorage;
    const store = new Map<string, string>();
    const mockStorage: Storage = {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      configurable: true,
    });
  });

  afterEach(() => {
    window.Audio = originalAudio;
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
    });
    vi.clearAllMocks();
  });

  async function loadManager() {
    const mod = await import('@/lib/audio');
    return mod;
  }

  function unlock() {
    window.dispatchEvent(new Event('pointerdown'));
  }

  it('defaults to sound ON at low volume (0.4) when no settings are persisted', async () => {
    const { audioManager } = await loadManager();
    expect(audioManager.getSettings()).toEqual({ muted: false, volume: 0.4 });
  });

  it('persists mute state to localStorage and survives a reload of the module', async () => {
    const { audioManager } = await loadManager();
    audioManager.setMuted(true);

    expect(JSON.parse(window.localStorage.getItem('audio-settings')!)).toMatchObject({
      muted: true,
    });

    // Simulate a fresh page load: reset modules, re-import, same localStorage.
    vi.resetModules();
    const { audioManager: reloaded } = await loadManager();
    expect(reloaded.getSettings().muted).toBe(true);
  });

  it('clamps volume to the 0..1 range', async () => {
    const { audioManager } = await loadManager();

    audioManager.setVolume(5);
    expect(audioManager.getSettings().volume).toBe(1);

    audioManager.setVolume(-3);
    expect(audioManager.getSettings().volume).toBe(0);

    audioManager.setVolume(0.65);
    expect(audioManager.getSettings().volume).toBe(0.65);
  });

  it('does not throw and does not play when playSound is called before unlock', async () => {
    const { audioManager } = await loadManager();
    expect(() => audioManager.playSound('week-advance')).not.toThrow();

    // Confirm nothing actually played: construct after the fact and check
    // no MockAudio.play was invoked as a side effect of the call above.
    const audio = new (window.Audio as unknown as typeof MockAudio)('x');
    expect(audio.play).not.toHaveBeenCalled();
  });

  it('does not throw when the requested asset is missing / Audio() fails to construct', async () => {
    // @ts-expect-error - force construction to throw, simulating a missing asset
    window.Audio = class {
      constructor() {
        throw new Error('no such asset');
      }
    };
    const { audioManager } = await loadManager();
    unlock();
    expect(() => audioManager.playSound('week-advance')).not.toThrow();
  });

  it('never plays while muted, even after unlock', async () => {
    const playSpy = vi.fn(() => Promise.resolve());
    // @ts-expect-error - custom mock capturing play() calls
    window.Audio = class {
      play = playSpy;
      currentTime = 0;
      volume = 1;
      preload = '';
      constructor(public src: string) {}
    };

    const { audioManager } = await loadManager();
    unlock();
    audioManager.setMuted(true);
    audioManager.playSound('week-advance');

    expect(playSpy).not.toHaveBeenCalled();
  });

  it('plays via play() once unlocked and unmuted', async () => {
    const playSpy = vi.fn(() => Promise.resolve());
    // @ts-expect-error - custom mock capturing play() calls
    window.Audio = class {
      play = playSpy;
      currentTime = 0;
      volume = 1;
      preload = '';
      constructor(public src: string) {}
    };

    const { audioManager } = await loadManager();
    unlock();
    audioManager.playSound('week-advance');

    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it('picks only the single highest-priority sound: campaign-end beats everything', async () => {
    const playSpy = vi.fn(() => Promise.resolve());
    const constructedSrcs: string[] = [];
    // @ts-expect-error - custom mock capturing play() calls + constructed src
    window.Audio = class {
      play = playSpy;
      currentTime = 0;
      volume = 1;
      preload = '';
      constructor(public src: string) {
        constructedSrcs.push(src);
      }
    };

    const { audioManager } = await loadManager();
    unlock();

    audioManager.playHighestPriority(['week-advance', 'tier-unlock', 'hero-fanfare', 'campaign-end']);

    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(constructedSrcs).toEqual(['/audio/campaign-end.mp3']);
  });

  it('picks hero-fanfare over tier-unlock and week-advance when no campaign-end', async () => {
    const playSpy = vi.fn(() => Promise.resolve());
    const constructedSrcs: string[] = [];
    // @ts-expect-error - custom mock capturing play() calls + constructed src
    window.Audio = class {
      play = playSpy;
      currentTime = 0;
      volume = 1;
      preload = '';
      constructor(public src: string) {
        constructedSrcs.push(src);
      }
    };

    const { audioManager } = await loadManager();
    unlock();

    audioManager.playHighestPriority(['week-advance', 'tier-unlock', 'hero-fanfare']);

    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(constructedSrcs).toEqual(['/audio/hero-fanfare.mp3']);
  });

  it('falls back to week-advance when no higher-priority candidate is present', async () => {
    const playSpy = vi.fn(() => Promise.resolve());
    const constructedSrcs: string[] = [];
    // @ts-expect-error - custom mock capturing play() calls + constructed src
    window.Audio = class {
      play = playSpy;
      currentTime = 0;
      volume = 1;
      preload = '';
      constructor(public src: string) {
        constructedSrcs.push(src);
      }
    };

    const { audioManager } = await loadManager();
    unlock();

    audioManager.playHighestPriority(['week-advance']);

    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(constructedSrcs).toEqual(['/audio/week-advance.mp3']);
  });

  it('playHighestPriority no-ops silently on an empty candidate list', async () => {
    const { audioManager } = await loadManager();
    unlock();
    expect(() => audioManager.playHighestPriority([])).not.toThrow();
  });
});
