<script lang="ts">
  import { TOOL_INFO, type ToolId } from '$lib/types/tools';
  
  const tools: { id: ToolId; status: 'live' | 'coming'; standalone: boolean }[] = [
    { id: 'shuffler', status: 'live', standalone: true },
    { id: 'timer', status: 'live', standalone: true },
    { id: 'poll', status: 'live', standalone: true },
    { id: 'survey', status: 'live', standalone: true },
    { id: 'checkin', status: 'coming', standalone: false },
  ];
</script>

<svelte:head>
  <title>Tools - unconf tools Lab</title>
  <meta name="description" content="Free unconf tools: Team Shuffler, Session Timer, Quick Polls, and more." />
</svelte:head>

<main>
  <header>
    <a href="/" class="back">← unconf tools Lab</a>
    <h1>🧰 All Tools</h1>
    <p class="subtitle">Free unconf tools - use standalone or with an event</p>
  </header>
  
  <div class="mode-toggle">
    <div class="mode-option">
      <h3>🚀 Standalone Mode</h3>
      <p>Use tools directly without creating an event. Great for quick one-off needs.</p>
    </div>
    <div class="mode-option">
      <h3>📋 Event Mode</h3>
      <p><a href="/create">Create an event</a> to share tools with participants and track data together.</p>
    </div>
  </div>
  
  <section class="tools-list">
    {#each tools as tool}
      {@const info = TOOL_INFO[tool.id]}
      {#if tool.status === 'live'}
        <a href="/tools/{tool.id}" class="tool-row">
          <span class="tool-emoji">{info.emoji}</span>
          <div class="tool-info">
            <h2>{info.name}</h2>
            <p>{info.description}</p>
          </div>
          <span class="arrow">→</span>
        </a>
      {:else}
        <div class="tool-row coming">
          <span class="tool-emoji">{info.emoji}</span>
          <div class="tool-info">
            <h2>{info.name}</h2>
            <p>{info.description}</p>
          </div>
          <span class="badge">Coming Soon</span>
        </div>
      {/if}
    {/each}
  </section>
  
  <section class="cta">
    <h2>Need a different tool?</h2>
    <p>This project is community-driven. Request what you need!</p>
    <a href="https://github.com/dmgrok/unconf/issues/new?template=tool-request.yml" class="request-btn">
      📬 Request a Tool
    </a>
  </section>
</main>

<style>
  main {
    max-width: 600px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
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
    margin-bottom: 2rem;
  }
  
  h1 {
    font-size: 1.75rem;
    margin: 1rem 0 0.25rem;
    color: #e4e4e7;
  }
  
  .subtitle {
    color: #a1a1aa;
    margin: 0;
  }
  
  .mode-toggle {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .mode-option {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 1rem;
    border-radius: 10px;
  }
  
  .mode-option h3 {
    font-size: 0.9rem;
    margin: 0 0 0.5rem;
    color: #e4e4e7;
  }
  
  .mode-option p {
    font-size: 0.8rem;
    color: #a1a1aa;
    margin: 0;
    line-height: 1.4;
  }
  
  .mode-option a {
    color: #60a5fa;
  }
  
  .tools-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 2rem;
  }
  
  .tool-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.2s, background 0.2s;
  }
  
  a.tool-row:hover {
    border-color: rgba(99, 102, 241, 0.5);
    background: rgba(99, 102, 241, 0.1);
  }
  
  .tool-row.coming {
    opacity: 0.6;
  }
  
  .tool-emoji {
    font-size: 2rem;
    flex-shrink: 0;
  }
  
  .tool-info {
    flex: 1;
  }
  
  .tool-info h2 {
    font-size: 1.1rem;
    margin: 0 0 0.25rem;
    color: #e4e4e7;
  }
  
  .tool-info p {
    font-size: 0.85rem;
    color: #a1a1aa;
    margin: 0;
  }
  
  .arrow {
    font-size: 1.25rem;
    color: #6366f1;
  }
  
  .badge {
    background: rgba(251, 191, 36, 0.15);
    color: #fbbf24;
    padding: 0.25rem 0.75rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .cta {
    text-align: center;
    padding: 2rem;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border-radius: 16px;
    color: white;
  }
  
  .cta h2 {
    margin: 0 0 0.5rem;
    font-size: 1.25rem;
  }
  
  .cta p {
    margin: 0 0 1rem;
    opacity: 0.9;
    font-size: 0.9rem;
  }
  
  .request-btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background: rgba(255, 255, 255, 0.15);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.9rem;
    transition: background 0.2s;
  }
  
  .request-btn:hover {
    background: rgba(255, 255, 255, 0.25);
  }
  
  @media (max-width: 500px) {
    .mode-toggle {
      grid-template-columns: 1fr;
    }
  }
</style>
