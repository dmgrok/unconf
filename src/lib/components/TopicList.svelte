<!--
  Topic List Component
  Display and manage topics with filtering, search, and real-time updates
-->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { writable } from 'svelte/store';
  import { topics, filteredTopics, topicActions, topicFilters } from '../stores/topicStore.js';
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
  
  // Local filter state (synced with store)
  let searchQuery = '';
  let statusFilter: string = 'all';
  let tagFilter: string = 'all';
  let sortBy: 'newest' | 'oldest' | 'title' = 'newest';
  
  // Available filters (computed from data)
  $: availableStatuses = [...new Set($topics.map(t => t.status))];
  $: availableTags = [...new Set($topics.flatMap(t => t.tags))];
  
  // Sync local filters with store
  $: {
    topicActions.setFilters({
      search: searchQuery,
      status: statusFilter === 'all' ? '' : statusFilter,
      tags: tagFilter === 'all' ? [] : [tagFilter],
      sortBy: sortBy === 'newest' ? 'createdAt' : sortBy === 'oldest' ? 'createdAt' : 'title',
      sortOrder: sortBy === 'oldest' ? 'asc' : 'desc'
    });
  }
  
  onMount(async () => {
    try {
      await topicActions.loadTopics(eventId);
    } catch (err) {
      error = 'Failed to load topics';
      console.error('Failed to load topics:', err);
    } finally {
      isLoading = false;
    }
  });
  
  // Action functions
  async function handleEditTopic(topic: Topic) {
    if (topic.submittedBy !== userId && !['organizer', 'admin'].includes(userRole)) {
      dispatch('error', { message: 'You can only edit your own topics' });
      return;
    }
    
    dispatch('edit-topic', { topic });
  }
  
  async function handleChangeStatus(topicId: string, newStatus: string) {
    if (!['organizer', 'admin'].includes(userRole)) {
      dispatch('error', { message: 'Only organizers can change topic status' });
      return;
    }
    
    const success = await topicActions.changeTopicStatus(topicId, newStatus);
    if (!success) {
      dispatch('error', { message: 'Failed to change topic status' });
    }
  }
  
  async function handleDeleteTopic(topicId: string) {
    if (!['organizer', 'admin'].includes(userRole)) {
      dispatch('error', { message: 'Only organizers can delete topics' });
      return;
    }
    
    if (confirm('Are you sure you want to delete this topic?')) {
      const success = await topicActions.deleteTopic(topicId);
      if (!success) {
        dispatch('error', { message: 'Failed to delete topic' });
      }
    }
  }
  
  function handleSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    searchQuery = target.value;
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
  
  function canChangeStatus(topic: Topic): boolean {
    return userRole === 'organizer' || userRole === 'admin';
  }
  
  function getStatusColor(status: string): string {
    switch (status) {
      case 'draft': return 'var(--status-draft, #6b7280)';
      case 'active': return 'var(--status-active, #10b981)';
      case 'frozen': return 'var(--status-frozen, #3b82f6)';
      case 'archived': return 'var(--status-archived, #6b7280)';
      default: return 'var(--status-default, #6b7280)';
    }
  }
  
  function formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }
  
  function handleTopicAction(action: string, topic: Topic) {
    dispatch('topicAction', { action, topic });
  }
</script>

