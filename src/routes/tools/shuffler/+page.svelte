<script lang="ts">
  import { shuffleArray, chunkArray, type Team } from '$lib/types/tools';
  
  // Manual name entry for standalone mode
  let namesInput = $state('');
  let teamSize = $state(4);
  let teams = $state<Team[]>([]);
  let shuffled = $state(false);
  let copied = $state(false);
  
  let names = $derived(namesInput.split('\n').map(n => n.trim()).filter(n => n.length > 0));
  let maxTeamSize = $derived(Math.max(2, Math.ceil(names.length / 2)));
  
  function shuffle() {
    if (names.length < 2) return;
    
    const shuffledNames = shuffleArray(names);
    const chunks = chunkArray(shuffledNames, teamSize);
    
    teams = chunks.map((members, i) => ({
      name: `Team ${i + 1}`,
      members,
    }));
    shuffled = true;
  }
  
  function copyTeams() {
    const text = teams.map(t => `${t.name}: ${t.members.join(', ')}`).join('\n');
    navigator.clipboard.writeText(text);
    copied = true;
    setTimeout(() => copied = false, 2000);
  }
  
  function resetShuffle() {
    teams = [];
    shuffled = false;
  }
  
  function loadSampleNames() {
    namesInput = `Alice Johnson
Bob Smith
Carol Williams
David Brown
Emma Davis
Frank Miller
Grace Wilson
Henry Moore
Ivy Taylor
Jack Anderson`;
  }
</script>

<svelte:head>
  <title>Team Shuffler - Event Tools Lab</title>
  <meta name="description" content="Randomly shuffle people into teams. Free, no signup required." />
</svelte:head>

