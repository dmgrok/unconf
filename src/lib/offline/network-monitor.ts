/**
 * Network connectivity monitoring and offline detection
 */

import { writable, derived } from 'svelte/store';

export type NetworkStatus = 'online' | 'offline' | 'unstable';

export interface NetworkState {
	status: NetworkStatus;
	isOnline: boolean;
	effectiveType?: string; // 'slow-2g', '2g', '3g', '4g'
	downlink?: number; // Mbps
	rtt?: number; // Round trip time in ms
	saveData?: boolean;
	lastOnline: Date | null;
	lastOffline: Date | null;
}

const initialState: NetworkState = {
	status: typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline',
	isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
	lastOnline: null,
	lastOffline: null
};

export const networkState = writable<NetworkState>(initialState);

// Derived stores
export const isOnline = derived(networkState, ($state) => $state.isOnline);
export const isOffline = derived(networkState, ($state) => !$state.isOnline);
export const isUnstable = derived(networkState, ($state) => $state.status === 'unstable');

class NetworkMonitor {
	private pingInterval: NodeJS.Timeout | null = null;
	private pingUrl: string = '/api/ping';
	private pingIntervalMs: number = 30000; // 30 seconds
	private failedPings: number = 0;
	private maxFailedPings: number = 3;

	constructor() {
		if (typeof window !== 'undefined') {
			this.setupEventListeners();
			this.updateConnectionInfo();
			this.startPinging();
		}
	}

	private setupEventListeners(): void {
		window.addEventListener('online', this.handleOnline);
		window.addEventListener('offline', this.handleOffline);

		// Connection quality monitoring
		if ('connection' in navigator) {
			const connection = (navigator as any).connection;
			if (connection) {
				connection.addEventListener('change', this.handleConnectionChange);
			}
		}

		// Visibility change detection
		document.addEventListener('visibilitychange', this.handleVisibilityChange);
	}

	private handleOnline = (): void => {
		this.failedPings = 0;
		networkState.update((state) => ({
			...state,
			status: 'online',
			isOnline: true,
			lastOnline: new Date()
		}));
		this.dispatchEvent('online');
	};

	private handleOffline = (): void => {
		networkState.update((state) => ({
			...state,
			status: 'offline',
			isOnline: false,
			lastOffline: new Date()
		}));
		this.dispatchEvent('offline');
	};

	private handleConnectionChange = (): void => {
		this.updateConnectionInfo();
	};

	private handleVisibilityChange = (): void => {
		if (!document.hidden) {
			// Page became visible, verify connection
			this.verifyConnection();
		}
	};

	private updateConnectionInfo(): void {
		if ('connection' in navigator) {
			const connection = (navigator as any).connection;
			if (connection) {
				networkState.update((state) => ({
					...state,
					effectiveType: connection.effectiveType,
					downlink: connection.downlink,
					rtt: connection.rtt,
					saveData: connection.saveData
				}));

				// Check if connection is unstable
				const isUnstable =
					connection.effectiveType === 'slow-2g' ||
					connection.effectiveType === '2g' ||
					connection.rtt > 1000;

				if (isUnstable && state.isOnline) {
					networkState.update((s) => ({ ...s, status: 'unstable' }));
					this.dispatchEvent('unstable');
				}
			}
		}
	}

	private async verifyConnection(): Promise<boolean> {
		try {
			const response = await fetch(this.pingUrl, {
				method: 'HEAD',
				cache: 'no-cache'
			});

			if (response.ok) {
				if (this.failedPings > 0) {
					// Recovered from failed pings
					this.handleOnline();
				}
				this.failedPings = 0;
				return true;
			} else {
				this.handlePingFailure();
				return false;
			}
		} catch (error) {
			this.handlePingFailure();
			return false;
		}
	}

	private handlePingFailure(): void {
		this.failedPings++;

		if (this.failedPings >= this.maxFailedPings) {
			// Consider offline after multiple failures
			if (navigator.onLine) {
				// Navigator says online but pings failing - unstable
				networkState.update((state) => ({
					...state,
					status: 'unstable'
				}));
				this.dispatchEvent('unstable');
			} else {
				this.handleOffline();
			}
		}
	}

	private startPinging(): void {
		this.pingInterval = setInterval(() => {
			this.verifyConnection();
		}, this.pingIntervalMs);
	}

	private dispatchEvent(type: 'online' | 'offline' | 'unstable'): void {
		if (typeof window !== 'undefined') {
			window.dispatchEvent(
				new CustomEvent(`network-${type}`, {
					detail: { timestamp: new Date() }
				})
			);
		}
	}

	public destroy(): void {
		if (this.pingInterval) {
			clearInterval(this.pingInterval);
		}

		if (typeof window !== 'undefined') {
			window.removeEventListener('online', this.handleOnline);
			window.removeEventListener('offline', this.handleOffline);
			document.removeEventListener('visibilitychange', this.handleVisibilityChange);

			if ('connection' in navigator) {
				const connection = (navigator as any).connection;
				if (connection) {
					connection.removeEventListener('change', this.handleConnectionChange);
				}
			}
		}
	}
}

// Singleton instance
let monitorInstance: NetworkMonitor | null = null;

export function startNetworkMonitoring(): NetworkMonitor {
	if (!monitorInstance) {
		monitorInstance = new NetworkMonitor();
	}
	return monitorInstance;
}

export function stopNetworkMonitoring(): void {
	if (monitorInstance) {
		monitorInstance.destroy();
		monitorInstance = null;
	}
}

// Utility functions
export function getNetworkQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
	const state = networkState;
	let currentState: NetworkState;

	state.subscribe((value) => {
		currentState = value;
	})();

	if (!currentState!.isOnline) {
		return 'poor';
	}

	const rtt = currentState!.rtt || 0;
	const effectiveType = currentState!.effectiveType;

	if (effectiveType === '4g' && rtt < 100) {
		return 'excellent';
	} else if (effectiveType === '4g' || (effectiveType === '3g' && rtt < 300)) {
		return 'good';
	} else if (effectiveType === '3g' || effectiveType === '2g') {
		return 'fair';
	} else {
		return 'poor';
	}
}

export function shouldReduceData(): boolean {
	let currentState: NetworkState;

	networkState.subscribe((value) => {
		currentState = value;
	})();

	return (
		currentState!.saveData ||
		currentState!.effectiveType === 'slow-2g' ||
		currentState!.effectiveType === '2g'
	);
}
