<!--
  Event Selector Component
  Allows users to select an event to create a template from
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { Event, Topic } from '../../types/entities';
  import { EventStatus } from '../../types/enums';

  export let currentUserId: string;
  export let loading = false;

  const dispatch = createEventDispatcher();

  let events: Event[] = [];
  let searchTerm = '';
  let selectedEventId = '';
  let selectedEvent: Event | null = null;
  let eventTopics: Record<string, Topic[]> = {};
  let loadingTopics = new Set<string>();

  $: filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  onMount(async () => {
    await loadEvents();
  });

  async function loadEvents() {
    loading = true;
    try {
      const response = await fetch(`/api/events?organizerId=${currentUserId}`);
      const result = await response.json();

      if (result.success) {
        events = result.events || [];
      } else {
        console.error('Failed to load events:', result.error);
        dispatch('error', { message: 'Failed to load events' });
      }
    } catch (error) {
      console.error('Error loading events:', error);
      dispatch('error', { message: 'Failed to load events' });
    } finally {
      loading = false;
    }
  }

  async function loadTopicsForEvent(eventId: string) {
    if (eventTopics[eventId] || loadingTopics.has(eventId)) {
      return;
    }

    loadingTopics.add(eventId);
    loadingTopics = new Set(loadingTopics);

    try {
      const response = await fetch(`/api/topics?eventId=${eventId}`);
      const result = await response.json();

      if (result.success) {
        eventTopics[eventId] = result.topics || [];
        eventTopics = { ...eventTopics };
      }
    } catch (error) {
      console.error('Error loading topics:', error);
    } finally {
      loadingTopics.delete(eventId);
      loadingTopics = new Set(loadingTopics);
    }
  }

  async function selectEvent(event: Event) {
    selectedEventId = event.id;
    selectedEvent = event;

    // Load topics for the selected event
    await loadTopicsForEvent(event.id);
  }

  function handleProceed() {
    if (selectedEvent) {
      dispatch('eventSelected', {
        event: selectedEvent,
        topics: eventTopics[selectedEvent.id] || []
      });
    }
  }

  function handleCancel() {
    dispatch('cancel');
  }

  function getEventStatusLabel(status: EventStatus): string {
    const statusMap: Record<EventStatus, string> = {
      [EventStatus.DRAFT]: 'Draft',
      [EventStatus.ACTIVE]: 'Active',
      [EventStatus.PAUSED]: 'Paused',
      [EventStatus.COMPLETED]: 'Completed'
    };
    return statusMap[status];
  }

  function getEventStatusClass(status: EventStatus): string {
    const classMap: Record<EventStatus, string> = {
      [EventStatus.DRAFT]: 'status-draft',
      [EventStatus.ACTIVE]: 'status-active',
      [EventStatus.PAUSED]: 'status-paused',
      [EventStatus.COMPLETED]: 'status-completed'
    };
    return classMap[status];
  }

  function formatDate(date: Date | undefined): string {
    if (!date) return 'Not set';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  function getParticipantCount(event: Event): number {
    return (event.metadata?.participantCount as number) || 0;
  }
</script>

<div class="event-selector">
  <div class="selector-header">
    <h2>Select Event for Template</h2>
    <p class="selector-subtitle">Choose an existing event to create a template from</p>
  </div>

  <div class="search-section">
    <div class="search-input-group">
      <input
        type="text"
        bind:value={searchTerm}
        placeholder="Search events by title or description..."
        class="search-input"
      />
      <div class="search-icon">🔍</div>
    </div>
  </div>

  <div class="events-section">
    {#if loading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading your events...</p>
      </div>
    {:else if events.length === 0}
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <h3>No events found</h3>
        <p>You need to have created at least one event before you can create templates.</p>
        <button class="btn btn-primary" on:click={() => dispatch('createEvent')}>
          Create Your First Event
        </button>
      </div>
    {:else if filteredEvents.length === 0}
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No events match your search</h3>
        <p>Try adjusting your search terms or browse all events.</p>
        <button class="btn btn-secondary" on:click={() => searchTerm = ''}>
          Clear Search
        </button>
      </div>
    {:else}
      <div class="events-grid">
        {#each filteredEvents as event (event.id)}
          <div
            class="event-card"
            class:selected={selectedEventId === event.id}
            on:click={() => selectEvent(event)}
            on:keydown={(e) => e.key === 'Enter' && selectEvent(event)}
            role="button"
            tabindex="0"
          >
            <div class="event-header">
              <div class="event-info">
                <h3 class="event-title">{event.title}</h3>
                <span class="event-status {getEventStatusClass(event.status)}">
                  {getEventStatusLabel(event.status)}
                </span>
              </div>
              <div class="event-id">#{event.accessCode}</div>
            </div>

            {#if event.description}
              <p class="event-description">{event.description}</p>
            {/if}

            <div class="event-stats">
              <div class="stat-item">
                <span class="stat-label">Participants:</span>
                <span class="stat-value">
                  {getParticipantCount(event)}{event.maxParticipants ? `/${event.maxParticipants}` : ''}
                </span>
              </div>

              <div class="stat-item">
                <span class="stat-label">Topics:</span>
                <span class="stat-value">
                  {#if loadingTopics.has(event.id)}
                    Loading...
                  {:else}
                    {eventTopics[event.id]?.length || 0}
                  {/if}
                </span>
              </div>

              <div class="stat-item">
                <span class="stat-label">Created:</span>
                <span class="stat-value">{formatDate(event.createdAt)}</span>
              </div>

              {#if event.startTime}
                <div class="stat-item">
                  <span class="stat-label">Start:</span>
                  <span class="stat-value">{formatDate(event.startTime)}</span>
                </div>
              {/if}
            </div>

            <div class="event-settings-preview">
              <h4>Event Settings</h4>
              <div class="settings-grid">
                <div class="setting-item">
                  <span class="setting-name">Guest Access:</span>
                  <span class="setting-value">
                    {event.settings.allowGuestAccess ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div class="setting-item">
                  <span class="setting-name">Voting:</span>
                  <span class="setting-value">
                    {event.settings.enableVoting ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div class="setting-item">
                  <span class="setting-name">Max Votes:</span>
                  <span class="setting-value">{event.settings.maxVotesPerTopic}</span>
                </div>
                <div class="setting-item">
                  <span class="setting-name">Discussion Groups:</span>
                  <span class="setting-value">
                    {event.settings.enableDiscussionGroups ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {#if selectedEventId === event.id}
              <div class="selection-indicator">
                <span class="checkmark">✓</span>
                Selected for template creation
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>

  {#if selectedEvent}
    <div class="selection-summary">
      <div class="summary-content">
        <h3>Selected Event: {selectedEvent.title}</h3>
        <p>This event will be used as the basis for your new template.</p>
        <div class="summary-stats">
          <span>Status: {getEventStatusLabel(selectedEvent.status)}</span>
          <span>Topics: {eventTopics[selectedEvent.id]?.length || 0}</span>
          <span>Participants: {getParticipantCount(selectedEvent)}</span>
        </div>
      </div>
    </div>
  {/if}

  <div class="selector-actions">
    <button
      class="btn btn-secondary"
      on:click={handleCancel}
    >
      Cancel
    </button>

    <button
      class="btn btn-primary"
      on:click={handleProceed}
      disabled={!selectedEvent}
    >
      Proceed to Template Creation
    </button>
  </div>
</div>

<style>
  .event-selector {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .selector-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .selector-header h2 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1.75rem;
    font-weight: 600;
  }

  .selector-subtitle {
    color: var(--text-secondary, #6b7280);
    font-size: 1rem;
    margin: 0;
  }

  .search-section {
    margin-bottom: 2rem;
  }

  .search-input-group {
    position: relative;
    max-width: 500px;
    margin: 0 auto;
  }

  .search-input {
    width: 100%;
    padding: 1rem 3rem 1rem 1rem;
    border: 1px solid var(--border-color, #d1d5db);
    border-radius: 12px;
    font-size: 1rem;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--primary-color, #3b82f6);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .search-icon {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary, #6b7280);
    font-size: 1.2rem;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    color: var(--text-secondary, #6b7280);
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-color, #e5e7eb);
    border-top: 3px solid var(--primary-color, #3b82f6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--text-secondary, #6b7280);
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .empty-state h3 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #1f2937);
  }

  .events-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 1.5rem;
  }

  .event-card {
    background: var(--surface-color, #ffffff);
    border: 2px solid var(--border-color, #e5e7eb);
    border-radius: 12px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
  }

  .event-card:hover {
    border-color: var(--primary-color, #3b82f6);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  }

  .event-card.selected {
    border-color: var(--primary-color, #3b82f6);
    background: var(--primary-light, #eff6ff);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  }

  .event-card:focus {
    outline: none;
    border-color: var(--primary-color, #3b82f6);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .event-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .event-info {
    flex: 1;
  }

  .event-title {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary, #1f2937);
  }

  .event-status {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .status-draft {
    background: var(--status-draft-bg, #f3f4f6);
    color: var(--status-draft-text, #374151);
  }

  .status-active {
    background: var(--status-active-bg, #dcfce7);
    color: var(--status-active-text, #166534);
  }

  .status-paused {
    background: var(--status-paused-bg, #fef3c7);
    color: var(--status-paused-text, #92400e);
  }

  .status-completed {
    background: var(--status-completed-bg, #e0e7ff);
    color: var(--status-completed-text, #3730a3);
  }

  .event-id {
    font-family: monospace;
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
    background: var(--surface-secondary, #f9fafb);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  .event-description {
    color: var(--text-secondary, #6b7280);
    font-size: 0.875rem;
    line-height: 1.5;
    margin-bottom: 1rem;
  }

  .event-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 1rem;
    background: var(--surface-secondary, #f9fafb);
    border-radius: 8px;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .stat-label {
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
  }

  .stat-value {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary, #1f2937);
  }

  .event-settings-preview {
    margin-bottom: 1rem;
  }

  .event-settings-preview h4 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary, #374151);
  }

  .settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.5rem;
  }

  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: white;
    border-radius: 6px;
    border: 1px solid var(--border-light, #f3f4f6);
  }

  .setting-name {
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
  }

  .setting-value {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary, #1f2937);
  }

  .selection-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--success-light, #dcfce7);
    color: var(--success-text, #166534);
    border-radius: 8px;
    font-weight: 500;
    font-size: 0.875rem;
    margin-top: 1rem;
  }

  .checkmark {
    background: var(--success-color, #22c55e);
    color: white;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
  }

  .selection-summary {
    margin: 2rem 0;
    padding: 1.5rem;
    background: var(--primary-light, #eff6ff);
    border: 1px solid var(--primary-color, #3b82f6);
    border-radius: 12px;
  }

  .summary-content h3 {
    margin: 0 0 0.5rem 0;
    color: var(--primary-color, #3b82f6);
    font-size: 1.25rem;
    font-weight: 600;
  }

  .summary-content p {
    margin: 0 0 1rem 0;
    color: var(--text-secondary, #6b7280);
  }

  .summary-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    font-size: 0.875rem;
    color: var(--text-primary, #374151);
  }

  .summary-stats span {
    font-weight: 500;
  }

  .selector-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    padding-top: 2rem;
    border-top: 1px solid var(--border-light, #f3f4f6);
  }

  .btn {
    padding: 0.875rem 1.75rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 120px;
  }

  .btn:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .btn-primary {
    background: var(--primary-color, #3b82f6);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--primary-hover, #2563eb);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
  }

  .btn-secondary {
    background: var(--secondary-bg, #f9fafb);
    color: var(--text-primary, #374151);
    border: 1px solid var(--border-color, #d1d5db);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--secondary-hover, #f3f4f6);
    border-color: var(--border-hover, #9ca3af);
  }

  @media (max-width: 768px) {
    .event-selector {
      padding: 1rem;
    }

    .events-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .event-stats {
      grid-template-columns: 1fr;
    }

    .settings-grid {
      grid-template-columns: 1fr;
    }

    .selector-actions {
      flex-direction: column;
    }

    .summary-stats {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
</style>