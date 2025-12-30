<!--
  PreviewToolsToggle.svelte
  
  Toggle to show/hide preview tools for users who opt-in to testing new features.
-->
<script lang="ts">
	import { browser } from '$app/environment';
	
	interface Props {
		enabled: boolean;
		onToggle?: (enabled: boolean) => void;
	}
	
	let { enabled = $bindable(), onToggle }: Props = $props();
	
	function handleToggle() {
		enabled = !enabled;
		
		// Persist preference
		if (browser) {
			localStorage.setItem('previewToolsEnabled', String(enabled));
		}
		
		onToggle?.(enabled);
	}
	
	// Load saved preference on mount
	$effect(() => {
		if (browser) {
			const saved = localStorage.getItem('previewToolsEnabled');
			if (saved !== null) {
				enabled = saved === 'true';
			}
		}
	});
</script>

<div class="flex items-center justify-between p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
	<div class="flex items-center gap-3">
		<div class="p-2 rounded-lg bg-amber-500/10">
			<svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
			</svg>
		</div>
		
		<div>
			<h4 class="font-medium text-zinc-100">Preview Tools</h4>
			<p class="text-sm text-zinc-400">
				Try new features before they're officially released
			</p>
		</div>
	</div>
	
	<button
		type="button"
		role="switch"
		aria-checked={enabled}
		onclick={handleToggle}
		class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors
			{enabled ? 'bg-amber-500' : 'bg-zinc-700'}"
	>
		<span class="sr-only">Enable preview tools</span>
		<span
			class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform
				{enabled ? 'translate-x-6' : 'translate-x-1'}"
		/>
	</button>
</div>

{#if enabled}
	<p class="mt-2 text-xs text-zinc-500 px-1">
		⚠️ Preview tools may have bugs or change without notice. Your feedback helps us improve them!
	</p>
{/if}
