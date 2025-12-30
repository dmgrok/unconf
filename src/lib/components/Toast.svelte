<script lang="ts">
	import { toast, type Toast } from '$lib/stores/toast';
	import { fade, fly } from 'svelte/transition';
	import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-svelte';

	let toasts: Toast[] = [];
	toast.subscribe((value: Toast[]) => (toasts = value));

	function getIcon(type: Toast['type']) {
		switch (type) {
			case 'success':
				return CheckCircle;
			case 'error':
				return XCircle;
			case 'warning':
				return AlertTriangle;
			case 'info':
				return Info;
		}
	}

	function getColorClass(type: Toast['type']) {
		switch (type) {
			case 'success':
				return 'toast-success';
			case 'error':
				return 'toast-error';
			case 'warning':
				return 'toast-warning';
			case 'info':
				return 'toast-info';
		}
	}
</script>

<div class="toast-container">
	{#each toasts as toast (toast.id)}
		<div
			class="toast {getColorClass(toast.type)}"
			transition:fly={{ y: -20, duration: 300 }}
		>
			<div class="toast-icon">
				<svelte:component this={getIcon(toast.type)} size={20} />
			</div>
			<div class="toast-message">{toast.message}</div>
			<button
				class="toast-close"
				onclick={() => toastStore.remove(toast.id)}
				aria-label="Close notification"
			>
				<X size={16} />
			</button>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 9999;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 400px;
		pointer-events: none;
	}

	.toast {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		background: white;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		border-left: 4px solid;
		pointer-events: auto;
		min-width: 300px;
	}

	.toast-success {
		border-left-color: #10b981;
	}

	.toast-error {
		border-left-color: #ef4444;
	}

	.toast-warning {
		border-left-color: #f59e0b;
	}

	.toast-info {
		border-left-color: #3b82f6;
	}

	.toast-icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
	}

	.toast-success .toast-icon {
		color: #10b981;
	}

	.toast-error .toast-icon {
		color: #ef4444;
	}

	.toast-warning .toast-icon {
		color: #f59e0b;
	}

	.toast-info .toast-icon {
		color: #3b82f6;
	}

	.toast-message {
		flex: 1;
		font-size: 0.875rem;
		line-height: 1.5;
		color: #1f2937;
	}

	.toast-close {
		flex-shrink: 0;
		background: none;
		border: none;
		padding: 0.25rem;
		cursor: pointer;
		color: #6b7280;
		border-radius: 4px;
		transition: all 0.15s;
		display: flex;
		align-items: center;
	}

	.toast-close:hover {
		background: #f3f4f6;
		color: #1f2937;
	}

	@media (max-width: 640px) {
		.toast-container {
			left: 1rem;
			right: 1rem;
			max-width: none;
		}

		.toast {
			min-width: auto;
		}
	}
</style>
