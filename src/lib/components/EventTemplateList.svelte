<!--
  Event Template List Component
  Displays a list of available event templates with actions
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { EventTemplate } from '../../types/entities';
  import { TemplateCategory } from '../../types/enums';

  export let templates: EventTemplate[] = [];
  export let currentUserId: string;
  export let loading = false;
  export let showCreateFromTemplate = true;
  export let showEdit = true;
  export let showShare = true;

  const dispatch = createEventDispatcher();

  function handleCreateFromTemplate(template: EventTemplate) {
    dispatch('createFromTemplate', { template });
  }

  function handleEditTemplate(template: EventTemplate) {
    dispatch('editTemplate', { template });
  }

  function handleShareTemplate(template: EventTemplate) {
    dispatch('shareTemplate', { template });
  }

  function handleDeleteTemplate(template: EventTemplate) {
    dispatch('deleteTemplate', { template });
  }

  function handleUseTemplate(template: EventTemplate) {
    dispatch('useTemplate', { template });
  }

  function getCategoryDisplayName(category: string): string {
    const categoryMap: Record<TemplateCategory, string> = {
      [TemplateCategory.CONFERENCE]: 'Conference',
      [TemplateCategory.WORKSHOP]: 'Workshop',
      [TemplateCategory.MEETING]: 'Meeting',
      [TemplateCategory.HACKATHON]: 'Hackathon',
      [TemplateCategory.NETWORKING]: 'Networking',
      [TemplateCategory.TRAINING]: 'Training',
      [TemplateCategory.CUSTOM]: 'Custom'
    };
    return categoryMap[category as TemplateCategory] || 'Unknown';
  }

  function formatLastUsed(date: Date | undefined): string {
    if (!date) return 'Never used';
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    );
  }

  function canEdit(template: EventTemplate): boolean {
    return template.createdBy === currentUserId;
  }

  function canShare(template: EventTemplate): boolean {
    return template.createdBy === currentUserId;
  }
</script>

<div class="template-list">
  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading templates...</p>
    </div>
  {:else if templates.length === 0}
    <div class="empty-state">
      <div class="empty-icon">📋</div>
      <h3>No templates found</h3>
      <p>Create your first template from an existing event or start from scratch.</p>
    </div>
  {:else}
    <div class="templates-grid">
      {#each templates as template (template.id)}
        <div class="template-card">
          <div class="template-header">
            <div class="template-info">
              <h3 class="template-name">{template.name}</h3>
              <span class="template-category">{getCategoryDisplayName(template.category)}</span>
            </div>

            <div class="template-stats">
              <span class="usage-count" title="Times used">
                📊 {template.usageCount}
              </span>
              {#if template.isPublic}
                <span class="public-badge" title="Public template">🌐</span>
              {:else}
                <span class="private-badge" title="Private template">🔒</span>
              {/if}
            </div>
          </div>

          {#if template.description}
            <p class="template-description">{template.description}</p>
          {/if}

          <div class="template-details">
            <div class="detail-item">
              <span class="detail-label">Topics:</span>
              <span class="detail-value">
                {template.templateData.topics?.length || 0}
              </span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Rooms:</span>
              <span class="detail-value">
                {template.templateData.rooms?.length || 0}
              </span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Last used:</span>
              <span class="detail-value">
                {formatLastUsed(template.lastUsedAt)}
              </span>
            </div>
          </div>

          {#if template.tags && template.tags.length > 0}
            <div class="template-tags">
              {#each template.tags as tag}
                <span class="tag">{tag}</span>
              {/each}
            </div>
          {/if}

          <div class="template-actions">
            {#if showCreateFromTemplate}
              <button
                class="btn btn-primary"
                on:click={() => handleCreateFromTemplate(template)}
              >
                Create Event
              </button>
            {/if}

            <button
              class="btn btn-secondary"
              on:click={() => handleUseTemplate(template)}
            >
              Use Template
            </button>

            {#if showEdit && canEdit(template)}
              <button
                class="btn btn-outline"
                on:click={() => handleEditTemplate(template)}
              >
                Edit
              </button>
            {/if}

            {#if showShare && canShare(template)}
              <button
                class="btn btn-outline"
                on:click={() => handleShareTemplate(template)}
              >
                Share
              </button>
            {/if}

            {#if canEdit(template)}
              <button
                class="btn btn-danger"
                on:click={() => handleDeleteTemplate(template)}
              >
                Delete
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .template-list {
    width: 100%;
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

  .templates-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
    padding: 1rem 0;
  }

  .template-card {
    background: var(--surface-color, #ffffff);
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    transition: all 0.2s ease;
  }

  .template-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: var(--primary-color, #3b82f6);
  }

  .template-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .template-info {
    flex: 1;
  }

  .template-name {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary, #1f2937);
  }

  .template-category {
    display: inline-block;
    background: var(--primary-light, #eff6ff);
    color: var(--primary-color, #3b82f6);
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .template-stats {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .usage-count {
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
  }

  .public-badge, .private-badge {
    font-size: 1rem;
  }

  .template-description {
    color: var(--text-secondary, #6b7280);
    font-size: 0.875rem;
    line-height: 1.5;
    margin-bottom: 1rem;
  }

  .template-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 1rem;
    background: var(--surface-secondary, #f9fafb);
    border-radius: 8px;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .detail-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-secondary, #6b7280);
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .detail-value {
    font-size: 0.875rem;
    color: var(--text-primary, #1f2937);
    font-weight: 500;
  }

  .template-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .tag {
    background: var(--tag-bg, #f3f4f6);
    color: var(--tag-text, #374151);
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .template-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-light, #f3f4f6);
  }

  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--primary-color, #3b82f6);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--primary-hover, #2563eb);
  }

  .btn-secondary {
    background: var(--secondary-bg, #f9fafb);
    color: var(--text-primary, #374151);
    border: 1px solid var(--border-color, #d1d5db);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--secondary-hover, #f3f4f6);
  }

  .btn-outline {
    background: transparent;
    color: var(--text-primary, #374151);
    border: 1px solid var(--border-color, #d1d5db);
  }

  .btn-outline:hover:not(:disabled) {
    background: var(--hover-bg, #f9fafb);
  }

  .btn-danger {
    background: transparent;
    color: var(--error-color, #ef4444);
    border: 1px solid var(--error-color, #ef4444);
  }

  .btn-danger:hover:not(:disabled) {
    background: var(--error-color, #ef4444);
    color: white;
  }

  @media (max-width: 768px) {
    .templates-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .template-card {
      padding: 1rem;
    }

    .template-header {
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-start;
    }

    .template-details {
      grid-template-columns: 1fr;
    }

    .template-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }
</style>