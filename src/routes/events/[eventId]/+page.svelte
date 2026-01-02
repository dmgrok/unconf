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
  
  .error-page h1 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }
  
  .error-page p {
    color: #6b7280;
    margin-bottom: 1.5rem;
  }
  
  /* Header */
  .back {
    color: #6b7280;
    text-decoration: none;
    font-size: 0.875rem;
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
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .code-badge:hover {
    background: #e5e7eb;
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
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 0.875rem;
    cursor: pointer;
    text-decoration: none;
    color: inherit;
  }
  
  .share-btn:hover, .manage-btn:hover {
    background: #f9fafb;
  }
  
  .description {
    color: #6b7280;
    margin: 1rem 0 0;
    line-height: 1.5;
  }
  
  /* Join Prompt */
  .join-prompt {
    background: #fef3c7;
    border: 1px solid #fcd34d;
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
    color: #92400e;
  }
  
  /* Welcome */
  .welcome {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    margin-bottom: 2rem;
    color: #166534;
  }
  
  .role-badge {
    background: #166534;
    color: white;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    margin-left: 0.5rem;
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
    background: #2563eb;
    color: white;
  }
  
  /* Tools Section */
  .tools-section {
    margin-bottom: 2rem;
  }
  
  .tools-section h2 {
    font-size: 1.25rem;
    margin: 0 0 1rem;
  }
  
  .tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
  }
  
  .tool-card {
    background: white;
    padding: 1.25rem;
    border-radius: 12px;
    text-align: center;
    border: 1px solid #e5e7eb;
    text-decoration: none;
    color: inherit;
    position: relative;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .tool-card:not(.disabled):hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border-color: #2563eb;
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
  }
  
  .tool-card p {
    font-size: 0.75rem;
    color: #6b7280;
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
    background: #fef3c7;
    color: #92400e;
  }
  
  .badge.disabled {
    background: #fee2e2;
    color: #b91c1c;
  }
  
  /* Participants Section */
  .participants-section {
    background: #f8fafc;
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
  }
  
  .view-all {
    font-size: 0.875rem;
    color: #2563eb;
    text-decoration: none;
  }
  
  .empty-state {
    color: #6b7280;
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
    background: #2563eb;
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
    background: #e5e7eb;
    color: #6b7280;
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
