<!--
  Template Permission Guard Component
  Controls access to template features based on user permissions
-->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import type { TemplatePermissionType } from '../../types/enums';

  export let templateId: string;
  export let userId: string;
  export let requiredPermission: TemplatePermissionType;
  export let fallback: string = 'You do not have permission to access this feature';
  export let showError: boolean = true;
  export let showLoading: boolean = true;

  const dispatch = createEventDispatcher();

  let hasPermission = false;
  let isLoading = true;
  let error: string | null = null;
  let userPermission: TemplatePermissionType | null = null;
  let isCreator = false;

  onMount(async () => {
    await checkPermission();
  });

  async function checkPermission() {
    isLoading = true;
    error = null;

    try {
      const response = await fetch(
        `/api/templates/${templateId}/permissions?userId=${userId}&permission=${requiredPermission}`
      );
      const result = await response.json();

      if (result.success) {
        hasPermission = result.hasPermission;
        userPermission = result.permission;
        isCreator = result.isCreator;

        dispatch('permissionChecked', {
          hasPermission,
          userPermission,
          isCreator,
          reason: result.reason
        });
      } else {
        error = result.error || 'Failed to check permissions';
        hasPermission = false;
        dispatch('permissionError', { error });
      }
    } catch (err) {
      console.error('Error checking permission:', err);
      error = 'Failed to check permissions';
      hasPermission = false;
      dispatch('permissionError', { error: err instanceof Error ? err.message : String(err) });
    } finally {
      isLoading = false;
    }
  }

  // Reactive function to refresh permission check
  export function refreshPermissions() {
    return checkPermission();
  }
</script>

{#if isLoading && showLoading}
  <div class="permission-loading">
    <span class="spinner"></span>
    Checking permissions...
  </div>
{:else if hasPermission}
  <slot {userPermission} {isCreator} {hasPermission} />
{:else if showError}
  <div class="permission-denied">
    <div class="permission-denied-content">
      <span class="error-icon">🔒</span>
      <span class="error-message">{fallback}</span>
    </div>
    {#if error}
      <div class="error-details">{error}</div>
    {/if}
  </div>
{/if}

<style>
  .permission-loading {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    color: var(--text-secondary, #6b7280);
    font-size: 0.875rem;
  }

  .permission-denied {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    background: var(--error-light, #fef2f2);
    border: 1px solid var(--error-color, #ef4444);
    border-radius: 8px;
    color: var(--error-color, #ef4444);
  }

  .permission-denied-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .error-icon {
    font-size: 1.25rem;
  }

  .error-message {
    font-weight: 500;
  }

  .error-details {
    font-size: 0.8rem;
    color: var(--error-color-muted, #dc2626);
    opacity: 0.8;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--border-light, #f3f4f6);
    border-top: 2px solid var(--primary-color, #3b82f6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>