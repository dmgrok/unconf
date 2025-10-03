<script lang="ts">
	import { onMount } from 'svelte';
	import { theme, initializeTheme, applyTheme } from '$lib/stores/theme';

	interface ThemeProviderProps {
		children?: any;
	}

	let { children }: ThemeProviderProps = $props();

	// Initialize theme system on mount
	onMount(() => {
		const cleanup = initializeTheme();

		// Ensure theme is applied correctly
		const currentTheme = $theme;
		applyTheme(currentTheme);

		return cleanup;
	});

	// React to theme changes
	$effect(() => {
		applyTheme($theme);
	});
</script>

<!-- Import theme CSS -->
<svelte:head>
	<link rel="stylesheet" href="/src/lib/styles/themes.css" />
</svelte:head>

<!-- Render children -->
{@render children?.()}