import { vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import {
	setupWebSocketMocks,
	resetWebSocketMocks,
	MockSocketIOClient
} from '../mocks/websocket';
import {
	setupAuthMocks,
	resetAuthMocks,
	authStateManager,
	type MockUser
} from '../mocks/auth';
import type { MockEvent } from '../fixtures/events';
import type { MockTopic } from '../fixtures/topics';

export interface TestEnvironment {
	// WebSocket related
	createSocketClient: () => MockSocketIOClient;

	// Authentication related
	authManager: typeof authStateManager;
	authenticateAs: (userType: keyof typeof import('../mocks/auth').mockUsers) => void;
	signOut: () => void;

	// Event management
	currentEvent: MockEvent | null;
	setCurrentEvent: (event: MockEvent) => void;
	clearCurrentEvent: () => void;

	// Test data management
	testData: {
		events: MockEvent[];
		topics: MockTopic[];
		users: MockUser[];
	};
	addTestData: (type: 'events' | 'topics' | 'users', data: any) => void;
	clearTestData: () => void;

	// Environment state
	reset: () => void;
	cleanup: () => void;
}

class TestEnvironmentManager implements TestEnvironment {
	public authManager = authStateManager;
	public currentEvent: MockEvent | null = null;
	public testData: TestEnvironment['testData'] = {
		events: [],
		topics: [],
		users: []
	};

	constructor() {
		this.setupGlobalMocks();
	}

	private setupGlobalMocks(): void {
		// Setup WebSocket mocks
		setupWebSocketMocks();

		// Setup Auth mocks
		setupAuthMocks();

		// Mock global objects
		Object.defineProperty(window, 'location', {
			value: {
				href: 'http://localhost:5173/',
				origin: 'http://localhost:5173',
				pathname: '/',
				search: '',
				hash: ''
			},
			writable: true
		});

		// Mock localStorage
		const localStorageMock = {
			store: new Map<string, string>(),
			getItem: vi.fn((key: string) => localStorageMock.store.get(key) || null),
			setItem: vi.fn((key: string, value: string) => {
				localStorageMock.store.set(key, value);
			}),
			removeItem: vi.fn((key: string) => {
				localStorageMock.store.delete(key);
			}),
			clear: vi.fn(() => {
				localStorageMock.store.clear();
			}),
			length: 0,
			key: vi.fn(() => null)
		};

		Object.defineProperty(window, 'localStorage', {
			value: localStorageMock,
			writable: true
		});

		// Mock sessionStorage
		Object.defineProperty(window, 'sessionStorage', {
			value: localStorageMock,
			writable: true
		});

		// Mock fetch for API calls
		global.fetch = vi.fn();
	}

	createSocketClient(): MockSocketIOClient {
		return new MockSocketIOClient('http://localhost:3001');
	}

	authenticateAs(userType: keyof typeof import('../mocks/auth').mockUsers): void {
		this.authManager.authenticateAs(userType);
	}

	signOut(): void {
		this.authManager.signOut();
	}

	setCurrentEvent(event: MockEvent): void {
		this.currentEvent = event;
	}

	clearCurrentEvent(): void {
		this.currentEvent = null;
	}

	addTestData(type: 'events' | 'topics' | 'users', data: any): void {
		this.testData[type].push(data);
	}

	clearTestData(): void {
		this.testData.events = [];
		this.testData.topics = [];
		this.testData.users = [];
	}

	reset(): void {
		// Reset all mocks
		resetWebSocketMocks();
		resetAuthMocks();

		// Reset WebSocket mocks
		resetWebSocketMocks();

		// Clear test data
		this.clearTestData();
		this.clearCurrentEvent();

		// Clear localStorage and sessionStorage
		window.localStorage.clear();
		window.sessionStorage.clear();

		// Reset fetch mock
		vi.mocked(global.fetch).mockReset();
	}

	cleanup(): void {
		cleanup(); // Svelte Testing Library cleanup
		this.reset();
	}
}

// Global test environment instance
export const testEnv = new TestEnvironmentManager();

// Test setup helpers
export function setupTestEnvironment() {
	beforeAll(() => {
		console.log('🧪 Setting up test environment...');
	});

	beforeEach(() => {
		testEnv.reset();
	});

	afterEach(() => {
		testEnv.cleanup();
	});

	afterAll(() => {
		console.log('🧹 Cleaning up test environment...');
	});
}

// Convenience functions for common test setups
export function setupAuthenticatedTest(userType: keyof typeof import('../mocks/auth').mockUsers = 'participant') {
	beforeEach(() => {
		testEnv.authenticateAs(userType);
	});
}

export function setupEventTest(event: MockEvent) {
	beforeEach(() => {
		testEnv.setCurrentEvent(event);
	});
}

export function setupWebSocketTest() {
	beforeEach(() => {
		// Ensure WebSocket server is clean
		// Note: WebSocket mocks are reset in global setup
	});
}

// Multi-user test setup
export function setupMultiUserTest(userCount: number = 3) {
	const clients: MockSocketIOClient[] = [];

	beforeEach(() => {
		// Create multiple socket clients
		for (let i = 0; i < userCount; i++) {
			const client = testEnv.createSocketClient();
			clients.push(client);
		}
	});

	afterEach(() => {
		// Disconnect all clients
		clients.forEach(client => client.disconnect());
		clients.length = 0;
	});

	return () => clients;
}

// Performance test setup
export function setupPerformanceTest() {
	let startTime: number;
	let endTime: number;

	beforeEach(() => {
		startTime = performance.now();
	});

	afterEach(() => {
		endTime = performance.now();
		const duration = endTime - startTime;
		console.log(`Test execution time: ${duration.toFixed(2)}ms`);
	});

	return {
		getExecutionTime: () => endTime - startTime
	};
}

// Error handling test setup
export function setupErrorHandlingTest() {
	const errors: Error[] = [];
	const originalConsoleError = console.error;

	beforeEach(() => {
		// Capture console errors
		console.error = vi.fn((...args) => {
			if (args[0] instanceof Error) {
				errors.push(args[0]);
			}
		});
	});

	afterEach(() => {
		console.error = originalConsoleError;
		errors.length = 0;
	});

	return {
		getErrors: () => [...errors],
		hasErrors: () => errors.length > 0
	};
}

// Network simulation helpers
export function simulateNetworkConditions(condition: 'slow' | 'offline' | 'unreliable') {
	beforeEach(() => {
		switch (condition) {
			case 'slow':
				// Mock slow network responses
				vi.mocked(global.fetch).mockImplementation((...args) => {
					return new Promise((resolve) => {
						setTimeout(() => {
							resolve(new Response('{}', { status: 200 }));
						}, 2000); // 2 second delay
					});
				});
				break;

			case 'offline':
				// Mock network unavailable
				vi.mocked(global.fetch).mockRejectedValue(new Error('Network unavailable'));
				break;

			case 'unreliable':
				// Mock unreliable network (random failures)
				vi.mocked(global.fetch).mockImplementation((...args) => {
					if (Math.random() < 0.3) { // 30% failure rate
						return Promise.reject(new Error('Network timeout'));
					}
					return Promise.resolve(new Response('{}', { status: 200 }));
				});
				break;
		}
	});
}

// Load testing helpers
export function setupLoadTest(concurrentUsers: number = 10) {
	const sockets: MockSocketIOClient[] = [];

	beforeEach(() => {
		console.log(`🚀 Setting up load test with ${concurrentUsers} concurrent users`);

		// Create multiple concurrent socket connections
		for (let i = 0; i < concurrentUsers; i++) {
			const socket = testEnv.createSocketClient();
			sockets.push(socket);
		}
	});

	afterEach(() => {
		// Cleanup all connections
		sockets.forEach(socket => socket.disconnect());
		sockets.length = 0;
	});

	return {
		getSockets: () => [...sockets],
		getSocketCount: () => sockets.length,
		simulateActivity: (activityFn: (socket: MockSocketIOClient, index: number) => void) => {
			sockets.forEach((socket, index) => {
				activityFn(socket, index);
			});
		}
	};
}

// Export convenience re-exports
export { testEnv as default };
export * from '../mocks/websocket';
export * from '../mocks/auth';
export * from '../fixtures/events';
export * from '../fixtures/topics';