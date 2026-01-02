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
  <title>unconf tools Lab - AI-Built Tools for Event Organizers</title>
  <meta name="description" content="Event organizer tools built entirely by AI from user requests. An experiment in agentic development - no human coding, just AI and your needs." />
</svelte:head>

<div class="full-width">
  <!-- Hero + Tools Two-Column Layout -->
  <section class="hero-tools-layout">
    <!-- Left Column: Hero Section (70%) -->
    <div class="hero-column">
      <a href="https://github.com/dmgrok/unconf" class="github-link" target="_blank" rel="noopener noreferrer" aria-label="View source code on GitHub">
        <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg>
      </a>
      <div class="hero-badge">
        <span class="pulse"></span>
        <span>🤖 100% AI-Built</span>
      </div>
      <h1>Focus on Your Event,<br/>Not the Tech</h1>
      <p class="hero-subtitle">
        Simple, powerful tools that let event organizers do what matters most — 
        <strong>connect people</strong>.
      </p>
      
      <div class="hero-actions">
        <a href="/create" class="btn-hero primary">
          <span>✨</span> Create Event
        </a>
        <div class="join-inline">
          <span class="join-text">or</span>
          <form action="/join" method="GET" class="join-form-inline">
            <input 
              type="text" 
              name="code" 
              bind:value={joinCode}
              placeholder="Event code"
              maxlength="10"
              autocomplete="off"
            />
            <button type="submit" disabled={!joinCode.trim()}>Join</button>
          </form>
        </div>
      </div>
    </div>

    <!-- Right Column: Tools Section (30%) -->
    <div class="tools-column" id="tools">
      <div class="tools-header">
        <h2>Your Toolkit</h2>
        <p>Use standalone or connect to an event</p>
      </div>
      
      <div class="tools-list">
        {#each tools as tool}
          {@const info = TOOL_INFO[tool.id]}
          {#if tool.status === 'live'}
            <a href="/tools/{tool.id}" class="tool-card">
              <div class="tool-icon">{info.emoji}</div>
              <div class="tool-content">
                <h3>{info.name}</h3>
                <p>{info.description}</p>
                <div class="tool-examples">
                  {#if tool.id === 'shuffler'}
                    <span>Breakout groups</span>
                    <span>Team formation</span>
                    <span>Speed networking</span>
                  {:else if tool.id === 'timer'}
                    <span>Presentations</span>
                    <span>Lightning talks</span>
                    <span>Break countdowns</span>
                  {:else if tool.id === 'poll'}
                    <span>Quick votes</span>
                    <span>Audience pulse</span>
                    <span>Topic selection</span>
                  {:else if tool.id === 'survey'}
                    <span>Feedback</span>
                    <span>Q&A collection</span>
                    <span>Session ideas</span>
                  {/if}
                </div>
              </div>
              <span class="tool-arrow">→</span>
            </a>
          {:else}
            <div class="tool-card coming">
              <div class="tool-icon">{info.emoji}</div>
              <div class="tool-content">
                <h3>{info.name}</h3>
                <p>{info.description}</p>
              </div>
              <span class="coming-badge">Soon</span>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  </section>

  <!-- The Experiment & How It Works - Side by Side -->
  <section class="content-row">
    <!-- Left Column: The Experiment -->
    <div class="experiment">
      <div class="experiment-header">
        <span class="experiment-icon">🧪</span>
        <h2>The Experiment</h2>
      </div>
      <div class="experiment-content">
        <p class="experiment-lead">
          <strong>How far can we push AI to build apps autonomously?</strong>
        </p>
        <p>
          Can we build a functional app purely from <strong>client intent</strong>? This platform tests 
          the limits of <strong>agentic AI</strong> development — where AI translates user needs directly 
          into working code. We're exploring: Can AI handle 80%? 90%? 100% of development?
        </p>
        <p>
          <strong>The real question:</strong> How much human effort is needed to set up guardrails for 
          autonomous app evolution? What's the role of software developers when AI can code? This 
          experiment maps those boundaries.
        </p>
        <div class="experiment-stats">
          <div class="stat">
            <span class="stat-value">?%</span>
            <span class="stat-label">Autonomy achieved</span>
          </div>
          <div class="stat">
            <span class="stat-value">100%</span>
            <span class="stat-label">User intent driven</span>
          </div>
          <div class="stat">
            <span class="stat-value">∞</span>
            <span class="stat-label">Learning iterations</span>
          </div>
        </div>
        <p class="experiment-note">
          <em>Every feature emerges from user requests. Claude writes the code. Humans guide the vision. 
          We're documenting what works, what fails, and where the future lies.</em>
        </p>
      </div>
    </div>

    <!-- Right Column: How It Works -->
    <div class="how-it-works">
      <div class="section-header">
        <h2>How to start</h2>
        <p>Get started in under a minute</p>
      </div>
      <div class="steps">
        <div class="step">
          <div class="step-icon">🎯</div>
          <h3>Create</h3>
          <p>Start an event, get a code instantly</p>
        </div>
        <div class="step-connector"></div>
        <div class="step">
          <div class="step-icon">📤</div>
          <h3>Share</h3>
          <p>Send the code — no accounts needed</p>
        </div>
        <div class="step-connector"></div>
        <div class="step">
          <div class="step-icon">🚀</div>
          <h3>Run</h3>
          <p>Use tools, engage your audience</p>
        </div>
      </div>

      <!-- Request Section -->
      <div class="request-inline">
        <h3>Want more features?</h3>
        <p>
          Need a tool we don't have? Your request becomes the AI's next task.
        </p>
        <div class="request-buttons">
          <a href="/ideas-lab" class="btn-ideas-lab">
            <span>💡</span> Ideas Lab
          </a>
          <a href="https://github.com/dmgrok/unconf/issues/new?template=tool-request.yml" class="btn-request">
            <span>📬</span> Request Feature
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer>
    <div class="footer-content">
      <div class="footer-brand">
        <span class="footer-logo">🧪</span>
        <span>unconf tools Lab</span>
      </div>
      <p class="footer-experiment">
        An experiment in AI-only development
      </p>
      <div class="footer-links">
        <a href="https://github.com/dmgrok/unconf">GitHub</a>
        <span class="footer-sep">•</span>
        <span>Built by Claude</span>
        <span class="footer-sep">•</span>
        <span>Guided by humans</span>
      </div>
    </div>
  </footer>
</div>

<style>
  :global(body) {
    margin: 0;
    background: #0a0a0f;
    color: #e4e4e7;
  }

  .full-width {
    min-height: 100vh;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }

  /* Hero + Tools Two-Column Layout */
  .hero-tools-layout {
    display: flex;
    min-height: 100vh;
    background: linear-gradient(180deg, #0f0f18 0%, #0a0a0f 100%);
    position: relative;
    overflow: hidden;
  }

  .hero-tools-layout::before {
    content: '';
    position: absolute;
    top: 0;
    left: 30%;
    transform: translateX(-50%);
    width: 800px;
    height: 600px;
    background: radial-gradient(ellipse, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
    pointer-events: none;
  }

  /* Left Column: Hero */
  .hero-column {
    flex: 0 0 50%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 4rem 4rem 4rem 8rem;
    position: relative;
  }

  .github-link {
    position: absolute;
    top: 2rem;
    right: 2rem;
    color: #a1a1aa;
    transition: color 0.2s;
    z-index: 10;
  }

  .github-link:hover {
    color: #e4e4e7;
  }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(99, 102, 241, 0.1);
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: 100px;
    font-size: 0.85rem;
    color: #a5b4fc;
    margin-bottom: 2rem;
    width: fit-content;
  }

  .pulse {
    width: 8px;
    height: 8px;
    background: #22c55e;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
  }

  .hero-column h1 {
    font-size: clamp(2.5rem, 5vw, 3.5rem);
    font-weight: 700;
    line-height: 1.1;
    margin: 0 0 1.5rem;
    background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    max-width: 600px;
  }

  .hero-subtitle {
    font-size: 1.25rem;
    color: #a1a1aa;
    max-width: 500px;
    margin: 0 0 2.5rem;
    line-height: 1.6;
  }

  .hero-subtitle strong {
    color: #e4e4e7;
  }

  .hero-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1.5rem;
  }

  .btn-hero {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 2rem;
    font-size: 1.1rem;
    font-weight: 600;
    border-radius: 12px;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .btn-hero.primary {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    color: white;
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
  }

  .btn-hero.primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(99, 102, 241, 0.5);
  }

  .join-inline {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .join-text {
    color: #71717a;
    font-size: 0.9rem;
  }

  .join-form-inline {
    display: flex;
    gap: 0.5rem;
  }

  .join-form-inline input {
    width: 120px;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: white;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    text-align: center;
  }

  .join-form-inline input::placeholder {
    text-transform: none;
    letter-spacing: normal;
    color: #71717a;
  }

  .join-form-inline input:focus {
    outline: none;
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.1);
  }

  .join-form-inline button {
    padding: 0.75rem 1.25rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: white;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .join-form-inline button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .join-form-inline button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Right Column: Tools */
  .tools-column {
    flex: 0 0 50%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 4rem 6rem 4rem 4rem;
    background: rgba(0, 0, 0, 0.3);
    border-left: 1px solid rgba(255, 255, 255, 0.05);
  }

  .tools-header {
    margin-bottom: 1.5rem;
  }

  .tools-header h2 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 0.25rem;
    color: #fff;
  }

  .tools-header p {
    color: #71717a;
    margin: 0;
    font-size: 0.85rem;
  }

  .tools-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .tool-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    text-decoration: none;
    color: inherit;
    transition: all 0.2s ease;
  }

  a.tool-card:hover {
    background: rgba(99, 102, 241, 0.1);
    border-color: rgba(99, 102, 241, 0.3);
    transform: translateX(4px);
  }

  .tool-card.coming {
    opacity: 0.5;
  }

  .tool-icon {
    font-size: 1.5rem;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    flex-shrink: 0;
  }

  .tool-content {
    flex: 1;
    min-width: 0;
  }

  .tool-content h3 {
    font-size: 0.9rem;
    font-weight: 600;
    margin: 0 0 0.15rem;
    color: #e4e4e7;
  }

  .tool-content p {
    font-size: 0.75rem;
    color: #71717a;
    margin: 0 0 0.5rem;
    line-height: 1.4;
  }

  .tool-examples {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-top: 0.5rem;
  }

  .tool-examples span {
    font-size: 0.65rem;
    padding: 0.2rem 0.5rem;
    background: rgba(99, 102, 241, 0.1);
    color: #a5b4fc;
    border-radius: 4px;
    white-space: nowrap;
  }

  .tool-arrow {
    color: #6366f1;
    font-size: 1rem;
    opacity: 0;
    transition: opacity 0.2s, transform 0.2s;
  }

  a.tool-card:hover .tool-arrow {
    opacity: 1;
    transform: translateX(4px);
  }

  .coming-badge {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #71717a;
    background: rgba(255, 255, 255, 0.05);
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
  }

  /* Content Row - Experiment and How It Works Side by Side */
  .content-row {
    display: flex;
    gap: 3rem;
    max-width: 1400px;
    margin: 0 auto;
    padding: 5rem 3rem;
  }

  /* Experiment Section */
  .experiment {
    flex: 1;
    padding: 0;
  }

  .experiment-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .experiment-icon {
    font-size: 2.5rem;
  }

  .experiment h2 {
    font-size: 2rem;
    font-weight: 700;
    margin: 0;
    color: #fff;
  }

  .experiment-content {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%);
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: 20px;
    padding: 2.5rem;
  }

  .experiment-lead {
    font-size: 1.25rem;
    color: #e4e4e7;
    margin: 0 0 1rem;
  }

  .experiment-content > p {
    color: #a1a1aa;
    line-height: 1.7;
    margin: 0 0 1.5rem;
  }

  .experiment-content > p strong {
    color: #c4b5fd;
  }

  .experiment-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin: 2rem 0;
    padding: 1.5rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 12px;
  }

  .stat {
    text-align: center;
  }

  .stat-value {
    display: block;
    font-size: 2rem;
    font-weight: 700;
    color: #a5b4fc;
    font-family: 'JetBrains Mono', monospace;
  }

  .stat-label {
    font-size: 0.8rem;
    color: #71717a;
    margin-top: 0.25rem;
    display: block;
  }

  .experiment-note {
    font-size: 0.9rem;
    color: #71717a;
    margin: 0;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  /* Section Header (for other sections) */
  .section-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .section-header h2 {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 0.5rem;
    color: #fff;
  }

  .section-header p {
    color: #71717a;
    margin: 0;
  }

  /* How It Works */
  .how-it-works {
    flex: 1;
    padding: 0;
  }

  .steps {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: 0;
  }

  .step {
    flex: 1;
    text-align: center;
    padding: 0 1rem;
    max-width: 200px;
  }

  .step-icon {
    font-size: 2.5rem;
    margin-bottom: 1rem;
  }

  .step h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 0.5rem;
    color: #e4e4e7;
  }

  .step p {
    font-size: 0.9rem;
    color: #71717a;
    margin: 0;
    line-height: 1.5;
  }

  .step-connector {
    width: 60px;
    height: 2px;
    background: linear-gradient(90deg, #6366f1 0%, #a855f7 100%);
    margin-top: 2rem;
    flex-shrink: 0;
  }

  /* Request Section - Inline */
  .request-inline {
    margin-top: 3rem;
    padding: 2rem;
    background: linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%);
    border: 1px solid rgba(168, 85, 247, 0.2);
    border-radius: 16px;
    text-align: center;
  }

  .request-inline h3 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 0.75rem;
    color: #fff;
  }

  .request-inline p {
    color: #a1a1aa;
    margin: 0 0 1.5rem;
    line-height: 1.6;
    font-size: 0.9rem;
  }

  .request-buttons {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .btn-ideas-lab {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05));
    border: 1px solid rgba(245, 158, 11, 0.4);
    color: #fbbf24;
    font-size: 1rem;
    font-weight: 600;
    border-radius: 12px;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .btn-ideas-lab:hover {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(245, 158, 11, 0.1));
    border-color: rgba(245, 158, 11, 0.6);
    transform: translateY(-2px);
  }

  .btn-request {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%);
    color: white;
    font-size: 1rem;
    font-weight: 600;
    border-radius: 12px;
    text-decoration: none;
    transition: all 0.2s ease;
    box-shadow: 0 4px 20px rgba(168, 85, 247, 0.3);
  }

  .btn-request:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(168, 85, 247, 0.4);
  }

  /* Footer */
  footer {
    padding: 3rem 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .footer-content {
    max-width: 800px;
    margin: 0 auto;
    text-align: center;
  }

  .footer-brand {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-weight: 600;
    color: #e4e4e7;
    margin-bottom: 0.5rem;
  }

  .footer-logo {
    font-size: 1.25rem;
  }

  .footer-experiment {
    font-size: 0.85rem;
    color: #71717a;
    margin: 0 0 1rem;
  }

  .footer-links {
    font-size: 0.85rem;
    color: #52525b;
  }

  .footer-links a {
    color: #6366f1;
    text-decoration: none;
  }

  .footer-links a:hover {
    text-decoration: underline;
  }

  .footer-sep {
    margin: 0 0.75rem;
    color: #3f3f46;
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .hero-tools-layout {
      flex-direction: column;
      min-height: auto;
    }

    .hero-column {
      flex: none;
      padding: 4rem 2rem 3rem;
      text-align: center;
      align-items: center;
    }

    .hero-actions {
      align-items: center;
    }

    .tools-column {
      flex: none;
      padding: 2rem;
      border-left: none;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .tools-header {
      text-align: center;
    }
  }

  @media (max-width: 1024px) {
    .content-row {
      flex-direction: column;
      gap: 4rem;
      padding: 3rem 2rem;
    }
  }

  @media (max-width: 640px) {
    .hero-column {
      padding: 3rem 1rem 2rem;
    }

    .hero-column h1 {
      font-size: 2rem;
    }

    .hero-subtitle {
      font-size: 1rem;
    }

    .join-inline {
      flex-direction: column;
    }

    .experiment-stats {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .steps {
      flex-direction: column;
      gap: 2rem;
    }

    .step-connector {
      width: 2px;
      height: 40px;
      margin: 0 auto;
    }

    .step {
      max-width: none;
    }

    .tools-column {
      padding: 1.5rem 1rem;
    }

    .content-row {
      padding: 2rem 1rem;
    }
  }
</style>
