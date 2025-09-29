<!--
  Topic List Component with Weighted Voting
  Display and manage topics with filtering, search, voting, and real-time updates
-->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { topics, topicActions } from '../stores/topicStore.js';
  import { votingStore } from '../stores/votingStore.js';
  import type { Topic, VoteWeight } from '../../types/entities.js';
  import WeightedVoting from './WeightedVoting.svelte';
  
  export let eventId: string;
  export let userId: string;
  export let userRole: 'guest' | 'participant' | 'organizer' | 'admin' = 'participant';
  export let showActions = true;
  export let enableVoting = true;
  
  const dispatch = createEventDispatcher();
  
  // State
  let isLoading = true;
  let error: string | null = null;
  let filteredTopics: Topic[] = [];
  
  // Local filter state
  let searchQuery = '';
  let statusFilter: string = 'all';
  let tagFilter: string = 'all';
  let sortBy: 'newest' | 'oldest' | 'title' | 'most-voted' = 'newest';
  
  // Available filters (computed from data)
  $: availableStatuses = [...new Set($topics.map(t => t.status))];
  $: availableTags = [...new Set($topics.flatMap(t => t.tags || []))];
  
  // Apply filters and sorting
  $: {
    let filtered = $topics;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(topic => 
        topic.title.toLowerCase().includes(query) ||
        topic.description?.toLowerCase().includes(query) ||
        topic.tags?.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(topic => topic.status === statusFilter);
    }
    
    // Apply tag filter
    if (tagFilter !== 'all') {
      filtered = filtered.filter(topic => topic.tags?.includes(tagFilter));
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'most-voted':
        filtered.sort((a, b) => b.voteCount - a.voteCount);
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }
    
    filteredTopics = filtered;
  }
  
  onMount(async () => {
    try {
      await topicActions.loadTopics(eventId);
      
      // Load user votes if voting is enabled
      if (enableVoting && userId) {
        await votingStore.loadUserVotes(userId, eventId);
      }
    } catch (err) {
      error = 'Failed to load topics';
      console.error('Failed to load topics:', err);
    } finally {
      isLoading = false;
    }
  });
  
  // Action functions
  async function handleTopicAction(action: string, topic: Topic) {
    switch (action) {
      case 'edit':
        if (topic.submittedBy !== userId && !['organizer', 'admin'].includes(userRole)) {
          dispatch('error', { message: 'You can only edit your own topics' });
          return;
        }
        dispatch('edit-topic', { topic });
        break;
        
      case 'changeStatus':
        if (!['organizer', 'admin'].includes(userRole)) {
          dispatch('error', { message: 'Only organizers can change topic status' });
          return;
        }
        // This would open a status selection modal
        dispatch('change-status', { topic });
        break;
        
      case 'view':
        dispatch('view-topic', { topic });
        break;
        
      case 'delete':
        if (!['organizer', 'admin'].includes(userRole)) {
          dispatch('error', { message: 'Only organizers can delete topics' });
          return;
        }
        
        if (confirm('Are you sure you want to delete this topic?')) {
          const success = await topicActions.deleteTopic(topic.id);
          if (!success) {
            dispatch('error', { message: 'Failed to delete topic' });
          }
        }
        break;
    }
  }
  
  function handleVoteCast(event: CustomEvent) {
    const { topicId, weight } = event.detail;
    votingStore.updateVote(topicId, weight);
    
    // Refresh topics to update vote counts
    topicActions.loadTopics(eventId);
    
    dispatch('vote-cast', event.detail);
  }
  
  function handleVoteRemoved(event: CustomEvent) {
    const { topicId } = event.detail;
    votingStore.removeVote(topicId);
    
    // Refresh topics to update vote counts  
    topicActions.loadTopics(eventId);
    
    dispatch('vote-removed', event.detail);
  }
  
  function handleVotingError(event: CustomEvent) {
    dispatch('error', { message: event.detail.message });
  }
  
  function clearFilters() {
    searchQuery = '';
    statusFilter = 'all';
    tagFilter = 'all';
    sortBy = 'newest';
  }
  
  function canEdit(topic: Topic): boolean {
    return topic.submittedBy === userId || userRole === 'organizer' || userRole === 'admin';
  }
  
  function canChangeStatus(): boolean {
    return userRole === 'organizer' || userRole === 'admin';
  }
  
  function getStatusColor(status: string): string {
    switch (status) {
      case 'draft': return 'var(--status-draft, #6b7280)';
      case 'active': return 'var(--status-active, #10b981)';
      case 'frozen': return 'var(--status-frozen, #3b82f6)';
      case 'archived': return 'var(--status-archived, #9ca3af)';
      default: return 'var(--text-secondary, #6b7280)';
    }
  }
  
  function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  function getUserVoteForTopic(topicId: string): VoteWeight | null {
    let userVote: VoteWeight | null = null;
    
    const unsubscribe = votingStore.subscribe(state => {
      userVote = state.userVotes.get(topicId)?.weight || null;
    });
    
    unsubscribe();
    return userVote;
  }
