import { vi, type MockedFunction } from 'vitest';
import type {
	ServerToClientEvents,
	ClientToServerEvents,
	AckResponse,
	VoteUpdateData,
	ActivitySwitchNotification,
	UserCountData,
	ConnectionStatusData
} from '../../lib/websocket/types';

export class MockWebSocket {
	static CONNECTING = 0;
	static OPEN = 1;
	static CLOSING = 2;
	static CLOSED = 3;

	public readyState = MockWebSocket.CONNECTING;
	public url: string;
	public protocol: string;
	public onopen: ((event: Event) => void) | null = null;
	public onclose: ((event: CloseEvent) => void) | null = null;
	public onmessage: ((event: MessageEvent) => void) | null = null;
	public onerror: ((event: Event) => void) | null = null;

	private listeners: Map<string, Function[]> = new Map();
	private sentMessages: any[] = [];

	constructor(url: string, protocol?: string) {
		this.url = url;
		this.protocol = protocol || '';

		// Simulate connection opening
		setTimeout(() => {
			this.readyState = MockWebSocket.OPEN;
			this.onopen?.({ type: 'open' } as Event);
			this.dispatchEvent('open', { type: 'open' });
		}, 10);
	}

	send = vi.fn((data: string | ArrayBuffer | Blob) => {
		if (this.readyState !== MockWebSocket.OPEN) {
			throw new Error('WebSocket is not open');
		}
		this.sentMessages.push(data);
	});

	close = vi.fn((code?: number, reason?: string) => {
		this.readyState = MockWebSocket.CLOSING;
		setTimeout(() => {
			this.readyState = MockWebSocket.CLOSED;
			const closeEvent = { type: 'close', code: code || 1000, reason: reason || '' } as CloseEvent;
			this.onclose?.(closeEvent);
			this.dispatchEvent('close', closeEvent);
		}, 10);
	});

	addEventListener = vi.fn((type: string, listener: Function) => {
		if (!this.listeners.has(type)) {
			this.listeners.set(type, []);
		}
		this.listeners.get(type)?.push(listener);
	});

	removeEventListener = vi.fn((type: string, listener: Function) => {
		const listeners = this.listeners.get(type);
		if (listeners) {
			const index = listeners.indexOf(listener);
			if (index > -1) {
				listeners.splice(index, 1);
			}
		}
	});

	dispatchEvent = vi.fn((type: string, event: any) => {
		const listeners = this.listeners.get(type);
		listeners?.forEach(listener => listener(event));
	});

	// Helper methods for testing
	simulateMessage(data: any) {
		const message = { type: 'message', data: JSON.stringify(data) } as MessageEvent;
		this.onmessage?.(message);
		this.dispatchEvent('message', message);
	}

	simulateError() {
		const error = { type: 'error' } as Event;
		this.onerror?.(error);
		this.dispatchEvent('error', error);
	}

	// Get sent messages for verification
	getSentMessages(): any[] {
		return [...this.sentMessages];
	}

	// Clear sent messages
	clearSentMessages(): void {
		this.sentMessages = [];
	}

	// Simulate reconnection
	simulateReconnection(): void {
		this.readyState = MockWebSocket.CONNECTING;
		setTimeout(() => {
			this.readyState = MockWebSocket.OPEN;
			this.onopen?.({ type: 'open' } as Event);
			this.dispatchEvent('open', { type: 'open' });
		}, 100);
	}

	// Simulate network reconnection for Socket.IO client
	simulateReconnect(): void {
		this.simulateReconnection();
	}
}

// Mock Socket.IO client
export class MockSocketIOClient {
	public id: string;
	public connected: boolean = false;
	public disconnected: boolean = true;

	private eventHandlers: Map<string, Function[]> = new Map();
	private url: string;
	private emittedEvents: Array<{ event: string; data: any; callback?: Function }> = [];

