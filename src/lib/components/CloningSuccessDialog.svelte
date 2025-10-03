<!--
  Cloning Success Dialog Component
  Shows the results of successful event cloning with next steps
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Event, Topic, EventTemplate } from '../../types/entities';
  import { EventStatus } from '../../types/enums';

  export let clonedEvent: Event;
  export let clonedTopics: Topic[] = [];
  export let sourceTemplate: EventTemplate;
  export let cloneOptions: {
    includeSettings: boolean;
    includeTopics: boolean;
    includeRooms: boolean;
    selectedTopicIds?: string[];
    selectedRoomIds?: string[];
  };

  const dispatch = createEventDispatcher();

  function handleGoToEvent() {
    dispatch('goToEvent', { event: clonedEvent });
  }

  function handleCloneAnother() {
    dispatch('cloneAnother');
  }

  function handleViewTemplates() {
    dispatch('viewTemplates');
  }

  function handleClose() {
    dispatch('close');
  }

  function getStatusDisplayName(status: EventStatus): string {
    const statusMap: Record<EventStatus, string> = {
      [EventStatus.DRAFT]: 'Draft',
      [EventStatus.ACTIVE]: 'Active',
      [EventStatus.PAUSED]: 'Paused',
      [EventStatus.COMPLETED]: 'Completed'
    };
    return statusMap[status];
  }

  function getStatusClass(status: EventStatus): string {
    const classMap: Record<EventStatus, string> = {
      [EventStatus.DRAFT]: 'status-draft',
      [EventStatus.ACTIVE]: 'status-active',
      [EventStatus.PAUSED]: 'status-paused',
      [EventStatus.COMPLETED]: 'status-completed'
    };
    return classMap[status];
  }

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  function getNextSteps(): string[] {
    const steps = [];

    if (clonedEvent.status === EventStatus.DRAFT) {
      steps.push('Configure event details and settings');
      if (clonedTopics.length > 0) {
        steps.push('Review and refine cloned topics');
      } else {
        steps.push('Add discussion topics for your event');
      }
      steps.push('Set up discussion rooms if needed');
      steps.push('Test the event configuration');
      steps.push('Activate the event when ready');
    } else {
      steps.push('Share the event access code with participants');
      steps.push('Monitor event progress and engagement');
      steps.push('Manage topics and voting as needed');
    }

    return steps;
  }
</script>