</script>

<div class="topic-list-container">
  <div class="list-header">
    <h3 class="list-title">
      Discussion Topics
      <span class="topic-count">({filteredTopics.length})</span>
    </h3>
  </div>

  <!-- Filters -->
  <div class="filters-container">
    <div class="search-group">
      <input
        type="text"
        class="search-input"
        placeholder="Search topics..."
        bind:value={searchQuery}
      />
    </div>
    
    <div class="filters-group">
      <select class="filter-select" bind:value={statusFilter}>
        <option value="all">All Status</option>
        {#each availableStatuses as status}
          <option value={status}>{status}</option>
        {/each}
      </select>
      
      <select class="filter-select" bind:value={tagFilter}>
        <option value="all">All Tags</option>
        {#each availableTags as tag}
          <option value={tag}>{tag}</option>
        {/each}
      </select>
      
      <select class="filter-select" bind:value={sortBy}>
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
        <option value="most-voted">Most Voted</option>
        <option value="title">Alphabetical</option>
      </select>
      
      <button class="btn btn-secondary btn-sm" on:click={clearFilters}>
        Clear Filters
      </button>
    </div>
  </div>
  
  <!-- Loading state -->
  {#if isLoading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading topics...</p>
    </div>
    
  <!-- Error state -->
  {:else if error}
    <div class="error-container">
      <p class="error-message">⚠️ {error}</p>
      <button class="btn btn-secondary" on:click={() => topicActions.loadTopics(eventId)}>
        Try Again
      </button>
    </div>
    
  <!-- Empty state -->
  {:else if filteredTopics.length === 0}
    <div class="empty-container">
      {#if $topics.length === 0}
        <p class="empty-message">
          No topics yet. Be the first to suggest a discussion topic!
        </p>
      {:else}
        <p class="empty-message">
          No topics match your current filters.
        </p>
        <button class="btn btn-secondary" on:click={clearFilters}>
          Clear Filters
        </button>
      {/if}
    </div>
    
  <!-- Topics list -->
  {:else}
    <div class="topics-grid">
      {#each filteredTopics as topic (topic.id)}
        <article class="topic-card">
          <header class="topic-header">
            <h4 class="topic-title">{topic.title}</h4>
            <div class="topic-status">
              <span 
                class="status-badge"
                style="color: {getStatusColor(topic.status)}"
              >
                {topic.status}
              </span>
            </div>
          </header>
          
          {#if topic.description}
            <div class="topic-description">
              {topic.description}
            </div>
          {/if}
          
          {#if topic.tags && topic.tags.length > 0}
            <div class="topic-tags">
              {#each topic.tags as tag}
                <span class="tag">{tag}</span>
              {/each}
            </div>
          {/if}
          
          <div class="topic-meta">
            <div class="meta-info">
              <span class="meta-item">
                💬 {topic.voteCount} votes
              </span>
              {#if topic.averageWeight > 0}
                <span class="meta-item">
                  ⭐ {topic.averageWeight.toFixed(1)} avg
                </span>
              {/if}
            </div>
            <div class="meta-time">
              {formatDate(topic.createdAt)}
            </div>
          </div>
          
          <!-- Voting Component -->
          {#if enableVoting}
            <div class="voting-section">
              <WeightedVoting
                topicId={topic.id}
                {eventId}
                {userId}
                userVote={getUserVoteForTopic(topic.id)}
                size="sm"
                disabled={topic.status !== 'active'}
                on:votecast={handleVoteCast}
                on:voteremoved={handleVoteRemoved}
                on:error={handleVotingError}
              />
            </div>
          {/if}
          
          {#if showActions}
            <div class="topic-actions">
              {#if canEdit(topic)}
                <button 
                  class="action-btn edit-btn"
                  on:click={() => handleTopicAction('edit', topic)}
                >
                  Edit
                </button>
              {/if}
              
              {#if canChangeStatus()}
                <button 
                  class="action-btn status-btn"
                  on:click={() => handleTopicAction('changeStatus', topic)}
                >
                  Change Status
                </button>
              {/if}
              
              <button 
                class="action-btn view-btn"
                on:click={() => handleTopicAction('view', topic)}
              >
                View Details
              </button>
              
              {#if userRole === 'organizer' || userRole === 'admin'}
                <button 
                  class="action-btn delete-btn"
                  on:click={() => handleTopicAction('delete', topic)}
                >
                  Delete
                </button>
              {/if}
            </div>
          {/if}
        </article>
      {/each}
    </div>
  {/if}
</div>

<style>
  .topic-list-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
  }
  
  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  .list-title {
    margin: 0;
    color: var(--text-primary, #1f2937);
  }
  
  .topic-count {
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
    font-weight: normal;
  }
  
  .filters-container {
    margin-bottom: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .search-group {
    flex: 1;
  }
  
  .search-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color, #d1d5db);
    border-radius: 6px;
    font-size: 1rem;
  }
  
  .search-input:focus {
    outline: none;
    border-color: var(--primary-color, #3b82f6);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .filters-group {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    align-items: center;
  }
  
  .filter-select {
    padding: 0.5rem;
    border: 1px solid var(--border-color, #d1d5db);
    border-radius: 6px;
    background: white;
    font-size: 0.875rem;
  }
  
  .filter-select:focus {
    outline: none;
    border-color: var(--primary-color, #3b82f6);
  }
  
  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }
  
  .btn-secondary {
    background: var(--secondary-bg, #f9fafb);
    color: var(--text-primary, #374151);
    border: 1px solid var(--border-color, #d1d5db);
  }
  
  .btn-secondary:hover {
    background: var(--secondary-hover, #f3f4f6);
  }
  
  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
  }
  
  .loading-container, .error-container, .empty-container {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-secondary, #6b7280);
  }
  
  .loading-spinner {
    width: 2rem;
    height: 2rem;
    border: 3px solid var(--border-color, #e5e7eb);
    border-top: 3px solid var(--primary-color, #3b82f6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .error-message {
    color: var(--error-color, #dc2626);
    margin-bottom: 1rem;
  }
  
  .empty-message {
    margin-bottom: 1rem;
  }
  
  .topics-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
  
  .topic-card {
    background: var(--card-bg, #ffffff);
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 8px;
    padding: 1.5rem;
    transition: all 0.2s ease;
  }
  
  .topic-card:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    border-color: var(--primary-color, #3b82f6);
  }
  
  .topic-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }
  
  .topic-title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary, #1f2937);
    flex: 1;
    margin-right: 1rem;
  }
  
  .status-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    background: var(--badge-bg, #f3f4f6);
  }
  
  .topic-description {
    color: var(--text-secondary, #6b7280);
    margin-bottom: 1rem;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow: hidden;
  }
  
  .topic-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .tag {
    padding: 0.25rem 0.5rem;
    background: var(--tag-bg, #dbeafe);
    color: var(--tag-color, #1e40af);
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .topic-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
  }
  
  .meta-info {
    display: flex;
    gap: 1rem;
  }
  
  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .voting-section {
    margin-bottom: 1rem;
    padding: 1rem;
    background: var(--voting-bg, #f8fafc);
    border-radius: 6px;
    border: 1px solid var(--voting-border, #e2e8f0);
  }
  
  .topic-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .action-btn {
    padding: 0.375rem 0.75rem;
    border: 1px solid var(--border-color, #d1d5db);
    border-radius: 4px;
    background: var(--bg-color, #ffffff);
    color: var(--text-primary, #374151);
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .action-btn:hover {
    background: var(--hover-bg, #f9fafb);
  }
  
  .edit-btn {
    border-color: var(--warning-color, #f59e0b);
    color: var(--warning-color, #f59e0b);
  }
  
  .edit-btn:hover {
    background: var(--warning-bg, #fef3c7);
  }
  
  .status-btn {
    border-color: var(--info-color, #3b82f6);
    color: var(--info-color, #3b82f6);
  }
  
  .status-btn:hover {
    background: var(--info-bg, #dbeafe);
  }
  
  .view-btn {
    border-color: var(--success-color, #10b981);
    color: var(--success-color, #10b981);
  }
  
  .view-btn:hover {
    background: var(--success-bg, #d1fae5);
  }
  
  .delete-btn {
    border-color: var(--error-color, #ef4444);
    color: var(--error-color, #ef4444);
  }
  
  .delete-btn:hover {
    background: var(--error-bg, #fef2f2);
  }
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    .filters-group {
      flex-direction: column;
      align-items: stretch;
    }
    
    .filter-select {
      width: 100%;
    }
    
    .topics-grid {
      grid-template-columns: 1fr;
    }
    
    .topic-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
    
    .topic-title {
      margin-right: 0;
    }
    
    .topic-actions {
      justify-content: flex-start;
    }
  }
  
  @media (max-width: 640px) {
    .topic-list-container {
      padding: 0.5rem;
    }
    
    .topic-card {
      padding: 1rem;
    }
    
    .voting-section {
      padding: 0.75rem;
    }
  }
</style>