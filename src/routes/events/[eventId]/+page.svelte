<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { TOOL_INFO, type Event, type Participant, type ToolId, type EnabledTools } from '$lib/types/tools';
  
  let event = $state<Event | null>(null);
  let participants = $state<Participant[]>([]);
  let currentParticipant = $state<Participant | null>(null);
  let isLoading = $state(true);
  let error = $state('');
  let codeCopied = $state(false);
  
  let eventId = $derived($page.params.eventId);
  let isOrganizer = $derived(currentParticipant?.role === 'organizer');
  let participantCount = $derived(participants.length);
  
  // Only show tools that are part of EnabledTools (not survey which is standalone-only)
  const tools: { id: keyof EnabledTools; status: 'live' | 'coming' }[] = [
    { id: 'shuffler', status: 'live' },
    { id: 'timer', status: 'live' },
    { id: 'poll', status: 'live' },
    { id: 'checkin', status: 'coming' },
  ];
  
  onMount(async () => {
    try {
      // Load event data
      const response = await fetch(`/api/tools/events/${eventId}`);
      if (!response.ok) {
        if (response.status === 404) {
          error = 'Event not found';
        } else {
          error = 'Failed to load event';
        }
        isLoading = false;
        return;
      }
      
      const data = await response.json();
      event = data.event;
      participants = data.participants || [];
      
      // Check if we have a stored participant for this event
      const stored = sessionStorage.getItem(`event_${eventId}_participant`);
      if (stored) {
        currentParticipant = JSON.parse(stored);
      }
      
      isLoading = false;
    } catch (err) {
      error = 'Failed to load event';
      isLoading = false;
    }
  });
  
  function copyCode() {
    if (event) {
      navigator.clipboard.writeText(event.code);
      codeCopied = true;
      setTimeout(() => codeCopied = false, 2000);
    }
  }
  
  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
  }
</script>

<svelte:head>
  <title>{event?.name || 'Event'} - unconf tools Lab</title>
</svelte:head>

