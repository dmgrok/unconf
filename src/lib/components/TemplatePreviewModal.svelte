<!--
  Template Preview Modal Component
  Detailed template preview with metadata, settings, and content overview
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { TemplateCategory } from '../../types/enums';
  import type { EventTemplate } from '../../types/entities';

  export let template: EventTemplate;
  export let isVisible: boolean = false;
  export let currentUserId: string;

  const dispatch = createEventDispatcher();

  let activeTab: 'overview' | 'settings' | 'content' | 'metadata' = 'overview';

  function closeModal() {
    isVisible = false;
    dispatch('close');
  }

  function handleUseTemplate() {
    dispatch('useTemplate', { template });
    closeModal();
  }

  function handleEditTemplate() {
    dispatch('editTemplate', { template });
    closeModal();
  }

  function handleShareTemplate() {
    dispatch('shareTemplate', { template });
  }

  function getCategoryIcon(category: TemplateCategory): string {
    const icons = {
      [TemplateCategory.CONFERENCE]: '🎪',
      [TemplateCategory.WORKSHOP]: '🛠️',
      [TemplateCategory.MEETING]: '💼',
      [TemplateCategory.HACKATHON]: '💻',
      [TemplateCategory.NETWORKING]: '🤝',
      [TemplateCategory.TRAINING]: '📚',
      [TemplateCategory.CUSTOM]: '⚙️'
    };
    return icons[category] || '📄';
  }

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function formatUsageStats(template: EventTemplate): string {
    if (template.usageCount === 0) return 'Never used';
    if (template.usageCount === 1) return 'Used once';

    let stats = `Used ${template.usageCount} times`;
    if (template.lastUsedAt) {
      const lastUsed = formatTimeAgo(template.lastUsedAt);
      stats += `, last used ${lastUsed}`;
    }
    return stats;
  }

  function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }

  function getVisibilityDescription(template: EventTemplate): string {
    if (template.isPublic) {
      return 'Public - Anyone can discover and use this template';
    } else if (template.sharedWith.length > 0) {
      return `Private - Shared with ${template.sharedWith.length} user${template.sharedWith.length > 1 ? 's' : ''}`;
    } else {
      return 'Private - Only visible to you';
    }
  }

  function getSettingDescription(key: string, value: any): string {
    const descriptions: Record<string, (val: any) => string> = {
      allowGuestAccess: (val: boolean) => val ? 'Guests can join without registration' : 'Registration required for all participants',
      requireRegistration: (val: boolean) => val ? 'All participants must register' : 'Registration is optional',
      enableVoting: (val: boolean) => val ? 'Topic voting is enabled' : 'No topic voting',
      enableGroupIntelligence: (val: boolean) => val ? 'Group intelligence features enabled' : 'Standard discussion mode',
      enableDiscussionGroups: (val: boolean) => val ? 'Discussion groups are enabled' : 'Single group discussion',
      enableTeamDistribution: (val: boolean) => val ? 'Team distribution features enabled' : 'No team distribution',
      votingTimeLimit: (val: number) => val ? `Voting time limit: ${val} seconds` : 'No voting time limit',
      maxVotesPerTopic: (val: number) => `Maximum ${val} vote${val > 1 ? 's' : ''} per topic`,
      maxTopicsPerUser: (val: number) => val ? `Maximum ${val} topic${val > 1 ? 's' : ''} per user` : 'No topic limit per user',
      autoAdvanceActivities: (val: boolean) => val ? 'Activities advance automatically' : 'Manual activity progression'
    };

    return descriptions[key]?.(value) || `${key}: ${value}`;
  }

  $: isOwner = template.createdBy === currentUserId;
  $: canEdit = isOwner; // In future, could check for edit permissions
  $: hasTopics = template.templateData.topics && template.templateData.topics.length > 0;
  $: hasRooms = template.templateData.rooms && template.templateData.rooms.length > 0;
  $: hasGeneralSettings = template.templateData.generalSettings;
</script>

