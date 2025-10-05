<script lang="ts">
	/**
	 * UI Component Showcase
	 * Interactive demonstration of the EmptyState component
	 *
	 * Navigate to /ui-showcase to view this page
	 */

	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let selectedVariant = $state<'no-results' | 'no-content' | 'error' | 'permission' | 'coming-soon'>('no-content');
	let selectedSize = $state<'sm' | 'md' | 'lg'>('md');
	let showAction = $state(true);
	let customTitle = $state('');
	let customDescription = $state('');

	const variantConfigs = {
		'no-results': {
			title: 'No results found',
			description: 'Try adjusting your filters or search terms',
			illustration: 'search' as const,
			actionLabel: 'Clear Filters'
		},
		'no-content': {
			title: 'No events yet',
			description: 'Create your first event to get started',
			illustration: 'create' as const,
			actionLabel: 'Create Event'
		},
		error: {
			title: 'Something went wrong',
			description: 'We couldn\'t load your data. Please try again.',
			illustration: 'error' as const,
			actionLabel: 'Try Again'
		},
		permission: {
			title: 'Access restricted',
			description: 'You need to be signed in to view this content',
			illustration: 'lock' as const,
			actionLabel: 'Sign In'
		},
		'coming-soon': {
			title: 'Feature coming soon',
			description: 'We\'re working on it. Check back soon!',
			illustration: 'rocket' as const,
			actionLabel: 'Learn More'
		}
	};

	const config = $derived(variantConfigs[selectedVariant]);
	const displayTitle = $derived(customTitle || config.title);
	const displayDescription = $derived(customDescription || config.description);

	function handleAction() {
		alert(`Action triggered for: ${selectedVariant}`);
	}
</script>

<svelte:head>
	<title>UI Component Showcase | UnConf</title>
	<meta name="description" content="EmptyState component demonstration" />
</svelte:head>

