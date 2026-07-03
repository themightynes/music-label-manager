/**
 * Audio manager (Phase 4 PR-6 — sound foundation).
 *
 * Plain `HTMLAudioElement`, no new dependency. Handles:
 *  - a typed sound-key union matching the six assets in `public/audio/`
 *  - master mute + volume, persisted to localStorage (`audio-settings`)
 *  - autoplay-policy safety: browsers block audio before a user gesture, so
 *    playback is "armed" on the first pointerdown/keydown/touchstart and
 *    `playSound` silently no-ops before that (and on any other failure —
 *    missing asset, rejected play() promise, etc.). Never throws, never
 *    console-spams.
 *  - fully independent of the motion/reduced-motion preference — sound has
 *    its own toggle (design principle #2 in the Phase 4 plan).
 *
 * Priority: when multiple stings could fire for the same week, only the
 * highest-priority one actually plays (see `pickHighestPriority`import and
 * `SOUND_PRIORITY` below) — callers ask "which one wins" instead of the
 * manager silently layering audio.
 */

export type SoundKey =
  | 'week-advance'
  | 'hero-fanfare'
  | 'tier-unlock'
  | 'notable-chime'
  | 'campaign-end'
  | 'warning';

const SOUND_FILES: Record<SoundKey, string> = {
  'week-advance': '/audio/week-advance.mp3',
  'hero-fanfare': '/audio/hero-fanfare.mp3',
  'tier-unlock': '/audio/tier-unlock.mp3',
  'notable-chime': '/audio/notable-chime.mp3',
  'campaign-end': '/audio/campaign-end.mp3',
  'warning': '/audio/warning.mp3',
};

/**
 * Highest-priority sound wins when several events land in the same week.
 * Lower index = higher priority. Only sounds actually wired by a caller
 * appear here in practice (see `pickHighestPriority`).
 */
const SOUND_PRIORITY: SoundKey[] = [
  'campaign-end',
  'hero-fanfare',
  'tier-unlock',
  'notable-chime',
  'week-advance',
  'warning',
];

export interface AudioSettings {
  muted: boolean;
  volume: number; // 0..1
}

const STORAGE_KEY = 'audio-settings';

// Sound ON by default, at low volume — decided in the Phase 4 PR-6 plan row.
const DEFAULT_SETTINGS: AudioSettings = {
  muted: false,
  volume: 0.4,
};

function clampVolume(volume: number): number {
  if (Number.isNaN(volume)) return DEFAULT_SETTINGS.volume;
  return Math.min(1, Math.max(0, volume));
}

function readSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      muted: typeof parsed.muted === 'boolean' ? parsed.muted : DEFAULT_SETTINGS.muted,
      volume: clampVolume(typeof parsed.volume === 'number' ? parsed.volume : DEFAULT_SETTINGS.volume),
    };
  } catch {
    // Corrupt/missing localStorage — fall back to defaults, never throw.
    return { ...DEFAULT_SETTINGS };
  }
}

function writeSettings(settings: AudioSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable (private mode, quota, etc.) — settings just won't
    // persist this session; never throw.
  }
}

type Listener = (settings: AudioSettings) => void;

class AudioManager {
  private settings: AudioSettings = readSettings();
  private unlocked = false;
  private cache = new Map<SoundKey, HTMLAudioElement>();
  private listeners = new Set<Listener>();
  private unlockHandlersAttached = false;

  constructor() {
    this.attachUnlockHandlers();
  }

  /** Arms playback on the first user gesture (autoplay-policy safety). */
  private attachUnlockHandlers(): void {
    if (this.unlockHandlersAttached || typeof window === 'undefined') return;
    this.unlockHandlersAttached = true;

    const unlock = () => {
      this.unlocked = true;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
  }

  private getOrCreateAudio(key: SoundKey): HTMLAudioElement | null {
    let audio = this.cache.get(key);
    if (audio) return audio;

    try {
      audio = new Audio(SOUND_FILES[key]);
      audio.preload = 'auto';
      this.cache.set(key, audio);
      return audio;
    } catch {
      // Missing asset / Audio unavailable (e.g. jsdom without a mock) — no-op.
      return null;
    }
  }

  /** Preloads all six assets. Safe to call repeatedly; safe before unlock. */
  preloadAll(): void {
    (Object.keys(SOUND_FILES) as SoundKey[]).forEach((key) => this.getOrCreateAudio(key));
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  setMuted(muted: boolean): void {
    this.settings = { ...this.settings, muted };
    writeSettings(this.settings);
    this.notify();
  }

  toggleMuted(): void {
    this.setMuted(!this.settings.muted);
  }

  setVolume(volume: number): void {
    this.settings = { ...this.settings, volume: clampVolume(volume) };
    writeSettings(this.settings);
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.getSettings()));
  }

  /**
   * Plays a sound by key. Silently no-ops (never throws, never logs) when:
   *  - audio hasn't been unlocked by a user gesture yet
   *  - the manager is muted or volume is 0
   *  - the asset is missing / Audio() failed to construct
   *  - `play()` rejects (still blocked by autoplay policy, decoding error, etc.)
   */
  playSound(key: SoundKey): void {
    if (!this.unlocked) return;
    if (this.settings.muted) return;

    const audio = this.getOrCreateAudio(key);
    if (!audio) return;

    try {
      audio.currentTime = 0;
      audio.volume = this.settings.volume;
      const playResult = audio.play();
      // HTMLAudioElement.play() returns a Promise in modern browsers; guard
      // for environments where it doesn't (or returns undefined in mocks).
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch(() => {
          // Autoplay-policy rejection or decode error — swallow silently.
        });
      }
    } catch {
      // Never throw from playSound.
    }
  }

  /**
   * Given a set of candidate sound keys that fired for the same event
   * (e.g. a week that has both a tier unlock and a hero chart debut), plays
   * only the single highest-priority one.
   */
  playHighestPriority(candidates: SoundKey[]): void {
    if (candidates.length === 0) return;
    const winner = SOUND_PRIORITY.find((key) => candidates.includes(key));
    if (winner) this.playSound(winner);
  }
}

export const audioManager = new AudioManager();

// TODO(phase4): wire notable-chime/warning in PR-3 reveal sequence.

/** Convenience free function mirroring `audioManager.playSound`. */
export function playSound(key: SoundKey): void {
  audioManager.playSound(key);
}

/** Convenience free function mirroring `audioManager.playHighestPriority`. */
export function playHighestPrioritySound(candidates: SoundKey[]): void {
  audioManager.playHighestPriority(candidates);
}
