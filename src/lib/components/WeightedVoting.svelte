<!--
  Weighted Voting Component
  Allows users to cast weighted votes (1st, 2nd, 3rd choice) for topics
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { VoteWeight } from '../../types/entities';
  
  export let topicId: string;
  export let eventId: string;
  export let userId: string;
  export let disabled: boolean = false;
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let userVote: VoteWeight | null = null; // Current user's vote if any
  
  const dispatch = createEventDispatcher();
  
  let isLoading = false;
  let error: string | null = null;
  
  // Vote weight configuration
  const voteOptions = [
    {
      weight: VoteWeight.FIRST,
      label: '1st Choice',
      value: 3,
      color: 'var(--primary-color, #3b82f6)',
      icon: '🥇'
    },
    {
      weight: VoteWeight.SECOND,
      label: '2nd Choice', 
      value: 2,
      color: 'var(--secondary-color, #10b981)',
      icon: '🥈'
    },
    {
      weight: VoteWeight.THIRD,
      label: '3rd Choice',
      value: 1,
      color: 'var(--accent-color, #f59e0b)',
      icon: '🥉'
    }
  ];
  
  async function castVote(weight: VoteWeight) {
    if (disabled || isLoading) return;
    
    isLoading = true;
    error = null;
    
    try {
      const method = userVote ? 'PUT' : 'POST';
      const response = await fetch('/api/votes', {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          topicId,
          eventId,
          weight
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to cast vote');
      }
      
      userVote = weight;
      dispatch('votecast', {
        topicId,
        userId,
        weight,
        previousVote: userVote
      });
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to cast vote';
      dispatch('error', { message: error });
    } finally {
      isLoading = false;
    }
  }
  
  async function removeVote() {
    if (disabled || isLoading || !userVote) return;
    
    isLoading = true;
    error = null;
    
    try {
      const response = await fetch('/api/votes', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          topicId
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove vote');
      }
      
      const previousVote = userVote;
      userVote = null;
      
      dispatch('voteremoved', {
        topicId,
        userId,
        previousVote
      });
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to remove vote';
      dispatch('error', { message: error });
    } finally {
      isLoading = false;
    }
  }
  
  // Get button classes based on size
  function getButtonClass(isSelected: boolean, weight: VoteWeight) {
    const baseClasses = ['vote-btn'];
    
    if (size === 'sm') baseClasses.push('vote-btn-sm');
    else if (size === 'lg') baseClasses.push('vote-btn-lg');
    else baseClasses.push('vote-btn-md');
    
    if (isSelected) {
      baseClasses.push('vote-btn-selected');
      baseClasses.push(`vote-btn-${weight}`);
    }
    
    if (disabled || isLoading) {
      baseClasses.push('vote-btn-disabled');
    }
    
    return baseClasses.join(' ');
  }
</script>

<div class="voting-widget {size}" class:disabled>
  
  {#if error}
    <div class="error-message" role="alert">
      {error}
    </div>
  {/if}
  
  <div class="vote-options" role="group" aria-label="Vote for this topic">
    
    {#each voteOptions as option}
      <button
        class={getButtonClass(userVote === option.weight, option.weight)}
        style="--vote-color: {option.color}"
        disabled={disabled || isLoading}
        title="{option.label} ({option.value} points)"
        aria-pressed={userVote === option.weight}
        on:click={() => castVote(option.weight)}
      >
        <span class="vote-icon" aria-hidden="true">{option.icon}</span>
        <span class="vote-label">{option.label}</span>
        <span class="vote-value">({option.value})</span>
      </button>
    {/each}
    
    {#if userVote}
      <button
        class="vote-btn vote-btn-remove {size === 'sm' ? 'vote-btn-sm' : size === 'lg' ? 'vote-btn-lg' : 'vote-btn-md'}"
        disabled={disabled || isLoading}
        title="Remove your vote"
        on:click={removeVote}
      >
        <span class="vote-icon" aria-hidden="true">❌</span>
        <span class="vote-label">Remove</span>
      </button>
    {/if}
  </div>
  
  {#if isLoading}
    <div class="loading-indicator" aria-live="polite">
      <span class="loading-spinner" aria-hidden="true"></span>
      <span class="sr-only">Processing vote...</span>
    </div>
  {/if}
</div>

<style>
  .voting-widget {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .vote-options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  
  .vote-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    border: 2px solid var(--border-color, #e5e7eb);
    background: var(--bg-color, #ffffff);
    color: var(--text-color, #374151);
    border-radius: 0.5rem;
    font-weight: 500;
    transition: all 0.2s ease;
    cursor: pointer;
    position: relative;
    white-space: nowrap;
  }
  
  .vote-btn:hover:not(.vote-btn-disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    border-color: var(--vote-color, var(--primary-color, #3b82f6));
  }
  
  .vote-btn:active:not(.vote-btn-disabled) {
    transform: translateY(0);
  }
  
  .vote-btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }
  
  .vote-btn-md {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
  }
  
  .vote-btn-lg {
    padding: 0.75rem 1rem;
    font-size: 1rem;
  }
  
  .vote-btn-selected {
    background: var(--vote-color);
    color: white;
    border-color: var(--vote-color);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .vote-btn-selected:hover:not(.vote-btn-disabled) {
    background: var(--vote-color);
    opacity: 0.9;
  }
  
  .vote-btn-remove {
    background: var(--error-color, #ef4444);
    color: white;
    border-color: var(--error-color, #ef4444);
  }
  
  .vote-btn-remove:hover:not(.vote-btn-disabled) {
    background: var(--error-hover, #dc2626);
    border-color: var(--error-hover, #dc2626);
  }
  
  .vote-btn-disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }
  
  .vote-icon {
    font-size: 1.1em;
  }
  
  .vote-label {
    font-weight: 500;
  }
  
  .vote-value {
    opacity: 0.8;
    font-size: 0.9em;
  }
  
  .error-message {
    padding: 0.5rem;
    background: var(--error-bg, #fef2f2);
    color: var(--error-color, #dc2626);
    border: 1px solid var(--error-border, #fecaca);
    border-radius: 0.25rem;
    font-size: 0.875rem;
  }
  
  .loading-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.25rem;
    color: var(--text-secondary, #6b7280);
    font-size: 0.875rem;
  }
  
  .loading-spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid var(--border-color, #e5e7eb);
    border-top: 2px solid var(--primary-color, #3b82f6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  
  .disabled {
    opacity: 0.6;
    pointer-events: none;
  }
  
  /* Responsive adjustments */
  @media (max-width: 640px) {
    .voting-widget.lg .vote-options {
      flex-direction: column;
      align-items: stretch;
    }
    
    .voting-widget.lg .vote-btn {
      justify-content: center;
    }
  }
</style>