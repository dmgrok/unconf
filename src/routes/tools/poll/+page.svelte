<script lang="ts">
  import { generateId } from '$lib/types/tools';
  
  type LocalPoll = {
    question: string;
    options: string[];
    votes: Record<string, number>;
    status: 'open' | 'closed';
  };
  
  // Poll state (local only in standalone mode)
  let activePoll = $state<LocalPoll | null>(null);
  let voted = $state(false);
  let votedOption = $state<string | null>(null);
  
  // Create poll form
  let question = $state('');
  let options = $state(['', '']);
  
  let totalVotes = $derived(activePoll 
    ? Object.values(activePoll.votes).reduce((sum, count) => sum + count, 0)
    : 0);
  
  function addOption() {
    if (options.length < 6) {
      options = [...options, ''];
    }
  }
  
  function removeOption(index: number) {
    if (options.length > 2) {
      options = options.filter((_, i) => i !== index);
    }
  }
  
  function createPoll() {
    const validOptions = options.filter(o => o.trim());
    if (!question.trim() || validOptions.length < 2) {
      return;
    }
    
    activePoll = {
      question: question.trim(),
      options: validOptions,
      votes: Object.fromEntries(validOptions.map(o => [o, 0])),
      status: 'open',
    };
    
    question = '';
    options = ['', ''];
  }
  
  function vote(option: string) {
    if (voted || !activePoll) return;
    
    activePoll.votes[option]++;
    activePoll = activePoll; // trigger reactivity
    voted = true;
    votedOption = option;
  }
  
  function closePoll() {
    activePoll = null;
    voted = false;
    votedOption = null;
  }
  
  function resetForNewPoll() {
    activePoll = null;
    voted = false;
    votedOption = null;
  }
</script>

<svelte:head>
  <title>Quick Poll - Event Tools Lab</title>
  <meta name="description" content="Create instant polls with live results. Free, no signup required." />
</svelte:head>

