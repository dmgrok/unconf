import { describe, it, expect } from 'vitest';
import { mockUser, mockSession } from './mocks/auth';
import { MockWebSocket } from './mocks/websocket';

describe('Test Infrastructure', () => {
	it('should have working vitest setup', () => {
		expect(1 + 1).toBe(2);
	});

	it('should provide mock auth utilities', () => {
		expect(mockUser).toMatchObject({
			id: 'participant-1',
			email: 'participant@example.com',
			name: 'Test Participant'
		});

		expect(mockSession).toMatchObject({
			user: mockUser
		});
	});

	it('should provide mock WebSocket', () => {
		const ws = new MockWebSocket('ws://localhost');
		expect(ws).toBeInstanceOf(MockWebSocket);
		expect(ws.url).toBe('ws://localhost');
		expect(ws.readyState).toBe(MockWebSocket.CONNECTING);
	});

	it('should simulate WebSocket connection', async () => {
		const ws = new MockWebSocket('ws://localhost');
		let opened = false;

		ws.onopen = () => {
			opened = true;
		};

		// Wait for connection to open
		await new Promise(resolve => setTimeout(resolve, 20));

		expect(opened).toBe(true);
		expect(ws.readyState).toBe(MockWebSocket.OPEN);
	});
});