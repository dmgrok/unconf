<script lang="ts">
  import { TOOL_INFO, type ToolId } from '$lib/types/tools';
  
  let joinCode = $state('');
  
  const tools: { id: ToolId; status: 'live' | 'coming' }[] = [
    { id: 'shuffler', status: 'live' },
    { id: 'timer', status: 'live' },
    { id: 'poll', status: 'live' },
    { id: 'survey', status: 'live' },
    { id: 'checkin', status: 'coming' },
  ];
</script>

<svelte:head>
  <title>Event Tools Lab - Simple tools for professional events</title>
  <meta name="description" content="Community-driven micro-tools for professional events. Team shuffler, session timer, quick polls, and more." />
</svelte:head>

<main>
  <header>
    <h1>🧪 Event Tools Lab</h1>
    <p class="tagline">Simple tools for professional events</p>
    <p class="subtitle">Community-driven • AI-assisted • Free to use</p>
  </header>
  
  <section class="actions">
    <a href="/create" class="btn primary">
      <span class="btn-icon">✨</span>
      Create Event
    </a>
    
    <div class="divider">
      <span>or join an existing event</span>
    </div>
    
    <form action="/join" method="GET" class="join-form">
      <input 
        type="text" 
        name="code" 
        bind:value={joinCode}
        placeholder="Enter event code"
        maxlength="10"
        autocomplete="off"
        style="text-transform: uppercase;"
      />
      <button type="submit" disabled={!joinCode.trim()}>Join</button>
    </form>
  </section>
  
  <section class="tools-preview">
    <h2>Available Tools</h2>
    <p class="tools-intro">Use standalone or connect to an event for participant sharing.</p>
    
    <div class="tools-grid">
      {#each tools as tool}
        {@const info = TOOL_INFO[tool.id]}
        {#if tool.status === 'live'}
          <a href="/tools/{tool.id}" class="tool-card">
            <span class="tool-emoji">{info.emoji}</span>
            <h3>{info.name}</h3>
            <p>{info.description}</p>
            <span class="try-now">Try it →</span>
          </a>
        {:else}
          <div class="tool-card coming">
            <span class="tool-emoji">{info.emoji}</span>
            <h3>{info.name}</h3>
            <p>{info.description}</p>
            <span class="badge">Coming Soon</span>
          </div>
        {/if}
      {/each}
    </div>
  </section>
  
  <section class="cta">
    <h2>Need a different tool?</h2>
    <p>This project is built entirely from community requests.</p>
    <a href="https://github.com/dmgrok/unconf/issues/new?template=tool-request.yml" class="request-btn">
      📬 Request a Tool
    </a>
  </section>
  
  <section class="how-it-works">
    <h2>How It Works</h2>
    <div class="steps">
      <div class="step">
        <span class="step-number">1</span>
        <h3>Create Event</h3>
        <p>Get a shareable code in seconds</p>
      </div>
      <div class="step">
        <span class="step-number">2</span>
        <h3>Share Code</h3>
        <p>Participants join with no signup</p>
      </div>
      <div class="step">
        <span class="step-number">3</span>
        <h3>Use Tools</h3>
        <p>Shuffle teams, run polls, time sessions</p>
      </div>
    </div>
  </section>
  
  <footer>
    <p>
      Built with SvelteKit • AI-assisted by Claude • 
      <a href="https://github.com/dmgrok/unconf">GitHub</a>
    </p>
  </footer>
</main>

<style>
  main {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 1rem;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  header {
    text-align: center;
    margin-bottom: 3rem;
  }
  
  h1 {
    font-size: 2.5rem;
    margin: 0 0 0.5rem;
    font-weight: 700;
  }
  
  .tagline {
    font-size: 1.25rem;
    color: #4b5563;
    margin: 0 0 0.5rem;
  }
  
  .subtitle {
    font-size: 0.875rem;
    color: #9ca3af;
    margin: 0;
  }
  
  /* Actions Section */
  .actions {
    background: #f8fafc;
    padding: 2rem;
    border-radius: 16px;
    margin-bottom: 3rem;
  }
  
  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem 2rem;
    border-radius: 12px;
    text-decoration: none;
    font-weight: 600;
    font-size: 1.125rem;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .btn.primary {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    color: white;
    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
  }
  
  .btn.primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
  }
  
  .btn-icon {
    font-size: 1.25rem;
  }
  
  .divider {
    display: flex;
    align-items: center;
    margin: 1.5rem 0;
    color: #9ca3af;
    font-size: 0.875rem;
  }
  
  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e5e7eb;
  }
  
  .divider span {
    padding: 0 1rem;
  }
  
  .join-form {
    display: flex;
    gap: 0.75rem;
  }
  
  .join-form input {
    flex: 1;
    padding: 0.875rem 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 10px;
    font-size: 1rem;
    text-align: center;
    letter-spacing: 0.1em;
    transition: border-color 0.2s;
  }
  
  .join-form input:focus {
    outline: none;
    border-color: #2563eb;
  }
  
  .join-form input::placeholder {
    text-transform: none;
    letter-spacing: normal;
  }
  
  .join-form button {
    padding: 0.875rem 1.5rem;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .join-form button:hover:not(:disabled) {
    background: #059669;
  }
  
  .join-form button:disabled {
    background: #d1d5db;
    cursor: not-allowed;
  }
  
  /* Tools Preview */
  .tools-preview {
    margin-bottom: 3rem;
  }
  
  .tools-preview h2 {
    text-align: center;
    font-size: 1.5rem;
    margin: 0 0 0.5rem;
  }
  
  .tools-intro {
    text-align: center;
    color: #6b7280;
    margin: 0 0 1.5rem;
  }
  
  .tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
  }
  
  .tool-card {
    display: block;
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    text-align: center;
    border: 1px solid #e5e7eb;
    position: relative;
    transition: transform 0.2s, box-shadow 0.2s;
    text-decoration: none;
    color: inherit;
  }
  
  a.tool-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border-color: #2563eb;
  }
  
  .tool-card.coming {
    opacity: 0.6;
  }
  
  .tool-emoji {
    font-size: 2.5rem;
    display: block;
    margin-bottom: 0.5rem;
  }
  
  .tool-card h3 {
    font-size: 1rem;
    margin: 0 0 0.25rem;
    font-weight: 600;
  }
  
  .tool-card p {
    font-size: 0.8rem;
    color: #6b7280;
    margin: 0;
    line-height: 1.4;
  }
  
  .badge {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: #fef3c7;
    color: #92400e;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.65rem;
    font-weight: 600;
  }
  
  .try-now {
    display: block;
    margin-top: 0.75rem;
    font-size: 0.8rem;
    color: #2563eb;
    font-weight: 500;
  }
  
  /* CTA Section */
  .cta {
    text-align: center;
    padding: 2.5rem 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    color: white;
    margin-bottom: 3rem;
  }
  
  .cta h2 {
    margin: 0 0 0.5rem;
    font-size: 1.5rem;
  }
  
  .cta p {
    margin: 0 0 1.25rem;
    opacity: 0.9;
  }
  
  .request-btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background: white;
    color: #764ba2;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    transition: transform 0.2s;
  }
  
  .request-btn:hover {
    transform: scale(1.05);
  }
  
  /* How It Works */
  .how-it-works {
    margin-bottom: 3rem;
  }
  
  .how-it-works h2 {
    text-align: center;
    font-size: 1.5rem;
    margin: 0 0 1.5rem;
  }
  
  .steps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }
  
  .step {
    text-align: center;
  }
  
  .step-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    background: #2563eb;
    color: white;
    border-radius: 50%;
    font-weight: 700;
    font-size: 1.125rem;
    margin-bottom: 0.75rem;
  }
  
  .step h3 {
    font-size: 1rem;
    margin: 0 0 0.25rem;
  }
  
  .step p {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }
  
  /* Footer */
  footer {
    text-align: center;
    padding-top: 2rem;
    border-top: 1px solid #e5e7eb;
    color: #9ca3af;
    font-size: 0.875rem;
  }
  
  footer a {
    color: #2563eb;
  }
  
  /* Responsive */
  @media (max-width: 640px) {
    h1 {
      font-size: 2rem;
    }
    
    .actions {
      padding: 1.5rem;
    }
    
    .join-form {
      flex-direction: column;
    }
    
    .join-form button {
      width: 100%;
    }
    
    .steps {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    
    .tools-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
