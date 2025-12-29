<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { generateId, type Event, type Participant, type Poll } from '$lib/types/tools';
  
  let event = $state<Event | null>(null);
  let currentParticipant = $state<Participant | null>(null);
  let activePoll = $state<Poll | null>(null);
  let isLoading = $state(true);
  let error = $state('');
  
  // Create poll form
  let question = $state('');
  let options = $state(['', '']);
  let isCreating = $state(false);
  
  // Vote state
  let voted = $state(false);
  let votedOption = $state<string | null>(null);
  
  let eventId = $derived($page.params.eventId ?? '');
  let isOrganizer = $derived(currentParticipant?.role === 'organizer');
  let totalVotes = $derived(activePoll 
    ? Object.values(activePoll.votes).reduce((sum, voters) => sum + voters.length, 0)
    : 0);
  
  onMount(async () => {
    try {
      const response = await fetch(`/api/tools/events/${eventId}`);
      if (!response.ok) {
        error = 'Event not found';
        isLoading = false;
        return;
      }
      
      const data = await response.json();
      event = data.event;
      
      // Check for stored participant
      const stored = sessionStorage.getItem(`event_${eventId}_participant`);
      if (stored) {
        currentParticipant = JSON.parse(stored);
      }
      
      // Load active poll
      await loadPoll();
      
      isLoading = false;
    } catch (err) {
      error = 'Failed to load event';
      isLoading = false;
    }
  });
  
  async function loadPoll() {
    try {
      const pollResponse = await fetch(`/api/tools/events/${eventId}/poll`);
      if (pollResponse.ok) {
        const pollData = await pollResponse.json();
        if (pollData.poll) {
          activePoll = pollData.poll;
          // Check if current participant already voted
          if (currentParticipant && activePoll) {
            for (const [option, voters] of Object.entries(activePoll.votes)) {
              if ((voters as string[]).includes(currentParticipant.id)) {
                voted = true;
                votedOption = option;
                break;
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load poll');
    }
  }
  
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
  
  async function createPoll() {
    const validOptions = options.filter(o => o.trim());
    if (!question.trim() || validOptions.length < 2) {
      return;
    }
    
    isCreating = true;
    
    try {
      const newPoll: Poll = {
        id: generateId(),
        eventId,
        question: question.trim(),
        options: validOptions,
        votes: Object.fromEntries(validOptions.map(o => [o, []])),
        status: 'open',
        createdAt: new Date().toISOString(),
      };
      
      const response = await fetch(`/api/tools/events/${eventId}/poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPoll),
      });
      
      if (response.ok) {
        activePoll = newPoll;
        question = '';
        options = ['', ''];
      }
    } catch (err) {
      console.error('Failed to create poll');
    }
    
    isCreating = false;
  }
  
  async function vote(option: string) {
    if (voted || !currentParticipant || !activePoll) return;
    
    try {
      const response = await fetch(`/api/tools/events/${eventId}/poll/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          option,
          participantId: currentParticipant.id,
        }),
      });
      
      if (response.ok) {
        voted = true;
        votedOption = option;
        // Update local vote count
        if (activePoll) {
          activePoll.votes[option] = [...(activePoll.votes[option] || []), currentParticipant.id];
          activePoll = activePoll; // trigger reactivity
        }
      }
    } catch (err) {
      console.error('Failed to vote');
    }
  }
  
  async function closePoll() {
    if (!activePoll) return;
    
    try {
      await fetch(`/api/tools/events/${eventId}/poll`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });
      
      activePoll = null;
      voted = false;
      votedOption = null;
    } catch (err) {
      console.error('Failed to close poll');
    }
  }
</script>

<svelte:head>
  <title>Quick Poll - {event?.name || 'Event'}</title>
</svelte:head>

<main>
  {#if isLoading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  {:else if error}
    <div class="error-page">
      <h1>😕 {error}</h1>
      <a href="/" class="btn">← Back to Home</a>
    </div>
  {:else if event}
    <header>
      <a href="/events/{eventId}" class="back">← Back to {event.name}</a>
      <h1>🗳️ Quick Poll</h1>
    </header>
    
    {#if !currentParticipant}
      <div class="join-prompt">
        <p>Join the event to participate in polls.</p>
        <a href="/join?code={event.code}" class="btn primary">Join Event</a>
      </div>
    {:else if !activePoll}
      {#if isOrganizer}
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
            
            <button type="submit" class="create-btn" disabled={isCreating || !question.trim() || options.filter(o => o.trim()).length < 2}>
              {isCreating ? 'Creating...' : 'Create Poll'}
            </button>
          </form>
        </section>
      {:else}
        <div class="waiting">
          <span class="waiting-icon">⏳</span>
          <h2>Waiting for poll</h2>
          <p>The organizer hasn't started a poll yet.</p>
        </div>
      {/if}
    {:else}
      <section class="active-poll">
        <h2>{activePoll.question}</h2>
        
        <div class="poll-options">
          {#each activePoll.options as option}
            {@const voteCount = activePoll.votes[option]?.length || 0}
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
        
        {#if isOrganizer}
          <button class="close-poll-btn" onclick={closePoll}>
            Close Poll
          </button>
        {/if}
      </section>
    {/if}
  {/if}
</main>

<style>
  main {
    max-width: 500px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
    color: #6b7280;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e5e7eb;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .error-page {
    text-align: center;
    padding: 4rem 1rem;
  }
  
  .back {
    color: #6b7280;
    text-decoration: none;
    font-size: 0.875rem;
  }
  
  header {
    margin-bottom: 2rem;
  }
  
  h1 {
    font-size: 1.75rem;
    margin: 1rem 0 0;
  }
  
  .btn {
    display: inline-block;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 500;
  }
  
  .btn.primary {
    background: #2563eb;
    color: white;
  }
  
  .join-prompt {
    background: #fef3c7;
    border: 1px solid #fcd34d;
    padding: 1.5rem;
    border-radius: 12px;
    text-align: center;
  }
  
  .join-prompt p {
    margin: 0 0 1rem;
    color: #92400e;
  }
  
  /* Waiting state */
  .waiting {
    text-align: center;
    padding: 3rem 1rem;
  }
  
  .waiting-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 1rem;
  }
  
  .waiting h2 {
    margin: 0 0 0.5rem;
    color: #374151;
  }
  
  .waiting p {
    color: #6b7280;
    margin: 0;
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
  
  .close-poll-btn {
    margin-top: 2rem;
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
