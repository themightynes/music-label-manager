/**
 * Vitest Setup — DB-free base (client project).
 *
 * Shared, database-free environment setup: jest-dom matchers, React Testing
 * Library cleanup, and browser API mocks. The "client" vitest project uses this
 * file directly so pure client/unit tests run WITHOUT the Docker test DB (C50).
 * The "db" project's setup (./setup.ts) imports this file and layers the
 * database lifecycle hooks on top.
 */

import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Extend Vitest's expect with jest-dom matchers
// The import above automatically adds custom matchers like toBeInTheDocument, toHaveClass, etc.

// Cleanup after each test to prevent memory leaks
// This unmounts React components and clears the DOM
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia (required for responsive components).
// Guard on `window` so node-environment tests (e.g. HTTP-layer endpoint
// characterization tests using `@vitest-environment node`) can share this setup.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Mock IntersectionObserver (used by some UI components)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver (used by some UI components)
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;
