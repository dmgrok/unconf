<script lang="ts">
  interface PollOption {
    text: string;
    voteCount: number;
    isSelected?: boolean;
  }
  
  interface Props {
    /** Poll question */
    question: string;
    /** Poll options with vote counts */
    options: PollOption[];
    /** Total votes cast */
    totalVotes: number;
    /** Whether user has voted */
    hasVoted: boolean;
    /** Poll status */
    status?: 'open' | 'closed';
    /** Callback when option is selected */
    onVote?: (optionText: string) => void;
  }
  
  let { 
    question,
    options,
    totalVotes,
    hasVoted,
    status = 'open',
    onVote
  }: Props = $props();
  
  function getPercentage(voteCount: number): number {
    return totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
  }
</script>

<div class="poll-display">
  <h2 class="question">{question}</h2>
  
  <div class="options">
    {#each options as option}
      {@const percentage = getPercentage(option.voteCount)}
      
      <button 
        class="poll-option"
        class:voted={hasVoted}
        class:selected={option.isSelected}
        onclick={() => onVote?.(option.text)}
        disabled={hasVoted || status === 'closed'}
      >
        <span class="option-text">{option.text}</span>
        {#if hasVoted || status === 'closed'}
          <span class="vote-count">{option.voteCount} ({percentage}%)</span>
        {/if}
        {#if hasVoted || status === 'closed'}
          <div class="bar" style="width: {percentage}%"></div>
        {/if}
        {#if option.isSelected}
          <span class="check">✓</span>
        {/if}
      </button>
    {/each}
  </div>
  
  <div class="poll-footer">
    {#if hasVoted || status === 'closed'}
      <p class="total-votes">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
    {:else}
      <p class="vote-prompt">Tap an option to vote</p>
    {/if}
    
    {#if status === 'closed'}
      <span class="status-badge closed">Poll Closed</span>
    {/if}
  </div>
</div>

<style>
  .poll-display {
    width: 100%;
  }
  
  .question {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 1.5rem;
    color: #f4f4f5;
  }
  
  .options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .poll-option {
    position: relative;
    width: 100%;
    padding: 1rem 1.25rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    text-align: left;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.2s;
    color: #e4e4e7;
  }
  
  .poll-option:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.15);
  }
  
  .poll-option:disabled {
    cursor: default;
  }
  
  .poll-option.selected {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.1);
  }
  
  .option-text {
    position: relative;
    z-index: 1;
    font-weight: 500;
  }
  
  .vote-count {
    position: relative;
    z-index: 1;
    font-size: 0.875rem;
    color: #a1a1aa;
    margin-left: 0.5rem;
  }
  
  .bar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    background: rgba(99, 102, 241, 0.15);
    transition: width 0.3s ease;
  }
  
  .check {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: #6366f1;
    font-weight: 600;
    z-index: 1;
  }
  
  .poll-footer {
    margin-top: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .total-votes {
    margin: 0;
    font-size: 0.875rem;
    color: #a1a1aa;
  }
  
  .vote-prompt {
    margin: 0;
    font-size: 0.875rem;
    color: #71717a;
  }
  
  .status-badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-weight: 500;
  }
  
  .status-badge.closed {
    background: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
  }
</style>
