/**
 * Comprehensive Accessibility Test Suite for UnConf Platform
 * Uses the accessibility runner to test all major pages and components
 */

import { createAccessibilityTests } from './accessibility-runner';

// Define all pages to test for accessibility
const PAGES_TO_TEST = [
  { url: '/', name: 'Home Page' },
  { url: '/events', name: 'Events List Page' },
  { url: '/about', name: 'About Page' },
  // Add more pages as they become available
  { url: '/events/demo-event', name: 'Event Details Page' },
];

// Create accessibility tests for all pages
createAccessibilityTests(PAGES_TO_TEST);