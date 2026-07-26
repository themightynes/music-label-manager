/**
 * Unit Tests for marketingUtils icon-name maps (C52b consolidation)
 *
 * shared/utils/marketingUtils is the single source of truth for channel and
 * release-type icon NAMES. It must stay framework-agnostic: plain lucide icon
 * name strings only (the client maps name → component), never Font Awesome
 * class strings and never imported icon components.
 *
 * Pure unit tests - no dependencies required.
 */

import { describe, it, expect } from 'vitest';
import {
  CHANNEL_ICON_NAMES,
  DEFAULT_CHANNEL_ICON_NAME,
  RELEASE_TYPE_ICON_NAMES,
  DEFAULT_RELEASE_TYPE_ICON_NAME,
  getChannelIconName,
  getReleaseTypeIconName
} from '@shared/utils/marketingUtils';

describe('marketingUtils - Icon Name Maps', () => {
  describe('getChannelIconName()', () => {
    it('should return canonical lucide names for known channels', () => {
      expect(getChannelIconName('radio')).toBe('radio');
      expect(getChannelIconName('digital')).toBe('megaphone');
      expect(getChannelIconName('pr')).toBe('newspaper');
      expect(getChannelIconName('influencer')).toBe('users');
    });

    it('should fall back to the default icon name for unknown channels', () => {
      expect(getChannelIconName('carrier-pigeon')).toBe(DEFAULT_CHANNEL_ICON_NAME);
      expect(getChannelIconName('')).toBe(DEFAULT_CHANNEL_ICON_NAME);
    });
  });

  describe('getReleaseTypeIconName()', () => {
    it('should return canonical lucide names for known release types', () => {
      expect(getReleaseTypeIconName('single')).toBe('music');
      expect(getReleaseTypeIconName('ep')).toBe('award');
      expect(getReleaseTypeIconName('album')).toBe('star');
    });

    it('should fall back to the default icon name for unknown types', () => {
      expect(getReleaseTypeIconName('mixtape')).toBe(DEFAULT_RELEASE_TYPE_ICON_NAME);
    });
  });

  describe('framework-agnostic contract', () => {
    it('should expose plain strings, never FA class strings or components', () => {
      const allNames = [
        ...Object.values(CHANNEL_ICON_NAMES),
        ...Object.values(RELEASE_TYPE_ICON_NAMES),
        DEFAULT_CHANNEL_ICON_NAME,
        DEFAULT_RELEASE_TYPE_ICON_NAME
      ];

      for (const name of allNames) {
        expect(typeof name).toBe('string');
        expect(name).not.toMatch(/^fa[srlb]? /); // no Font Awesome class strings
        expect(name).toMatch(/^[a-z][a-z0-9-]*$/); // kebab-case lucide icon name
      }
    });
  });
});
