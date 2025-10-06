import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
	duration?: number;
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	function show(message: string, type: ToastType = 'info', duration = 5000) {
		const id = `toast-${Date.now()}-${Math.random()}`;
		const toast: Toast = { id, message, type, duration };

		update((toasts) => [...toasts, toast]);

		if (duration > 0) {
			setTimeout(() => {
				dismiss(id);
			}, duration);
		}

		return id;
	}

	function dismiss(id: string) {
		update((toasts) => toasts.filter((t) => t.id !== id));
	}

	return {
		subscribe,
		success: (message: string, duration?: number) => show(message, 'success', duration),
		error: (message: string, duration?: number) => show(message, 'error', duration),
		warning: (message: string, duration?: number) => show(message, 'warning', duration),
		info: (message: string, duration?: number) => show(message, 'info', duration),
		dismiss
	};
}

export const toast = createToastStore();
