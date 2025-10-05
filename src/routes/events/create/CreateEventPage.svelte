<script lang="ts">
  import { goto } from '$app/navigation';
  import { authStore, type AuthUser } from '$lib/stores/auth';
  import { AlertTriangle, Lock, Sparkles } from 'lucide-svelte';
  import EventConfigurationFormNew from '$lib/components/EventConfigurationFormNew.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { onMount } from 'svelte';

  type EventSavedDetail = { event: { id: string; title: string; accessCode?: string } };
  type ErrorDetail = { message: string; details?: Array<{ message: string }> };

  let isLoading = $state(true);
  let user = $state<AuthUser | null>(null);
  let showSuccess = $state(false);
  let successEvent = $state<{ id: string; title: string; accessCode?: string } | null>(null);
  let errorMessage = $state('');

  onMount(async () => {
    await authStore.initialize();
    user = authStore.getUser();
    isLoading = false;
  });

  function handleEventCreated(event: CustomEvent<EventSavedDetail>) {
    const { event: newEvent } = event.detail;
    successEvent = newEvent;
    showSuccess = true;

    // Auto-redirect after 3 seconds or wait for user action
    setTimeout(() => {
      if (showSuccess) {
        goto(`/events/${newEvent.id}`);
      }
    }, 3000);
  }

  function handleError(event: CustomEvent<ErrorDetail>) {
    const { message, details } = event.detail;

    let errorMsg = message;
    if (details && Array.isArray(details) && details.length) {
      errorMsg += '\n\nValidation errors:\n' + details.map(d => `• ${d.message}`).join('\n');
    }

    errorMessage = errorMsg;

    // Clear error after 5 seconds
    setTimeout(() => {
      errorMessage = '';
    }, 5000);
  }

  function handleCancel() {
    goto('/');
  }

  function goToEvent() {
    if (successEvent) {
      goto(`/events/${successEvent.id}`);
    }
  }

  function createAnother() {
    showSuccess = false;
    successEvent = null;
  }
</script>

<svelte:head>
  <title>Create Event - UnConf</title>
  <meta name="description" content="Create a new unconference event with custom settings and constraints" />
</svelte:head>

