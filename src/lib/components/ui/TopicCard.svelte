<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { MessageSquare, Users, Clock, Tag, MoreHorizontal, Heart, ThumbsUp } from 'lucide-svelte';
	import Button from './Button.svelte';
	import Card from './Card.svelte';

	interface TopicCardProps {
		id: string;
		title: string;
		description?: string;
		category?: string;
		author?: string;
		timeAgo?: string;
		participantCount?: number;
		voteCount?: number;
		commentCount?: number;
		isLiked?: boolean;
		isBookmarked?: boolean;
		status?: 'proposed' | 'active' | 'completed' | 'archived';
		tags?: string[];
		priority?: 'low' | 'medium' | 'high';
		variant?: 'default' | 'compact' | 'featured';
		interactive?: boolean;
		showActions?: boolean;
		class?: string;
	}

	let {
		id,
		title,
		description,
		category,
		author,
		timeAgo,
		participantCount = 0,
		voteCount = 0,
		commentCount = 0,
		isLiked = false,
		isBookmarked = false,
		status = 'proposed',
		tags = [],
		priority = 'medium',
		variant = 'default',
		interactive = true,
		showActions = true,
		class: className = ''
	}: TopicCardProps = $props();

	const dispatch = createEventDispatcher<{
		click: { id: string };
		like: { id: string; liked: boolean };
		bookmark: { id: string; bookmarked: boolean };
		join: { id: string };
		vote: { id: string };
		menu: { id: string };
	}>();

	// Status styling and labels
	$: statusConfig = {
		proposed: { label: 'Proposed', class: 'status-proposed' },
		active: { label: 'Active', class: 'status-active' },
		completed: { label: 'Completed', class: 'status-completed' },
		archived: { label: 'Archived', class: 'status-archived' }
	}[status];

	// Priority styling
	$: priorityClass = {
		low: 'priority-low',
		medium: 'priority-medium',
		high: 'priority-high'
	}[priority];

	function handleCardClick() {
		if (interactive) {
			dispatch('click', { id });
		}
	}

	function handleLike(event: Event) {
		event.stopPropagation();
		dispatch('like', { id, liked: !isLiked });
	}

	function handleBookmark(event: Event) {
		event.stopPropagation();
		dispatch('bookmark', { id, bookmarked: !isBookmarked });
	}

	function handleJoin(event: Event) {
		event.stopPropagation();
		dispatch('join', { id });
	}

	function handleVote(event: Event) {
		event.stopPropagation();
		dispatch('vote', { id });
	}

	function handleMenu(event: Event) {
		event.stopPropagation();
		dispatch('menu', { id });
	}
</script>

<Card
	variant={variant === 'featured' ? 'elevated' : 'outlined'}
	padding={variant === 'compact' ? 'sm' : 'md'}
	hover={interactive}
	class="topic-card {priorityClass} {className}"
	onclick={handleCardClick}
>
	{#snippet header()}
		<div class="topic-header">
			<div class="topic-meta">
				{#if category}
					<div class="topic-category">
						<Tag size={14} />
						{category}
					</div>
				{/if}
				<div class="topic-status {statusConfig.class}">
					{statusConfig.label}
				</div>
				{#if timeAgo}
					<div class="topic-time">
						<Clock size={14} />
						{timeAgo}
					</div>
				{/if}
			</div>

			{#if showActions}
				<Button
					variant="outline"
					size="sm"
					icon
					onclick={handleMenu}
					aria-label="Topic options"
				>
					<MoreHorizontal size={16} />
				</Button>
			{/if}
		</div>
	{/snippet}

	<div class="topic-content">
		<h3 class="topic-title">{title}</h3>

		{#if description}
			<p class="topic-description">{description}</p>
		{/if}

		{#if author}
			<div class="topic-author">
				Proposed by <strong>{author}</strong>
			</div>
		{/if}

		{#if tags.length > 0}
			<div class="topic-tags">
				{#each tags.slice(0, 3) as tag}
					<span class="topic-tag">{tag}</span>
				{/each}
				{#if tags.length > 3}
					<span class="topic-tag-more">+{tags.length - 3} more</span>
				{/if}
			</div>
		{/if}
	</div>

	{#snippet footer()}
		<div class="topic-footer">
			<div class="topic-stats">
				{#if participantCount > 0}
					<div class="stat">
						<Users size={16} />
						<span>{participantCount}</span>
					</div>
				{/if}

				{#if commentCount > 0}
					<div class="stat">
						<MessageSquare size={16} />
						<span>{commentCount}</span>
					</div>
				{/if}

				{#if voteCount > 0}
					<div class="stat">
						<ThumbsUp size={16} />
						<span>{voteCount}</span>
					</div>
				{/if}
			</div>

			{#if showActions}
				<div class="topic-actions">
					<Button
						variant="outline"
						size="sm"
						onclick={handleLike}
						class={isLiked ? 'action-active' : ''}
						aria-label={isLiked ? 'Unlike topic' : 'Like topic'}
					>
						<Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
						{isLiked ? 'Liked' : 'Like'}
					</Button>

					{#if status === 'proposed' || status === 'active'}
						<Button
							variant="primary"
							size="sm"
							onclick={handleJoin}
						>
							Join Discussion
						</Button>
					{/if}
				</div>
			{/if}
		</div>
	{/snippet}
</Card>

<style>
	.topic-card {
		transition: all 0.2s ease;
		cursor: pointer;
	}

	.topic-card:not(.interactive) {
		cursor: default;
	}

	/* Priority borders */
	.priority-high {
		border-left: 4px solid #ef4444;
	}

	.priority-medium {
		border-left: 4px solid #f59e0b;
	}

	.priority-low {
		border-left: 4px solid #10b981;
	}

	.topic-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	.topic-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		flex: 1;
	}

	.topic-category {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		background-color: #f3f4f6;
		color: #4b5563;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.topic-status {
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.status-proposed {
		background-color: #dbeafe;
		color: #1d4ed8;
	}

	.status-active {
		background-color: #d1fae5;
		color: #065f46;
	}

	.status-completed {
		background-color: #e5e7eb;
		color: #374151;
	}

	.status-archived {
		background-color: #f3f4f6;
		color: #6b7280;
	}

	.topic-time {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: #6b7280;
		font-size: 0.75rem;
	}

	.topic-content {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.topic-title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
		line-height: 1.4;
	}

	.topic-description {
		margin: 0;
		color: #6b7280;
		font-size: 0.875rem;
		line-height: 1.5;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.topic-author {
		color: #6b7280;
		font-size: 0.75rem;
	}

	.topic-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.topic-tag {
		background-color: #eff6ff;
		color: #1e40af;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.topic-tag-more {
		color: #6b7280;
		font-size: 0.75rem;
		font-style: italic;
	}

	.topic-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.topic-stats {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.stat {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: #6b7280;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.topic-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
	}

	:global(.topic-actions .action-active) {
		background-color: #fef2f2;
		border-color: #fca5a5;
		color: #dc2626;
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.topic-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}

		.topic-meta {
			gap: 0.5rem;
		}

		.topic-footer {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
		}

		.topic-actions {
			justify-content: stretch;
		}

		.topic-actions :global(button) {
			flex: 1;
		}
	}
</style>