<main>
  <header>
    <a href="/" class="back">← Event Tools Lab</a>
    <h1>🎲 Team Shuffler</h1>
    <p class="subtitle">Randomly shuffle people into teams</p>
  </header>
  
  <div class="standalone-notice">
    <span>💡</span>
    <p>
      <strong>Standalone mode</strong> - Enter names manually below. 
      <a href="/create">Create an event</a> to track participants automatically.
    </p>
  </div>
  
  <section class="name-entry">
    <div class="input-header">
      <label for="names">Enter names (one per line)</label>
      <button class="sample-btn" onclick={loadSampleNames}>Load sample</button>
    </div>
    <textarea 
      id="names"
      bind:value={namesInput}
      placeholder="Alice&#10;Bob&#10;Carol&#10;David&#10;..."
      rows="8"
    ></textarea>
    <span class="name-count">{names.length} name{names.length !== 1 ? 's' : ''} entered</span>
  </section>
  
  {#if names.length >= 2}
    <section class="controls">
      <div class="control-row">
        <label>
          <span>Team size</span>
          <div class="size-input">
            <button 
              class="size-btn" 
              onclick={() => teamSize = Math.max(2, teamSize - 1)}
              disabled={teamSize <= 2}
            >−</button>
            <span class="size-value">{teamSize}</span>
            <button 
              class="size-btn" 
              onclick={() => teamSize = Math.min(maxTeamSize, teamSize + 1)}
              disabled={teamSize >= maxTeamSize}
            >+</button>
          </div>
        </label>
        <span class="team-count">
          → {Math.ceil(names.length / teamSize)} teams
        </span>
      </div>
      
      <div class="action-buttons">
        <button class="shuffle-btn" onclick={shuffle}>
          🎲 {shuffled ? 'Reshuffle' : 'Shuffle Teams'}
        </button>
        {#if shuffled}
          <button class="reset-btn" onclick={resetShuffle}>Reset</button>
        {/if}
      </div>
    </section>
    
    {#if shuffled && teams.length > 0}
      <section class="results">
        <div class="results-header">
          <h2>Teams</h2>
          <button class="copy-btn" onclick={copyTeams}>
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
        
        <div class="teams-grid">
          {#each teams as team, i}
            <div class="team-card">
              <h3>{team.name}</h3>
              <ul>
                {#each team.members as member}
                  <li>{member}</li>
                {/each}
              </ul>
              <span class="member-count">{team.members.length} members</span>
            </div>
          {/each}
        </div>
      </section>
    {/if}
  {:else if namesInput.trim().length > 0}
    <div class="warning-box">
      <p>Add at least 2 names to create teams.</p>
    </div>
  {/if}
</main>

<style>
  main {
    max-width: 800px;
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
    margin-bottom: 1.5rem;
  }
  
  h1 {
    font-size: 1.75rem;
    margin: 1rem 0 0.25rem;
  }
  
  .subtitle {
    color: #6b7280;
    margin: 0;
  }
  
  .standalone-notice {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    padding: 1rem;
    border-radius: 10px;
    margin-bottom: 1.5rem;
  }
  
  .standalone-notice span {
    font-size: 1.25rem;
  }
  
  .standalone-notice p {
    margin: 0;
    font-size: 0.875rem;
    color: #0c4a6e;
  }
  
  .standalone-notice a {
    color: #0284c7;
  }
  
  /* Name Entry */
  .name-entry {
    margin-bottom: 1.5rem;
  }
  
  .input-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .input-header label {
    font-weight: 500;
    font-size: 0.9rem;
  }
  
  .sample-btn {
    padding: 0.25rem 0.5rem;
    background: none;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 0.75rem;
    color: #6b7280;
    cursor: pointer;
  }
  
  .sample-btn:hover {
    background: #f3f4f6;
  }
  
  textarea {
    width: 100%;
    padding: 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 10px;
    font-size: 1rem;
    font-family: inherit;
    resize: vertical;
    box-sizing: border-box;
  }
  
  textarea:focus {
    outline: none;
    border-color: #2563eb;
  }
  
  .name-count {
    display: block;
    text-align: right;
    font-size: 0.8rem;
    color: #9ca3af;
    margin-top: 0.25rem;
  }
  
  .warning-box {
    background: #fef3c7;
    border: 1px solid #fcd34d;
    padding: 1rem;
    border-radius: 10px;
    text-align: center;
  }
  
  .warning-box p {
    margin: 0;
    color: #a16207;
  }
  
  /* Controls */
  .controls {
    background: #f8fafc;
    padding: 1.5rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
  }
  
  .control-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .control-row label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .control-row label span {
    font-weight: 500;
  }
  
  .size-input {
    display: flex;
    align-items: center;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .size-btn {
    width: 36px;
    height: 36px;
    border: none;
    background: none;
    font-size: 1.25rem;
    cursor: pointer;
    color: #374151;
  }
  
  .size-btn:hover:not(:disabled) {
    background: #f3f4f6;
  }
  
  .size-btn:disabled {
    color: #d1d5db;
    cursor: not-allowed;
  }
  
  .size-value {
    width: 40px;
    text-align: center;
    font-weight: 600;
    font-size: 1.125rem;
  }
  
  .team-count {
    color: #6b7280;
    font-size: 0.875rem;
  }
  
  .action-buttons {
    display: flex;
    gap: 0.75rem;
  }
  
  .shuffle-btn {
    flex: 1;
    padding: 0.875rem 1.5rem;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  
  .shuffle-btn:hover {
    opacity: 0.9;
  }
  
  .reset-btn {
    padding: 0.875rem 1rem;
    background: white;
    color: #6b7280;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    font-size: 1rem;
    cursor: pointer;
  }
  
  /* Results */
  .results {
    margin-bottom: 2rem;
  }
  
  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .results-header h2 {
    margin: 0;
    font-size: 1.25rem;
  }
  
  .copy-btn {
    padding: 0.5rem 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    background: white;
  }
  
  .copy-btn:hover {
    background: #f9fafb;
  }
  
  .teams-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
  }
  
  .team-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1rem;
    position: relative;
  }
  
  .team-card h3 {
    margin: 0 0 0.75rem;
    font-size: 1rem;
    color: #2563eb;
  }
  
  .team-card ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  
  .team-card li {
    padding: 0.375rem 0;
    border-bottom: 1px solid #f3f4f6;
    font-size: 0.9rem;
  }
  
  .team-card li:last-child {
    border-bottom: none;
  }
  
  .member-count {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    font-size: 0.7rem;
    color: #9ca3af;
  }
  
  @media (max-width: 640px) {
    .control-row {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .teams-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
