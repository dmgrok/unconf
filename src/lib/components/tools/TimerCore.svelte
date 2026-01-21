<script lang="ts">
  import { onDestroy } from 'svelte';
  
  interface Props {
    /** Optional event context */
    eventId?: string;
    eventName?: string;
    /** Show back link */
    showBack?: boolean;
    /** Back link URL */
    backUrl?: string;
    /** Back link text */
    backText?: string;
    /** Show use cases section */
    showUseCases?: boolean;
    /** Display mode (fullscreen, hide controls) */
    displayMode?: boolean;
  }
  
  let { 
    eventId,
    eventName,
    showBack = true,
    backUrl = '/',
    backText = 'Back',
    showUseCases = false,
    displayMode = false
  }: Props = $props();
  
  // Timer state
  let minutes = $state(15);
  let seconds = $state(0);
  let label = $state('');
  let running = $state(false);
  let interval: ReturnType<typeof setInterval> | null = null;
  
  // Sound settings
  let enableSound = $state(true);
  let soundType = $state<'duck' | 'cat' | 'boat-horn' | 'custom'>('duck');
  let customSoundUrl = $state('');
  
  let totalSeconds = $derived(minutes * 60 + seconds);
  let display = $derived(formatTime(totalSeconds));
  let urgent = $derived(running && totalSeconds <= 60 && totalSeconds > 0);
  let done = $derived(running && totalSeconds === 0);
  
  // Sound URLs for different options
  const soundUrls = {
    'duck': 'https://assets.mixkit.co/active_storage/sfx/2377/2377-preview.mp3',
    'cat': 'https://assets.mixkit.co/active_storage/sfx/1643/1643-preview.mp3',
    'boat-horn': 'https://assets.mixkit.co/active_storage/sfx/2372/2372-preview.mp3',
  };
  
  function formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  
  function playSound() {
    if (!enableSound) return;
    
    const audioUrl = soundType === 'custom' ? customSoundUrl : soundUrls[soundType];
    if (!audioUrl) return;
    
    const audio = new Audio(audioUrl);
    audio.play().catch(err => console.error('Failed to play sound:', err));
  }
  
  function extendTime(mins: number) {
    minutes += mins;
    if (!running) {
      running = true;
      interval = setInterval(tick, 1000);
    }
  }
  
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
      playSound();
      stop();
    }
  }
  
  function stop() {
    running = false;
    if (interval) {
      clearInterval(interval);
      interval = null;
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
    const baseUrl = eventId 
      ? `${window.location.origin}/events/${eventId}/tools/timer`
      : `${window.location.origin}/tools/timer`;
    const url = `${baseUrl}?display=true`;
    navigator.clipboard.writeText(url);
    alert('Display link copied! Share this with participants to show the timer.');
  }
</script>

<main class:urgent class:done class:display-mode={displayMode}>
  {#if !displayMode}
    {#if showBack}
      <a href={backUrl} class="back">← {backText}</a>
    {/if}
  {/if}
  
  {#if label}
    <div class="label">{label}</div>
  {/if}
  
  <div class="timer">{display}</div>
  
  {#if done}
    <div class="done-message">Time's up!</div>
  {/if}
  
  {#if !displayMode}
    {#if showUseCases}
      <section class="use-cases">
        <h3>🎯 Common Use Cases</h3>
        <div class="use-case-grid">
          <div class="use-case-card">
            <span class="use-case-icon">🎤</span>
            <div class="use-case-content">
              <strong>Lightning Talks</strong>
              <span>5-10 min presentations with visible countdown</span>
            </div>
          </div>
          <div class="use-case-card">
            <span class="use-case-icon">💬</span>
            <div class="use-case-content">
              <strong>Breakout Sessions</strong>
              <span>Keep discussion groups on track</span>
            </div>
          </div>
          <div class="use-case-card">
            <span class="use-case-icon">☕</span>
            <div class="use-case-content">
              <strong>Break Countdown</strong>
              <span>Show when the session resumes</span>
            </div>
          </div>
          <div class="use-case-card">
            <span class="use-case-icon">🗳️</span>
            <div class="use-case-content">
              <strong>Voting Windows</strong>
              <span>Time-boxed voting or brainstorming</span>
            </div>
          </div>
        </div>
      </section>
      
      <div class="standalone-notice">
        <span>💡</span>
        <p>
          <strong>Standalone mode</strong> - 
          <a href="/create">Create an event</a> to share timer with participants automatically.
        </p>
      </div>
    {/if}
    
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
          
          <div class="sound-settings">
            <label class="sound-toggle">
              <input type="checkbox" bind:checked={enableSound} />
              <span>Play sound when timer ends</span>
            </label>
            
            {#if enableSound}
              <div class="sound-options">
                <label>
                  <input type="radio" bind:group={soundType} value="duck" />
                  🦆 Duck
                </label>
                <label>
                  <input type="radio" bind:group={soundType} value="cat" />
                  🐱 Cat
                </label>
                <label>
                  <input type="radio" bind:group={soundType} value="boat-horn" />
                  📢 Boat Horn
                </label>
                <label>
                  <input type="radio" bind:group={soundType} value="custom" />
                  🔗 Custom
                </label>
              </div>
              
              {#if soundType === 'custom'}
                <input 
                  type="url" 
                  bind:value={customSoundUrl} 
                  placeholder="Enter sound URL"
                  class="custom-sound-input"
                />
              {/if}
            {/if}
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
        
        {#if urgent || done}
          <div class="extend-controls">
            <span class="extend-label">Extend:</span>
            <button class="extend-btn" onclick={() => extendTime(1)}>+1 min</button>
            <button class="extend-btn" onclick={() => extendTime(5)}>+5 min</button>
            <button class="extend-btn" onclick={() => extendTime(10)}>+10 min</button>
          </div>
        {/if}
      {/if}
    </div>
  {/if}
  
  <button class="fullscreen-btn" onclick={fullscreen} title="Fullscreen">⛶</button>
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
  
  .standalone-notice {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    background: rgba(255,255,255,0.1);
    padding: 0.75rem 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    max-width: 400px;
    text-align: center;
  }
  
  .standalone-notice span {
    font-size: 1rem;
  }
  
  .standalone-notice p {
    margin: 0;
    font-size: 0.8rem;
    opacity: 0.9;
  }
  
  .standalone-notice a {
    color: #93c5fd;
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
  
  .sound-settings {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(255,255,255,0.05);
    border-radius: 8px;
  }
  
  .sound-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
  }
  
  .sound-toggle input {
    cursor: pointer;
  }
  
  .sound-options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding-left: 1.5rem;
  }
  
  .sound-options label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
    cursor: pointer;
  }
  
  .sound-options input {
    cursor: pointer;
  }
  
  .custom-sound-input {
    width: 100%;
    padding: 0.5rem;
    font-size: 0.875rem;
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 6px;
    background: rgba(255,255,255,0.1);
    color: white;
  }
  
  .custom-sound-input::placeholder {
    color: rgba(255,255,255,0.5);
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
  
  .extend-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    justify-content: center;
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgba(255,255,255,0.1);
    border-radius: 8px;
  }
  
  .extend-label {
    font-size: 0.875rem;
    opacity: 0.8;
    margin-right: 0.25rem;
  }
  
  .extend-btn {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    background: rgba(255,255,255,0.2);
    color: white;
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .extend-btn:hover {
    background: rgba(255,255,255,0.3);
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
  
  .display-mode .standalone-notice {
    display: none;
  }
  
  /* Use Cases Section */
  .use-cases {
    max-width: 400px;
    margin-bottom: 1rem;
  }
  
  .use-cases h3 {
    font-size: 0.9rem;
    margin: 0 0 0.75rem;
    opacity: 0.9;
    text-align: center;
  }
  
  .use-case-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
  
  .use-case-card {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 8px;
  }
  
  .use-case-icon {
    font-size: 1rem;
    flex-shrink: 0;
  }
  
  .use-case-content {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }
  
  .use-case-content strong {
    font-size: 0.75rem;
    color: white;
  }
  
  .use-case-content span {
    font-size: 0.65rem;
    opacity: 0.8;
  }
  
  @media (max-width: 480px) {
    .use-case-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
