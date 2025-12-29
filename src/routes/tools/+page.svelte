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
  <title>Tools - Event Tools Lab</title>
  <meta name="description" content="Free event tools: Team Shuffler, Session Timer, Quick Polls, and more." />
</svelte:head>

<main>
  <header>
    <a href="/" class="back">← Event Tools Lab</a>
    <h1>🧰 All Tools</h1>
    <p class="subtitle">Free event tools - use standalone or with an event</p>
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
    color: #6b7280;
    text-decoration: none;
    font-size: 0.875rem;
  }
  
  .back:hover {
    color: #374151;
  }
  
  header {
    margin-bottom: 2rem;
  }
  
  h1 {
    font-size: 1.75rem;
    margin: 1rem 0 0.25rem;
  }
  
  .subtitle {
    color: #6b7280;
    margin: 0;
  }
  
  .mode-toggle {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .mode-option {
    background: #f8fafc;
    padding: 1rem;
    border-radius: 10px;
  }
  
  .mode-option h3 {
    font-size: 0.9rem;
    margin: 0 0 0.5rem;
  }
  
  .mode-option p {
    font-size: 0.8rem;
    color: #6b7280;
    margin: 0;
    line-height: 1.4;
  }
  
  .mode-option a {
    color: #2563eb;
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
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  
  a.tool-row:hover {
    border-color: #2563eb;
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1);
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
  }
  
  .tool-info p {
    font-size: 0.85rem;
    color: #6b7280;
    margin: 0;
  }
  
  .arrow {
    font-size: 1.25rem;
    color: #2563eb;
  }
  
  .badge {
    background: #fef3c7;
    color: #92400e;
    padding: 0.25rem 0.75rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .cta {
    text-align: center;
    padding: 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
    background: white;
    color: #764ba2;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.9rem;
    transition: transform 0.2s;
  }
  
  .request-btn:hover {
    transform: scale(1.05);
  }
  
  @media (max-width: 500px) {
    .mode-toggle {
      grid-template-columns: 1fr;
    }
  }
</style>
