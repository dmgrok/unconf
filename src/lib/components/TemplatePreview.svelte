<!--
  Template Preview Component
  Shows a detailed preview of what will be included in the template
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Event, Topic, EventTemplateData } from '../../types/entities';
  import { TemplateCategory } from '../../types/enums';

  export let templateName: string;
  export let templateDescription: string;
  export let templateCategory: TemplateCategory;
  export let isPublic: boolean;
  export let tags: string[] = [];
  export let sourceEvent: Event | null = null;
  export let sourceTopics: Topic[] = [];
  export let contentOptions: {
    includeSettings: boolean;
    includeTopics: boolean;
    includeRooms: boolean;
    selectedTopicIds?: string[];
  } = {
    includeSettings: true,
    includeTopics: true,
    includeRooms: false
  };

  const dispatch = createEventDispatcher();

  $: selectedTopics = sourceTopics.filter(topic =>
    contentOptions.selectedTopicIds?.includes(topic.id) ?? true
  );

  $: templateData = generateTemplateData();

  function generateTemplateData(): EventTemplateData {
    if (!sourceEvent) {
      return {
        eventSettings: {
          allowGuestAccess: true,
          requireRegistration: false,
          enableVoting: true,
          enableGroupIntelligence: false,
          enableDiscussionGroups: false,
          enableTeamDistribution: false,
          maxVotesPerTopic: 3,
          autoAdvanceActivities: false
        }
      };
    }

    return {
      eventSettings: contentOptions.includeSettings ? sourceEvent.settings : {
        allowGuestAccess: true,
        requireRegistration: false,
        enableVoting: true,
        enableGroupIntelligence: false,
        enableDiscussionGroups: false,
        enableTeamDistribution: false,
        maxVotesPerTopic: 3,
        autoAdvanceActivities: false
      },
      topics: contentOptions.includeTopics ? selectedTopics.map(topic => ({
        title: topic.title,
        description: topic.description,
        tags: topic.tags,
        priority: 'medium' as const
      })) : undefined,
      rooms: contentOptions.includeRooms ? [] : undefined, // Will be populated when room functionality is available
      generalSettings: {
        defaultCapacity: sourceEvent.maxParticipants,
        defaultTitle: templateName,
        defaultDescription: templateDescription
      }
    };
  }

  function getCategoryDisplayName(category: TemplateCategory): string {
    const categoryMap: Record<TemplateCategory, string> = {
      [TemplateCategory.CONFERENCE]: 'Conference',
      [TemplateCategory.WORKSHOP]: 'Workshop',
      [TemplateCategory.MEETING]: 'Meeting',
      [TemplateCategory.HACKATHON]: 'Hackathon',
      [TemplateCategory.NETWORKING]: 'Networking',
      [TemplateCategory.TRAINING]: 'Training',
      [TemplateCategory.CUSTOM]: 'Custom'
    };
    return categoryMap[category];
  }

  function handleConfirm() {
    dispatch('confirm', {
      templateName,
      templateDescription,
      templateCategory,
      isPublic,
      tags,
      templateData
    });
  }

  function handleEdit() {
    dispatch('edit');
  }

  function formatSettingValue(key: string, value: any): string {
    if (typeof value === 'boolean') {
      return value ? 'Enabled' : 'Disabled';
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    return String(value);
  }

  function getSettingDisplayName(key: string): string {
    const settingNames: Record<string, string> = {
      allowGuestAccess: 'Guest Access',
      requireRegistration: 'Require Registration',
      enableVoting: 'Voting System',
      enableGroupIntelligence: 'Group Intelligence',
      enableDiscussionGroups: 'Discussion Groups',
      enableTeamDistribution: 'Team Distribution',
      maxVotesPerTopic: 'Max Votes per Topic',
      maxTopicsPerUser: 'Max Topics per User',
      votingTimeLimit: 'Voting Time Limit (seconds)',
      autoAdvanceActivities: 'Auto-advance Activities'
    };
    return settingNames[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }
</script>

<div class="template-preview">
  <div class="preview-header">
    <h2>Template Preview</h2>
    <p class="preview-subtitle">Review your template before saving</p>
  </div>

  <div class="preview-content">
    <!-- Template Metadata -->
    <section class="preview-section">
      <h3>Template Information</h3>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Name:</span>
          <span class="info-value">{templateName}</span>
        </div>

        <div class="info-item">
          <span class="info-label">Category:</span>
          <span class="info-value">{getCategoryDisplayName(templateCategory)}</span>
        </div>

        <div class="info-item">
          <span class="info-label">Visibility:</span>
          <span class="info-value">
            {isPublic ? '🌐 Public' : '🔒 Private'}
          </span>
        </div>

        {#if templateDescription}
          <div class="info-item full-width">
            <span class="info-label">Description:</span>
            <span class="info-value description">{templateDescription}</span>
          </div>
        {/if}

        {#if tags.length > 0}
          <div class="info-item full-width">
            <span class="info-label">Tags:</span>
            <div class="tags-display">
              {#each tags as tag}
                <span class="tag">{tag}</span>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </section>

    <!-- Source Event Information -->
    {#if sourceEvent}
      <section class="preview-section">
        <h3>Source Event</h3>
        <div class="source-event-info">
          <div class="event-header">
            <h4>{sourceEvent.title}</h4>
            <span class="event-code">#{sourceEvent.accessCode}</span>
          </div>
          {#if sourceEvent.description}
            <p class="event-description">{sourceEvent.description}</p>
          {/if}
          <div class="event-stats">
            <span>Max Participants: {sourceEvent.maxParticipants || 'Unlimited'}</span>
            <span>Created: {new Date(sourceEvent.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </section>
    {/if}

    <!-- Event Settings -->
    <section class="preview-section">
      <h3>Event Settings</h3>
      <div class="settings-grid">
        {#each Object.entries(templateData.eventSettings) as [key, value]}
          <div class="setting-item">
            <span class="setting-name">{getSettingDisplayName(key)}</span>
            <span class="setting-value">{formatSettingValue(key, value)}</span>
          </div>
        {/each}
      </div>
    </section>

    <!-- Topics -->
    {#if templateData.topics && templateData.topics.length > 0}
      <section class="preview-section">
        <h3>Topics ({templateData.topics.length})</h3>
        <div class="topics-list">
          {#each templateData.topics as topic}
            <div class="topic-item">
              <div class="topic-header">
                <h4 class="topic-title">{topic.title}</h4>
                <span class="topic-priority priority-{topic.priority}">{topic.priority}</span>
              </div>
              {#if topic.description}
                <p class="topic-description">{topic.description}</p>
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
        </div>
      </section>
    {:else if contentOptions.includeTopics}
      <section class="preview-section">
        <h3>Topics</h3>
        <div class="empty-content">
          <p>No topics selected for this template</p>
        </div>
      </section>
    {/if}

    <!-- Rooms (placeholder) -->
    {#if contentOptions.includeRooms}
      <section class="preview-section">
        <h3>Room Configurations</h3>
        <div class="empty-content">
          <p>Room configuration support coming soon</p>
        </div>
      </section>
    {/if}

    <!-- General Settings -->
    {#if templateData.generalSettings}
      <section class="preview-section">
        <h3>Default Settings</h3>
        <div class="general-settings">
          {#if templateData.generalSettings.defaultCapacity}
            <div class="setting-item">
              <span class="setting-name">Default Capacity</span>
              <span class="setting-value">{templateData.generalSettings.defaultCapacity}</span>
            </div>
          {/if}
          {#if templateData.generalSettings.defaultDuration}
            <div class="setting-item">
              <span class="setting-name">Default Duration</span>
              <span class="setting-value">{templateData.generalSettings.defaultDuration} days</span>
            </div>
          {/if}
        </div>
      </section>
    {/if}

    <!-- Template Statistics -->
    <section class="preview-section">
      <h3>Template Summary</h3>
      <div class="template-stats">
        <div class="stat-card">
          <div class="stat-number">{Object.keys(templateData.eventSettings).length}</div>
          <div class="stat-label">Event Settings</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{templateData.topics?.length || 0}</div>
          <div class="stat-label">Topics</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{templateData.rooms?.length || 0}</div>
          <div class="stat-label">Room Configs</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{tags.length}</div>
          <div class="stat-label">Tags</div>
        </div>
      </div>
    </section>
  </div>

  <div class="preview-actions">
    <button
      class="btn btn-secondary"
      on:click={handleEdit}
    >
      ← Edit Template
    </button>

    <button
      class="btn btn-primary"
      on:click={handleConfirm}
    >
      Confirm & Save Template
    </button>
  </div>
</div>

<style>
  .template-preview {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem;
    background: var(--surface-color, #ffffff);
    border-radius: 12px;
    border: 1px solid var(--border-color, #e0e0e0);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  }

  .preview-header {
    text-align: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid var(--primary-color, #3b82f6);
  }

  .preview-header h2 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1.75rem;
    font-weight: 600;
  }

  .preview-subtitle {
    color: var(--text-secondary, #6b7280);
    font-size: 1rem;
    margin: 0;
  }

  .preview-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .preview-section {
    padding: 1.5rem;
    background: var(--section-bg, #fafbfc);
    border: 1px solid var(--border-light, #f3f4f6);
    border-radius: 12px;
  }

  .preview-section h3 {
    margin: 0 0 1.5rem 0;
    color: var(--text-primary, #374151);
    font-size: 1.25rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .preview-section h3::before {
    content: '▶';
    color: var(--primary-color, #3b82f6);
    font-size: 0.875rem;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    background: white;
    border-radius: 8px;
    border: 1px solid var(--border-light, #f3f4f6);
  }

  .info-item.full-width {
    grid-column: 1 / -1;
  }

  .info-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary, #6b7280);
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .info-value {
    font-size: 1rem;
    color: var(--text-primary, #1f2937);
    font-weight: 500;
  }

  .info-value.description {
    line-height: 1.5;
    font-weight: normal;
  }

  .tags-display {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag {
    background: var(--primary-light, #eff6ff);
    color: var(--primary-color, #3b82f6);
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .source-event-info {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid var(--border-light, #f3f4f6);
  }

  .event-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .event-header h4 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary, #1f2937);
  }

  .event-code {
    font-family: monospace;
    background: var(--surface-secondary, #f9fafb);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
  }

  .event-description {
    color: var(--text-secondary, #6b7280);
    line-height: 1.5;
    margin-bottom: 1rem;
  }

  .event-stats {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
  }

  .settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: white;
    border-radius: 8px;
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

  .topics-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .topic-item {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid var(--border-light, #f3f4f6);
  }

  .topic-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .topic-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary, #1f2937);
  }

  .topic-priority {
    padding: 0.25rem 0.5rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
  }

  .priority-high {
    background: var(--error-light, #fef2f2);
    color: var(--error-color, #ef4444);
  }

  .priority-medium {
    background: var(--warning-light, #fef3c7);
    color: var(--warning-color, #f59e0b);
  }

  .priority-low {
    background: var(--success-light, #dcfce7);
    color: var(--success-color, #22c55e);
  }

  .topic-description {
    color: var(--text-secondary, #6b7280);
    line-height: 1.5;
    margin-bottom: 1rem;
  }

  .topic-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .topic-tag {
    background: var(--tag-bg, #f3f4f6);
    color: var(--tag-text, #374151);
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .empty-content {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    border: 1px solid var(--border-light, #f3f4f6);
    text-align: center;
    color: var(--text-secondary, #6b7280);
  }

  .general-settings {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .template-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid var(--border-light, #f3f4f6);
    text-align: center;
  }

  .stat-number {
    font-size: 2rem;
    font-weight: 700;
    color: var(--primary-color, #3b82f6);
    margin-bottom: 0.5rem;
  }

  .stat-label {
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
    font-weight: 500;
  }

  .preview-actions {
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    padding-top: 2rem;
    border-top: 2px solid var(--border-light, #f3f4f6);
  }

  .btn {
    padding: 1rem 2rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 180px;
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
    background: var(--secondary-bg, #f9fafb);
    color: var(--text-primary, #374151);
    border: 1px solid var(--border-color, #d1d5db);
  }

  .btn-secondary:hover {
    background: var(--secondary-hover, #f3f4f6);
    border-color: var(--border-hover, #9ca3af);
  }

  @media (max-width: 768px) {
    .template-preview {
      padding: 1.5rem;
      margin: 0 1rem;
    }

    .info-grid {
      grid-template-columns: 1fr;
    }

    .settings-grid {
      grid-template-columns: 1fr;
    }

    .template-stats {
      grid-template-columns: repeat(2, 1fr);
    }

    .preview-actions {
      flex-direction: column;
    }

    .event-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .event-stats {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
</style>