<!--
  PreviewBadge.svelte
  
  Visual indicator for tool status (standard, preview, beta, deprecated).
  Shows tool status badge and allows users to provide feedback on ALL tools.
  Feedback is key for continuous improvement!
-->
<script lang="ts">
	import type { ToolStatus } from '$lib/feature-flags';
	
	interface Props {
		status: ToolStatus;
		showFeedback?: boolean;
		showBadge?: boolean;
		onFeedback?: (type: 'like' | 'dislike') => void;
		likes?: number;
		dislikes?: number;
	}
	
	let { 
		status, 
		showFeedback = true,  // Default to true - feedback on ALL tools!
		showBadge = true,
		onFeedback,
		likes = 0,
		dislikes = 0,
	}: Props = $props();
	
	const statusConfig: Record<ToolStatus, { label: string; color: string; bgColor: string; icon: string }> = {
		standard: { label: 'Stable', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: '✓' },
		preview: { label: 'Preview', color: 'text-amber-400', bgColor: 'bg-amber-500/10', icon: '🧪' },
		beta: { label: 'Beta', color: 'text-blue-400', bgColor: 'bg-blue-500/10', icon: '🔬' },
		deprecated: { label: 'Deprecated', color: 'text-red-400', bgColor: 'bg-red-500/10', icon: '⚠️' },
	};
	
	let config = $derived(statusConfig[status]);
	let hasVoted = $state(false);
	
	function handleFeedback(type: 'like' | 'dislike') {
		if (hasVoted) return;
		hasVoted = true;
		onFeedback?.(type);
	}
	
	let totalVotes = $derived(likes + dislikes);
	let positivePercent = $derived(totalVotes > 0 ? Math.round((likes / totalVotes) * 100) : 0);
</script>

<div class="inline-flex items-center gap-2 flex-wrap">
	<!-- Status Badge (optional, hidden for standard by default) -->
	{#if showBadge && status !== 'standard'}
		<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium {config.bgColor} {config.color}">
			{#if status === 'preview'}
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
				</svg>
			{:else if status === 'beta'}
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
				</svg>
			{:else if status === 'deprecated'}
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
			{/if}
			{config.label}
		</span>
	{/if}
	
	<!-- Feedback Buttons - Shown for ALL tools by default -->
	{#if showFeedback && status !== 'deprecated'}
		<div class="flex items-center gap-1 text-xs">
			<button
				onclick={() => handleFeedback('like')}
				disabled={hasVoted}
				class="inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors
					{hasVoted ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-500/20 cursor-pointer'}
					text-zinc-400 hover:text-emerald-400"
				title="This tool is helpful"
			>
				<svg class="w-4 h-4" fill={hasVoted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
				</svg>
				{#if likes > 0}
					<span class="text-emerald-400">{likes}</span>
				{/if}
			</button>
			
			<button
				onclick={() => handleFeedback('dislike')}
				disabled={hasVoted}
				class="inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors
					{hasVoted ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-500/20 cursor-pointer'}
					text-zinc-400 hover:text-red-400"
				title="This tool needs improvement"
			>
				<svg class="w-4 h-4" fill={hasVoted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
				</svg>
				{#if dislikes > 0}
					<span class="text-red-400">{dislikes}</span>
				{/if}
			</button>
			
			<!-- Feedback score indicator -->
			{#if totalVotes >= 5}
				<span class="ml-1 text-xs {positivePercent >= 70 ? 'text-emerald-400' : positivePercent >= 50 ? 'text-amber-400' : 'text-red-400'}">
					{positivePercent}%
				</span>
			{/if}
		</div>
	{/if}
</div>