	constructor(url: string, options?: any) {
		this.url = url;
		this.id = `client_${Date.now()}_${Math.random()}`;

		// Simulate connection after a short delay
		setTimeout(() => this.simulateConnect(), 10);
	}

	on = vi.fn((event: string, handler: Function) => {
		if (!this.eventHandlers.has(event)) {
			this.eventHandlers.set(event, []);
		}
		this.eventHandlers.get(event)!.push(handler);
		return this;
	});

	off = vi.fn((event: string, handler?: Function) => {
		if (handler) {
			const handlers = this.eventHandlers.get(event);
			if (handlers) {
				const index = handlers.indexOf(handler);
				if (index > -1) {
					handlers.splice(index, 1);
				}
			}
		} else {
			this.eventHandlers.delete(event);
		}
		return this;
	});

	emit = vi.fn((event: string, ...args: any[]) => {
		const callback = args.find(arg => typeof arg === 'function');
		const data = args.filter(arg => typeof arg !== 'function');

		this.emittedEvents.push({ event, data: data[0], callback });

		// Simulate server response for common events
		if (callback) {
			setTimeout(() => {
				switch (event) {
					case 'join_event':
						callback({ success: true, message: 'Joined successfully' });
						break;
					case 'submit_vote':
						callback({ success: true, message: 'Vote submitted' });
						break;
					case 'switch_activity':
						callback({ success: true, message: 'Activity switched' });
						break;
					case 'heartbeat':
						callback({
							serverTime: new Date().toISOString(),
							eventStatus: 'active'
						});
						break;
					default:
						callback({ success: true });
				}
			}, 10);
		}

		return this;
	});

	disconnect = vi.fn(() => {
		this.connected = false;
		this.disconnected = true;
		this.triggerEvent('disconnect', 'client namespace disconnect');
		return this;
	});

	connect = vi.fn(() => {
		this.simulateConnect();
		return this;
	});

	// Test helper methods
	simulateConnect(): void {
		this.connected = true;
		this.disconnected = false;
		this.triggerEvent('connect');
	}

	simulateDisconnect(reason: string = 'transport close'): void {
		this.connected = false;
		this.disconnected = true;
		this.triggerEvent('disconnect', reason);
	}

	simulateError(error: Error): void {
		this.triggerEvent('connect_error', error);
	}

	simulateMessage(event: string, data: any): void {
		this.triggerEvent(event, data);
	}

	triggerEvent(event: string, ...args: any[]): void {
		const handlers = this.eventHandlers.get(event);
		if (handlers) {
			handlers.forEach(handler => {
				try {
					handler(...args);
				} catch (error) {
					console.error(`Error in mock socket event handler for ${event}:`, error);
				}
			});
		}
	}

	// Verification methods for tests
	getEmittedEvents(): Array<{ event: string; data: any; callback?: Function }> {
		return [...this.emittedEvents];
	}

	clearEmittedEvents(): void {
		this.emittedEvents = [];
	}

	hasEmittedEvent(event: string): boolean {
		return this.emittedEvents.some(e => e.event === event);
	}

	getEmittedEventData(event: string): any[] {
		return this.emittedEvents
			.filter(e => e.event === event)
			.map(e => e.data);
	}

	// Add reconnection method for compatibility
	simulateReconnection(): void {
		this.connected = false;
		this.disconnected = true;
		this.triggerEvent('disconnect', 'transport close');

		setTimeout(() => {
			this.connected = true;
			this.disconnected = false;
			this.triggerEvent('connect');
		}, 100);
	}
}

export const mockSocketIO = {
	connect: vi.fn((url: string, options?: any) => new MockSocketIOClient(url, options)),
	io: vi.fn((url: string, options?: any) => new MockSocketIOClient(url, options))
};

// Setup WebSocket mocks
export function setupWebSocketMocks() {
	// @ts-ignore
	global.WebSocket = MockWebSocket;
	vi.mock('socket.io-client', () => mockSocketIO);
}

export function resetWebSocketMocks() {
	vi.clearAllMocks();
}