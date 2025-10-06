<script lang="ts">
	import { toast, type Toast } from '$lib/stores/toast';
	import { fly, fade } from 'svelte/transition';

	let toasts = $state<Toast[]>([]);

	toast.subscribe((value) => {
		toasts = value;
	});

	function getIcon(type: Toast['type']) {
		switch (type) {
			case 'success':
				return '✓';
			case 'error':
				return '✕';
			case 'warning':
				return '⚠';
			case 'info':
				return 'ⓘ';
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
	{#each toasts as item (item.id)}
		<div
			class="toast {getColorClass(item.type)}"
			transition:fly={{ y: -20, duration: 300 }}
		>
			<span class="toast-icon">{getIcon(item.type)}</span>
			<span class="toast-message">{item.message}</span>
			<button
				class="toast-close"
				onclick={() => toast.dismiss(item.id)}
				aria-label="Dismiss"
			>
				×
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
		gap: 0.75rem;
		max-width: 400px;
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
		min-width: 300px;
	}

	.toast-success {
		border-left-color: #10b981;
		background: #f0fdf4;
	}

	.toast-error {
		border-left-color: #ef4444;
		background: #fef2f2;
	}

	.toast-warning {
		border-left-color: #f59e0b;
		background: #fffbeb;
	}

	.toast-info {
		border-left-color: #3b82f6;
		background: #eff6ff;
	}

	.toast-icon {
		font-size: 1.25rem;
		font-weight: bold;
		flex-shrink: 0;
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
		color: #1f2937;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.toast-close {
		background: none;
		border: none;
		font-size: 1.5rem;
		line-height: 1;
		color: #6b7280;
		cursor: pointer;
		padding: 0;
		width: 1.5rem;
		height: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: background 0.2s;
		flex-shrink: 0;
	}

	.toast-close:hover {
		background: rgba(0, 0, 0, 0.05);
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