<div class="topic-list-container">
  <!-- Header and Controls -->
  <div class="list-header">
    <h3 class="list-title">
      Discussion Topics
      {#if !isLoading}
        <span class="topic-count">({$filteredTopics.length} of {$topics.length})</span>
      {/if}
    </h3>
    
    <button 
      class="btn btn-primary"
      on:click={() => dispatch('createTopic')}
    >
      + Add Topic
    </button>
  </div>
  
  <!-- Search and Filters -->
  <div class="filters-container">
    <div class="search-group">
      <input
        type="text"
        placeholder="Search topics by title, description, or tags..."
        value={searchQuery}
        on:input={handleSearch}
        class="search-input"
      />
    </div>
    
    <div class="filters-group">
      <select bind:value={statusFilter} class="filter-select">
        <option value="all">All Statuses</option>
        {#each availableStatuses as status}
          <option value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
        {/each}
      </select>
      
      <select bind:value={tagFilter} class="filter-select">
        <option value="all">All Tags</option>
        {#each availableTags as tag}
          <option value={tag}>{tag}</option>
        {/each}
      </select>
      
      <select bind:value={sortBy} class="filter-select">
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
        <option value="most-voted">Most Voted</option>
        <option value="title">Alphabetical</option>
      </select>
      
      {#if searchQuery || statusFilter !== 'all' || tagFilter !== 'all' || sortBy !== 'newest'}
        <button class="btn btn-secondary btn-sm" on:click={clearFilters}>
          Clear Filters
        </button>
      {/if}
    </div>
  </div>
  
  <!-- Loading State -->
  {#if isLoading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading topics...</p>
    </div>
  {/if}
  
  <!-- Error State -->
  {#if error}
    <div class="error-container">
      <p class="error-message">{error}</p>
      <button class="btn btn-secondary" on:click={() => topicActions.loadTopics(eventId)}>
        Try Again
      </button>
    </div>
  {/if}
  
  <!-- Empty State -->
  {#if !isLoading && !error && $filteredTopics.length === 0}
    <div class="empty-container">
      {#if $topics.length === 0}
        <p>No topics submitted yet.</p>
        <button class="btn btn-primary" on:click={() => dispatch('createTopic')}>
          Submit the First Topic
        </button>
      {:else}
        <p>No topics match your current filters.</p>
        <button class="btn btn-secondary" on:click={clearFilters}>
          Clear Filters
        </button>
      {/if}
    </div>
  {/if}
  
  <!-- Topics List -->
  {#if !isLoading && !error && $filteredTopics.length > 0}
    <div class="topics-grid">
      {#each $filteredTopics as topic (topic.id)}
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
              
              {#if canChangeStatus(topic)}
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
    min-width: 120px;
  }
  
  .loading-container, .error-container, .empty-container {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-secondary, #6b7280);
  }
  
  .loading-spinner {
    width: 32px;
    height: 32px;
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
    color: var(--error-color, #ef4444);
    margin-bottom: 1rem;
  }
  
  .topics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
  }
  
  .topic-card {
    background: var(--surface-color, white);
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 8px;
    padding: 1.25rem;
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
    margin-bottom: 0.75rem;
  }
  
  .topic-title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary, #1f2937);
    line-height: 1.4;
    flex: 1;
  }
  
  .topic-status {
    margin-left: 0.75rem;
  }
  
  .status-badge {
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .topic-description {
    color: var(--text-secondary, #6b7280);
    line-height: 1.5;
    margin-bottom: 1rem;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .topic-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .tag {
    background: var(--tag-bg, #f3f4f6);
    color: var(--tag-text, #374151);
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .topic-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
    margin-bottom: 1rem;
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
  
  .topic-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .action-btn {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-color, #d1d5db);
    background: white;
    color: var(--text-primary, #374151);
    border-radius: 4px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .action-btn:hover {
    background: var(--hover-bg, #f9fafb);
  }
  
  .edit-btn:hover {
    border-color: var(--primary-color, #3b82f6);
    color: var(--primary-color, #3b82f6);
  }
  
  .status-btn:hover {
    border-color: var(--warning-color, #f59e0b);
    color: var(--warning-color, #f59e0b);
  }
  
  .view-btn:hover {
    border-color: var(--success-color, #10b981);
    color: var(--success-color, #10b981);
  }
  
  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  
  .btn-primary {
    background: var(--primary-color, #3b82f6);
    color: white;
  }
  
  .btn-primary:hover {
    background: var(--primary-hover, #2563eb);
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
  
  @media (max-width: 768px) {
    .list-header {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }
    
    .filters-container {
      gap: 0.75rem;
    }
    
    .filters-group {
      flex-direction: column;
      align-items: stretch;
    }
    
    .filter-select {
      min-width: unset;
    }
    
    .topics-grid {
      grid-template-columns: 1fr;
    }
    
    .topic-header {
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .topic-status {
      margin-left: 0;
      align-self: flex-start;
    }
  }
</style>