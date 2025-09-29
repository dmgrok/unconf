<script lang="ts">
  import { goto } from '$app/navigation';
  import { authStore, type AuthUser } from '$lib/stores/auth';
  import EventConfigurationForm from '$lib/components/EventConfigurationForm.svelte';
  import { onMount } from 'svelte';

  type EventSavedDetail = { event: { id: string; title: string; accessCode?: string } };
  type ErrorDetail = { message: string; details?: Array<{ message: string }> };

  let isLoading = true;
  let user: AuthUser | null = null;

  onMount(async () => {
    await authStore.initialize();
    user = authStore.getUser();
    isLoading = false;
  });

  function handleEventCreated(event: CustomEvent<EventSavedDetail>) {
    const { event: newEvent } = event.detail;

    alert(`Event "${newEvent.title}" created successfully!${newEvent.accessCode ? ` Access code: ${newEvent.accessCode}` : ''}`);
    goto(`/events/${newEvent.id}`);
  }

  function handleError(event: CustomEvent<ErrorDetail>) {
    const { message, details } = event.detail;

    let errorMsg = message;
    if (details && Array.isArray(details) && details.length) {
      errorMsg += '\n\nValidation errors:\n' + details.map(d => `• ${d.message}`).join('\n');
    }

    alert(errorMsg);
  }

  function handleCancel() {
    goto('/');
  }
</script>

<svelte:head>
  <title>Create Event - UnConf</title>
  <meta name="description" content="Create a new unconference event with custom settings and constraints" />
</svelte:head>

<main class="create-event-page">
  <div class="page-header">
    <h1>Create New Event</h1>
    <p>Set up your unconference with custom settings, voting rules, and participant constraints</p>
  </div>

  {#if isLoading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  {:else if !user}
    <div class="auth-required">
      <h2>Authentication Required</h2>
      <p>You need to be signed in to create an event.</p>
      <a href="/auth/signin" class="btn btn-primary">Sign In</a>
    </div>
  {:else}
    <div class="form-container">
      <EventConfigurationForm
        mode="create"
        organizerId={user.id}
  organizerName={user.name ?? user.email ?? 'Anonymous'}
        on:eventSaved={handleEventCreated}
        on:error={handleError}
        on:cancel={handleCancel}
      />
    </div>
  {/if}
</main>

<style>
  .create-event-page {
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

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    gap: 1rem;
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

  .auth-required {
    text-align: center;
    padding: 3rem 2rem;
    background: white;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    max-width: 400px;
    margin: 0 auto;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  }

  .auth-required h2 {
    color: #1f2937;
    margin: 0 0 1rem 0;
  }

  .auth-required p {
    color: #6b7280;
    margin: 0 0 2rem 0;
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

  .form-container {
    max-width: 900px;
    margin: 0 auto;
  }

  @media (max-width: 768px) {
    .create-event-page {
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
  }
</style>
