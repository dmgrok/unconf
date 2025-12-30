<!--
  ToolFeedback.svelte
  
  Standalone feedback widget for any tool (standard, preview, or beta).
  Shows like/dislike buttons with counts. Feedback is key for all tools!
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import { trackToolFeedback, recordToolFeedback, getToolFeedback } from '$lib/feature-flags';
	import type { ToolStatus } from '$lib/feature-flags';
	
	interface Props {
		toolId: string;
		userId?: string;
		status?: ToolStatus;
		compact?: boolean;
	}
	
	let { 
		toolId,
		userId = 'anonymous',
		status = 'standard',
		compact = false,
	}: Props = $props();
	
	let feedback = $state(getToolFeedback(toolId));
	let hasVoted = $state(false);
	let showThankYou = $state(false);
	
	// Check if user already voted (persisted in localStorage)
	$effect(() => {
		if (browser) {
			const votedTools = JSON.parse(localStorage.getItem('toolFeedbackVotes') || '{}');
			hasVoted = !!votedTools[toolId];
		}
	});
	
	function handleFeedback(type: 'like' | 'dislike') {
		if (hasVoted) return;
		
		// Track in analytics
		trackToolFeedback(toolId, userId, type);
		
		// Update local store
		recordToolFeedback(toolId, type);
		
		// Persist vote to localStorage
		if (browser) {
			const votedTools = JSON.parse(localStorage.getItem('toolFeedbackVotes') || '{}');
			votedTools[toolId] = { type, timestamp: Date.now() };
			localStorage.setItem('toolFeedbackVotes', JSON.stringify(votedTools));
		}
		
		// Update local state
		hasVoted = true;
		feedback = getToolFeedback(toolId);
		
		// Show thank you message briefly
		showThankYou = true;
		setTimeout(() => {
			showThankYou = false;
		}, 2000);
	}
	
	const statusColors: Record<ToolStatus, string> = {
		standard: 'text-emerald-400',
		preview: 'text-amber-400',
		beta: 'text-blue-400',
		deprecated: 'text-red-400',
	};
</script>

<div class="tool-feedback {compact ? 'compact' : ''}">
	{#if showThankYou}
		<div class="thank-you-message">
			<span class="text-emerald-400">✓</span> Thanks for your feedback!
		</div>
	{:else}
		<div class="feedback-container">
			{#if !compact}
				<span class="feedback-label">
					{#if status === 'preview' || status === 'beta'}
						Help us improve this {status} tool:
					{:else}
						Is this tool helpful?
					{/if}
				</span>
			{/if}
			
			<div class="feedback-buttons">
				<button
					onclick={() => handleFeedback('like')}
					disabled={hasVoted}
					class="feedback-btn like {hasVoted ? 'voted' : ''}"
					title={hasVoted ? 'You already voted' : 'This tool is helpful'}
					aria-label="Like this tool"
				>
					<svg class="w-5 h-5" fill={hasVoted && feedback.likes > feedback.dislikes ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
					</svg>
					<span class="count">{feedback.likes}</span>
				</button>
				
				<button
					onclick={() => handleFeedback('dislike')}
					disabled={hasVoted}
					class="feedback-btn dislike {hasVoted ? 'voted' : ''}"
					title={hasVoted ? 'You already voted' : 'This tool needs improvement'}
					aria-label="Dislike this tool"
				>
					<svg class="w-5 h-5" fill={hasVoted && feedback.dislikes > feedback.likes ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
					</svg>
					<span class="count">{feedback.dislikes}</span>
				</button>
			</div>
			
			{#if feedback.likes + feedback.dislikes > 0}
				<div class="feedback-score {statusColors[status]}">
					{Math.round((feedback.likes / (feedback.likes + feedback.dislikes)) * 100)}% positive
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.tool-feedback {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: rgba(39, 39, 42, 0.5);
		border: 1px solid rgba(63, 63, 70, 0.5);
		border-radius: 0.75rem;
	}
	
	.tool-feedback.compact {
		padding: 0.5rem 0.75rem;
		background: transparent;
		border: none;
	}
	
	.thank-you-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #a1a1aa;
		font-size: 0.875rem;
		animation: fadeIn 0.3s ease-out;
	}
	
	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(-4px); }
		to { opacity: 1; transform: translateY(0); }
	}
	
	.feedback-container {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	
	.feedback-label {
		color: #a1a1aa;
		font-size: 0.875rem;
	}
	
	.feedback-buttons {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.feedback-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;
		border: 1px solid transparent;
		cursor: pointer;
	}
	
	.feedback-btn.like {
		background: rgba(16, 185, 129, 0.1);
		color: #6ee7b7;
		border-color: rgba(16, 185, 129, 0.2);
	}
	
	.feedback-btn.like:hover:not(:disabled) {
		background: rgba(16, 185, 129, 0.2);
		border-color: rgba(16, 185, 129, 0.4);
	}
	
	.feedback-btn.dislike {
		background: rgba(239, 68, 68, 0.1);
		color: #fca5a5;
		border-color: rgba(239, 68, 68, 0.2);
	}
	
	.feedback-btn.dislike:hover:not(:disabled) {
		background: rgba(239, 68, 68, 0.2);
		border-color: rgba(239, 68, 68, 0.4);
	}
	
	.feedback-btn.voted {
		opacity: 0.6;
		cursor: not-allowed;
	}
	
	.feedback-btn:disabled {
		cursor: not-allowed;
	}
	
	.count {
		font-variant-numeric: tabular-nums;
	}
	
	.feedback-score {
		font-size: 0.75rem;
		font-weight: 500;
	}
</style>