{#if isVisible}
  <div class="modal-overlay" on:click={closeModal}>
    <div class="modal-content" on:click|stopPropagation>
      <!-- Header -->
      <div class="modal-header">
        <div class="template-title-section">
          <div class="title-row">
            <span class="category-icon">{getCategoryIcon(template.category)}</span>
            <h2 class="template-title">{template.name}</h2>
            <div class="visibility-badge" class:public={template.isPublic} class:private={!template.isPublic}>
              {template.isPublic ? '🌐 Public' : '🔒 Private'}
            </div>
          </div>
          {#if template.description}
            <p class="template-description">{template.description}</p>
          {/if}
        </div>

        <button class="modal-close" on:click={closeModal} title="Close">×</button>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button
          class="tab"
          class:active={activeTab === 'overview'}
          on:click={() => activeTab = 'overview'}
        >
          Overview
        </button>
        <button
          class="tab"
          class:active={activeTab === 'settings'}
          on:click={() => activeTab = 'settings'}
        >
          Event Settings
        </button>
        <button
          class="tab"
          class:active={activeTab === 'content'}
          on:click={() => activeTab = 'content'}
        >
          Content
        </button>
        <button
          class="tab"
          class:active={activeTab === 'metadata'}
          on:click={() => activeTab = 'metadata'}
        >
          Details
        </button>
      </div>

      <!-- Content -->
      <div class="modal-body">
        {#if activeTab === 'overview'}
          <div class="overview-section">
            <!-- Quick Stats -->
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon">📈</div>
                <div class="stat-content">
                  <div class="stat-label">Usage</div>
                  <div class="stat-value">{formatUsageStats(template)}</div>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">🏷️</div>
                <div class="stat-content">
                  <div class="stat-label">Category</div>
                  <div class="stat-value">{template.category}</div>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">👤</div>
                <div class="stat-content">
                  <div class="stat-label">Creator</div>
                  <div class="stat-value">{template.createdBy}</div>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">🌐</div>
                <div class="stat-content">
                  <div class="stat-label">Visibility</div>
                  <div class="stat-value">{template.isPublic ? 'Public' : 'Private'}</div>
                </div>
              </div>
            </div>

            <!-- Key Features -->
            <div class="features-section">
              <h3>Template Features</h3>
              <div class="feature-list">
                {#if template.templateData.eventSettings.enableVoting}
                  <div class="feature-item">
                    <span class="feature-icon">🗳️</span>
                    <span>Topic Voting ({template.templateData.eventSettings.maxVotesPerTopic} votes per topic)</span>
                  </div>
                {/if}

                {#if template.templateData.eventSettings.enableGroupIntelligence}
                  <div class="feature-item">
                    <span class="feature-icon">🧠</span>
                    <span>Group Intelligence</span>
                  </div>
                {/if}

                {#if template.templateData.eventSettings.enableDiscussionGroups}
                  <div class="feature-item">
                    <span class="feature-icon">💬</span>
                    <span>Discussion Groups</span>
                  </div>
                {/if}

                {#if template.templateData.eventSettings.enableTeamDistribution}
                  <div class="feature-item">
                    <span class="feature-icon">👥</span>
                    <span>Team Distribution</span>
                  </div>
                {/if}

                {#if template.templateData.eventSettings.allowGuestAccess}
                  <div class="feature-item">
                    <span class="feature-icon">🚪</span>
                    <span>Guest Access Allowed</span>
                  </div>
                {/if}

                {#if hasTopics}
                  <div class="feature-item">
                    <span class="feature-icon">📝</span>
                    <span>{template.templateData.topics.length} Pre-configured Topic{template.templateData.topics.length > 1 ? 's' : ''}</span>
                  </div>
                {/if}

                {#if hasRooms}
                  <div class="feature-item">
                    <span class="feature-icon">🏠</span>
                    <span>{template.templateData.rooms.length} Room{template.templateData.rooms.length > 1 ? 's' : ''} Configured</span>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Tags -->
            {#if template.tags && template.tags.length > 0}
              <div class="tags-section">
                <h3>Tags</h3>
                <div class="tag-list">
                  {#each template.tags as tag}
                    <span class="tag">{tag}</span>
                  {/each}
                </div>
              </div>
            {/if}
          </div>

        {:else if activeTab === 'settings'}
          <div class="settings-section">
            <h3>Event Configuration</h3>
            <div class="settings-list">
              {#each Object.entries(template.templateData.eventSettings) as [key, value]}
                <div class="setting-item">
                  <div class="setting-name">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</div>
                  <div class="setting-value">
                    {#if typeof value === 'boolean'}
                      <span class="setting-toggle" class:enabled={value}>
                        {value ? '✓ Enabled' : '✗ Disabled'}
                      </span>
                    {:else}
                      <span class="setting-text">{value || 'Not set'}</span>
                    {/if}
                  </div>
                  <div class="setting-description">{getSettingDescription(key, value)}</div>
                </div>
              {/each}
            </div>

            {#if hasGeneralSettings}
              <h3>General Settings</h3>
              <div class="settings-list">
                {#each Object.entries(template.templateData.generalSettings) as [key, value]}
                  {#if value !== undefined && value !== null}
                    <div class="setting-item">
                      <div class="setting-name">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</div>
                      <div class="setting-value">
                        <span class="setting-text">{value}</span>
                      </div>
                    </div>
                  {/if}
                {/each}
              </div>
            {/if}
          </div>

        {:else if activeTab === 'content'}
          <div class="content-section">
            {#if hasTopics}
              <div class="content-group">
                <h3>Pre-configured Topics ({template.templateData.topics.length})</h3>
                <div class="topic-list">
                  {#each template.templateData.topics as topic, index}
                    <div class="topic-item">
                      <div class="topic-header">
                        <span class="topic-number">#{index + 1}</span>
                        <span class="topic-title">{topic.title}</span>
                        {#if topic.priority}
                          <span class="priority-badge priority-{topic.priority}">{topic.priority}</span>
                        {/if}
                      </div>
                      {#if topic.description}
                        <div class="topic-description">{topic.description}</div>
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
              </div>
            {/if}

            {#if hasRooms}
              <div class="content-group">
                <h3>Room Configurations ({template.templateData.rooms.length})</h3>
                <div class="room-list">
                  {#each template.templateData.rooms as room}
                    <div class="room-item">
                      <div class="room-header">
                        <span class="room-name">{room.name}</span>
                        <span class="room-capacity">Capacity: {room.capacity}</span>
                        {#if room.isVirtual}
                          <span class="virtual-badge">🌐 Virtual</span>
                        {/if}
                      </div>
                      {#if room.description}
                        <div class="room-description">{room.description}</div>
                      {/if}
                      {#if room.location}
                        <div class="room-location">📍 {room.location}</div>
                      {/if}
                      {#if room.amenities && room.amenities.length > 0}
                        <div class="room-amenities">
                          <span class="amenities-label">Amenities:</span>
                          {room.amenities.join(', ')}
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            {#if !hasTopics && !hasRooms}
              <div class="empty-content">
                <div class="empty-icon">📄</div>
                <h4>Basic Template</h4>
                <p>This template contains event settings but no pre-configured topics or rooms. You can add your own content when creating an event.</p>
              </div>
            {/if}
          </div>

        {:else if activeTab === 'metadata'}
          <div class="metadata-section">
            <div class="metadata-grid">
              <div class="metadata-item">
                <div class="metadata-label">Template ID</div>
                <div class="metadata-value">{template.id}</div>
              </div>

              <div class="metadata-item">
                <div class="metadata-label">Created</div>
                <div class="metadata-value">{formatDate(template.createdAt)}</div>
              </div>

              <div class="metadata-item">
                <div class="metadata-label">Last Modified</div>
                <div class="metadata-value">{formatDate(template.updatedAt)}</div>
              </div>

              {#if template.lastUsedAt}
                <div class="metadata-item">
                  <div class="metadata-label">Last Used</div>
                  <div class="metadata-value">{formatDate(template.lastUsedAt)}</div>
                </div>
              {/if}

              <div class="metadata-item">
                <div class="metadata-label">Usage Count</div>
                <div class="metadata-value">{template.usageCount}</div>
              </div>

              <div class="metadata-item">
                <div class="metadata-label">Visibility</div>
                <div class="metadata-value">{getVisibilityDescription(template)}</div>
              </div>

              {#if template.sharedWith.length > 0}
                <div class="metadata-item">
                  <div class="metadata-label">Shared With</div>
                  <div class="metadata-value">
                    {#each template.sharedWith.slice(0, 3) as userId}
                      <span class="shared-user">{userId}</span>
                    {/each}
                    {#if template.sharedWith.length > 3}
                      <span class="more-users">+{template.sharedWith.length - 3} more</span>
                    {/if}
                  </div>
                </div>
              {/if}

              {#if template.metadata && Object.keys(template.metadata).length > 0}
                <div class="metadata-item full-width">
                  <div class="metadata-label">Additional Metadata</div>
                  <div class="metadata-value">
                    <pre class="metadata-json">{JSON.stringify(template.metadata, null, 2)}</pre>
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>

      <!-- Actions -->
      <div class="modal-actions">
        <div class="action-group">
          {#if canEdit}
            <button class="btn btn-secondary" on:click={handleEditTemplate}>
              Edit Template
            </button>
          {/if}
          {#if isOwner}
            <button class="btn btn-secondary" on:click={handleShareTemplate}>
              Share Template
            </button>
          {/if}
        </div>

        <div class="action-group">
          <button class="btn btn-secondary" on:click={closeModal}>
            Close
          </button>
          <button class="btn btn-primary" on:click={handleUseTemplate}>
            Use This Template
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
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

  .modal-content {
    background: var(--surface-color, #ffffff);
    border-radius: 16px;
    max-width: 900px;
    max-height: 90vh;
    width: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 2rem;
    border-bottom: 1px solid var(--border-light, #f3f4f6);
    background: var(--bg-light, #f9fafb);
  }

  .template-title-section {
    flex: 1;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .category-icon {
    font-size: 1.5rem;
  }

  .template-title {
    margin: 0;
    color: var(--text-primary, #1f2937);
    font-size: 1.5rem;
    font-weight: 700;
    flex: 1;
  }

  .visibility-badge {
    padding: 0.375rem 0.75rem;
    border-radius: 16px;
    font-size: 0.8rem;
    font-weight: 500;
  }

  .visibility-badge.public {
    background: var(--success-light, #d1fae5);
    color: var(--success-color, #22c55e);
  }

  .visibility-badge.private {
    background: var(--warning-light, #fef3c7);
    color: var(--warning-color, #f59e0b);
  }

  .template-description {
    margin: 0;
    color: var(--text-secondary, #6b7280);
    font-size: 1rem;
    line-height: 1.5;
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    color: var(--text-secondary, #6b7280);
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    transition: background-color 0.2s;
  }

  .modal-close:hover {
    background: var(--bg-light, #f9fafb);
  }

  .tabs {
    display: flex;
    border-bottom: 2px solid var(--border-light, #f3f4f6);
  }

  .tab {
    background: none;
    border: none;
    padding: 1rem 1.5rem;
    cursor: pointer;
    color: var(--text-secondary, #6b7280);
    font-weight: 500;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
    font-size: 0.875rem;
  }

  .tab:hover {
    color: var(--text-primary, #1f2937);
    background: var(--bg-light, #f9fafb);
  }

  .tab.active {
    color: var(--primary-color, #3b82f6);
    border-bottom-color: var(--primary-color, #3b82f6);
  }

  .modal-body {
    padding: 2rem;
    overflow-y: auto;
    flex: 1;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--bg-light, #f9fafb);
    border-radius: 8px;
  }

  .stat-icon {
    font-size: 1.5rem;
  }

  .stat-content {
    flex: 1;
  }

  .stat-label {
    font-size: 0.8rem;
    color: var(--text-secondary, #6b7280);
    font-weight: 500;
    margin-bottom: 0.25rem;
  }

  .stat-value {
    font-size: 0.9rem;
    color: var(--text-primary, #1f2937);
    font-weight: 600;
  }

  .features-section {
    margin-bottom: 2rem;
  }

  .features-section h3 {
    margin: 0 0 1rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1.125rem;
    font-weight: 600;
  }

  .feature-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--surface-color, #ffffff);
    border: 1px solid var(--border-light, #f3f4f6);
    border-radius: 8px;
  }

  .feature-icon {
    font-size: 1.125rem;
  }

  .tags-section {
    margin-bottom: 2rem;
  }

  .tags-section h3 {
    margin: 0 0 1rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1.125rem;
    font-weight: 600;
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag {
    padding: 0.375rem 0.75rem;
    background: var(--primary-light, #dbeafe);
    color: var(--primary-color, #3b82f6);
    border-radius: 16px;
    font-size: 0.8rem;
    font-weight: 500;
  }

  .settings-section h3 {
    margin: 0 0 1.5rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1.125rem;
    font-weight: 600;
  }

  .settings-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .setting-item {
    padding: 1rem;
    background: var(--bg-light, #f9fafb);
    border-radius: 8px;
  }

  .setting-name {
    font-weight: 600;
    color: var(--text-primary, #1f2937);
    margin-bottom: 0.5rem;
  }

  .setting-value {
    margin-bottom: 0.5rem;
  }

  .setting-toggle {
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 500;
  }

  .setting-toggle.enabled {
    background: var(--success-light, #d1fae5);
    color: var(--success-color, #22c55e);
  }

  .setting-toggle:not(.enabled) {
    background: var(--error-light, #fef2f2);
    color: var(--error-color, #ef4444);
  }

  .setting-text {
    color: var(--text-primary, #1f2937);
    font-weight: 500;
  }

  .setting-description {
    font-size: 0.8rem;
    color: var(--text-secondary, #6b7280);
    font-style: italic;
  }

  .content-section {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .content-group h3 {
    margin: 0 0 1rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1.125rem;
    font-weight: 600;
  }

  .topic-list, .room-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .topic-item, .room-item {
    padding: 1rem;
    background: var(--surface-color, #ffffff);
    border: 1px solid var(--border-light, #f3f4f6);
    border-radius: 8px;
  }

  .topic-header, .room-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .topic-number {
    font-weight: 600;
    color: var(--primary-color, #3b82f6);
    font-size: 0.9rem;
  }

  .topic-title, .room-name {
    font-weight: 600;
    color: var(--text-primary, #1f2937);
    flex: 1;
  }

  .priority-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 600;
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
    background: var(--success-light, #d1fae5);
    color: var(--success-color, #22c55e);
  }

  .room-capacity {
    font-size: 0.8rem;
    color: var(--text-secondary, #6b7280);
    font-weight: 500;
  }

  .virtual-badge {
    padding: 0.25rem 0.5rem;
    background: var(--info-light, #dbeafe);
    color: var(--info-color, #3b82f6);
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 500;
  }

  .topic-description, .room-description {
    color: var(--text-secondary, #6b7280);
    font-size: 0.875rem;
    line-height: 1.5;
    margin-bottom: 0.5rem;
  }

  .room-location {
    color: var(--text-secondary, #6b7280);
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
  }

  .room-amenities {
    font-size: 0.8rem;
    color: var(--text-secondary, #6b7280);
  }

  .amenities-label {
    font-weight: 500;
  }

  .topic-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .topic-tag {
    padding: 0.125rem 0.375rem;
    background: var(--bg-light, #f9fafb);
    border: 1px solid var(--border-light, #f3f4f6);
    border-radius: 8px;
    font-size: 0.7rem;
    color: var(--text-secondary, #6b7280);
  }

  .empty-content {
    text-align: center;
    padding: 3rem;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .empty-content h4 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1.125rem;
    font-weight: 600;
  }

  .empty-content p {
    color: var(--text-secondary, #6b7280);
    margin: 0;
  }

  .metadata-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .metadata-item {
    padding: 1rem;
    background: var(--bg-light, #f9fafb);
    border-radius: 8px;
  }

  .metadata-item.full-width {
    grid-column: 1 / -1;
  }

  .metadata-label {
    font-weight: 600;
    color: var(--text-secondary, #6b7280);
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .metadata-value {
    color: var(--text-primary, #1f2937);
    font-size: 0.9rem;
    word-break: break-word;
  }

  .shared-user {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background: var(--primary-light, #dbeafe);
    color: var(--primary-color, #3b82f6);
    border-radius: 12px;
    font-size: 0.8rem;
    margin-right: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .more-users {
    color: var(--text-secondary, #6b7280);
    font-style: italic;
    font-size: 0.8rem;
  }

  .metadata-json {
    background: var(--surface-color, #ffffff);
    border: 1px solid var(--border-light, #f3f4f6);
    border-radius: 6px;
    padding: 1rem;
    font-size: 0.8rem;
    color: var(--text-primary, #1f2937);
    overflow-x: auto;
    white-space: pre-wrap;
    margin: 0;
  }

  .modal-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    border-top: 1px solid var(--border-light, #f3f4f6);
    background: var(--bg-light, #f9fafb);
  }

  .action-group {
    display: flex;
    gap: 1rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
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
    .modal-content {
      max-height: 95vh;
      margin: 0.5rem;
    }

    .modal-header {
      padding: 1.5rem;
    }

    .title-row {
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .template-title {
      font-size: 1.25rem;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .metadata-grid {
      grid-template-columns: 1fr;
    }

    .modal-actions {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .action-group {
      justify-content: center;
    }
  }
</style>