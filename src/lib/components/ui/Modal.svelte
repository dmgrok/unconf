<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { X } from 'lucide-svelte';

	interface ModalProps {
		open?: boolean;
		title?: string;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		persistent?: boolean;
		showCloseButton?: boolean;
		class?: string;
		children?: any;
		header?: any;
		footer?: any;
	}

	let {
		open = $bindable(false),
		title,
		size = 'md',
		persistent = false,
		showCloseButton = true,
		class: className = '',
		children,
		header,
		footer
	}: ModalProps = $props();

	const dispatch = createEventDispatcher<{
		close: void;
		open: void;
	}>();

	let dialogElement: HTMLDialogElement;
	let previouslyFocused: Element | null = null;

	// Handle open/close state changes
	$effect(() => {
		if (open) {
			openModal();
		} else {
			closeModal();
		}
	});

	function openModal() {
		if (dialogElement && !dialogElement.open) {
			// Store the currently focused element
			previouslyFocused = document.activeElement;

			dialogElement.showModal();

			// Focus the first focusable element in the modal
			const firstFocusable = dialogElement.querySelector(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			) as HTMLElement;

			if (firstFocusable) {
				firstFocusable.focus();
			}

			dispatch('open');
		}
	}

	function closeModal() {
		if (dialogElement && dialogElement.open) {
			dialogElement.close();

			// Restore focus to the previously focused element
			if (previouslyFocused instanceof HTMLElement) {
				previouslyFocused.focus();
			}

			dispatch('close');
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (!persistent && event.target === dialogElement) {
			open = false;
		}
	}

	function handleEscape(event: KeyboardEvent) {
		if (!persistent && event.key === 'Escape') {
			open = false;
		}
	}

	function handleClose() {
		open = false;
	}

	// Trap focus within the modal
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Tab') {
			const focusableElements = dialogElement.querySelectorAll(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);

			const firstElement = focusableElements[0] as HTMLElement;
			const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

			if (event.shiftKey) {
				if (document.activeElement === firstElement) {
					lastElement?.focus();
					event.preventDefault();
				}
			} else {
				if (document.activeElement === lastElement) {
					firstElement?.focus();
					event.preventDefault();
				}
			}
		}
	}

	onMount(() => {
		return () => {
			// Cleanup: restore focus if modal is destroyed while open
			if (previouslyFocused instanceof HTMLElement) {
				previouslyFocused.focus();
			}
		};
	});
</script>

<dialog
	bind:this={dialogElement}
	class="modal modal-{size} {className}"
	onclick={handleBackdropClick}
	onkeydown={handleKeydown}
	oncancel={handleEscape}
	aria-labelledby={title ? 'modal-title' : undefined}
	aria-modal="true"
>
	<div class="modal-content" onclick={(e) => e.stopPropagation()}>
		{#if header}
			<div class="modal-header">
				{@render header()}
				{#if showCloseButton}
					<button
						type="button"
						class="modal-close"
						onclick={handleClose}
						aria-label="Close modal"
					>
						<X size={20} />
					</button>
				{/if}
			</div>
		{:else if title || showCloseButton}
			<div class="modal-header">
				{#if title}
					<h2 id="modal-title" class="modal-title">{title}</h2>
				{/if}
				{#if showCloseButton}
					<button
						type="button"
						class="modal-close"
						onclick={handleClose}
						aria-label="Close modal"
					>
						<X size={20} />
					</button>
				{/if}
			</div>
		{/if}

		<div class="modal-body">
			{@render children?.()}
		</div>

		{#if footer}
			<div class="modal-footer">
				{@render footer()}
			</div>
		{/if}
	</div>
</dialog>

<style>
	.modal {
		border: none;
		border-radius: 0.5rem;
		padding: 0;
		background: transparent;
		max-width: none;
		max-height: none;
		width: 100%;
		height: 100%;
	}

	.modal::backdrop {
		background-color: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(2px);
	}

	.modal-content {
		background: white;
		border-radius: 0.5rem;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
		margin: auto;
		max-height: 90vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		position: relative;
		top: 50%;
		transform: translateY(-50%);
	}

	/* Sizes */
	.modal-sm .modal-content {
		max-width: 24rem;
	}

	.modal-md .modal-content {
		max-width: 32rem;
	}

	.modal-lg .modal-content {
		max-width: 48rem;
	}

	.modal-xl .modal-content {
		max-width: 64rem;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.5rem 1.5rem 0;
		border-bottom: 1px solid #e5e7eb;
		padding-bottom: 1rem;
		margin-bottom: 1rem;
	}

	.modal-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #111827;
	}

	.modal-close {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 0.25rem;
		color: #6b7280;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.modal-close:hover {
		background-color: #f3f4f6;
		color: #374151;
	}

	.modal-close:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	.modal-body {
		padding: 0 1.5rem;
		overflow-y: auto;
		flex: 1;
	}

	.modal-footer {
		padding: 1rem 1.5rem 1.5rem;
		border-top: 1px solid #e5e7eb;
		margin-top: 1rem;
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		flex-wrap: wrap;
	}

	/* Animation */
	.modal[open] {
		animation: modal-appear 0.2s ease-out;
	}

	.modal[open] .modal-content {
		animation: modal-slide-up 0.2s ease-out;
	}

	@keyframes modal-appear {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes modal-slide-up {
		from {
			transform: translateY(-40%) scale(0.95);
		}
		to {
			transform: translateY(-50%) scale(1);
		}
	}

	/* Mobile responsiveness */
	@media (max-width: 640px) {
		.modal-content {
			margin: 1rem;
			max-height: calc(100vh - 2rem);
			top: 1rem;
			transform: none;
		}

		.modal-sm .modal-content,
		.modal-md .modal-content,
		.modal-lg .modal-content,
		.modal-xl .modal-content {
			max-width: none;
			width: calc(100vw - 2rem);
		}

		.modal-header,
		.modal-body,
		.modal-footer {
			padding-left: 1rem;
			padding-right: 1rem;
		}

		.modal-footer {
			flex-direction: column-reverse;
		}
	}
</style>