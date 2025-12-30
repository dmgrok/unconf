/**
 * Vitest setup file for unit tests
 * Configures global test environment and mocks
 */

import { vi } from 'vitest';

// Mock browser globals if needed
global.fetch = vi.fn();

// Set up any global test configuration here
