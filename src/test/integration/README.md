# Integration Tests for Real-Time Activity Switching

This directory contains comprehensive integration tests for the UnConf participant dashboard and real-time features.

## Test Suites

### 1. Activity Switching Tests (`activity-switching.test.ts`)

Tests for real-time activity interface switching:

- **Activity Interface Rendering**
  - Correct interface for each activity type (voting, games, discussion, teams)
  - No activity state handling
  - Unknown activity type handling

- **Real-time Activity Switching**
  - Switching between different activity types
  - Rapid consecutive switches
  - Component state preservation during switches

- **Performance**
  - Sub-100ms activity switch timing
  - Multiple concurrent instance handling
  - Memory leak prevention

- **Error Handling**
  - Null event handling
  - Missing data handling
  - Invalid activity types
  - Graceful degradation

- **Event Dispatching**
  - Activity change events
  - State update events from child components

### 2. Connection Handling Tests (`connection-handling.test.ts`)

Tests for offline support and connection recovery:

- **Network Monitoring**
  - Online/offline detection
  - Status tracking
  - Timestamp recording

- **Action Queue**
  - Offline action queuing
  - LocalStorage persistence
  - Automatic sync on reconnection
  - Retry logic with exponential backoff
  - Failed action handling

- **Connection Health Monitor**
  - Component rendering
  - Visual indicator states
  - Status change event emission

- **Offline Manager**
  - Queue viewer integration
  - Auto-sync functionality
  - End-to-end offline flow

### 3. Event Validation Tests (`event-validation.test.ts`)

Tests for event joining and participation validation:

- **Access Code Validation**
  - Correct/incorrect codes
  - Empty code handling
  - Whitespace trimming

- **Capacity Validation**
  - Under/at/over capacity
  - Unlimited capacity handling

- **Guest Access Validation**
  - Guest access enabled/disabled
  - Registered user access

- **Voting Limits**
  - Under/at limit validation
  - Error details and recovery

- **Permission Validation**
  - Role hierarchy checking
  - Insufficient permissions

- **Comprehensive Join Validation**
  - Complete validation flow
  - Multiple failing conditions
  - Validation order

## Running Tests

### Run all integration tests:
```bash
npm run test:integration
```

### Run specific test suite:
```bash
npm run test -- activity-switching
npm run test -- connection-handling
npm run test -- event-validation
```

### Run with coverage:
```bash
npm run test:coverage
```

### Watch mode for development:
```bash
npm run test:watch
```

## Test Coverage Goals

- **Activity Switching**: >90% coverage
- **Connection Handling**: >85% coverage
- **Event Validation**: >95% coverage

## Performance Benchmarks

The tests verify these performance targets:

- Activity switching: <100ms
- Concurrent switches (10 instances): <500ms
- Network status detection: <50ms
- Action queue sync: <1s per action

## Key Features Tested

### Real-time Updates
- Sub-second activity switching
- WebSocket event handling
- State synchronization across components

### Offline Support
- Network status monitoring
- Action queuing and persistence
- Automatic recovery
- Retry mechanisms

### Validation & Error Handling
- Comprehensive input validation
- User-friendly error messages
- Recovery suggestions
- Edge case handling

### Responsive Design
- Component rendering across devices
- Mobile-specific behaviors
- Accessibility features

## CI/CD Integration

These tests run automatically on:
- Pull request creation
- Commit to main branch
- Pre-deployment verification

## Adding New Tests

When adding new integration tests:

1. Follow existing test structure
2. Use descriptive test names
3. Include setup and teardown
4. Mock external dependencies
5. Test both success and failure cases
6. Verify error messages and recovery
7. Check performance where relevant

## Mock Data

Standard mock data is available in `../mocks/`:
- Events
- Users
- Topics
- WebSocket connections

## Troubleshooting

### Tests Timing Out
- Increase timeout in test config
- Check for missing async/await
- Verify mock responses

### Flaky Tests
- Check for race conditions
- Ensure proper cleanup
- Use waitFor for async operations

### Memory Leaks
- Verify cleanup in afterEach
- Check event listener removal
- Stop intervals and timeouts