<main>
  <header>
    <a href="/" class="back">← Event Tools Lab</a>
    <h1>🗳️ Quick Poll</h1>
    <p class="subtitle">Create instant polls with live results</p>
  </header>
  
  <div class="standalone-notice">
    <span>💡</span>
    <p>
      <strong>Standalone mode</strong> - Votes are local to this browser session. 
      <a href="/create">Create an event</a> to share polls with participants.
    </p>
  </div>
  
  {#if !activePoll}
    <section class="create-poll">
      <h2>Create a Poll</h2>
      
      <form onsubmit={(e) => { e.preventDefault(); createPoll(); }}>
        <div class="form-group">
          <label for="question">Question</label>
          <input 
            id="question"
            type="text" 
            bind:value={question}
            placeholder="What should we discuss next?"
            maxlength="200"
          />
        </div>
        
        <div class="form-group">
          <span class="form-label">Options</span>
          {#each options as option, i}
            <div class="option-row">
              <input 
                type="text" 
                bind:value={options[i]}
                placeholder="Option {i + 1}"
                maxlength="100"
              />
              {#if options.length > 2}
                <button type="button" class="remove-btn" onclick={() => removeOption(i)}>×</button>
              {/if}
            </div>
          {/each}
          {#if options.length < 6}
            <button type="button" class="add-option-btn" onclick={addOption}>
              + Add option
            </button>
          {/if}
        </div>
        
        <button type="submit" class="create-btn" disabled={!question.trim() || options.filter(o => o.trim()).length < 2}>
          Create Poll
        </button>
      </form>
    </section>
  {:else}
    <section class="active-poll">
      <h2>{activePoll.question}</h2>
      
      <div class="poll-options">
        {#each activePoll.options as option}
          {@const voteCount = activePoll.votes[option] || 0}
          {@const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0}
          {@const isSelected = votedOption === option}
          
          <button 
            class="poll-option"
            class:voted
            class:selected={isSelected}
            onclick={() => vote(option)}
            disabled={voted}
          >
            <span class="option-text">{option}</span>
            {#if voted}
              <span class="vote-count">{voteCount} ({percentage}%)</span>
            {/if}
            {#if voted}
              <div class="bar" style="width: {percentage}%"></div>
            {/if}
            {#if isSelected}
              <span class="check">✓</span>
            {/if}
          </button>
        {/each}
      </div>
      
      {#if voted}
        <p class="total-votes">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
      {:else}
        <p class="vote-prompt">Tap an option to vote</p>
      {/if}
      
      <div class="poll-actions">
        <button class="new-poll-btn" onclick={resetForNewPoll}>
          + New Poll
        </button>
        <button class="close-poll-btn" onclick={closePoll}>
          Close Poll
        </button>
      </div>
    </section>
  {/if}
</main>

<style>
  main {
    max-width: 500px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  .back {
    color: #6b7280;
    text-decoration: none;
    font-size: 0.875rem;
  }
  
  .back:hover {
    color: #374151;
  }
  
  header {
    margin-bottom: 1.5rem;
  }
  
  h1 {
    font-size: 1.75rem;
    margin: 1rem 0 0.25rem;
  }
  
  .subtitle {
    color: #6b7280;
    margin: 0;
  }
  
  .standalone-notice {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    padding: 1rem;
    border-radius: 10px;
    margin-bottom: 1.5rem;
  }
  
  .standalone-notice span {
    font-size: 1.25rem;
  }
  
  .standalone-notice p {
    margin: 0;
    font-size: 0.875rem;
    color: #0c4a6e;
  }
  
  .standalone-notice a {
    color: #0284c7;
  }
  
  /* Create Poll Form */
  .create-poll {
    background: #f8fafc;
    padding: 1.5rem;
    border-radius: 12px;
  }
  
  .create-poll h2 {
    margin: 0 0 1.5rem;
    font-size: 1.25rem;
  }
  
  .form-group {
    margin-bottom: 1.25rem;
  }
  
  .form-group label, .form-label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }
  
  .form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 1rem;
    box-sizing: border-box;
  }
  
  .form-group input:focus {
    outline: none;
    border-color: #2563eb;
  }
  
  .option-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .option-row input {
    flex: 1;
  }
  
  .remove-btn {
    width: 40px;
    background: #fee2e2;
    color: #b91c1c;
    border: none;
    border-radius: 8px;
    font-size: 1.25rem;
    cursor: pointer;
  }
  
  .add-option-btn {
    width: 100%;
    padding: 0.75rem;
    background: none;
    border: 2px dashed #d1d5db;
    border-radius: 8px;
    color: #6b7280;
    cursor: pointer;
    font-size: 0.875rem;
  }
  
  .add-option-btn:hover {
    border-color: #9ca3af;
    color: #374151;
  }
  
  .create-btn {
    width: 100%;
    padding: 1rem;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
  }
  
  .create-btn:hover:not(:disabled) {
    background: #1d4ed8;
  }
  
  .create-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* Active Poll */
  .active-poll {
    text-align: center;
  }
  
  .active-poll h2 {
    font-size: 1.5rem;
    margin: 0 0 1.5rem;
  }
  
  .poll-options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .poll-option {
    position: relative;
    padding: 1rem 1.25rem;
    background: #f8fafc;
    border: 2px solid #e5e7eb;
    border-radius: 10px;
    text-align: left;
    cursor: pointer;
    overflow: hidden;
    transition: border-color 0.2s;
  }
  
  .poll-option:not(:disabled):hover {
    border-color: #2563eb;
  }
  
  .poll-option:disabled {
    cursor: default;
  }
  
  .poll-option.voted {
    background: white;
  }
  
  .poll-option.selected {
    border-color: #2563eb;
    background: #eff6ff;
  }
  
  .option-text {
    position: relative;
    z-index: 1;
    font-size: 1rem;
  }
  
  .vote-count {
    position: relative;
    z-index: 1;
    float: right;
    color: #6b7280;
    font-size: 0.875rem;
  }
  
  .bar {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: #dbeafe;
    transition: width 0.3s ease;
    z-index: 0;
  }
  
  .check {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: #2563eb;
    font-weight: bold;
    z-index: 1;
  }
  
  .total-votes {
    margin: 1.5rem 0 0;
    color: #6b7280;
  }
  
  .vote-prompt {
    margin: 1rem 0 0;
    color: #9ca3af;
    font-size: 0.875rem;
  }
  
  .poll-actions {
    margin-top: 2rem;
    display: flex;
    gap: 0.75rem;
    justify-content: center;
  }
  
  .new-poll-btn {
    padding: 0.75rem 1.5rem;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    cursor: pointer;
  }
  
  .new-poll-btn:hover {
    background: #1d4ed8;
  }
  
  .close-poll-btn {
    padding: 0.75rem 1.5rem;
    background: #fee2e2;
    color: #b91c1c;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    cursor: pointer;
  }
  
  .close-poll-btn:hover {
    background: #fecaca;
  }
</style>
