<script lang="ts">
	import { Sun, Moon, Monitor, Contrast } from 'lucide-svelte';
	import { theme, themes, type Theme } from '$lib/stores/theme';
	import Button from './Button.svelte';

	interface ThemeToggleProps {
		variant?: 'button' | 'select' | 'segmented';
		size?: 'sm' | 'md' | 'lg';
		showLabel?: boolean;
		class?: string;
	}

	let {
		variant = 'button',
		size = 'md',
		showLabel = false,
		class: className = ''
	}: ThemeToggleProps = $props();

	// Get icon for theme
	function getThemeIcon(themeValue: Theme) {
		switch (themeValue) {
			case 'light': return Sun;
			case 'dark': return Moon;
			case 'high-contrast': return Contrast;
			case 'auto':
			default: return Monitor;
		}
	}

	// Get next theme for button toggle (cycles through light -> dark -> auto)
	function getNextTheme(currentTheme: Theme): Theme {
		switch (currentTheme) {
			case 'light': return 'dark';
			case 'dark': return 'auto';
			case 'auto': return 'light';
			case 'high-contrast': return 'light';
			default: return 'light';
		}
	}

	function handleToggle() {
		if (variant === 'button') {
			theme.set(getNextTheme($theme));
		}
	}

	function handleSelectChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		theme.set(target.value as Theme);
	}

	function handleSegmentedChange(newTheme: Theme) {
		theme.set(newTheme);
	}

	// Get current theme info
	$: currentThemeInfo = themes.find(t => t.value === $theme) || themes[0];
	$: IconComponent = getThemeIcon($theme);
</script>

{#if variant === 'button'}
	<Button
		variant="outline"
		{size}
		icon={!showLabel}
		onclick={handleToggle}
		class="theme-toggle {className}"
		aria-label="Toggle theme"
		title="Current: {currentThemeInfo.label}"
	>
		<IconComponent size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
		{#if showLabel}
			{currentThemeInfo.label}
		{/if}
	</Button>

{:else if variant === 'select'}
	<div class="theme-select {className}">
		{#if showLabel}
			<label for="theme-select" class="theme-label">Theme:</label>
		{/if}
		<select
			id="theme-select"
			class="theme-select-input"
			value={$theme}
			onchange={handleSelectChange}
			aria-label="Select theme"
		>
			{#each themes as themeOption}
				<option value={themeOption.value}>
					{themeOption.label}
				</option>
			{/each}
		</select>
	</div>

{:else if variant === 'segmented'}
	<div class="theme-segmented {className}" role="radiogroup" aria-label="Theme selection">
		{#each themes as themeOption}
			{@const IconComponent = getThemeIcon(themeOption.value)}
			{@const isSelected = $theme === themeOption.value}

			<button
				class="segmented-option"
				class:selected={isSelected}
				onclick={() => handleSegmentedChange(themeOption.value)}
				aria-pressed={isSelected}
				aria-label="{themeOption.label}: {themeOption.description}"
				title={themeOption.description}
				role="radio"
				tabindex={isSelected ? 0 : -1}
			>
				<IconComponent size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
				{#if showLabel}
					<span class="segmented-label">{themeOption.label}</span>
				{/if}
			</button>
		{/each}
	</div>
{/if}

<style>
	.theme-toggle {
		position: relative;
	}

	.theme-select {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
	}

	.theme-label {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-secondary);
	}

	.theme-select-input {
		padding: var(--spacing-2) var(--spacing-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background-color: var(--color-surface);
		color: var(--color-text-primary);
		font-size: var(--font-size-sm);
		transition: var(--transition-all);
	}

	.theme-select-input:focus {
		outline: none;
		border-color: var(--color-focus);
		box-shadow: 0 0 0 3px var(--color-focus-outline);
	}

	.theme-segmented {
		display: flex;
		background-color: var(--color-surface-secondary);
		border-radius: var(--radius-lg);
		padding: var(--spacing-1);
		gap: var(--spacing-1);
	}

	.segmented-option {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-2);
		padding: var(--spacing-2) var(--spacing-3);
		border: none;
		border-radius: var(--radius-md);
		background-color: transparent;
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: var(--transition-all);
		white-space: nowrap;
	}

	.segmented-option:hover {
		background-color: var(--color-surface-tertiary);
		color: var(--color-text-primary);
	}

	.segmented-option:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.segmented-option.selected {
		background-color: var(--color-surface);
		color: var(--color-text-primary);
		box-shadow: var(--shadow-sm);
	}

	.segmented-label {
		font-size: var(--font-size-xs);
	}

	/* Size variants for segmented control */
	.theme-segmented.size-sm .segmented-option {
		padding: var(--spacing-1) var(--spacing-2);
	}

	.theme-segmented.size-lg .segmented-option {
		padding: var(--spacing-3) var(--spacing-4);
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.theme-segmented {
			flex-wrap: wrap;
		}

		.segmented-label {
			display: none;
		}
	}

	/* High contrast mode adjustments */
	[data-theme="high-contrast"] .segmented-option {
		border: 1px solid var(--color-border);
	}

	[data-theme="high-contrast"] .segmented-option.selected {
		border-color: var(--color-primary);
		background-color: var(--color-primary-light);
	}
</style>