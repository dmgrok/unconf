<script lang="ts">
	let {
		type = 'info',
		title = '',
		children
	}: {
		type?: 'info' | 'warning' | 'tip' | 'danger' | 'success';
		title?: string;
		children: any;
	} = $props();

	const icons = {
		info: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`,
		warning: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />`,
		tip: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />`,
		danger: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`,
		success: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />`
	};

	const defaultTitles = {
		info: 'Note',
		warning: 'Warning',
		tip: 'Tip',
		danger: 'Important',
		success: 'Success'
	};
</script>

<div class="callout callout-{type}">
	<div class="callout-icon">
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
			{@html icons[type]}
		</svg>
	</div>
	<div class="callout-content">
		{#if title}
			<div class="callout-title">{title}</div>
		{:else}
			<div class="callout-title">{defaultTitles[type]}</div>
		{/if}
		<div class="callout-body">
			{@render children()}
		</div>
	</div>
</div>

<style>
	.callout {
		display: flex;
		gap: 1rem;
		padding: 1rem 1.25rem;
		border-radius: 12px;
		margin: 1.5rem 0;
		border-left: 4px solid;
	}

	.callout-icon {
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	.callout-content {
		flex: 1;
	}

	.callout-title {
		font-weight: 600;
		font-size: 0.9375rem;
		margin-bottom: 0.5rem;
	}

	.callout-body {
		font-size: 0.9375rem;
		line-height: 1.6;
	}

	.callout-body :global(p) {
		margin: 0;
	}

	.callout-body :global(p + p) {
		margin-top: 0.5rem;
	}

	.callout-body :global(ul),
	.callout-body :global(ol) {
		margin: 0.5rem 0 0 0;
		padding-left: 1.5rem;
	}

	.callout-body :global(li) {
		margin: 0.25rem 0;
	}

	.callout-body :global(code) {
		padding: 0.125rem 0.375rem;
		background: rgba(0, 0, 0, 0.1);
		border-radius: 4px;
		font-family: var(--font-family-mono);
		font-size: 0.875em;
	}

	/* Info (Blue) */
	.callout-info {
		background: #eff6ff;
		border-color: #3b82f6;
	}

	.callout-info .callout-icon {
		color: #3b82f6;
	}

	.callout-info .callout-title {
		color: #1e40af;
	}

	.callout-info .callout-body {
		color: #1e3a8a;
	}

	/* Warning (Amber) */
	.callout-warning {
		background: #fffbeb;
		border-color: #f59e0b;
	}

	.callout-warning .callout-icon {
		color: #f59e0b;
	}

	.callout-warning .callout-title {
		color: #b45309;
	}

	.callout-warning .callout-body {
		color: #92400e;
	}

	/* Tip (Purple) */
	.callout-tip {
		background: #faf5ff;
		border-color: #a855f7;
	}

	.callout-tip .callout-icon {
		color: #a855f7;
	}

	.callout-tip .callout-title {
		color: #7e22ce;
	}

	.callout-tip .callout-body {
		color: #6b21a8;
	}

	/* Danger (Red) */
	.callout-danger {
		background: #fef2f2;
		border-color: #ef4444;
	}

	.callout-danger .callout-icon {
		color: #ef4444;
	}

	.callout-danger .callout-title {
		color: #b91c1c;
	}

	.callout-danger .callout-body {
		color: #991b1b;
	}

	/* Success (Green) */
	.callout-success {
		background: #f0fdf4;
		border-color: #10b981;
	}

	.callout-success .callout-icon {
		color: #10b981;
	}

	.callout-success .callout-title {
		color: #047857;
	}

	.callout-success .callout-body {
		color: #065f46;
	}
</style>
