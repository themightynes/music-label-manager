/**
 * Vitest Setup File
 *
 * This file runs before all tests to configure the testing environment.
 * It sets up global test utilities, extends matchers, and provides
 * common test helpers for the Music Label Manager test suite.
 */

import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { setupDatabase, clearDatabase, createTestDatabase, closeDatabaseConnection } from './helpers/test-db';

// Extend Vitest's expect with jest-dom matchers
// This adds custom matchers like toBeInTheDocument, toHaveClass, etc.
expect.extend(matchers);

// Set up database before all tests
beforeAll(async () => {
  console.log('[Test Setup] Initializing database...');
  await setupDatabase();
  console.log('[Test Setup] Database ready!');
});

// Clean up database after all tests
afterAll(async () => {
  console.log('[Test Cleanup] Closing database connection...');
  await closeDatabaseConnection();
  console.log('[Test Cleanup] Done!');
});

// Cleanup after each test to prevent memory leaks
// This unmounts React components and clears the DOM
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia (required for responsive components)
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
