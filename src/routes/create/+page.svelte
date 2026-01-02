<script lang="ts">
  import { goto } from '$app/navigation';
  import { generateEventCode, generateId, DEFAULT_TOOLS, type Event, type Participant } from '$lib/types/tools';
  
  let name = $state('');
  let description = $state('');
  let organizerName = $state('');
  let organizerEmail = $state('');
  let isSubmitting = $state(false);
  let error = $state('');
  
  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    
    if (!name.trim() || !organizerName.trim()) {
      error = 'Event name and your name are required';
      return;
    }
    
    isSubmitting = true;
    error = '';
    
    try {
      const eventId = generateId();
      const code = generateEventCode();
      const organizerId = generateId();
      
      const event: Event = {
        id: eventId,
        code,
        name: name.trim(),
        description: description.trim() || undefined,
        createdAt: new Date().toISOString(),
        createdBy: organizerId,
        tools: { ...DEFAULT_TOOLS },
        status: 'active',
      };
      
      const organizer: Participant = {
        id: organizerId,
        eventId,
        name: organizerName.trim(),
        email: organizerEmail.trim() || undefined,
        role: 'organizer',
        checkedIn: true,
        joinedAt: new Date().toISOString(),
      };
      
      // Create event via API
      const response = await fetch('/api/tools/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, organizer }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create event');
      }
      
      const { event: createdEvent } = await response.json();
      
      // Store organizer info in session storage for this event
      sessionStorage.setItem(`event_${eventId}_participant`, JSON.stringify(organizer));
      
      // Navigate to the event hub
      goto(`/events/${createdEvent.id}`);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Something went wrong';
      isSubmitting = false;
    }
  }
</script>

<svelte:head>
  <title>Create Event - unconf tools Lab</title>
</svelte:head>

<main>
  <a href="/" class="back">← Back</a>
  
  <header>
    <h1>✨ Create Event</h1>
    <p>Get a shareable code in seconds. No signup required.</p>
  </header>
  
  <form onsubmit={handleSubmit}>
    {#if error}
      <div class="error-banner">{error}</div>
    {/if}
    
    <div class="form-group">
      <label for="name">Event Name *</label>
      <input 
        id="name"
        type="text" 
        bind:value={name}
        placeholder="e.g., Team Retrospective, Workshop Day 1"
        required
        maxlength="100"
      />
    </div>
    
    <div class="form-group">
      <label for="description">Description <span class="optional">(optional)</span></label>
      <textarea 
        id="description"
        bind:value={description}
        placeholder="Brief description of your event..."
        rows="3"
        maxlength="500"
      ></textarea>
    </div>
    
    <hr />
    
    <div class="form-group">
      <label for="organizerName">Your Name *</label>
      <input 
        id="organizerName"
        type="text" 
        bind:value={organizerName}
        placeholder="How should participants see you?"
        required
        maxlength="50"
      />
    </div>
    
    <div class="form-group">
      <label for="organizerEmail">Your Email <span class="optional">(optional)</span></label>
      <input 
        id="organizerEmail"
        type="email" 
        bind:value={organizerEmail}
        placeholder="For event recovery if needed"
      />
      <span class="hint">We don't send any emails. This is only for account recovery.</span>
    </div>
    
    <button type="submit" class="submit-btn" disabled={isSubmitting}>
      {#if isSubmitting}
        Creating...
      {:else}
        Create Event
      {/if}
    </button>
  </form>
  
  <div class="info-box">
    <h3>What happens next?</h3>
    <ul>
      <li>You'll get a <strong>6-letter code</strong> to share with participants</li>
      <li>Participants join instantly - no signup needed</li>
      <li>You can enable/disable tools as needed</li>
    </ul>
  </div>
</main>

<style>
  main {
    max-width: 500px;
    margin: 0 auto;
    padding: 2rem 1rem;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  .back {
    color: #a1a1aa;
    text-decoration: none;
    font-size: 0.875rem;
  }
  
  .back:hover {
    color: #e4e4e7;
  }
  
  header {
    margin: 1.5rem 0 2rem;
  }
  
  h1 {
    font-size: 1.75rem;
    margin: 0 0 0.5rem;
    color: #e4e4e7;
  }
  
  header p {
    color: #a1a1aa;
    margin: 0;
  }
  
  form {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 1.5rem;
    border-radius: 12px;
  }
  
  .error-banner {
    background: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    font-size: 0.875rem;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
  
  .form-group {
    margin-bottom: 1.25rem;
  }
  
  label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    color: #e4e4e7;
  }
  
  .optional {
    color: #71717a;
    font-weight: 400;
  }
  
  input, textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s;
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.05);
    color: #e4e4e7;
  }
  
  input::placeholder, textarea::placeholder {
    color: #71717a;
  }
  
  input:focus, textarea:focus {
    outline: none;
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.1);
  }
  
  textarea {
    resize: vertical;
    min-height: 80px;
  }
  
  .hint {
    display: block;
    font-size: 0.75rem;
    color: #71717a;
    margin-top: 0.25rem;
  }
  
  hr {
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    margin: 1.5rem 0;
  }
  
  .submit-btn {
    width: 100%;
    padding: 1rem;
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  
  .submit-btn:hover:not(:disabled) {
    opacity: 0.9;
  }
  
  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .info-box {
    margin-top: 2rem;
    padding: 1.25rem;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 10px;
  }
  
  .info-box h3 {
    font-size: 0.875rem;
    margin: 0 0 0.75rem;
    color: #4ade80;
  }
  
  .info-box ul {
    margin: 0;
    padding-left: 1.25rem;
    font-size: 0.875rem;
    color: #86efac;
  }
  
  .info-box li {
    margin-bottom: 0.5rem;
  }
  
  .info-box li:last-child {
    margin-bottom: 0;
  }
</style>