<div class="showcase-page">
	<header class="showcase-header">
		<h1>EmptyState Component Showcase</h1>
		<p>Interactive demonstration and testing ground for the EmptyState component</p>
	</header>

	<div class="showcase-container">
		<!-- Controls Panel -->
		<aside class="controls-panel">
			<section class="control-section">
				<h2>Variant</h2>
				<div class="variant-buttons">
					{#each Object.keys(variantConfigs) as variant}
						<button
							class="variant-btn"
							class:active={selectedVariant === variant}
							onclick={() => {
								selectedVariant = variant as typeof selectedVariant;
								customTitle = '';
								customDescription = '';
							}}
						>
							{variant}
						</button>
					{/each}
				</div>
			</section>

			<section class="control-section">
				<h2>Size</h2>
				<div class="size-buttons">
					{#each ['sm', 'md', 'lg'] as size}
						<button
							class="size-btn"
							class:active={selectedSize === size}
							onclick={() => (selectedSize = size as typeof selectedSize)}
						>
							{size}
						</button>
					{/each}
				</div>
			</section>

			<section class="control-section">
				<h2>Options</h2>
				<label class="checkbox-label">
					<input type="checkbox" bind:checked={showAction} />
					Show Action Button
				</label>
			</section>

			<section class="control-section">
				<h2>Custom Text</h2>
				<div class="input-group">
					<label for="custom-title">Title</label>
					<input
						id="custom-title"
						type="text"
						bind:value={customTitle}
						placeholder={config.title}
						class="text-input"
					/>
				</div>
				<div class="input-group">
					<label for="custom-description">Description</label>
					<textarea
						id="custom-description"
						bind:value={customDescription}
						placeholder={config.description}
						class="text-input"
						rows="3"
					></textarea>
				</div>
			</section>

			<section class="control-section">
				<h2>Code</h2>
				<pre class="code-block"><code>{`<EmptyState
  variant="${selectedVariant}"
  title="${displayTitle}"
  description="${displayDescription}"
  illustration="${config.illustration}"${showAction ? `\n  actionLabel="${config.actionLabel}"\n  onAction={handleAction}` : ''}
  size="${selectedSize}"
/>`}</code></pre>
			</section>
		</aside>

		<!-- Preview Panel -->
		<main class="preview-panel">
			<div class="preview-header">
				<h2>Preview</h2>
				<span class="preview-badge">{selectedVariant} • {selectedSize}</span>
			</div>

			<div class="preview-container">
				<EmptyState
					variant={selectedVariant}
					title={displayTitle}
					description={displayDescription}
					illustration={config.illustration}
					actionLabel={showAction ? config.actionLabel : undefined}
					onAction={showAction ? handleAction : undefined}
					size={selectedSize}
				/>
			</div>

			<!-- Info Cards -->
			<div class="info-cards">
				<div class="info-card">
					<h3>When to Use</h3>
					<p>
						{#if selectedVariant === 'no-results'}
							Use when search or filters return no matches. Helps users understand why they're
							seeing nothing and suggests next steps.
						{:else if selectedVariant === 'no-content'}
							Use for empty lists that can be populated. Encourages users to create their first
							item.
						{:else if selectedVariant === 'error'}
							Use when errors prevent content from loading. Provides clear feedback and recovery
							options.
						{:else if selectedVariant === 'permission'}
							Use when users lack access to view content. Explains the restriction and offers
							solutions.
						{:else if selectedVariant === 'coming-soon'}
							Use for features in development. Builds anticipation and manages expectations.
						{/if}
					</p>
				</div>

				<div class="info-card">
					<h3>Best Practices</h3>
					<ul>
						<li>Keep titles under 5 words</li>
						<li>Descriptions should be 1-2 sentences</li>
						<li>Use action verbs for buttons</li>
						<li>Match tone to context</li>
						<li>Test in dark mode</li>
					</ul>
				</div>
			</div>
		</main>
	</div>

	<!-- All Variants Grid -->
	<section class="variants-section">
		<h2>All Variants</h2>
		<div class="variants-grid">
			{#each Object.entries(variantConfigs) as [variant, config]}
				<div class="variant-card">
					<h3>{variant}</h3>
					<EmptyState
						variant={variant as typeof selectedVariant}
						title={config.title}
						description={config.description}
						illustration={config.illustration}
						actionLabel={config.actionLabel}
						onAction={handleAction}
						size="sm"
					/>
				</div>
			{/each}
		</div>
	</section>
</div>

<style>
	.showcase-page {
		min-height: 100vh;
		background: var(--color-background);
		padding: 2rem;
	}

	.showcase-header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.showcase-header h1 {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin-bottom: 0.5rem;
	}

	.showcase-header p {
		font-size: 1.125rem;
		color: var(--color-text-secondary);
	}

	.showcase-container {
		display: grid;
		grid-template-columns: 350px 1fr;
		gap: 2rem;
		max-width: 1600px;
		margin: 0 auto 4rem;
	}

	/* Controls Panel */
	.controls-panel {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1.5rem;
		height: fit-content;
		position: sticky;
		top: 2rem;
	}

	.control-section {
		margin-bottom: 2rem;
	}

	.control-section:last-child {
		margin-bottom: 0;
	}

	.control-section h2 {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.75rem;
	}

	.variant-buttons,
	.size-buttons {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.variant-btn,
	.size-btn {
		padding: 0.625rem 1rem;
		background: var(--color-surface-secondary);
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-primary);
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
		font-family: inherit;
	}

	.variant-btn:hover,
	.size-btn:hover {
		background: var(--color-surface-tertiary);
		border-color: var(--color-primary);
	}

	.variant-btn.active,
	.size-btn.active {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-text-primary);
		cursor: pointer;
	}

	.checkbox-label input[type='checkbox'] {
		width: 1rem;
		height: 1rem;
		cursor: pointer;
	}

	.input-group {
		margin-bottom: 1rem;
	}

	.input-group:last-child {
		margin-bottom: 0;
	}

	.input-group label {
		display: block;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		margin-bottom: 0.375rem;
	}

	.text-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: var(--color-surface-secondary);
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		color: var(--color-text-primary);
		font-family: inherit;
	}

	.text-input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	textarea.text-input {
		resize: vertical;
	}

	.code-block {
		background: var(--color-surface-secondary);
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		padding: 1rem;
		overflow-x: auto;
		font-family: 'Courier New', monospace;
		font-size: 0.75rem;
		line-height: 1.5;
		margin: 0;
	}

	.code-block code {
		color: var(--color-text-primary);
	}

	/* Preview Panel */
	.preview-panel {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1.5rem;
	}

	.preview-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--color-border);
	}

	.preview-header h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.preview-badge {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		background: var(--color-surface-secondary);
		padding: 0.375rem 0.75rem;
		border-radius: 0.375rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.preview-container {
		min-height: 400px;
		background: var(--color-background);
		border: 2px dashed var(--color-border);
		border-radius: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.info-cards {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	.info-card {
		background: var(--color-surface-secondary);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		padding: 1.25rem;
	}

	.info-card h3 {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 0.75rem 0;
	}

	.info-card p {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		line-height: 1.6;
		margin: 0;
	}

	.info-card ul {
		margin: 0;
		padding-left: 1.25rem;
	}

	.info-card li {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		line-height: 1.8;
	}

	/* Variants Section */
	.variants-section {
		max-width: 1600px;
		margin: 0 auto;
	}

	.variants-section h2 {
		font-size: 2rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin-bottom: 2rem;
		text-align: center;
	}

	.variants-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: 2rem;
	}

	.variant-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1.5rem;
	}

	.variant-card h3 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 1rem 0;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--color-border);
		text-transform: capitalize;
	}

	/* Responsive */
	@media (max-width: 1200px) {
		.showcase-container {
			grid-template-columns: 1fr;
		}

		.controls-panel {
			position: static;
		}

		.info-cards {
			grid-template-columns: 1fr;
		}

		.variants-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.showcase-page {
			padding: 1rem;
		}

		.showcase-header h1 {
			font-size: 2rem;
		}

		.preview-container {
			min-height: 300px;
		}
	}
</style>
