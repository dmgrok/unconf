import { render, type RenderOptions } from '@testing-library/svelte';
import type { ComponentProps, SvelteComponent } from 'svelte';

// Custom render function with common providers/wrappers
export function renderWithProviders<T extends SvelteComponent>(
	component: new (...args: any[]) => T,
	options?: RenderOptions<ComponentProps<T>>
) {
	return render(component, options);
}

// Mock data generators
export const mockUser = {
	id: 'test-user-id',
	email: 'test@example.com',
	name: 'Test User'
};

export const mockSession = {
	user: mockUser,
	expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
};

// Test helpers
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const createMockEvent = (type: string, detail?: any) =>
	new CustomEvent(type, { detail });

// Mock localStorage
export const mockLocalStorage = {
	store: new Map<string, string>(),
	getItem: function(key: string) {
		return this.store.get(key) || null;
	},
	setItem: function(key: string, value: string) {
		this.store.set(key, value);
	},
	removeItem: function(key: string) {
		this.store.delete(key);
	},
	clear: function() {
		this.store.clear();
	}
};