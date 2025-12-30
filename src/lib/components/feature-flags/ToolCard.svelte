<!--
  ToolCard.svelte
  
  Card component for displaying a tool with its status and feedback.
  Used in tool listings and event dashboards.
  Feedback is shown for ALL tools - it's key for continuous improvement!
-->
<script lang="ts">
	import type { ToolInfo } from '$lib/feature-flags';
	import PreviewBadge from './PreviewBadge.svelte';
	import { trackToolFeedback, recordToolFeedback, getToolFeedback } from '$lib/feature-flags';
	
	interface Props {
		tool: ToolInfo;
		eventId?: string;
		userId?: string;
		href?: string;
		disabled?: boolean;
		showFeedback?: boolean;
	}
	
	let { 
		tool, 
		eventId, 
		userId = 'anonymous',
		href,
		disabled = false,
		showFeedback = true,  // Always show feedback by default!
	}: Props = $props();
	
	let feedback = $state(getToolFeedback(tool.id));
	
	function handleFeedback(type: 'like' | 'dislike') {
		// Track in analytics
		trackToolFeedback(tool.id, userId, type);
		
		// Update local store
		recordToolFeedback(tool.id, type);
		
		// Update local state
		feedback = getToolFeedback(tool.id);
	}
	
	// Build the actual href with eventId if provided
	let computedHref = $derived(
		href || (eventId ? tool.route.replace('[eventId]', eventId) : tool.route)
	);
</script>

<a 
	href={disabled ? undefined : computedHref}
	class="group block p-4 rounded-xl border transition-all duration-200
		{disabled 
			? 'border-zinc-800 bg-zinc-900/30 opacity-50 cursor-not-allowed' 
			: 'border-zinc-800 bg-zinc-900/50 hover:border-indigo-500/50 hover:bg-zinc-800/50'
		}
		{tool.status === 'deprecated' ? 'opacity-60' : ''}"
	aria-disabled={disabled}
>
	<div class="flex items-start justify-between gap-3">
		<div class="flex items-start gap-3">
			<!-- Icon -->
			<span class="text-2xl" role="img" aria-hidden="true">{tool.icon}</span>
			
			<div>
				<!-- Name + Badge -->
				<div class="flex items-center gap-2 flex-wrap">
					<h3 class="font-semibold text-zinc-100 group-hover:text-indigo-400 transition-colors">
						{tool.name}
					</h3>
					<PreviewBadge 
						status={tool.status}
						showFeedback={showFeedback}
						likes={feedback.likes}
						dislikes={feedback.dislikes}
						onFeedback={handleFeedback}
					/>
				</div>
				
				<!-- Description -->
				<p class="text-sm text-zinc-400 mt-1">
					{tool.description}
				</p>
				
				{#if tool.status === 'deprecated'}
					<p class="text-xs text-red-400 mt-2">
						This tool is deprecated and will be removed soon.
					</p>
				{/if}
			</div>
		</div>
		
		<!-- Arrow indicator -->
		{#if !disabled}
			<svg 
				class="w-5 h-5 text-zinc-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" 
				fill="none" 
				stroke="currentColor" 
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		{/if}
	</div>
</a>