<main>
  {#if isLoading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading event...</p>
    </div>
  {:else if error}
    <div class="error-page">
      <h1>😕 {error}</h1>
      <p>The event you're looking for doesn't exist or has been archived.</p>
      <a href="/" class="btn">← Back to Home</a>
    </div>
  {:else if event}
    <header>
      <a href="/" class="back">← Home</a>
      <div class="event-header">
        <h1>{event.name}</h1>
        <div class="event-meta">
          <button class="code-badge" onclick={copyCode} title="Click to copy">
            Code: <strong>{event.code}</strong>
            <span class="copy-icon">{codeCopied ? '✓' : '📋'}</span>
          </button>
          <button class="share-btn" onclick={copyLink}>🔗 Share Link</button>
          {#if isOrganizer}
            <a href="/events/{eventId}/manage" class="manage-btn">⚙️ Manage</a>
          {/if}
        </div>
      </div>
      {#if event.description}
        <p class="description">{event.description}</p>
      {/if}
    </header>
    
    {#if !currentParticipant}
      <div class="join-prompt">
        <p>You're viewing this event as a guest.</p>
        <a href="/join?code={event.code}" class="btn primary">Join Event</a>
      </div>
    {:else}
      <div class="welcome">
        👋 Welcome, <strong>{currentParticipant.name}</strong>
        {#if isOrganizer}
          <span class="role-badge">Organizer</span>
        {/if}
      </div>
    {/if}
    
    <section class="tools-section">
      <h2>Tools</h2>
      <div class="tools-grid">
        {#each tools as tool}
          {@const info = TOOL_INFO[tool.id]}
          {@const enabled = event.tools[tool.id]}
          {@const available = tool.status === 'live' && enabled}
          
          <a 
            href={available ? `/events/${eventId}/tools/${tool.id}` : undefined}
            class="tool-card"
            class:disabled={!available}
            class:coming={tool.status === 'coming'}
          >
            <span class="tool-emoji">{info.emoji}</span>
            <h3>{info.name}</h3>
            <p>{info.description}</p>
            {#if tool.status === 'coming'}
              <span class="badge coming">Coming Soon</span>
            {:else if !enabled}
              <span class="badge disabled">Not Enabled</span>
            {/if}
          </a>
        {/each}
      </div>
    </section>
    
    <section class="participants-section">
      <div class="section-header">
        <h2>Participants ({participantCount})</h2>
        <a href="/events/{eventId}/participants" class="view-all">View all →</a>
      </div>
      
      {#if participantCount === 0}
        <p class="empty-state">No participants yet. Share the event code to invite people!</p>
      {:else}
        <div class="participant-preview">
          {#each participants.slice(0, 8) as p}
            <div class="participant-avatar" title={p.name}>
              {p.name.charAt(0).toUpperCase()}
            </div>
          {/each}
          {#if participantCount > 8}
            <div class="participant-more">+{participantCount - 8}</div>
          {/if}
        </div>
      {/if}
    </section>
  {/if}
</main>

<style>
  main {
    max-width: 800px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  /* Loading & Error States */
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
    border: 3px solid rgba(255, 255, 255, 0.1);
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
  
  .error-page h1 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    color: #e4e4e7;
  }
  
  .error-page p {
    color: #a1a1aa;
    margin-bottom: 1.5rem;
  }
  
  /* Header */
  .back {
    color: #a1a1aa;
    text-decoration: none;
    font-size: 0.875rem;
  }
  
  .back:hover {
    color: #e4e4e7;
  }
  
  header {
    margin-bottom: 2rem;
  }
  
  .event-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .event-header h1 {
    font-size: 1.75rem;
    margin: 0;
    flex: 1;
    min-width: 200px;
    color: #e4e4e7;
  }
  
  .event-meta {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .code-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background 0.2s;
    color: #e4e4e7;
  }
  
  .code-badge:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .code-badge strong {
    font-family: monospace;
    font-size: 1rem;
    letter-spacing: 0.1em;
  }
  
  .copy-icon {
    opacity: 0.5;
  }
  
  .share-btn, .manage-btn {
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    font-size: 0.875rem;
    cursor: pointer;
    text-decoration: none;
    color: #e4e4e7;
  }
  
  .share-btn:hover, .manage-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .description {
    color: #a1a1aa;
    margin: 1rem 0 0;
    line-height: 1.5;
  }
  
  /* Join Prompt */
  .join-prompt {
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.3);
    padding: 1rem 1.25rem;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .join-prompt p {
    margin: 0;
    color: #fbbf24;
  }
  
  /* Welcome */
  .welcome {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    padding: 0.75rem 1rem;
    border-radius: 8px;
    margin-bottom: 2rem;
    color: #4ade80;
  }
  
  .role-badge {
    background: #22c55e;
    color: #0a0a0f;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    margin-left: 0.5rem;
    font-weight: 600;
  }
  
  /* Buttons */
  .btn {
    display: inline-block;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 500;
    font-size: 0.875rem;
    transition: opacity 0.2s;
  }
  
  .btn.primary {
    background: #6366f1;
    color: white;
  }
  
  /* Tools Section */
  .tools-section {
    margin-bottom: 2rem;
  }
  
  .tools-section h2 {
    font-size: 1.25rem;
    margin: 0 0 1rem;
    color: #e4e4e7;
  }
  
  .tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
  }
  
  .tool-card {
    background: rgba(255, 255, 255, 0.03);
    padding: 1.25rem;
    border-radius: 12px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.08);
    text-decoration: none;
    color: inherit;
    position: relative;
    transition: transform 0.2s, border-color 0.2s;
  }
  
  .tool-card:not(.disabled):hover {
    transform: translateY(-2px);
    border-color: rgba(99, 102, 241, 0.5);
    background: rgba(99, 102, 241, 0.1);
  }
  
  .tool-card.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .tool-emoji {
    font-size: 2rem;
    display: block;
    margin-bottom: 0.5rem;
  }
  
  .tool-card h3 {
    font-size: 0.9rem;
    margin: 0 0 0.25rem;
    color: #e4e4e7;
  }
  
  .tool-card p {
    font-size: 0.75rem;
    color: #a1a1aa;
    margin: 0;
    line-height: 1.3;
  }
  
  .badge {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    font-size: 0.6rem;
    font-weight: 600;
  }
  
  .badge.coming {
    background: rgba(251, 191, 36, 0.15);
    color: #fbbf24;
  }
  
  .badge.disabled {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
  }
  
  /* Participants Section */
  .participants-section {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 1.25rem;
    border-radius: 12px;
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .section-header h2 {
    font-size: 1rem;
    margin: 0;
    color: #e4e4e7;
  }
  
  .view-all {
    font-size: 0.875rem;
    color: #60a5fa;
    text-decoration: none;
  }
  
  .empty-state {
    color: #a1a1aa;
    font-size: 0.875rem;
    margin: 0;
  }
  
  .participant-preview {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .participant-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #6366f1;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.875rem;
  }
  
  .participant-more {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    color: #a1a1aa;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
  }
  
  @media (max-width: 640px) {
    .event-header {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .event-meta {
      width: 100%;
    }
    
    .join-prompt {
      flex-direction: column;
      text-align: center;
    }
    
    .tools-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
