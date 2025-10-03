<!--
  Template Sharing History Component
  Shows comprehensive history of template sharing actions with revocation capabilities
-->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { TemplatePermissionType } from '../../types/enums';

  export let templateId: string;
  export let currentUserId: string;
  export let isCreator: boolean = false;

  const dispatch = createEventDispatcher();

  interface HistoryEntry {
    id: string;
    templateId: string;
    action: 'shared' | 'unshared' | 'permission_changed' | 'made_public' | 'made_private';
    targetUserId?: string;
    targetUserName?: string;
    permission?: TemplatePermissionType;
    previousPermission?: TemplatePermissionType;
    performedBy: string;
    performedByName?: string;
    timestamp: Date;
    details?: string;
  }

  let history: HistoryEntry[] = [];
  let isLoading = false;
  let error: string | null = null;
  let hasMore = false;
  let offset = 0;
  let limit = 20;

  onMount(async () => {
    await loadHistory();
  });

  async function loadHistory(reset = true) {
    if (reset) {
      offset = 0;
      history = [];
    }

    isLoading = true;
    error = null;

    try {
      const response = await fetch(
        `/api/templates/${templateId}/history?userId=${currentUserId}&limit=${limit}&offset=${offset}`
      );
      const result = await response.json();

      if (result.success) {
        const newEntries = result.history.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));

        if (reset) {
          history = newEntries;
        } else {
          history = [...history, ...newEntries];
        }

        hasMore = result.pagination.hasMore;
        offset = result.pagination.offset + result.pagination.limit;
      } else {
        error = result.error || 'Failed to load sharing history';
      }
    } catch (err) {
      console.error('Error loading sharing history:', err);
      error = 'Failed to load sharing history';
    } finally {
      isLoading = false;
    }
  }

  async function loadMore() {
    if (!hasMore || isLoading) return;
    await loadHistory(false);
  }

  function getActionIcon(action: string): string {
    const icons = {
      shared: '🔗',
      unshared: '❌',
      permission_changed: '🔄',
      made_public: '🌐',
      made_private: '🔒'
    };
    return icons[action as keyof typeof icons] || '📝';
  }

  function getActionColor(action: string): string {
    const colors = {
      shared: 'success',
      unshared: 'error',
      permission_changed: 'warning',
      made_public: 'info',
      made_private: 'warning'
    };
    return colors[action as keyof typeof colors] || 'default';
  }

  function getActionDescription(entry: HistoryEntry): string {
    switch (entry.action) {
      case 'shared':
        return `Shared with ${entry.targetUserName || entry.targetUserId} (${entry.permission} permission)`;
      case 'unshared':
        return `Removed access for ${entry.targetUserName || entry.targetUserId}`;
      case 'permission_changed':
        return `Changed permission for ${entry.targetUserName || entry.targetUserId} from ${entry.previousPermission} to ${entry.permission}`;
      case 'made_public':
        return 'Template made publicly accessible';
      case 'made_private':
        return 'Template made private';
      default:
        return entry.details || 'Unknown action';
    }
  }

  function getPermissionBadgeClass(permission?: TemplatePermissionType): string {
    if (!permission) return '';

    const classes = {
      [TemplatePermissionType.VIEW]: 'permission-view',
      [TemplatePermissionType.USE]: 'permission-use',
      [TemplatePermissionType.EDIT]: 'permission-edit',
      [TemplatePermissionType.SHARE]: 'permission-share',
      [TemplatePermissionType.ADMIN]: 'permission-admin'
    };
    return classes[permission] || '';
  }

  function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }

  async function revokeUserAccess(targetUserId: string, targetUserName?: string) {
    if (!confirm(`Are you sure you want to revoke all access for ${targetUserName || targetUserId}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/templates/${templateId}/share?userId=${currentUserId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds: [targetUserId]
        })
      });

      const result = await response.json();

      if (result.success) {
        dispatch('accessRevoked', {
          targetUserId,
          targetUserName,
          message: result.message
        });
        // Reload history to show the revocation
        await loadHistory();
      } else {
        error = result.error || 'Failed to revoke access';
      }
    } catch (err) {
      console.error('Error revoking access:', err);
      error = 'Failed to revoke access';
    }
  }

  function clearError() {
    error = null;
  }

  // Export refresh function for parent components
  export function refreshHistory() {
    return loadHistory();
  }
</script>

<div class="sharing-history">
  <div class="history-header">
    <h3>Sharing History</h3>
    <p class="history-subtitle">Track all sharing activities for this template</p>
  </div>

  {#if error}
    <div class="error-banner">
      <span class="error-icon">⚠️</span>
      <span class="error-message">{error}</span>
      <button class="error-dismiss" on:click={clearError}>×</button>
    </div>
  {/if}

  {#if isLoading && history.length === 0}
    <div class="loading-state">
      <span class="spinner"></span>
      Loading sharing history...
    </div>
  {:else if history.length === 0}
    <div class="empty-state">
      <div class="empty-icon">📋</div>
      <h4>No Sharing History</h4>
      <p>This template hasn't been shared with anyone yet</p>
    </div>
  {:else}
    <div class="history-timeline">
      {#each history as entry}
        <div class="history-entry" data-action={entry.action}>
          <div class="entry-icon {getActionColor(entry.action)}">
            {getActionIcon(entry.action)}
          </div>

          <div class="entry-content">
            <div class="entry-header">
              <div class="entry-description">
                {getActionDescription(entry)}
              </div>
              <div class="entry-timestamp">
                {formatTimeAgo(entry.timestamp)}
              </div>
            </div>

            <div class="entry-meta">
              <span class="performed-by">
                by {entry.performedByName || entry.performedBy}
              </span>

              {#if entry.permission}
                <span class="permission-badge {getPermissionBadgeClass(entry.permission)}">
                  {entry.permission}
                </span>
              {/if}

              <span class="entry-date">
                {entry.timestamp.toLocaleDateString()} at {entry.timestamp.toLocaleTimeString()}
              </span>
            </div>

            {#if entry.details}
              <div class="entry-details">
                {entry.details}
              </div>
            {/if}

            {#if isCreator && entry.action === 'shared' && entry.targetUserId}
              <div class="entry-actions">
                <button
                  class="revoke-button"
                  on:click={() => revokeUserAccess(entry.targetUserId, entry.targetUserName)}
                >
                  Revoke Access
                </button>
              </div>
            {/if}
          </div>
        </div>
      {/each}

      {#if hasMore}
        <div class="load-more">
          <button
            class="load-more-button"
            on:click={loadMore}
            disabled={isLoading}
          >
            {#if isLoading}
              <span class="spinner small"></span>
              Loading...
            {:else}
              Load More History
            {/if}
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .sharing-history {
    background: var(--surface-color, #ffffff);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .history-header {
    margin-bottom: 1.5rem;
  }

  .history-header h3 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1.25rem;
    font-weight: 600;
  }

  .history-subtitle {
    color: var(--text-secondary, #6b7280);
    margin: 0;
    font-size: 0.875rem;
  }

  .error-banner {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--error-light, #fef2f2);
    border: 1px solid var(--error-color, #ef4444);
    border-radius: 8px;
    margin-bottom: 1.5rem;
  }

  .error-icon {
    font-size: 1.25rem;
  }

  .error-message {
    flex: 1;
    color: var(--error-color, #ef4444);
    font-weight: 500;
  }

  .error-dismiss {
    background: none;
    border: none;
    color: var(--error-color, #ef4444);
    cursor: pointer;
    font-size: 1.25rem;
    padding: 0;
    width: 24px;
    height: 24px;
  }

  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 3rem;
    color: var(--text-secondary, #6b7280);
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .empty-state h4 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1.125rem;
    font-weight: 600;
  }

  .empty-state p {
    color: var(--text-secondary, #6b7280);
    margin: 0;
  }

  .history-timeline {
    position: relative;
  }

  .history-timeline::before {
    content: '';
    position: absolute;
    left: 20px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--border-light, #f3f4f6);
  }

  .history-entry {
    position: relative;
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .entry-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    font-weight: 600;
    background: var(--surface-color, #ffffff);
    border: 2px solid var(--border-color, #e5e7eb);
    z-index: 1;
    flex-shrink: 0;
  }

  .entry-icon.success {
    background: var(--success-light, #d1fae5);
    border-color: var(--success-color, #22c55e);
    color: var(--success-color, #22c55e);
  }

  .entry-icon.error {
    background: var(--error-light, #fef2f2);
    border-color: var(--error-color, #ef4444);
    color: var(--error-color, #ef4444);
  }

  .entry-icon.warning {
    background: var(--warning-light, #fef3c7);
    border-color: var(--warning-color, #f59e0b);
    color: var(--warning-color, #f59e0b);
  }

  .entry-icon.info {
    background: var(--info-light, #dbeafe);
    border-color: var(--info-color, #3b82f6);
    color: var(--info-color, #3b82f6);
  }

  .entry-content {
    flex: 1;
    min-width: 0;
  }

  .entry-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .entry-description {
    font-weight: 500;
    color: var(--text-primary, #1f2937);
    flex: 1;
  }

  .entry-timestamp {
    color: var(--text-secondary, #6b7280);
    font-size: 0.8rem;
    flex-shrink: 0;
  }

  .entry-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    font-size: 0.8rem;
    color: var(--text-secondary, #6b7280);
    margin-bottom: 0.5rem;
  }

  .performed-by {
    font-weight: 500;
  }

  .permission-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .permission-view {
    background: var(--gray-light, #f3f4f6);
    color: var(--gray-dark, #374151);
  }

  .permission-use {
    background: var(--blue-light, #dbeafe);
    color: var(--blue-dark, #1e40af);
  }

  .permission-edit {
    background: var(--yellow-light, #fef3c7);
    color: var(--yellow-dark, #92400e);
  }

  .permission-share {
    background: var(--green-light, #d1fae5);
    color: var(--green-dark, #065f46);
  }

  .permission-admin {
    background: var(--purple-light, #e9d5ff);
    color: var(--purple-dark, #6b21a8);
  }

  .entry-details {
    font-size: 0.8rem;
    color: var(--text-secondary, #6b7280);
    font-style: italic;
    margin-bottom: 0.5rem;
  }

  .entry-actions {
    margin-top: 0.75rem;
  }

  .revoke-button {
    padding: 0.375rem 0.75rem;
    background: var(--error-light, #fef2f2);
    color: var(--error-color, #ef4444);
    border: 1px solid var(--error-color, #ef4444);
    border-radius: 6px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .revoke-button:hover {
    background: var(--error-color, #ef4444);
    color: white;
  }

  .load-more {
    display: flex;
    justify-content: center;
    margin-top: 2rem;
  }

  .load-more-button {
    padding: 0.75rem 1.5rem;
    background: var(--secondary-bg, #f9fafb);
    color: var(--text-primary, #374151);
    border: 1px solid var(--border-color, #d1d5db);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .load-more-button:hover:not(:disabled) {
    background: var(--secondary-hover, #f3f4f6);
  }

  .load-more-button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-light, #f3f4f6);
    border-top: 2px solid var(--primary-color, #3b82f6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .spinner.small {
    width: 16px;
    height: 16px;
    border-width: 2px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .sharing-history {
      padding: 1rem;
    }

    .history-timeline::before {
      left: 15px;
    }

    .entry-icon {
      width: 32px;
      height: 32px;
      font-size: 1rem;
    }

    .entry-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .entry-meta {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }
  }
</style>