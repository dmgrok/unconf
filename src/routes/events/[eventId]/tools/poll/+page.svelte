<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { generateId, type Event, type Participant, type Poll } from '$lib/types/tools';
  import { ToolHeader, LoadingState, ErrorState, PollDisplay } from '$lib/components/tools';
  
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
  
  // Transform poll options for PollDisplay component
  let pollOptions = $derived(activePoll 
    ? activePoll.options.map(opt => ({
        text: opt,
        voteCount: activePoll!.votes[opt]?.length || 0,
        isSelected: votedOption === opt
      }))
    : []
  );
  
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
  
  async function handleVote(optionText: string) {
    if (voted || !currentParticipant || !activePoll) return;
    
    try {
      const response = await fetch(`/api/tools/events/${eventId}/poll/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          option: optionText,
          participantId: currentParticipant.id,
        }),
      });
      
      if (response.ok) {
        voted = true;
        votedOption = optionText;
        // Update local vote count
        if (activePoll) {
          activePoll.votes[optionText] = [...(activePoll.votes[optionText] || []), currentParticipant.id];
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
    <LoadingState message="Loading..." />
  {:else if error}
    <ErrorState title={error} backUrl="/" backText="← Back to Home" />
  {:else if event}
    <ToolHeader 
      {eventId}
      eventName={event.name}
      title="Quick Poll"
      icon="🗳️"
    />
    
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
        <PollDisplay 
          question={activePoll.question}
          options={pollOptions}
          {totalVotes}
          hasVoted={voted}
          status={activePoll.status}
          onVote={handleVote}
        />
        
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
    color: #e4e4e7;
  }
  
  .btn {
    display: inline-block;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 500;
  }
  
  .btn.primary {
    background: #6366f1;
    color: white;
  }
  
  .btn.primary:hover {
    background: #4f46e5;
  }
  
  .join-prompt {
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    padding: 1.5rem;
    border-radius: 12px;
    text-align: center;
  }
  
  .join-prompt p {
    margin: 0 0 1rem;
    color: #fbbf24;
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
    color: #f4f4f5;
  }
  
  .waiting p {
    color: #a1a1aa;
    margin: 0;
  }
  
  /* Create Poll Form */
  .create-poll {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 1.5rem;
    border-radius: 12px;
  }
  
  .create-poll h2 {
    margin: 0 0 1.5rem;
    font-size: 1.25rem;
    color: #f4f4f5;
  }
  
  .form-group {
    margin-bottom: 1.25rem;
  }
  
  .form-group label, .form-label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    color: #d4d4d8;
  }
  
  .form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    font-size: 1rem;
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.05);
    color: #e4e4e7;
  }
  
  .form-group input:focus {
    outline: none;
    border-color: #6366f1;
    background: rgba(255, 255, 255, 0.08);
  }
  
  .form-group input::placeholder {
    color: #71717a;
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
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
    font-size: 1.25rem;
    cursor: pointer;
  }
  
  .remove-btn:hover {
    background: rgba(239, 68, 68, 0.25);
  }
  
  .add-option-btn {
    width: 100%;
    padding: 0.75rem;
    background: none;
    border: 2px dashed rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    color: #71717a;
    cursor: pointer;
    font-size: 0.875rem;
  }
  
  .add-option-btn:hover {
    border-color: rgba(255, 255, 255, 0.25);
    color: #a1a1aa;
  }
  
  .create-btn {
    width: 100%;
    padding: 1rem;
    background: #6366f1;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
  }
  
  .create-btn:hover:not(:disabled) {
    background: #4f46e5;
  }
  
  .create-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* Active Poll */
  .active-poll {
    text-align: center;
  }
  
  .close-poll-btn {
    margin-top: 2rem;
    padding: 0.75rem 1.5rem;
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
    font-size: 0.875rem;
    cursor: pointer;
  }
  
  .close-poll-btn:hover {
    background: rgba(239, 68, 68, 0.25);
  }
</style>
