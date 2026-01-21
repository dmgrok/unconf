<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { shuffleArray, chunkArray, type Event, type Participant, type Team } from '$lib/types/tools';
  import { 
    ToolHeader, 
    LoadingState, 
    ErrorState, 
    TeamSizeControl, 
    TeamsDisplay 
  } from '$lib/components/tools';
  
  let event = $state<Event | null>(null);
  let participants = $state<Participant[]>([]);
  let currentParticipant = $state<Participant | null>(null);
  
  let teamSize = $state(4);
  let teams = $state<Team[]>([]);
  let shuffled = $state(false);
  let isLoading = $state(true);
  let isSaving = $state(false);
  let error = $state('');
  let copied = $state(false);
  
  let eventId = $derived($page.params.eventId);
  let isOrganizer = $derived(currentParticipant?.role === 'organizer');
  let maxTeamSize = $derived(Math.max(2, Math.ceil(participants.length / 2)));
  
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
      participants = data.participants || [];
      
      // Check for stored participant
      const stored = sessionStorage.getItem(`event_${eventId}_participant`);
      if (stored) {
        currentParticipant = JSON.parse(stored);
      }
      
      // Load previous shuffle result if exists
      const shuffleResponse = await fetch(`/api/tools/events/${eventId}/shuffler`);
      if (shuffleResponse.ok) {
        const shuffleData = await shuffleResponse.json();
        if (shuffleData.result) {
          teams = shuffleData.result.teams;
          teamSize = shuffleData.result.teamSize;
          shuffled = true;
        }
      }
      
      isLoading = false;
    } catch (err) {
      error = 'Failed to load event';
      isLoading = false;
    }
  });
  
  function shuffle() {
    if (participants.length < 2) return;
    
    const names = participants.map(p => p.name);
    const shuffledNames = shuffleArray(names);
    const chunks = chunkArray(shuffledNames, teamSize);
    
    teams = chunks.map((members, i) => ({
      name: `Team ${i + 1}`,
      members,
    }));
    shuffled = true;
  }
  
  async function saveAndShare() {
    if (!shuffled || teams.length === 0) return;
    
    isSaving = true;
    try {
      await fetch(`/api/tools/events/${eventId}/shuffler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams, teamSize }),
      });
    } catch (err) {
      console.error('Failed to save shuffle result');
    }
    isSaving = false;
  }
  
  function copyTeams() {
    const text = teams.map(t => `${t.name}: ${t.members.join(', ')}`).join('\n');
    navigator.clipboard.writeText(text);
    copied = true;
    setTimeout(() => copied = false, 2000);
  }
  
  function resetShuffle() {
    teams = [];
    shuffled = false;
  }
  
  function handleTeamSizeChange(newSize: number) {
    teamSize = newSize;
  }
</script>

<svelte:head>
  <title>Team Shuffler - {event?.name || 'Event'}</title>
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
      title="Team Shuffler"
      icon="🎲"
      subtitle="{participants.length} participants available"
    />
    
    {#if participants.length < 2}
      <div class="warning-box">
        <h3>Not enough participants</h3>
        <p>You need at least 2 participants to create teams.</p>
        <a href="/events/{eventId}/participants" class="btn">Manage Participants →</a>
      </div>
    {:else}
      <section class="controls">
        <div class="control-row">
          <TeamSizeControl 
            {teamSize}
            max={maxTeamSize}
            totalPeople={participants.length}
            onChange={handleTeamSizeChange}
          />
        </div>
        
        <div class="action-buttons">
          <button class="shuffle-btn" onclick={shuffle}>
            🎲 {shuffled ? 'Reshuffle' : 'Shuffle Teams'}
          </button>
          {#if shuffled}
            <button class="reset-btn" onclick={resetShuffle}>Reset</button>
          {/if}
        </div>
      </section>
      
      {#if shuffled && teams.length > 0}
        <section class="results">
          <div class="results-header">
            <h2>Teams</h2>
            <div class="results-actions">
              <button class="copy-btn" onclick={copyTeams}>
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
              {#if isOrganizer}
                <button class="save-btn" onclick={saveAndShare} disabled={isSaving}>
                  {isSaving ? 'Saving...' : '💾 Save'}
                </button>
              {/if}
            </div>
          </div>
          
          <TeamsDisplay {teams} />
        </section>
      {/if}
      
      <section class="participant-list">
        <h3>Available Participants ({participants.length})</h3>
        <div class="participants">
          {#each participants as p}
            <span class="participant-chip">{p.name}</span>
          {/each}
        </div>
      </section>
    {/if}
  {/if}
</main>

<style>
  main {
    max-width: 800px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
    font-family: system-ui, -apple-system, sans-serif;
    color: #e4e4e7;
  }
  
  .warning-box {
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    padding: 1.5rem;
    border-radius: 12px;
    text-align: center;
  }
  
  .warning-box h3 {
    margin: 0 0 0.5rem;
    color: #fbbf24;
  }
  
  .warning-box p {
    margin: 0 0 1rem;
    color: #f59e0b;
  }
  
  .btn {
    display: inline-block;
    padding: 0.5rem 1rem;
    background: #6366f1;
    color: white;
    border-radius: 8px;
    text-decoration: none;
    font-size: 0.875rem;
  }
  
  .btn:hover {
    background: #4f46e5;
  }
  
  /* Controls */
  .controls {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 1.5rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
  }
  
  .control-row {
    margin-bottom: 1rem;
  }
  
  .action-buttons {
    display: flex;
    gap: 0.75rem;
  }
  
  .shuffle-btn {
    flex: 1;
    padding: 0.875rem 1.5rem;
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  
  .shuffle-btn:hover {
    opacity: 0.9;
  }
  
  .reset-btn {
    padding: 0.875rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    color: #a1a1aa;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    font-size: 1rem;
    cursor: pointer;
  }
  
  .reset-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #e4e4e7;
  }
  
  /* Results */
  .results {
    margin-bottom: 2rem;
  }
  
  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .results-header h2 {
    margin: 0;
    font-size: 1.25rem;
    color: #f4f4f5;
  }
  
  .results-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .copy-btn, .save-btn {
    padding: 0.5rem 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.05);
    color: #e4e4e7;
  }
  
  .copy-btn:hover, .save-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .save-btn {
    background: #22c55e;
    color: white;
    border-color: #22c55e;
  }
  
  .save-btn:hover {
    background: #16a34a;
  }
  
  .save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* Participant List */
  .participant-list {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 1.25rem;
    border-radius: 12px;
  }
  
  .participant-list h3 {
    font-size: 0.875rem;
    margin: 0 0 0.75rem;
    color: #a1a1aa;
  }
  
  .participants {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .participant-chip {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0.375rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    color: #d4d4d8;
  }
  
  @media (max-width: 640px) {
    .control-row {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
