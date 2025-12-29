<script lang="ts">
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import type { Event } from '$lib/types/tools';
  
  let event = $state<Event | null>(null);
  let isLoading = $state(true);
  let error = $state('');
  
  // Timer state
  let minutes = $state(15);
  let seconds = $state(0);
  let label = $state('');
  let running = $state(false);
  let interval: ReturnType<typeof setInterval> | null = null;
  
  let eventId = $derived($page.params.eventId);
  let totalSeconds = $derived(minutes * 60 + seconds);
  let display = $derived(formatTime(totalSeconds));
  let urgent = $derived(running && totalSeconds <= 60 && totalSeconds > 0);
  let done = $derived(running && totalSeconds === 0);
  let displayMode = $derived($page.url.searchParams.get('display') === 'true');
  
  function formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  
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
  
  onDestroy(() => {
    if (interval) clearInterval(interval);
  });
  
  function start() {
    if (totalSeconds <= 0) return;
    running = true;
    interval = setInterval(tick, 1000);
  }
  
  function tick() {
    if (totalSeconds > 0) {
      if (seconds > 0) {
        seconds--;
      } else {
        minutes--;
        seconds = 59;
      }
    } else {
      stop();
    }
  }
  
  function pause() {
    running = false;
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }
  
  function reset() {
    pause();
    minutes = 15;
    seconds = 0;
  }
  
  function setPreset(mins: number) {
    pause();
    minutes = mins;
    seconds = 0;
  }
  
  function fullscreen() {
    document.documentElement.requestFullscreen?.();
  }
  
  function shareDisplayLink() {
    const url = `${window.location.origin}/events/${eventId}/tools/timer?display=true`;
    navigator.clipboard.writeText(url);
    alert('Display link copied! Share this with participants to show the timer.');
  }
</script>

<svelte:head>
  <title>{label || 'Timer'} - {event?.name || 'Event'}</title>
</svelte:head>

<main class:urgent class:done class:display-mode={displayMode}>
  {#if isLoading}
    <div class="loading-overlay">
      <p>Loading...</p>
    </div>
  {:else if error}
    <div class="error-overlay">
      <p>{error}</p>
      <a href="/">← Home</a>
    </div>
  {:else}
    {#if !displayMode}
      <a href="/events/{eventId}" class="back">← {event?.name}</a>
    {/if}
    
    {#if label}
      <div class="label">{label}</div>
    {/if}
    
    <div class="timer">{display}</div>
    
    {#if done}
      <div class="done-message">Time's up!</div>
    {/if}
    
    {#if !displayMode}
      <div class="controls-wrapper">
        {#if !running}
          <div class="setup">
            <input 
              type="text" 
              bind:value={label} 
              placeholder="Session label (optional)"
              class="label-input"
            />
            
            <div class="presets">
              <button class="preset" onclick={() => setPreset(5)}>5 min</button>
              <button class="preset" onclick={() => setPreset(10)}>10 min</button>
              <button class="preset" onclick={() => setPreset(15)}>15 min</button>
              <button class="preset" onclick={() => setPreset(25)}>25 min</button>
              <button class="preset" onclick={() => setPreset(45)}>45 min</button>
            </div>
            
            <div class="time-input">
              <label>
                <span>Minutes</span>
                <input type="number" bind:value={minutes} min="0" max="180" />
              </label>
            </div>
            
            <div class="action-buttons">
              <button class="start-btn" onclick={start} disabled={totalSeconds <= 0}>
                ▶ Start
              </button>
              <button class="share-btn" onclick={shareDisplayLink}>
                🔗 Share Display
              </button>
            </div>
          </div>
        {:else}
          <div class="running-controls">
            <button class="pause-btn" onclick={pause}>⏸ Pause</button>
            <button class="reset-btn" onclick={reset}>↺ Reset</button>
          </div>
        {/if}
      </div>
    {/if}
    
    <button class="fullscreen-btn" onclick={fullscreen} title="Fullscreen">⛶</button>
  {/if}
</main>

<style>
  main {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #1a1a2e;
    color: white;
    font-family: system-ui, -apple-system, sans-serif;
    transition: background 0.5s;
    padding: 1rem;
    position: relative;
  }
  
  main.urgent {
    background: #b91c1c;
  }
  
  main.done {
    background: #15803d;
  }
  
  .loading-overlay, .error-overlay {
    text-align: center;
  }
  
  .error-overlay a {
    color: rgba(255,255,255,0.8);
  }
  
  .back {
    position: fixed;
    top: 1rem;
    left: 1rem;
    color: rgba(255,255,255,0.7);
    text-decoration: none;
    font-size: 0.875rem;
    z-index: 10;
  }
  
  .back:hover {
    color: white;
  }
  
  .label {
    font-size: clamp(1rem, 4vw, 2rem);
    opacity: 0.8;
    margin-bottom: 0.5rem;
    text-align: center;
  }
  
  .timer {
    font-size: clamp(5rem, 25vw, 18rem);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    letter-spacing: -0.02em;
  }
  
  .done-message {
    font-size: clamp(1.5rem, 5vw, 3rem);
    margin-top: 1rem;
    animation: pulse 1s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  .controls-wrapper {
    margin-top: 2rem;
    width: 100%;
    max-width: 400px;
  }
  
  .setup {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  
  .label-input {
    width: 100%;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    border: none;
    border-radius: 8px;
    text-align: center;
    background: rgba(255,255,255,0.95);
  }
  
  .presets {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .preset {
    padding: 0.5rem 1rem;
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.3);
    color: white;
    border-radius: 20px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .preset:hover {
    background: rgba(255,255,255,0.25);
  }
  
  .time-input {
    display: flex;
    gap: 1rem;
  }
  
  .time-input label {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }
  
  .time-input span {
    font-size: 0.75rem;
    opacity: 0.7;
  }
  
  .time-input input {
    width: 80px;
    padding: 0.5rem;
    font-size: 1.5rem;
    text-align: center;
    border: none;
    border-radius: 8px;
  }
  
  .action-buttons {
    display: flex;
    gap: 0.75rem;
    width: 100%;
  }
  
  .start-btn {
    flex: 1;
    padding: 1rem 2rem;
    font-size: 1.25rem;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
  }
  
  .start-btn:hover:not(:disabled) {
    background: #059669;
  }
  
  .start-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .share-btn {
    padding: 1rem;
    font-size: 1rem;
    background: rgba(255,255,255,0.15);
    color: white;
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 10px;
    cursor: pointer;
  }
  
  .share-btn:hover {
    background: rgba(255,255,255,0.25);
  }
  
  .running-controls {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }
  
  .pause-btn, .reset-btn {
    padding: 1rem 2rem;
    font-size: 1.25rem;
    background: rgba(255,255,255,0.2);
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
  }
  
  .pause-btn:hover, .reset-btn:hover {
    background: rgba(255,255,255,0.3);
  }
  
  .fullscreen-btn {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    padding: 0.75rem;
    font-size: 1.5rem;
    background: rgba(255,255,255,0.1);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    z-index: 10;
  }
  
  .fullscreen-btn:hover {
    background: rgba(255,255,255,0.2);
  }
  
  /* Display mode - hide controls */
  .display-mode .controls-wrapper {
    display: none;
  }
  
  .display-mode .back {
    display: none;
  }
</style>
