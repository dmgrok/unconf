<script lang="ts">
  import { 
    shuffleArray, 
    chunkArray, 
    parseTSV, 
    distributeWithDiversity,
    type Team, 
    type DistributionPerson, 
    type DistributionGroup 
  } from '$lib/types/tools';
  
  // Mode: 'simple' (names only) or 'advanced' (Excel paste with criteria)
  let mode = $state<'simple' | 'advanced'>('simple');
  
  // Simple mode state
  let namesInput = $state('');
  let teamSize = $state(4);
  let teams = $state<Team[]>([]);
  let shuffled = $state(false);
  let copied = $state(false);
  
  // Advanced mode state
  let excelPaste = $state('');
  let parsedData = $state<string[][]>([]);
  let hasHeader = $state(true);
  let nameColumn = $state(0);
  let emailColumn = $state<number | null>(null);
  let criteriaColumn1 = $state<number | null>(null);
  let criteriaColumn2 = $state<number | null>(null);
  let criteriaName1 = $state('Criteria 1');
  let criteriaName2 = $state('Criteria 2');
  let advancedGroups = $state<DistributionGroup[]>([]);
  let advancedShuffled = $state(false);
  
  // Derived values
  let names = $derived(namesInput.split('\n').map(n => n.trim()).filter(n => n.length > 0));
  let maxTeamSize = $derived(Math.max(2, Math.ceil(names.length / 2)));
  
  // Advanced mode derived
  let columns = $derived(parsedData.length > 0 ? parsedData[0] : []);
  let dataRows = $derived(hasHeader ? parsedData.slice(1) : parsedData);
  let previewRows = $derived(dataRows.slice(0, 5));
  let totalPeople = $derived(dataRows.length);
  let advancedMaxTeamSize = $derived(Math.max(2, Math.ceil(totalPeople / 2)));
  
  // Parse Excel paste when it changes
  $effect(() => {
    if (excelPaste.trim()) {
      parsedData = parseTSV(excelPaste);
      // Reset selections when data changes
      advancedGroups = [];
      advancedShuffled = false;
    } else {
      parsedData = [];
    }
  });
  
  // Simple mode functions
  function shuffle() {
    if (names.length < 2) return;
    
    const shuffledNames = shuffleArray(names);
    const chunks = chunkArray(shuffledNames, teamSize);
    
    teams = chunks.map((members, i) => ({
      name: `Group ${i + 1}`,
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
  
  // Advanced mode functions
  function loadSampleExcel() {
    excelPaste = `Name	Email	Department	Location
Alice Johnson	alice@company.com	Engineering	New York
Bob Smith	bob@company.com	Marketing	London
Carol Williams	carol@company.com	Engineering	London
David Brown	david@company.com	Sales	New York
Emma Davis	emma@company.com	Engineering	Paris
Frank Miller	frank@company.com	Marketing	New York
Grace Wilson	grace@company.com	Sales	London
Henry Moore	henry@company.com	Engineering	Paris
Ivy Taylor	ivy@company.com	Marketing	Paris
Jack Anderson	jack@company.com	Sales	New York
Kate Roberts	kate@company.com	Engineering	London
Leo Garcia	leo@company.com	Marketing	Paris`;
    // Auto-detect columns
    setTimeout(() => {
      nameColumn = 0;
      emailColumn = 1;
      criteriaColumn1 = 2;
      criteriaColumn2 = 3;
      criteriaName1 = 'Department';
      criteriaName2 = 'Location';
    }, 100);
  }
  
  function distributeAdvanced() {
    if (dataRows.length < 2) return;
    
    // Build people array
    const people: DistributionPerson[] = dataRows.map(row => {
      const criteria: Record<string, string> = {};
      if (criteriaColumn1 !== null && row[criteriaColumn1]) {
        criteria[criteriaName1] = row[criteriaColumn1];
      }
      if (criteriaColumn2 !== null && row[criteriaColumn2]) {
        criteria[criteriaName2] = row[criteriaColumn2];
      }
      
      return {
        name: row[nameColumn] || 'Unknown',
        email: emailColumn !== null ? row[emailColumn] : undefined,
        criteria,
        rawRow: row,
      };
    });
    
    // Get criteria names for diversity distribution
    const criteriaNames: string[] = [];
    if (criteriaColumn1 !== null) criteriaNames.push(criteriaName1);
    if (criteriaColumn2 !== null) criteriaNames.push(criteriaName2);
    
    // Distribute with diversity
    advancedGroups = distributeWithDiversity(people, teamSize, criteriaNames);
    advancedShuffled = true;
  }
  
  function copyAdvancedGroups() {
    let text = '';
    for (const group of advancedGroups) {
      text += `${group.name}\n`;
      for (const member of group.members) {
        const criteriaStr = Object.entries(member.criteria)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        text += `  - ${member.name}${member.email ? ` (${member.email})` : ''}${criteriaStr ? ` [${criteriaStr}]` : ''}\n`;
      }
      text += '\n';
    }
    navigator.clipboard.writeText(text);
    copied = true;
    setTimeout(() => copied = false, 2000);
  }
  
  function resetAdvanced() {
    advancedGroups = [];
    advancedShuffled = false;
  }
  
  function getCriteriaDistribution(group: DistributionGroup, criteriaName: string): Record<string, number> {
    const dist: Record<string, number> = {};
    for (const member of group.members) {
      const val = member.criteria[criteriaName] || 'Unknown';
      dist[val] = (dist[val] || 0) + 1;
    }
    return dist;
  }
</script>

<svelte:head>
  <title>Group Shuffler - Event Tools Lab</title>
  <meta name="description" content="Randomly distribute people into diverse groups. Paste from Excel, configure columns, and maximize team diversity." />
</svelte:head>

<main>
  <header>
    <a href="/" class="back">← Event Tools Lab</a>
    <h1>🎲 Group Shuffler</h1>
    <p class="subtitle">Randomly distribute people into diverse groups</p>
  </header>
  
  <!-- Mode Toggle -->
  <div class="mode-toggle">
    <button 
      class="mode-btn" 
      class:active={mode === 'simple'}
      onclick={() => mode = 'simple'}
    >
      📝 Simple Mode
    </button>
    <button 
      class="mode-btn" 
      class:active={mode === 'advanced'}
      onclick={() => mode = 'advanced'}
    >
      📊 Excel Paste Mode
    </button>
  </div>
  
  {#if mode === 'simple'}
    <!-- SIMPLE MODE -->
    <div class="standalone-notice">
      <span>💡</span>
      <p>
        <strong>Simple mode</strong> - Enter names manually below. 
        Switch to <button class="link-btn" onclick={() => mode = 'advanced'}>Excel Paste Mode</button> for advanced features.
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
            <span>Group size</span>
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
            → {Math.ceil(names.length / teamSize)} groups
          </span>
        </div>
        
        <div class="action-buttons">
          <button class="shuffle-btn" onclick={shuffle}>
            🎲 {shuffled ? 'Reshuffle' : 'Create Groups'}
          </button>
          {#if shuffled}
            <button class="reset-btn" onclick={resetShuffle}>Reset</button>
          {/if}
        </div>
      </section>
      
      {#if shuffled && teams.length > 0}
        <section class="results">
          <div class="results-header">
            <h2>Groups</h2>
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
        <p>Add at least 2 names to create groups.</p>
      </div>
    {/if}
    
  {:else}
    <!-- ADVANCED MODE - Excel Paste -->
    <div class="standalone-notice">
      <span>📊</span>
      <p>
        <strong>Excel Paste Mode</strong> - Paste tab-separated data from Excel/Google Sheets. 
        Configure name, email, and grouping criteria columns.
      </p>
    </div>
    
    <section class="name-entry">
      <div class="input-header">
        <label for="excel-paste">Paste from Excel (Ctrl+V)</label>
        <button class="sample-btn" onclick={loadSampleExcel}>Load sample data</button>
      </div>
      <textarea 
        id="excel-paste"
        bind:value={excelPaste}
        placeholder="Paste your Excel data here...&#10;Name	Email	Department	Location&#10;Alice	alice@company.com	Engineering	NYC&#10;Bob	bob@company.com	Marketing	London"
        rows="8"
      ></textarea>
      {#if parsedData.length > 0}
        <span class="name-count">{totalPeople} row{totalPeople !== 1 ? 's' : ''} detected ({columns.length} columns)</span>
      {/if}
    </section>
    
    {#if parsedData.length > 0}
      <!-- Column Configuration -->
      <section class="column-config">
        <h3>📑 Column Configuration</h3>
        
        <div class="config-row">
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={hasHeader} />
            <span>First row is header</span>
          </label>
        </div>
        
        <div class="config-grid">
          <div class="config-item">
            <span class="config-label">Name Column *</span>
            <select bind:value={nameColumn}>
              {#each columns as col, i}
                <option value={i}>{hasHeader ? col : `Column ${i + 1}`}</option>
              {/each}
            </select>
          </div>
          
          <div class="config-item">
            <span class="config-label">Email Column (optional)</span>
            <select bind:value={emailColumn}>
              <option value={null}>— None —</option>
              {#each columns as col, i}
                <option value={i}>{hasHeader ? col : `Column ${i + 1}`}</option>
              {/each}
            </select>
          </div>
        </div>
        
        <h4>🎯 Diversity Criteria (optional)</h4>
        <p class="config-help">Select up to 2 columns to maximize diversity in groups (e.g., mix departments, locations)</p>
        
        <div class="config-grid">
          <div class="config-item">
            <span class="config-label">Criteria 1</span>
            <select bind:value={criteriaColumn1}>
              <option value={null}>— None —</option>
              {#each columns as col, i}
                <option value={i}>{hasHeader ? col : `Column ${i + 1}`}</option>
              {/each}
            </select>
            {#if criteriaColumn1 !== null}
              <input 
                type="text" 
                bind:value={criteriaName1} 
                placeholder="Criteria name"
                class="criteria-name-input"
              />
            {/if}
          </div>
          
          <div class="config-item">
            <span class="config-label">Criteria 2</span>
            <select bind:value={criteriaColumn2}>
              <option value={null}>— None —</option>
              {#each columns as col, i}
                <option value={i}>{hasHeader ? col : `Column ${i + 1}`}</option>
              {/each}
            </select>
            {#if criteriaColumn2 !== null}
              <input 
                type="text" 
                bind:value={criteriaName2} 
                placeholder="Criteria name"
                class="criteria-name-input"
              />
            {/if}
          </div>
        </div>
      </section>
      
      <!-- Data Preview -->
      <section class="preview-section">
        <h3>👀 Data Preview (first 5 rows)</h3>
        <div class="preview-table-wrapper">
          <table class="preview-table">
            <thead>
              <tr>
                {#each columns as col, i}
                  <th class:highlight={i === nameColumn || i === emailColumn || i === criteriaColumn1 || i === criteriaColumn2}>
                    {hasHeader ? col : `Col ${i + 1}`}
                    {#if i === nameColumn}<span class="col-badge name">Name</span>{/if}
                    {#if i === emailColumn}<span class="col-badge email">Email</span>{/if}
                    {#if i === criteriaColumn1}<span class="col-badge criteria">{criteriaName1}</span>{/if}
                    {#if i === criteriaColumn2}<span class="col-badge criteria">{criteriaName2}</span>{/if}
                  </th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each previewRows as row}
                <tr>
                  {#each row as cell, i}
                    <td class:highlight={i === nameColumn || i === emailColumn || i === criteriaColumn1 || i === criteriaColumn2}>
                      {cell || '—'}
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
      
      {#if totalPeople >= 2}
        <!-- Controls -->
        <section class="controls">
          <div class="control-row">
            <label>
              <span>Group size</span>
              <div class="size-input">
                <button 
                  class="size-btn" 
                  onclick={() => teamSize = Math.max(2, teamSize - 1)}
                  disabled={teamSize <= 2}
                >−</button>
                <span class="size-value">{teamSize}</span>
                <button 
                  class="size-btn" 
                  onclick={() => teamSize = Math.min(advancedMaxTeamSize, teamSize + 1)}
                  disabled={teamSize >= advancedMaxTeamSize}
                >+</button>
              </div>
            </label>
            <span class="team-count">
              → {Math.ceil(totalPeople / teamSize)} groups from {totalPeople} people
            </span>
          </div>
          
          <div class="action-buttons">
            <button class="shuffle-btn" onclick={distributeAdvanced}>
              🎲 {advancedShuffled ? 'Redistribute' : 'Create Diverse Groups'}
            </button>
            {#if advancedShuffled}
              <button class="reset-btn" onclick={resetAdvanced}>Reset</button>
            {/if}
          </div>
        </section>
        
        {#if advancedShuffled && advancedGroups.length > 0}
          <section class="results">
            <div class="results-header">
              <h2>Groups</h2>
              <button class="copy-btn" onclick={copyAdvancedGroups}>
                {copied ? '✓ Copied!' : '📋 Copy All'}
              </button>
            </div>
            
            <div class="teams-grid advanced">
              {#each advancedGroups as group}
                <div class="team-card advanced">
                  <h3>{group.name}</h3>
                  <ul>
                    {#each group.members as member}
                      <li>
                        <span class="member-name">{member.name}</span>
                        {#if member.email}
                          <span class="member-email">{member.email}</span>
                        {/if}
                        {#if Object.keys(member.criteria).length > 0}
                          <div class="member-criteria">
                            {#each Object.entries(member.criteria) as [key, value]}
                              <span class="criteria-tag">{value}</span>
                            {/each}
                          </div>
                        {/if}
                      </li>
                    {/each}
                  </ul>
                  <div class="group-stats">
                    <span class="member-count">{group.members.length} members</span>
                    {#if criteriaColumn1 !== null}
                      <div class="criteria-distribution">
                        {#each Object.entries(getCriteriaDistribution(group, criteriaName1)) as [val, count]}
                          <span class="dist-tag">{val}: {count}</span>
                        {/each}
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </section>
        {/if}
      {:else}
        <div class="warning-box">
          <p>Need at least 2 rows of data to create groups.</p>
        </div>
      {/if}
    {/if}
  {/if}
</main>

<style>
  main {
    max-width: 900px;
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
  
  /* Mode Toggle */
  .mode-toggle {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }
  
  .mode-btn {
    flex: 1;
    padding: 0.75rem 1rem;
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 10px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .mode-btn:hover {
    border-color: #2563eb;
  }
  
  .mode-btn.active {
    background: #2563eb;
    border-color: #2563eb;
    color: white;
  }
  
  .link-btn {
    background: none;
    border: none;
    color: #2563eb;
    text-decoration: underline;
    cursor: pointer;
    font: inherit;
    padding: 0;
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
  
  /* Column Configuration */
  .column-config {
    background: #f8fafc;
    padding: 1.5rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
  }
  
  .column-config h3 {
    margin: 0 0 1rem;
    font-size: 1.1rem;
  }
  
  .column-config h4 {
    margin: 1.5rem 0 0.5rem;
    font-size: 1rem;
    color: #374151;
  }
  
  .config-help {
    margin: 0 0 1rem;
    font-size: 0.85rem;
    color: #6b7280;
  }
  
  .config-row {
    margin-bottom: 1rem;
  }
  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    cursor: pointer;
  }
  
  .checkbox-label input {
    width: 18px;
    height: 18px;
  }
  
  .config-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  .config-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .config-label {
    font-size: 0.85rem;
    font-weight: 500;
    color: #374151;
  }
  
  .config-item select {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.9rem;
    background: white;
  }
  
  .criteria-name-input {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.85rem;
  }
  
  /* Preview Table */
  .preview-section {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
  }
  
  .preview-section h3 {
    margin: 0 0 1rem;
    font-size: 1rem;
    color: #374151;
  }
  
  .preview-table-wrapper {
    overflow-x: auto;
  }
  
  .preview-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  
  .preview-table th,
  .preview-table td {
    padding: 0.5rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .preview-table th {
    background: #f9fafb;
    font-weight: 600;
    font-size: 0.8rem;
    white-space: nowrap;
  }
  
  .preview-table th.highlight,
  .preview-table td.highlight {
    background: #eff6ff;
  }
  
  .col-badge {
    display: inline-block;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    font-size: 0.65rem;
    font-weight: 600;
    margin-left: 0.5rem;
  }
  
  .col-badge.name {
    background: #dbeafe;
    color: #1e40af;
  }
  
  .col-badge.email {
    background: #d1fae5;
    color: #065f46;
  }
  
  .col-badge.criteria {
    background: #fef3c7;
    color: #92400e;
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
    flex-wrap: wrap;
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
  
  .teams-grid.advanced {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
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
    padding: 0.5rem 0;
    border-bottom: 1px solid #f3f4f6;
    font-size: 0.9rem;
  }
  
  .team-card li:last-child {
    border-bottom: none;
  }
  
  .team-card.advanced li {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .member-name {
    font-weight: 500;
  }
  
  .member-email {
    font-size: 0.8rem;
    color: #6b7280;
  }
  
  .member-criteria {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
    margin-top: 0.25rem;
  }
  
  .criteria-tag {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    background: #f3f4f6;
    border-radius: 4px;
    font-size: 0.7rem;
    color: #4b5563;
  }
  
  .group-stats {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .member-count {
    font-size: 0.75rem;
    color: #9ca3af;
  }
  
  .criteria-distribution {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }
  
  .dist-tag {
    font-size: 0.65rem;
    padding: 0.125rem 0.375rem;
    background: #eff6ff;
    color: #1e40af;
    border-radius: 3px;
  }
  
  @media (max-width: 640px) {
    .mode-toggle {
      flex-direction: column;
    }
    
    .control-row {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .teams-grid {
      grid-template-columns: 1fr;
    }
    
    .config-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
