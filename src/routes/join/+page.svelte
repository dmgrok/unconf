<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { generateId, type Participant } from '$lib/types/tools';
  
  let code = $state('');
  let name = $state('');
  let email = $state('');
  let isJoining = $state(false);
  let error = $state('');
  let eventName = $state('');
  let eventFound = $state(false);
  let isLookingUp = $state(false);
  
  // Get code from URL if present
  onMount(() => {
    const urlCode = $page.url.searchParams.get('code');
    if (urlCode) {
      code = urlCode.toUpperCase();
      lookupEvent();
    }
  });
  
  async function lookupEvent() {
    if (code.length < 4) {
      eventFound = false;
      eventName = '';
      return;
    }
    
    isLookingUp = true;
    try {
      const response = await fetch(`/api/tools/events/lookup?code=${code.toUpperCase()}`);
      if (response.ok) {
        const data = await response.json();
        if (data.event) {
          eventFound = true;
          eventName = data.event.name;
        } else {
          eventFound = false;
          eventName = '';
        }
      } else {
        eventFound = false;
        eventName = '';
      }
    } catch {
      eventFound = false;
    }
    isLookingUp = false;
  }
  
  function handleCodeInput(e: Event) {
    const target = e.target as HTMLInputElement;
    code = target.value.toUpperCase();
    // Debounce lookup
    clearTimeout((window as any).__lookupTimeout);
    (window as any).__lookupTimeout = setTimeout(lookupEvent, 300);
  }
  
  async function handleJoin(e: SubmitEvent) {
    e.preventDefault();
    
    if (!code.trim()) {
      error = 'Please enter an event code';
      return;
    }
    
    if (!name.trim()) {
      error = 'Please enter your name';
      return;
    }
    
    isJoining = true;
    error = '';
    
    try {
      // First, look up the event by code
      const lookupResponse = await fetch(`/api/tools/events/lookup?code=${code.toUpperCase()}`);
      if (!lookupResponse.ok) {
        error = 'Event not found. Check the code and try again.';
        isJoining = false;
        return;
      }
      
      const { event } = await lookupResponse.json();
      if (!event) {
        error = 'Event not found. Check the code and try again.';
        isJoining = false;
        return;
      }
      
      // Create participant
      const participantId = generateId();
      const participant: Participant = {
        id: participantId,
        eventId: event.id,
        name: name.trim(),
        email: email.trim() || undefined,
        role: 'participant',
        checkedIn: true,
        joinedAt: new Date().toISOString(),
      };
      
      // Add participant to event
      const joinResponse = await fetch(`/api/tools/events/${event.id}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(participant),
      });
      
      if (!joinResponse.ok) {
        error = 'Failed to join event. Please try again.';
        isJoining = false;
        return;
      }
      
      // Store participant info in session
      sessionStorage.setItem(`event_${event.id}_participant`, JSON.stringify(participant));
      
      // Navigate to event
      goto(`/events/${event.id}`);
    } catch (err) {
      error = 'Something went wrong. Please try again.';
      isJoining = false;
    }
  }
</script>

<svelte:head>
  <title>Join Event - Event Tools Lab</title>
</svelte:head>

<main>
  <a href="/" class="back">← Back</a>
  
  <header>
    <h1>🎟️ Join Event</h1>
    <p>Enter the code shared by your event organizer</p>
  </header>
  
  <form onsubmit={handleJoin}>
    {#if error}
      <div class="error-banner">{error}</div>
    {/if}
    
    <div class="form-group">
      <label for="code">Event Code *</label>
      <input 
        id="code"
        type="text" 
        value={code}
        oninput={handleCodeInput}
        placeholder="e.g., ABCDEF"
        required
        maxlength="10"
        autocomplete="off"
        class="code-input"
      />
      {#if isLookingUp}
        <span class="hint looking">Looking up event...</span>
      {:else if eventFound}
        <span class="hint found">✓ Found: {eventName}</span>
      {:else if code.length >= 4}
        <span class="hint not-found">Event not found</span>
      {/if}
    </div>
    
    <hr />
    
    <div class="form-group">
      <label for="name">Your Name *</label>
      <input 
        id="name"
        type="text" 
        bind:value={name}
        placeholder="How should others see you?"
        required
        maxlength="50"
      />
    </div>
    
    <div class="form-group">
      <label for="email">Email <span class="optional">(optional)</span></label>
      <input 
        id="email"
        type="email" 
        bind:value={email}
        placeholder="Only for account recovery"
      />
    </div>
    
    <button type="submit" class="join-btn" disabled={isJoining || !eventFound}>
      {#if isJoining}
        Joining...
      {:else}
        Join Event
      {/if}
    </button>
  </form>
</main>

<style>
  main {
    max-width: 400px;
    margin: 0 auto;
    padding: 2rem 1rem;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  .back {
    color: #6b7280;
    text-decoration: none;
    font-size: 0.875rem;
  }
  
  header {
    margin: 1.5rem 0 2rem;
  }
  
  h1 {
    font-size: 1.75rem;
    margin: 0 0 0.5rem;
  }
  
  header p {
    color: #6b7280;
    margin: 0;
  }
  
  form {
    background: #f8fafc;
    padding: 1.5rem;
    border-radius: 12px;
  }
  
  .error-banner {
    background: #fee2e2;
    color: #b91c1c;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }
  
  .form-group {
    margin-bottom: 1.25rem;
  }
  
  label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }
  
  .optional {
    color: #9ca3af;
    font-weight: 400;
  }
  
  input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }
  
  input:focus {
    outline: none;
    border-color: #2563eb;
  }
  
  .code-input {
    text-transform: uppercase;
    letter-spacing: 0.15em;
    font-family: monospace;
    font-size: 1.25rem;
    text-align: center;
  }
  
  .hint {
    display: block;
    font-size: 0.75rem;
    margin-top: 0.375rem;
  }
  
  .hint.looking {
    color: #6b7280;
  }
  
  .hint.found {
    color: #059669;
  }
  
  .hint.not-found {
    color: #dc2626;
  }
  
  hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 1.5rem 0;
  }
  
  .join-btn {
    width: 100%;
    padding: 1rem;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  
  .join-btn:hover:not(:disabled) {
    opacity: 0.9;
  }
  
  .join-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
