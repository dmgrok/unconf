<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { shuffleArray, chunkArray, type Event, type Participant, type Team } from '$lib/types/tools';
  
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
</script>

<svelte:head>
  <title>Team Shuffler - {event?.name || 'Event'}</title>
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
      <h1>🎲 Team Shuffler</h1>
      <p class="subtitle">{participants.length} participants available</p>
    </header>
    
    {#if participants.length < 2}
      <div class="warning-box">
        <h3>Not enough participants</h3>
        <p>You need at least 2 participants to create teams.</p>
        <a href="/events/{eventId}/participants" class="btn">Manage Participants →</a>
      </div>
    {:else}
      <section class="controls">
        <div class="control-row">
          <label>
            <span>Team size</span>
            <div class="size-input">
              <button 
                class="size-btn" 
                onclick={() => teamSize = Math.max(2, teamSize - 1)}
                disabled={teamSize <= 2}
              >−</button>
              <span class="size-value">{teamSize}</span>
              <button 
                class="size-btn" 
                onclick={() => teamSize = Math.min(maxTeamSize, teamSize + 1)}
                disabled={teamSize >= maxTeamSize}
              >+</button>
            </div>
          </label>
          <span class="team-count">
            → {Math.ceil(participants.length / teamSize)} teams
          </span>
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
          
          <div class="teams-grid">
            {#each teams as team, i}
              <div class="team-card">
                <h3>{team.name}</h3>
                <ul>
                  {#each team.members as member}
                    <li>{member}</li>
                  {/each}
                </ul>
                <span class="member-count">{team.members.length} members</span>
              </div>
            {/each}
          </div>
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
  
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
    color: #a1a1aa;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #27272a;
    border-top-color: #6366f1;
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
    color: #71717a;
    text-decoration: none;
    font-size: 0.875rem;
  }
  
  .back:hover {
    color: #a1a1aa;
  }
  
  header {
    margin-bottom: 2rem;
  }
  
  h1 {
    font-size: 1.75rem;
    margin: 1rem 0 0.25rem;
    color: #f4f4f5;
  }
  
  .subtitle {
    color: #a1a1aa;
    margin: 0;
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
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .control-row label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .control-row label span {
    font-weight: 500;
    color: #d4d4d8;
  }
  
  .size-input {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    overflow: hidden;
  }
  
  .size-btn {
    width: 36px;
    height: 36px;
    border: none;
    background: none;
    font-size: 1.25rem;
    cursor: pointer;
    color: #e4e4e7;
  }
  
  .size-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .size-btn:disabled {
    color: #52525b;
    cursor: not-allowed;
  }
  
  .size-value {
    width: 40px;
    text-align: center;
    font-weight: 600;
    font-size: 1.125rem;
    color: #f4f4f5;
  }
  
  .team-count {
    color: #a1a1aa;
    font-size: 0.875rem;
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
  
  .teams-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
  }
  
  .team-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 1rem;
    position: relative;
  }
  
  .team-card h3 {
    margin: 0 0 0.75rem;
    font-size: 1rem;
    color: #6366f1;
  }
  
  .team-card ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  
  .team-card li {
    padding: 0.375rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 0.9rem;
    color: #e4e4e7;
  }
  
  .team-card li:last-child {
    border-bottom: none;
  }
  
  .member-count {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    font-size: 0.7rem;
    color: #71717a;
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
    
    .teams-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
