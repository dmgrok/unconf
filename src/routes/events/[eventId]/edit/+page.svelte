<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore, type AuthUser } from '$lib/stores/auth';
  import EventConfigurationForm from '$lib/components/EventConfigurationForm.svelte';
  import type { Event as EventEntity } from '../../../../types/entities';
  import { onMount } from 'svelte';

  let isLoading = true;
  let user: AuthUser | null = null;
  let event: EventEntity | null = null;
  let error: string | null = null;

  type EventSavedDetail = { event: EventEntity };
  type ErrorDetail = { message: string; details?: Array<{ message: string }> };

  $: eventId = $page.params.eventId;

  onMount(async () => {
    await authStore.initialize();
    user = authStore.getUser();

    if (user && eventId) {
      await loadEvent();
    }

    isLoading = false;
  });

  async function loadEvent() {
    try {
      const response = await fetch(`/api/events?id=${eventId}`);
      const result = await response.json();

      if (result.success) {
        const fetchedEvent = result.event as EventEntity;
        event = fetchedEvent;

        // Check if user is authorized to edit this event
        if (user && fetchedEvent.organizerId !== user.id) {
          error = 'You are not authorized to edit this event.';
        }
      } else {
        error = result.error || 'Event not found.';
      }
    } catch (err) {
      console.error('Failed to load event:', err);
      error = 'Failed to load event. Please try again.';
    }
  }

  function handleEventSaved(event: CustomEvent<EventSavedDetail>) {
    const { event: updatedEvent } = event.detail;
    console.log('Event updated successfully:', updatedEvent);

    alert(`Event "${updatedEvent.title}" updated successfully!`);
    goto(`/events/${updatedEvent.id}`);
  }

  function handleError(event: CustomEvent<ErrorDetail>) {
    const { message, details } = event.detail;
    console.error('Event update error:', message, details);

    let errorMsg = message;
    if (details && Array.isArray(details)) {
      errorMsg += '\n\nValidation errors:\n' + details.map(d => `• ${d.message}`).join('\n');
    }

    alert(errorMsg);
  }

  function handleCancel() {
    goto(`/events/${eventId}`);
  }
</script>

<svelte:head>
  <title>Edit Event{event ? ` - ${event.title}` : ''} - UnConf</title>
  <meta name="description" content="Edit event settings and configuration" />
</svelte:head>

<main class="edit-event-page">
  <div class="page-header">
    <h1>Edit Event</h1>
    {#if event}
      <p>Modify settings and configuration for "{event.title}"</p>
    {:else}
      <p>Update your event settings and constraints</p>
    {/if}
  </div>

  {#if isLoading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading event...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <h2>Error</h2>
      <p>{error}</p>
      <div class="error-actions">
        <button class="btn btn-secondary" on:click={() => goto('/')}>
          Go Home
        </button>
        <button class="btn btn-primary" on:click={loadEvent}>
          Try Again
        </button>
      </div>
    </div>
  {:else if !user}
    <div class="auth-required">
      <h2>Authentication Required</h2>
      <p>You need to be signed in to edit events.</p>
      <a href="/auth/signin" class="btn btn-primary">Sign In</a>
    </div>
  {:else if !event}
    <div class="not-found">
      <h2>Event Not Found</h2>
      <p>The event you're looking for doesn't exist or has been removed.</p>
      <button class="btn btn-primary" on:click={() => goto('/')}>
        Go Home
      </button>
    </div>
  {:else}
    <div class="form-container">
      <EventConfigurationForm
        mode="edit"
        {eventId}
        initialData={event}
        organizerId={user.id}
  organizerName={user.name ?? user.email ?? 'Anonymous'}
        on:eventSaved={handleEventSaved}
        on:error={handleError}
        on:cancel={handleCancel}
      />
    </div>
  {/if}
</main>

<style>
  .edit-event-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    padding: 2rem 1rem;
  }

  .page-header {
    text-align: center;
    margin-bottom: 3rem;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }

  .page-header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 1rem 0;
  }

  .page-header p {
    font-size: 1.125rem;
    color: #6b7280;
    margin: 0;
    line-height: 1.6;
  }

  .loading-state, .error-state, .auth-required, .not-found {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    gap: 1rem;
    text-align: center;
    padding: 2rem;
    background: white;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    max-width: 500px;
    margin: 0 auto;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  }

  .loading-state {
    min-height: 200px;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f4f6;
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-state h2, .auth-required h2, .not-found h2 {
    color: #1f2937;
    margin: 0 0 1rem 0;
  }

  .error-state p, .auth-required p, .not-found p {
    color: #6b7280;
    margin: 0 0 2rem 0;
  }

  .error-actions {
    display: flex;
    gap: 1rem;
  }

  .btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
  }

  .btn-secondary {
    background: #f9fafb;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .btn-secondary:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .form-container {
    max-width: 900px;
    margin: 0 auto;
  }

  @media (max-width: 768px) {
    .edit-event-page {
      padding: 1rem 0.5rem;
    }

    .page-header h1 {
      font-size: 2rem;
    }

    .page-header p {
      font-size: 1rem;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .error-actions {
      flex-direction: column;
    }
  }
</style>