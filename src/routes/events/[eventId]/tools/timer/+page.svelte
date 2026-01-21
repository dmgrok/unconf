<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import TimerCore from '$lib/components/tools/TimerCore.svelte';
  import type { Event } from '$lib/types/tools';
  
  let event = $state<Event | null>(null);
  let isLoading = $state(true);
  let error = $state('');
  
  let eventId = $derived($page.params.eventId);
  let displayMode = $derived($page.url.searchParams.get('display') === 'true');
  
  onMount(async () => {
    try {
      const response = await fetch(`/api/tools/events/${eventId}`);
      if (!response.ok) {
        error = 'Event not found';
        isLoading = false;
        return;
      }
      
      const data = await response.json();
      event = data.event;
      isLoading = false;
    } catch (err) {
      error = 'Failed to load event';
      isLoading = false;
    }
  });
</script>

<svelte:head>
  <title>Timer - {event?.name || 'Event'}</title>
</svelte:head>

{#if isLoading}
  <div class="loading-overlay">
    <p>Loading...</p>
  </div>
{:else if error}
  <div class="error-overlay">
    <p>{error}</p>
    <a href="/">← Home</a>
  </div>
{:else if event}
  <TimerCore 
    {eventId}
    eventName={event.name}
    showBack={true}
    backUrl="/events/{eventId}"
    backText="← {event.name}"
    showUseCases={false}
    {displayMode}
  />
{/if}

<style>
  .loading-overlay, .error-overlay {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #1a1a2e;
    color: white;
    text-align: center;
  }
  
  .error-overlay a {
    color: rgba(255,255,255,0.8);
    margin-top: 1rem;
  }
</style>