<div class="success-dialog-overlay" on:click={handleClose} on:keydown={(e) => e.key === 'Escape' && handleClose()}>
  <div class="success-dialog" on:click|stopPropagation on:keydown|stopPropagation>
    <div class="dialog-header">
      <div class="success-icon">🎉</div>
      <h2>Event Created Successfully!</h2>
      <p class="dialog-subtitle">
        Your new event has been created from the "{sourceTemplate.name}" template
      </p>
      <button class="close-btn" on:click={handleClose}>×</button>
    </div>

    <div class="dialog-content">
      <!-- Event Summary -->
      <section class="summary-section">
        <h3>Event Summary</h3>
        <div class="event-card">
          <div class="event-header">
            <div class="event-info">
              <h4>{clonedEvent.title}</h4>
              <span class="event-status {getStatusClass(clonedEvent.status)}">
                {getStatusDisplayName(clonedEvent.status)}
              </span>
            </div>
            <div class="event-access">
              <span class="access-label">Access Code:</span>
              <span class="access-code">{clonedEvent.accessCode}</span>
            </div>
          </div>

          {#if clonedEvent.description}
            <p class="event-description">{clonedEvent.description}</p>
          {/if}

          <div class="event-details">
            <div class="detail-item">
              <span class="detail-label">Created:</span>
              <span class="detail-value">{formatDate(clonedEvent.createdAt)}</span>
            </div>

            {#if clonedEvent.maxParticipants}
              <div class="detail-item">
                <span class="detail-label">Max Participants:</span>
                <span class="detail-value">{clonedEvent.maxParticipants}</span>
              </div>
            {/if}

            <div class="detail-item">
              <span class="detail-label">Template Used:</span>
              <span class="detail-value">{sourceTemplate.name}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Cloning Results -->
      <section class="results-section">
        <h3>What Was Cloned</h3>
        <div class="results-grid">
          <div class="result-item">
            <div class="result-icon">⚙️</div>
            <div class="result-info">
              <span class="result-label">Event Settings</span>
              <span class="result-status {cloneOptions.includeSettings ? 'included' : 'skipped'}">
                {cloneOptions.includeSettings ? 'Included' : 'Skipped'}
              </span>
            </div>
          </div>

          <div class="result-item">
            <div class="result-icon">💬</div>
            <div class="result-info">
              <span class="result-label">Topics</span>
              <span class="result-status {cloneOptions.includeTopics ? 'included' : 'skipped'}">
                {cloneOptions.includeTopics ? `${clonedTopics.length} Included` : 'Skipped'}
              </span>
            </div>
          </div>

          <div class="result-item">
            <div class="result-icon">🏠</div>
            <div class="result-info">
              <span class="result-label">Room Configurations</span>
              <span class="result-status {cloneOptions.includeRooms ? 'included' : 'skipped'}">
                {cloneOptions.includeRooms ? 'Included' : 'Skipped'}
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Cloned Topics -->
      {#if clonedTopics.length > 0}
        <section class="topics-section">
          <h3>Cloned Topics ({clonedTopics.length})</h3>
          <div class="topics-list">
            {#each clonedTopics.slice(0, 5) as topic}
              <div class="topic-item">
                <span class="topic-title">{topic.title}</span>
                {#if topic.description}
                  <span class="topic-description">{topic.description}</span>
                {/if}
                {#if topic.tags && topic.tags.length > 0}
                  <div class="topic-tags">
                    {#each topic.tags as tag}
                      <span class="topic-tag">{tag}</span>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
            {#if clonedTopics.length > 5}
              <div class="more-topics">
                ...and {clonedTopics.length - 5} more topics
              </div>
            {/if}
          </div>
        </section>
      {/if}

      <!-- Next Steps -->
      <section class="next-steps-section">
        <h3>Next Steps</h3>
        <div class="steps-list">
          {#each getNextSteps() as step, index}
            <div class="step-item">
              <span class="step-number">{index + 1}</span>
              <span class="step-text">{step}</span>
            </div>
          {/each}
        </div>
      </section>
    </div>

    <div class="dialog-actions">
      <button class="btn btn-secondary" on:click={handleCloneAnother}>
        Clone Another Event
      </button>

      <button class="btn btn-secondary" on:click={handleViewTemplates}>
        View All Templates
      </button>

      <button class="btn btn-primary" on:click={handleGoToEvent}>
        Go to Event
      </button>
    </div>
  </div>
</div>

<style>
  .success-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .success-dialog {
    background: var(--surface-color, #ffffff);
    border-radius: 16px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    max-width: 700px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .dialog-header {
    padding: 2rem 2rem 1rem 2rem;
    text-align: center;
    background: linear-gradient(135deg, var(--primary-light, #eff6ff), var(--success-light, #f0fdf4));
    border-bottom: 1px solid var(--border-light, #f3f4f6);
    position: relative;
  }

  .success-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .dialog-header h2 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1.75rem;
    font-weight: 700;
  }

  .dialog-subtitle {
    color: var(--text-secondary, #6b7280);
    font-size: 1rem;
    margin: 0;
  }

  .close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--text-secondary, #6b7280);
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: var(--hover-bg, #f9fafb);
    color: var(--text-primary, #1f2937);
  }

  .dialog-content {
    padding: 1.5rem 2rem;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .summary-section h3,
  .results-section h3,
  .topics-section h3,
  .next-steps-section h3 {
    margin: 0 0 1rem 0;
    color: var(--text-primary, #374151);
    font-size: 1.25rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .summary-section h3::before {
    content: '📋';
  }

  .results-section h3::before {
    content: '✅';
  }

  .topics-section h3::before {
    content: '💬';
  }

  .next-steps-section h3::before {
    content: '🚀';
  }

  .event-card {
    background: var(--surface-secondary, #f9fafb);
    border: 1px solid var(--border-light, #f3f4f6);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .event-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .event-info h4 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1.25rem;
    font-weight: 600;
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

  .event-access {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
  }

  .access-label {
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
  }

  .access-code {
    font-family: monospace;
    background: var(--primary-color, #3b82f6);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: 0.1em;
  }

  .event-description {
    color: var(--text-secondary, #6b7280);
    line-height: 1.5;
    margin-bottom: 1rem;
  }

  .event-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: white;
    border-radius: 6px;
    border: 1px solid var(--border-light, #f3f4f6);
  }

  .detail-label {
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
  }

  .detail-value {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary, #1f2937);
  }

  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--surface-secondary, #f9fafb);
    border: 1px solid var(--border-light, #f3f4f6);
    border-radius: 8px;
  }

  .result-icon {
    font-size: 1.5rem;
  }

  .result-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .result-label {
    font-weight: 500;
    color: var(--text-primary, #374151);
  }

  .result-status {
    font-size: 0.875rem;
    font-weight: 500;
  }

  .result-status.included {
    color: var(--success-color, #22c55e);
  }

  .result-status.skipped {
    color: var(--text-secondary, #6b7280);
  }

  .topics-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .topic-item {
    background: var(--surface-secondary, #f9fafb);
    border: 1px solid var(--border-light, #f3f4f6);
    border-radius: 8px;
    padding: 1rem;
  }

  .topic-title {
    font-weight: 500;
    color: var(--text-primary, #374151);
    display: block;
    margin-bottom: 0.5rem;
  }

  .topic-description {
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
    display: block;
    margin-bottom: 0.5rem;
  }

  .topic-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .topic-tag {
    background: var(--tag-bg, #f3f4f6);
    color: var(--tag-text, #374151);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .more-topics {
    text-align: center;
    padding: 1rem;
    color: var(--text-secondary, #6b7280);
    font-style: italic;
  }

  .steps-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .step-item {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
    background: var(--surface-secondary, #f9fafb);
    border: 1px solid var(--border-light, #f3f4f6);
    border-radius: 8px;
  }

  .step-number {
    background: var(--primary-color, #3b82f6);
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  .step-text {
    color: var(--text-primary, #374151);
    font-weight: 500;
  }

  .dialog-actions {
    padding: 1.5rem 2rem 2rem 2rem;
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    border-top: 1px solid var(--border-light, #f3f4f6);
    background: var(--surface-secondary, #f9fafb);
  }

  .btn {
    padding: 0.875rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .btn-primary {
    background: var(--primary-color, #3b82f6);
    color: white;
  }

  .btn-primary:hover {
    background: var(--primary-hover, #2563eb);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
  }

  .btn-secondary {
    background: white;
    color: var(--text-primary, #374151);
    border: 1px solid var(--border-color, #d1d5db);
  }

  .btn-secondary:hover {
    background: var(--hover-bg, #f9fafb);
    border-color: var(--border-hover, #9ca3af);
  }

  @media (max-width: 768px) {
    .success-dialog {
      margin: 0.5rem;
      max-height: 95vh;
    }

    .dialog-header {
      padding: 1.5rem 1.5rem 1rem 1.5rem;
    }

    .dialog-content {
      padding: 1rem 1.5rem;
    }

    .dialog-actions {
      padding: 1rem 1.5rem 1.5rem 1.5rem;
      flex-direction: column;
    }

    .event-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .event-access {
      align-items: flex-start;
    }

    .event-details {
      grid-template-columns: 1fr;
    }

    .results-grid {
      grid-template-columns: 1fr;
    }
  }
</style>