<main class="create-event-page">
  <!-- Error Toast -->
  {#if errorMessage}
    <div class="error-toast">
      <div class="toast-content">
        <span class="toast-icon">
          <AlertTriangle size={20} />
        </span>
        <p class="toast-message">{errorMessage}</p>
        <button class="toast-close" onclick={() => (errorMessage = '')}>×</button>
      </div>
    </div>
  {/if}

  {#if isLoading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  {:else if !user}
    <div class="auth-required">
      <div class="auth-card">
        <div class="auth-icon">
          <Lock size={48} />
        </div>
        <h2>Authentication Required</h2>
        <p>You need to be signed in to create an event.</p>
        <Button variant="primary" size="lg" onclick={() => goto('/auth/signin')}>
          Sign In
        </Button>
      </div>
    </div>
  {:else if showSuccess && successEvent}
    <div class="success-state">
      <div class="success-card">
        <div class="success-icon">
          <Sparkles size={64} />
        </div>
        <h2>Event Created Successfully!</h2>
        <p class="success-title">{successEvent.title}</p>
        {#if successEvent.accessCode}
          <div class="access-code-section">
            <p class="access-code-label">Access Code:</p>
            <div class="access-code">{successEvent.accessCode}</div>
            <p class="access-code-hint">Share this code with participants</p>
          </div>
        {/if}
        <div class="success-actions">
          <Button variant="primary" size="lg" onclick={goToEvent}>
            Go to Event Dashboard
          </Button>
          <Button variant="outline" size="lg" onclick={createAnother}>
            Create Another Event
          </Button>
        </div>
        <p class="auto-redirect">Redirecting in 3 seconds...</p>
      </div>
    </div>
  {:else}
    <EventConfigurationFormNew
      mode="create"
      organizerId={user.id}
      organizerName={user.name ?? user.email ?? 'Anonymous'}
      on:eventSaved={handleEventCreated}
      on:error={handleError}
      on:cancel={handleCancel}
    />
  {/if}
</main>

<style>
  .create-event-page {
    min-height: 100vh;
    background: linear-gradient(
      135deg,
      var(--color-primary-50) 0%,
      var(--color-secondary-50) 100%
    );
    padding: var(--spacing-8) var(--spacing-4);
  }

  /* Error Toast */
  .error-toast {
    position: fixed;
    top: var(--spacing-6);
    right: var(--spacing-6);
    z-index: var(--z-tooltip);
    animation: slideIn 0.3s ease;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .toast-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    background: var(--color-danger);
    color: white;
    padding: var(--spacing-4);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    max-width: 400px;
    min-width: 300px;
  }

  .toast-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .toast-message {
    flex: 1;
    margin: 0;
    font-size: var(--font-size-sm);
    line-height: var(--line-height-normal);
  }

  .toast-close {
    background: none;
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background var(--transition-fast);
  }

  .toast-close:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  /* Loading State */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    gap: var(--spacing-4);
  }

  .loading-state p {
    color: var(--color-text-secondary);
    font-size: var(--font-size-lg);
    margin: 0;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--color-border);
    border-top: 4px solid var(--color-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Auth Required */
  .auth-required {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
  }

  .auth-card {
    text-align: center;
    padding: var(--spacing-10);
    background: var(--color-surface);
    border-radius: var(--radius-2xl);
    border: 1px solid var(--color-border);
    max-width: 440px;
    box-shadow: var(--shadow-xl);
  }

  .auth-icon {
    font-size: 4rem;
    margin-bottom: var(--spacing-4);
  }

  .auth-card h2 {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    margin: 0 0 var(--spacing-3) 0;
  }

  .auth-card p {
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
    margin: 0 0 var(--spacing-6) 0;
    line-height: var(--line-height-relaxed);
  }

  /* Success State */
  .success-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
  }

  .success-card {
    text-align: center;
    padding: var(--spacing-10);
    background: var(--color-surface);
    border-radius: var(--radius-2xl);
    border: 1px solid var(--color-success);
    max-width: 560px;
    width: 100%;
    box-shadow: var(--shadow-xl);
    animation: scaleIn 0.3s ease;
  }

  @keyframes scaleIn {
    from {
      transform: scale(0.9);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .success-icon {
    font-size: 5rem;
    margin-bottom: var(--spacing-4);
    animation: bounce 0.6s ease;
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-20px); }
  }

  .success-card h2 {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-success);
    margin: 0 0 var(--spacing-3) 0;
  }

  .success-title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    margin: 0 0 var(--spacing-6) 0;
  }

  .access-code-section {
    margin: var(--spacing-6) 0;
    padding: var(--spacing-6);
    background: var(--color-primary-light);
    border-radius: var(--radius-lg);
  }

  .access-code-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
    margin: 0 0 var(--spacing-2) 0;
  }

  .access-code {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    font-family: 'Monaco', 'Courier New', monospace;
    color: var(--color-primary);
    letter-spacing: 0.1em;
    margin: 0 0 var(--spacing-2) 0;
  }

  .access-code-hint {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
    margin: 0;
  }

  .success-actions {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    margin: var(--spacing-6) 0;
  }

  .auto-redirect {
    font-size: var(--font-size-sm);
    color: var(--color-text-tertiary);
    margin: var(--spacing-4) 0 0 0;
  }

  @media (max-width: 768px) {
    .create-event-page {
      padding: var(--spacing-6) var(--spacing-4);
    }

    .error-toast {
      top: var(--spacing-4);
      right: var(--spacing-4);
      left: var(--spacing-4);
    }

    .toast-content {
      min-width: auto;
      width: 100%;
    }

    .auth-card,
    .success-card {
      padding: var(--spacing-8);
    }

    .success-icon {
      font-size: 4rem;
    }

    .success-card h2 {
      font-size: var(--font-size-2xl);
    }

    .access-code {
      font-size: var(--font-size-2xl);
    }
  }

  @media (max-width: 640px) {
    .create-event-page {
      padding: var(--spacing-4) var(--spacing-2);
    }

    .auth-card,
    .success-card {
      padding: var(--spacing-6);
    }

    .auth-icon,
    .success-icon {
      font-size: 3rem;
    }
  }
</style>
