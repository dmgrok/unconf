<!--
  Template Sharing Interface Component
  Provides comprehensive template sharing with granular permission controls
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { TemplatePermissionType } from '../../types/enums';
  import type { EventTemplatePermission } from '../../types/entities';
  import TemplateSharingHistory from './TemplateSharingHistory.svelte';

  export let templateId: string;
  export let templateName: string;
  export let currentUserId: string;
  export let isCreator: boolean = false;

  const dispatch = createEventDispatcher();

  interface ShareUser {
    userId: string;
    email?: string;
    name?: string;
    permission: TemplatePermissionType;
  }

  interface PermissionDetails extends EventTemplatePermission {
    userName?: string;
    userEmail?: string;
  }

  let isLoading = false;
  let isSharing = false;
  let error: string | null = null;
  let activeTab: 'share' | 'permissions' | 'public' | 'history' = 'share';

  // Sharing state
  let emailInput = '';
  let selectedPermission: TemplatePermissionType = TemplatePermissionType.USE;
  let usersToShare: ShareUser[] = [];

  // Current permissions
  let currentPermissions: PermissionDetails[] = [];
  let isPublic = false;

  // History component reference
  let historyComponent: TemplateSharingHistory;

  // Permission options with descriptions
  const permissionOptions = [
    {
      value: TemplatePermissionType.VIEW,
      label: 'View Only',
      description: 'Can view template details but cannot use or modify'
    },
    {
      value: TemplatePermissionType.USE,
      label: 'Use Template',
      description: 'Can create events from this template'
    },
    {
      value: TemplatePermissionType.EDIT,
      label: 'Edit Template',
      description: 'Can modify template settings and content'
    },
    {
      value: TemplatePermissionType.SHARE,
      label: 'Share Template',
      description: 'Can share template with others (includes use and edit)'
    },
    {
      value: TemplatePermissionType.ADMIN,
      label: 'Admin Access',
      description: 'Full control including deletion (creator level access)'
    }
  ];

  onMount(async () => {
    await loadCurrentPermissions();
  });

  async function loadCurrentPermissions() {
    isLoading = true;
    error = null;

    try {
      const response = await fetch(`/api/templates/${templateId}/share?userId=${currentUserId}`);
      const result = await response.json();

      if (result.success) {
        currentPermissions = result.permissions || [];
        isPublic = result.isPublic || false;
      } else {
        error = result.error || 'Failed to load sharing information';
      }
    } catch (err) {
      console.error('Error loading permissions:', err);
      error = 'Failed to load sharing information';
    } finally {
      isLoading = false;
    }
  }

  function addUserToShare() {
    if (!emailInput.trim()) return;

    const email = emailInput.trim().toLowerCase();

    // Check if user is already in the list
    if (usersToShare.find(u => u.email === email)) {
      error = 'User already added to sharing list';
      return;
    }

    usersToShare = [
      ...usersToShare,
      {
        userId: email, // Using email as userId for now
        email,
        name: email.split('@')[0], // Extract name from email
        permission: selectedPermission
      }
    ];

    emailInput = '';
    error = null;
  }

  function removeUserFromShare(index: number) {
    usersToShare = usersToShare.filter((_, i) => i !== index);
  }

  function updateUserPermission(index: number, permission: TemplatePermissionType) {
    usersToShare[index].permission = permission;
    usersToShare = [...usersToShare];
  }

  async function shareTemplate() {
    if (usersToShare.length === 0) {
      error = 'Please add at least one user to share with';
      return;
    }

    isSharing = true;
    error = null;

    try {
      const response = await fetch(`/api/templates/${templateId}/share?userId=${currentUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds: usersToShare.map(u => u.userId),
          permission: selectedPermission
        })
      });

      const result = await response.json();

      if (result.success) {
        usersToShare = [];
        await loadCurrentPermissions();
        // Refresh history if available
        if (historyComponent) {
          historyComponent.refreshHistory();
        }
        dispatch('shared', {
          message: result.message,
          userCount: usersToShare.length
        });
      } else {
        error = result.error || 'Failed to share template';
      }
    } catch (err) {
      console.error('Error sharing template:', err);
      error = 'Failed to share template';
    } finally {
      isSharing = false;
    }
  }

  async function revokePermission(userId: string, userName?: string) {
    if (!confirm(`Are you sure you want to revoke access for ${userName || userId}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/templates/${templateId}/share?userId=${currentUserId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds: [userId]
        })
      });

      const result = await response.json();

      if (result.success) {
        await loadCurrentPermissions();
        // Refresh history if available
        if (historyComponent) {
          historyComponent.refreshHistory();
        }
        dispatch('revoked', {
          message: `Access revoked for ${userName || userId}`
        });
      } else {
        error = result.error || 'Failed to revoke access';
      }
    } catch (err) {
      console.error('Error revoking permission:', err);
      error = 'Failed to revoke access';
    }
  }

  async function togglePublicAccess() {
    try {
      const response = await fetch(`/api/templates/${templateId}?userId=${currentUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isPublic: !isPublic
        })
      });

      const result = await response.json();

      if (result.success) {
        isPublic = !isPublic;
        // Refresh history if available
        if (historyComponent) {
          historyComponent.refreshHistory();
        }
        dispatch('visibilityChanged', {
          isPublic,
          message: `Template is now ${isPublic ? 'public' : 'private'}`
        });
      } else {
        error = result.error || 'Failed to update visibility';
      }
    } catch (err) {
      console.error('Error updating visibility:', err);
      error = 'Failed to update visibility';
    }
  }

  function getPermissionIcon(permission: TemplatePermissionType): string {
    const icons = {
      [TemplatePermissionType.VIEW]: '👁️',
      [TemplatePermissionType.USE]: '🔧',
      [TemplatePermissionType.EDIT]: '✏️',
      [TemplatePermissionType.SHARE]: '🔗',
      [TemplatePermissionType.ADMIN]: '👑'
    };
    return icons[permission] || '📄';
  }

  function getPermissionLevel(permission: TemplatePermissionType): number {
    const levels = {
      [TemplatePermissionType.VIEW]: 1,
      [TemplatePermissionType.USE]: 2,
      [TemplatePermissionType.EDIT]: 3,
      [TemplatePermissionType.SHARE]: 4,
      [TemplatePermissionType.ADMIN]: 5
    };
    return levels[permission] || 0;
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      addUserToShare();
    }
  }

  function clearError() {
    error = null;
  }
</script>

<div class="sharing-interface">
  <div class="header">
    <h2>Share "{templateName}"</h2>
    <p class="subtitle">Control who can access and use your template</p>
  </div>

  {#if error}
    <div class="error-banner">
      <span class="error-icon">⚠️</span>
      <span class="error-message">{error}</span>
      <button class="error-dismiss" on:click={clearError}>×</button>
    </div>
  {/if}

  <div class="tabs">
    <button
      class="tab"
      class:active={activeTab === 'share'}
      on:click={() => activeTab = 'share'}
    >
      <span class="tab-icon">👥</span>
      Share with Users
    </button>
    <button
      class="tab"
      class:active={activeTab === 'permissions'}
      on:click={() => activeTab = 'permissions'}
    >
      <span class="tab-icon">🔒</span>
      Current Permissions
    </button>
    <button
      class="tab"
      class:active={activeTab === 'public'}
      on:click={() => activeTab = 'public'}
    >
      <span class="tab-icon">🌐</span>
      Public Access
    </button>
    <button
      class="tab"
      class:active={activeTab === 'history'}
      on:click={() => activeTab = 'history'}
    >
      <span class="tab-icon">📋</span>
      History
    </button>
  </div>

  <div class="tab-content">
    {#if activeTab === 'share'}
      <div class="share-section">
        <h3>Add People</h3>
        <p class="section-description">Enter email addresses of people you want to share this template with</p>

        <div class="add-user-form">
          <div class="input-group">
            <input
              type="email"
              bind:value={emailInput}
              placeholder="Enter email address"
              class="email-input"
              on:keypress={handleKeyPress}
            />
            <select bind:value={selectedPermission} class="permission-select">
              {#each permissionOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
            <button
              class="add-button"
              on:click={addUserToShare}
              disabled={!emailInput.trim()}
            >
              Add
            </button>
          </div>
        </div>

        {#if usersToShare.length > 0}
          <div class="users-to-share">
            <h4>Users to Share With</h4>
            <div class="user-list">
              {#each usersToShare as user, index}
                <div class="user-item">
                  <div class="user-info">
                    <div class="user-avatar">
                      {user.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div class="user-details">
                      <div class="user-name">{user.name || user.email}</div>
                      <div class="user-email">{user.email}</div>
                    </div>
                  </div>
                  <div class="user-permission">
                    <select
                      value={user.permission}
                      on:change={(e) => updateUserPermission(index, e.target.value)}
                      class="permission-select small"
                    >
                      {#each permissionOptions as option}
                        <option value={option.value}>{option.label}</option>
                      {/each}
                    </select>
                  </div>
                  <button
                    class="remove-button"
                    on:click={() => removeUserFromShare(index)}
                    title="Remove user"
                  >
                    ×
                  </button>
                </div>
              {/each}
            </div>

            <div class="share-actions">
              <button
                class="btn btn-primary"
                on:click={shareTemplate}
                disabled={isSharing}
              >
                {#if isSharing}
                  <span class="spinner"></span>
                  Sharing...
                {:else}
                  Share Template
                {/if}
              </button>
              <button
                class="btn btn-secondary"
                on:click={() => usersToShare = []}
              >
                Clear All
              </button>
            </div>
          </div>
        {/if}
      </div>

    {:else if activeTab === 'permissions'}
      <div class="permissions-section">
        <h3>Current Permissions</h3>
        <p class="section-description">People who currently have access to this template</p>

        {#if isLoading}
          <div class="loading-state">
            <span class="spinner"></span>
            Loading permissions...
          </div>
        {:else if currentPermissions.length === 0}
          <div class="empty-state">
            <div class="empty-icon">🔒</div>
            <h4>No Shared Access</h4>
            <p>This template is not currently shared with anyone</p>
          </div>
        {:else}
          <div class="permissions-list">
            {#each currentPermissions as permission}
              <div class="permission-item">
                <div class="permission-user">
                  <div class="user-avatar">
                    {permission.userName?.charAt(0).toUpperCase() || permission.userId.charAt(0).toUpperCase()}
                  </div>
                  <div class="user-details">
                    <div class="user-name">{permission.userName || permission.userId}</div>
                    <div class="user-email">{permission.userEmail || ''}</div>
                    <div class="permission-meta">
                      Granted {permission.grantedAt.toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div class="permission-level">
                  <span class="permission-badge" data-level={getPermissionLevel(permission.permission)}>
                    <span class="permission-icon">{getPermissionIcon(permission.permission)}</span>
                    {permissionOptions.find(p => p.value === permission.permission)?.label || permission.permission}
                  </span>
                </div>
                {#if isCreator}
                  <button
                    class="revoke-button"
                    on:click={() => revokePermission(permission.userId, permission.userName)}
                    title="Revoke access"
                  >
                    Revoke
                  </button>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>

    {:else if activeTab === 'public'}
      <div class="public-section">
        <h3>Public Access</h3>
        <p class="section-description">Control whether anyone can discover and use this template</p>

        <div class="public-toggle">
          <div class="toggle-content">
            <div class="toggle-info">
              <h4>Make Template Public</h4>
              <p>
                {#if isPublic}
                  This template is publicly visible and can be used by anyone
                {:else}
                  This template is private and only accessible to people you share it with
                {/if}
              </p>
            </div>
            <label class="toggle-switch">
              <input
                type="checkbox"
                checked={isPublic}
                on:change={togglePublicAccess}
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        {#if isPublic}
          <div class="public-info">
            <div class="info-card">
              <h4>🌐 Public Template Benefits</h4>
              <ul>
                <li>Increased visibility in template gallery</li>
                <li>Higher usage and community engagement</li>
                <li>Contributes to the UnConf template library</li>
              </ul>
            </div>
          </div>
        {:else}
          <div class="private-info">
            <div class="info-card">
              <h4>🔒 Private Template Benefits</h4>
              <ul>
                <li>Full control over who can access</li>
                <li>Confidential content remains secure</li>
                <li>Granular permission management</li>
              </ul>
            </div>
          </div>
        {/if}
      </div>

    {:else if activeTab === 'history'}
      <div class="history-section">
        <TemplateSharingHistory
          bind:this={historyComponent}
          {templateId}
          {currentUserId}
          {isCreator}
          on:accessRevoked={async (event) => {
            await loadCurrentPermissions();
            dispatch('revoked', event.detail);
          }}
        />
      </div>
    {/if}
  </div>
</div>

<style>
  .sharing-interface {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    background: var(--surface-color, #ffffff);
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  }

  .header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .header h2 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1.75rem;
    font-weight: 600;
  }

  .subtitle {
    color: var(--text-secondary, #6b7280);
    margin: 0;
    font-size: 1rem;
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

  .tabs {
    display: flex;
    border-bottom: 2px solid var(--border-light, #f3f4f6);
    margin-bottom: 2rem;
    gap: 0.5rem;
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
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .tab:hover {
    color: var(--text-primary, #1f2937);
    background: var(--bg-light, #f9fafb);
  }

  .tab.active {
    color: var(--primary-color, #3b82f6);
    border-bottom-color: var(--primary-color, #3b82f6);
  }

  .tab-icon {
    font-size: 1.125rem;
  }

  .tab-content {
    min-height: 400px;
  }

  .share-section h3,
  .permissions-section h3,
  .public-section h3 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1.25rem;
    font-weight: 600;
  }

  .section-description {
    color: var(--text-secondary, #6b7280);
    margin: 0 0 2rem 0;
  }

  .add-user-form {
    margin-bottom: 2rem;
  }

  .input-group {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .email-input {
    flex: 1;
    min-width: 250px;
    padding: 0.875rem 1rem;
    border: 1px solid var(--border-color, #d1d5db);
    border-radius: 8px;
    font-size: 0.875rem;
  }

  .email-input:focus {
    outline: none;
    border-color: var(--primary-color, #3b82f6);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .permission-select {
    padding: 0.875rem 1rem;
    border: 1px solid var(--border-color, #d1d5db);
    border-radius: 8px;
    font-size: 0.875rem;
    background: var(--surface-color, #ffffff);
    min-width: 120px;
  }

  .permission-select.small {
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
    min-width: 100px;
  }

  .add-button {
    padding: 0.875rem 1.5rem;
    background: var(--primary-color, #3b82f6);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .add-button:hover:not(:disabled) {
    background: var(--primary-hover, #2563eb);
  }

  .add-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .users-to-share {
    border: 1px solid var(--border-light, #f3f4f6);
    border-radius: 8px;
    padding: 1.5rem;
    background: var(--bg-light, #f9fafb);
  }

  .users-to-share h4 {
    margin: 0 0 1rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1rem;
    font-weight: 600;
  }

  .user-list {
    space-y: 0.75rem;
  }

  .user-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--surface-color, #ffffff);
    border: 1px solid var(--border-light, #f3f4f6);
    border-radius: 8px;
    margin-bottom: 0.75rem;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
  }

  .user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--primary-color, #3b82f6);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .user-name {
    font-weight: 500;
    color: var(--text-primary, #1f2937);
    font-size: 0.875rem;
  }

  .user-email {
    color: var(--text-secondary, #6b7280);
    font-size: 0.8rem;
  }

  .user-permission {
    min-width: 120px;
  }

  .remove-button {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--error-light, #fef2f2);
    color: var(--error-color, #ef4444);
    border: none;
    cursor: pointer;
    font-size: 1.125rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .remove-button:hover {
    background: var(--error-color, #ef4444);
    color: white;
  }

  .share-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border-light, #f3f4f6);
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

  .permissions-list {
    space-y: 1rem;
  }

  .permission-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    border: 1px solid var(--border-light, #f3f4f6);
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .permission-user {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
  }

  .permission-meta {
    color: var(--text-muted, #9ca3af);
    font-size: 0.75rem;
  }

  .permission-level {
    min-width: 140px;
  }

  .permission-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 500;
  }

  .permission-badge[data-level="1"] {
    background: var(--gray-light, #f3f4f6);
    color: var(--gray-dark, #374151);
  }

  .permission-badge[data-level="2"] {
    background: var(--blue-light, #dbeafe);
    color: var(--blue-dark, #1e40af);
  }

  .permission-badge[data-level="3"] {
    background: var(--yellow-light, #fef3c7);
    color: var(--yellow-dark, #92400e);
  }

  .permission-badge[data-level="4"] {
    background: var(--green-light, #d1fae5);
    color: var(--green-dark, #065f46);
  }

  .permission-badge[data-level="5"] {
    background: var(--purple-light, #e9d5ff);
    color: var(--purple-dark, #6b21a8);
  }

  .permission-icon {
    font-size: 1rem;
  }

  .revoke-button {
    padding: 0.5rem 1rem;
    background: var(--error-light, #fef2f2);
    color: var(--error-color, #ef4444);
    border: 1px solid var(--error-color, #ef4444);
    border-radius: 6px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .revoke-button:hover {
    background: var(--error-color, #ef4444);
    color: white;
  }

  .public-toggle {
    margin-bottom: 2rem;
  }

  .toggle-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    border: 1px solid var(--border-light, #f3f4f6);
    border-radius: 8px;
    background: var(--surface-color, #ffffff);
  }

  .toggle-info h4 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1rem;
    font-weight: 600;
  }

  .toggle-info p {
    margin: 0;
    color: var(--text-secondary, #6b7280);
    font-size: 0.875rem;
  }

  .toggle-switch {
    position: relative;
    width: 60px;
    height: 34px;
    cursor: pointer;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--border-color, #d1d5db);
    border-radius: 34px;
    transition: 0.3s;
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 26px;
    width: 26px;
    left: 4px;
    bottom: 4px;
    background: white;
    border-radius: 50%;
    transition: 0.3s;
  }

  input:checked + .toggle-slider {
    background: var(--primary-color, #3b82f6);
  }

  input:checked + .toggle-slider:before {
    transform: translateX(26px);
  }

  .info-card {
    padding: 1.5rem;
    border: 1px solid var(--border-light, #f3f4f6);
    border-radius: 8px;
    background: var(--bg-light, #f9fafb);
  }

  .info-card h4 {
    margin: 0 0 1rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1rem;
    font-weight: 600;
  }

  .info-card ul {
    margin: 0;
    padding-left: 1.5rem;
    color: var(--text-secondary, #6b7280);
  }

  .info-card li {
    margin-bottom: 0.5rem;
  }

  .btn {
    padding: 0.875rem 1.75rem;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
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
  }

  .btn-secondary {
    background: var(--secondary-bg, #f9fafb);
    color: var(--text-primary, #374151);
    border: 1px solid var(--border-color, #d1d5db);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--secondary-hover, #f3f4f6);
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .sharing-interface {
      padding: 1rem;
    }

    .input-group {
      flex-direction: column;
      align-items: stretch;
    }

    .email-input,
    .permission-select {
      min-width: auto;
    }

    .user-item {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }

    .user-info {
      justify-content: center;
    }

    .share-actions {
      flex-direction: column;
    }

    .toggle-content {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }

    .permission-item {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }

    .permission-user {
      justify-content: center;
      text-align: center;
    }
  }
</style>