/**
 * WebSocket Connection Pool Manager
 * Optimizes connection management with pooling, throttling, and batching
 */

import { io, type Socket } from 'socket.io-client';

interface ConnectionConfig {
	url: string;
	maxConnections?: number;
	reconnectionAttempts?: number;
	reconnectionDelay?: number;
	timeout?: number;
	batchInterval?: number;
}

interface QueuedMessage {
	event: string;
	data: any;
	timestamp: number;
}

export class WebSocketConnectionPool {
	private config: Required<ConnectionConfig>;
	private connections: Map<string, Socket> = new Map();
	private messageQueue: QueuedMessage[] = [];
	private batchTimer: ReturnType<typeof setTimeout> | null = null;
	private isProcessing = false;

	constructor(config: ConnectionConfig) {
		this.config = {
			url: config.url,
			maxConnections: config.maxConnections || 5,
			reconnectionAttempts: config.reconnectionAttempts || 5,
			reconnectionDelay: config.reconnectionDelay || 1000,
			timeout: config.timeout || 10000,
			batchInterval: config.batchInterval || 100
		};
	}

	/**
	 * Get or create a connection for a specific event
	 */
	async getConnection(eventId: string): Promise<Socket> {
		// Reuse existing connection if available
		if (this.connections.has(eventId)) {
			const conn = this.connections.get(eventId)!;
			if (conn.connected) {
				return conn;
			}
		}

		// Check pool size limit
		if (this.connections.size >= this.config.maxConnections) {
			// Remove oldest inactive connection
			this.pruneInactiveConnections();
		}

		// Create new connection
		const socket = await this.createConnection(eventId);
		this.connections.set(eventId, socket);
		return socket;
	}

	/**
	 * Create optimized WebSocket connection
	 */
	private async createConnection(eventId: string): Promise<Socket> {
		return new Promise((resolve, reject) => {
			const socket = io(this.config.url, {
				transports: ['websocket', 'polling'],
				reconnection: true,
				reconnectionAttempts: this.config.reconnectionAttempts,
				reconnectionDelay: this.config.reconnectionDelay,
				reconnectionDelayMax: 5000,
				timeout: this.config.timeout,
				// Optimize for performance
				upgrade: true,
				rememberUpgrade: true,
				// Enable binary protocol for better performance
				parser: undefined,
				// Connection pooling
				multiplex: true,
				// Add custom headers
				extraHeaders: {
					'X-Event-ID': eventId
				}
			});

			const timeout = setTimeout(() => {
				socket.close();
				reject(new Error('Connection timeout'));
			}, this.config.timeout);

			socket.on('connect', () => {
				clearTimeout(timeout);
				console.log(`Connected to event ${eventId}`);
				resolve(socket);
			});

			socket.on('connect_error', (error) => {
				clearTimeout(timeout);
				console.error(`Connection error for event ${eventId}:`, error);
				reject(error);
			});

			// Setup reconnection handling
			socket.on('reconnect', (attemptNumber) => {
				console.log(`Reconnected to event ${eventId} after ${attemptNumber} attempts`);
			});

			socket.on('reconnect_failed', () => {
				console.error(`Failed to reconnect to event ${eventId}`);
				this.connections.delete(eventId);
			});
		});
	}

	/**
	 * Queue message for batched sending
	 */
	queueMessage(event: string, data: any): void {
		this.messageQueue.push({
			event,
			data,
			timestamp: Date.now()
		});

		// Start batch timer if not already running
		if (!this.batchTimer) {
			this.batchTimer = setTimeout(() => {
				this.processBatch();
			}, this.config.batchInterval);
		}
	}

	/**
	 * Process queued messages in batch
	 */
	private async processBatch(): Promise<void> {
		if (this.isProcessing || this.messageQueue.length === 0) {
			return;
		}

		this.isProcessing = true;
		this.batchTimer = null;

		const batch = [...this.messageQueue];
		this.messageQueue = [];

		try {
			// Group messages by event
			const grouped = batch.reduce(
				(acc, msg) => {
					if (!acc[msg.event]) {
						acc[msg.event] = [];
					}
					acc[msg.event].push(msg.data);
					return acc;
				},
				{} as Record<string, any[]>
			);

			// Send batched messages
			for (const [event, dataArray] of Object.entries(grouped)) {
				// Find appropriate connection
				const socket = Array.from(this.connections.values()).find((s) => s.connected);
				if (socket) {
					socket.emit(`${event}_batch`, dataArray);
				}
			}
		} catch (error) {
			console.error('Error processing message batch:', error);
			// Re-queue failed messages
			this.messageQueue.unshift(...batch);
		} finally {
			this.isProcessing = false;
		}
	}

	/**
	 * Remove inactive connections to free up pool space
	 */
	private pruneInactiveConnections(): void {
		for (const [eventId, socket] of this.connections.entries()) {
			if (!socket.connected) {
				socket.close();
				this.connections.delete(eventId);
				break; // Remove one at a time
			}
		}
	}

	/**
	 * Close specific connection
	 */
	closeConnection(eventId: string): void {
		const socket = this.connections.get(eventId);
		if (socket) {
			socket.close();
			this.connections.delete(eventId);
		}
	}

	/**
	 * Close all connections
	 */
	closeAll(): void {
		for (const socket of this.connections.values()) {
			socket.close();
		}
		this.connections.clear();

		if (this.batchTimer) {
			clearTimeout(this.batchTimer);
			this.batchTimer = null;
		}
	}

	/**
	 * Get connection statistics
	 */
	getStats() {
		return {
			totalConnections: this.connections.size,
			activeConnections: Array.from(this.connections.values()).filter((s) => s.connected).length,
			queuedMessages: this.messageQueue.length,
			maxConnections: this.config.maxConnections
		};
	}
}

// Singleton instance
let poolInstance: WebSocketConnectionPool | null = null;

export function getConnectionPool(url?: string): WebSocketConnectionPool {
	if (!poolInstance && url) {
		poolInstance = new WebSocketConnectionPool({ url });
	}
	if (!poolInstance) {
		throw new Error('Connection pool not initialized. Provide URL on first call.');
	}
	return poolInstance;
}

export function resetConnectionPool(): void {
	if (poolInstance) {
		poolInstance.closeAll();
		poolInstance = null;
	}
}
