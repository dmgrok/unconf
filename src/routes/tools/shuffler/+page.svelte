<script lang="ts">
  import { 
    shuffleArray, 
    chunkArray, 
    parseTSV, 
    distributeWithDiversity,
    type Team, 
    type DistributionPerson, 
    type DistributionGroup,
    type ShufflerActivityData
  } from '$lib/types/tools';
  import QRCode from 'qrcode';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { user, isAuthenticated } from '$lib/stores/auth';
  
  // Mode: 'simple' (names only) or 'advanced' (Excel paste with criteria)
  let mode = $state<'simple' | 'advanced'>('simple');
  
  // Simple mode state
  let namesInput = $state('');
  let teamSize = $state(4);
  let teams = $state<Team[]>([]);
  let shuffled = $state(false);
  let copied = $state(false);
  
  // Advanced mode state
  let parsedData = $state<string[][]>([]);
  let hasHeader = true; // Always true - first row is always header
  let nameColumn = $state(0);
  let emailColumn = $state<number | null>(null);
  let criteriaColumn1 = $state<number | null>(null);
  let criteriaColumn2 = $state<number | null>(null);
  let criteriaName1 = $state('Criteria 1');
  let criteriaName2 = $state('Criteria 2');
  let advancedGroups = $state<DistributionGroup[]>([]);
  let advancedShuffled = $state(false);
  
  // File upload
  let fileInput = $state<HTMLInputElement | null>(null);
  let dragActive = $state(false);
  
  // QR Code
  let showQRCode = $state(false);
  let qrCodeDataUrl = $state('');
  let activityId = $state<string | null>(null);
  
  // Save activity
  let showSaveDialog = $state(false);
  let activityName = $state('');
  let activityDescription = $state('');
  let saving = $state(false);
  let saveError = $state('');
  let savedActivity = $state<{ id: string; shareCode: string } | null>(null);
  
  // Discussion topics
  let discussionTopics = $state<string[]>([]);
  let showTopicsConfig = $state(false);
  let newTopic = $state('');
  
  // Default empty grid (4 columns, 5 rows)
  const DEFAULT_COLUMNS = 4;
  const DEFAULT_ROWS = 5;
  
  // Derived values
  let names = $derived(namesInput.split('\n').map(n => n.trim()).filter(n => n.length > 0));
  let maxTeamSize = $derived(Math.max(2, Math.ceil(names.length / 2)));
  
  // Advanced mode derived
  let columns = $derived(parsedData.length > 0 ? parsedData[0] : []);
  let dataRows = $derived(hasHeader ? parsedData.slice(1) : parsedData);
  let filledDataRows = $derived(dataRows.filter(row => row.some(cell => cell.trim() !== '')));
  let totalPeople = $derived(filledDataRows.length);
  let advancedMaxTeamSize = $derived(Math.max(2, Math.ceil(totalPeople / 2)));
  
  // Check if grid has real data (not just empty placeholder)
  let hasRealData = $derived(parsedData.length > 0 && filledDataRows.length > 0);
  
  // Initialize empty grid when switching to advanced mode
  $effect(() => {
    if (mode === 'advanced' && parsedData.length === 0) {
      initializeEmptyGrid();
    }
  });
  
  // Generate QR code when needed
  $effect(() => {
    if (showQRCode && browser) {
      generateQRCode();
    }
  });
  
  function initializeEmptyGrid() {
    const headers = ['Name', 'Email', 'Department', 'Location'];
    const emptyRows = Array(DEFAULT_ROWS).fill(null).map(() => Array(DEFAULT_COLUMNS).fill(''));
    parsedData = [headers, ...emptyRows];
    nameColumn = 0;
    emailColumn = 1;
    criteriaColumn1 = 2;
    criteriaColumn2 = 3;
    criteriaName1 = 'Department';
    criteriaName2 = 'Location';
  }
  
  function autoDetectColumns(data: string[][]) {
    if (data.length === 0 || !hasHeader) return;
    
    const headers = data[0].map(h => h.toLowerCase());
    
    // Find name column
    const nameIdx = headers.findIndex(h => 
      h.includes('name') || h.includes('nom') || h === 'participant'
    );
    if (nameIdx >= 0) nameColumn = nameIdx;
    
    // Find email column
    const emailIdx = headers.findIndex(h => 
      h.includes('email') || h.includes('mail') || h.includes('courriel')
    );
    if (emailIdx >= 0) emailColumn = emailIdx;
    
    // Find potential criteria columns
    const deptIdx = headers.findIndex(h => 
      h.includes('department') || h.includes('dept') || h.includes('team') || 
      h.includes('équipe') || h.includes('service') || h.includes('entity')
    );
    if (deptIdx >= 0) {
      criteriaColumn1 = deptIdx;
      criteriaName1 = data[0][deptIdx];
    }
    
    const locIdx = headers.findIndex(h => 
      h.includes('location') || h.includes('office') || h.includes('city') ||
      h.includes('site') || h.includes('ville') || h.includes('bureau')
    );
    if (locIdx >= 0 && locIdx !== deptIdx) {
      criteriaColumn2 = locIdx;
      criteriaName2 = data[0][locIdx];
    }
  }
  
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
  function loadSampleData() {
    parsedData = [
      ['Name', 'Email', 'Department', 'Location'],
      ['Alice Johnson', 'alice@company.com', 'Engineering', 'New York'],
      ['Bob Smith', 'bob@company.com', 'Marketing', 'London'],
      ['Carol Williams', 'carol@company.com', 'Engineering', 'London'],
      ['David Brown', 'david@company.com', 'Sales', 'New York'],
      ['Emma Davis', 'emma@company.com', 'Engineering', 'Paris'],
      ['Frank Miller', 'frank@company.com', 'Marketing', 'New York'],
      ['Grace Wilson', 'grace@company.com', 'Sales', 'London'],
      ['Henry Moore', 'henry@company.com', 'Engineering', 'Paris'],
      ['Ivy Taylor', 'ivy@company.com', 'Marketing', 'Paris'],
      ['Jack Anderson', 'jack@company.com', 'Sales', 'New York'],
      ['Kate Roberts', 'kate@company.com', 'Engineering', 'London'],
      ['Leo Garcia', 'leo@company.com', 'Marketing', 'Paris']
    ];
    nameColumn = 0;
    emailColumn = 1;
    criteriaColumn1 = 2;
    criteriaColumn2 = 3;
    criteriaName1 = 'Department';
    criteriaName2 = 'Location';
    advancedGroups = [];
    advancedShuffled = false;
  }
  
  function clearData() {
    initializeEmptyGrid();
    advancedGroups = [];
    advancedShuffled = false;
    discussionTopics = [];
    showTopicsConfig = false;
  }
  
  // Template functions for use cases
  function loadNetworkingTemplate() {
    parsedData = [
      ['Name', 'Email', 'Department', 'Office Location'],
      ['Alice Johnson', 'alice@company.com', 'Engineering', 'New York'],
      ['Bob Smith', 'bob@company.com', 'Marketing', 'London'],
      ['Carol Williams', 'carol@company.com', 'Engineering', 'London'],
      ['David Brown', 'david@company.com', 'Sales', 'New York'],
      ['Emma Davis', 'emma@company.com', 'Engineering', 'Paris'],
      ['Frank Miller', 'frank@company.com', 'Marketing', 'New York'],
      ['Grace Wilson', 'grace@company.com', 'Sales', 'London'],
      ['Henry Moore', 'henry@company.com', 'Engineering', 'Paris'],
      ['Ivy Taylor', 'ivy@company.com', 'Marketing', 'Paris'],
      ['Jack Anderson', 'jack@company.com', 'Sales', 'New York'],
      ['Kate Roberts', 'kate@company.com', 'HR', 'London'],
      ['Leo Garcia', 'leo@company.com', 'Finance', 'Paris']
    ];
    nameColumn = 0;
    emailColumn = 1;
    criteriaColumn1 = 2;
    criteriaColumn2 = 3;
    criteriaName1 = 'Department';
    criteriaName2 = 'Office Location';
    advancedGroups = [];
    advancedShuffled = false;
    discussionTopics = [];
    showTopicsConfig = false;
  }
  
  function loadDiscussionTemplate() {
    parsedData = [
      ['Name', 'Email', 'Role'],
      ['Alice Johnson', 'alice@company.com', 'Developer'],
      ['Bob Smith', 'bob@company.com', 'Designer'],
      ['Carol Williams', 'carol@company.com', 'Product Manager'],
      ['David Brown', 'david@company.com', 'Developer'],
      ['Emma Davis', 'emma@company.com', 'Designer'],
      ['Frank Miller', 'frank@company.com', 'Product Manager'],
      ['Grace Wilson', 'grace@company.com', 'Developer'],
      ['Henry Moore', 'henry@company.com', 'Designer'],
      ['Ivy Taylor', 'ivy@company.com', 'Product Manager'],
      ['Jack Anderson', 'jack@company.com', 'Developer'],
      ['Kate Roberts', 'kate@company.com', 'Designer'],
      ['Leo Garcia', 'leo@company.com', 'Product Manager']
    ];
    nameColumn = 0;
    emailColumn = 1;
    criteriaColumn1 = 2;
    criteriaColumn2 = null;
    criteriaName1 = 'Role';
    criteriaName2 = 'Criteria 2';
    advancedGroups = [];
    advancedShuffled = false;
    // Pre-populate with sample discussion topics
    discussionTopics = [
      'How can we improve team collaboration?',
      'What tools would make your work easier?',
      'Ideas for the next team offsite',
      'Customer feedback themes to address'
    ];
    showTopicsConfig = true;
  }
  
  function loadRandomTemplate() {
    parsedData = [
      ['Name', 'Email'],
      ['Alice Johnson', 'alice@company.com'],
      ['Bob Smith', 'bob@company.com'],
      ['Carol Williams', 'carol@company.com'],
      ['David Brown', 'david@company.com'],
      ['Emma Davis', 'emma@company.com'],
      ['Frank Miller', 'frank@company.com'],
      ['Grace Wilson', 'grace@company.com'],
      ['Henry Moore', 'henry@company.com'],
      ['Ivy Taylor', 'ivy@company.com'],
      ['Jack Anderson', 'jack@company.com']
    ];
    nameColumn = 0;
    emailColumn = 1;
    criteriaColumn1 = null;
    criteriaColumn2 = null;
    criteriaName1 = 'Criteria 1';
    criteriaName2 = 'Criteria 2';
    advancedGroups = [];
    advancedShuffled = false;
    discussionTopics = [];
    showTopicsConfig = false;
  }
  
  function addTopic() {
    if (newTopic.trim() && discussionTopics.length < 20) {
      discussionTopics = [...discussionTopics, newTopic.trim()];
      newTopic = '';
    }
  }
  
  function removeTopic(index: number) {
    discussionTopics = discussionTopics.filter((_, i) => i !== index);
  }
  
  // File upload functions
  function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) processFile(file);
  }
  
  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragActive = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) processFile(file);
  }
  
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    dragActive = true;
  }
  
  function handleDragLeave() {
    dragActive = false;
  }
  
  function handlePaste(event: ClipboardEvent) {
    const text = event.clipboardData?.getData('text');
    if (text) {
      const result = parseTSV(text);
      if (result.length > 0) {
        parsedData = result;
        autoDetectColumns(result);
        advancedGroups = [];
        advancedShuffled = false;
      }
    }
  }
  
  async function processFile(file: File) {
    const text = await file.text();
    const result = parseTSV(text);
    if (result.length > 0) {
      parsedData = result;
      autoDetectColumns(result);
      advancedGroups = [];
      advancedShuffled = false;
    }
  }
  
  function triggerFileUpload() {
    fileInput?.click();
  }
  
  // Export CSV
  function exportCSV() {
    if (parsedData.length === 0) return;
    
    const csvContent = parsedData
      .map(row => row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma, newline or quote
        if (cell.includes(',') || cell.includes('\n') || cell.includes('"')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'group-shuffler-data.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
  
  function exportGroupsCSV() {
    if (advancedGroups.length === 0) return;
    
    const rows: string[][] = [['Group', 'Name', 'Email', ...Object.keys(advancedGroups[0]?.members[0]?.criteria || {})]];
    
    for (const group of advancedGroups) {
      for (const member of group.members) {
        rows.push([
          group.name,
          member.name,
          member.email || '',
          ...Object.values(member.criteria)
        ]);
      }
    }
    
    const csvContent = rows
      .map(row => row.map(cell => {
        if (cell.includes(',') || cell.includes('\n') || cell.includes('"')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'shuffled-groups.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
  
  // QR Code
  async function generateQRCode() {
    if (!browser) return;
    const url = window.location.href;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: { dark: '#1e3a5f', light: '#ffffff' }
      });
    } catch (err) {
      console.error('QR generation error:', err);
    }
  }
  
  function toggleQRCode() {
    showQRCode = !showQRCode;
  }
  
  // Save activity functions
  function openSaveDialog() {
    if (!$isAuthenticated) {
      // Redirect to sign in
      window.location.href = '/signin?callbackUrl=' + encodeURIComponent(window.location.href);
      return;
    }
    showSaveDialog = true;
    saveError = '';
  }
  
  function closeSaveDialog() {
    showSaveDialog = false;
    activityName = '';
    activityDescription = '';
    saveError = '';
  }
  
  async function saveActivity() {
    if (!activityName.trim()) {
      saveError = 'Please enter a name for this activity';
      return;
    }
    
    saving = true;
    saveError = '';
    
    try {
      const activityData: ShufflerActivityData = {
        type: 'shuffler',
        gridData: parsedData,
        config: {
          hasHeader,
          nameColumn,
          emailColumn,
          criteriaColumn1,
          criteriaColumn2,
          criteriaName1,
          criteriaName2,
          groupSize: teamSize,
        },
        results: advancedShuffled ? advancedGroups : undefined,
      };
      
      const response = await fetch('/api/tools/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'shuffler',
          name: activityName.trim(),
          description: activityDescription.trim() || undefined,
          data: activityData,
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        saveError = result.error || 'Failed to save activity';
        return;
      }
      
      savedActivity = { id: result.data.id, shareCode: result.data.shareCode };
      closeSaveDialog();
    } catch (err) {
      console.error('Error saving activity:', err);
      saveError = 'An error occurred while saving';
    } finally {
      saving = false;
    }
  }

  function updateCell(rowIndex: number, colIndex: number, value: string) {
    // Update the cell in parsedData (add 1 to rowIndex if hasHeader to account for header row)
    const actualRowIndex = hasHeader ? rowIndex + 1 : rowIndex;
    if (parsedData[actualRowIndex]) {
      parsedData[actualRowIndex][colIndex] = value;
      parsedData = [...parsedData]; // Trigger reactivity
    }
  }
  
  function deleteRow(rowIndex: number) {
    const actualRowIndex = hasHeader ? rowIndex + 1 : rowIndex;
    parsedData = parsedData.filter((_, i) => i !== actualRowIndex);
  }
  
  function addRow() {
    const newRow = new Array(columns.length).fill('');
    parsedData = [...parsedData, newRow];
  }
  
  function addColumn() {
    parsedData = parsedData.map((row, i) => {
      if (i === 0 && hasHeader) {
        return [...row, `Column ${row.length + 1}`];
      }
      return [...row, ''];
    });
  }
  
  function distributeAdvanced() {
    if (filledDataRows.length < 2) return;
    
    // Build people array (only from filled rows)
    const people: DistributionPerson[] = filledDataRows.map(row => {
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
  <title>Group Shuffler - unconf tools Lab</title>
  <meta name="description" content="Randomly distribute people into diverse groups. Paste from Excel, configure columns, and maximize team diversity." />
</svelte:head>

<div class="shuffler-container">
  <header>
    <div class="header-row">
      <a href="/" class="back">← unconf tools Lab</a>
      {#if hasRealData || advancedShuffled}
        <button class="save-activity-btn" onclick={openSaveDialog}>
          💾 {savedActivity ? 'Saved!' : 'Save Activity'}
        </button>
      {/if}
    </div>
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
    <!-- ADVANCED MODE - Data Grid -->
    <div class="standalone-notice">
      <span>📊</span>
      <p>
        <strong>Data Grid Mode</strong> - Upload a CSV/Excel file, paste data, or enter directly in the grid.
        <strong>Max 4 columns:</strong> 2 for personal info (name, email) + 2 for classification (department, location, etc.).
        <button class="qr-btn-inline" onclick={toggleQRCode}>📱 {showQRCode ? 'Hide' : 'Show'} QR Code</button>
      </p>
    </div>
    
    <!-- Use Case Examples -->
    <section class="use-cases">
      <h3>🎯 Quick Start Templates</h3>
      <p class="use-cases-intro">Choose a template based on your goal:</p>
      <div class="use-case-grid">
        <button class="use-case-card" onclick={loadNetworkingTemplate}>
          <span class="use-case-icon">🤝</span>
          <div class="use-case-content">
            <strong>Networking Groups</strong>
            <span>Mix people who don't know each other (by department/location)</span>
          </div>
        </button>
        <button class="use-case-card" onclick={loadDiscussionTemplate}>
          <span class="use-case-icon">💬</span>
          <div class="use-case-content">
            <strong>Discussion Tables</strong>
            <span>Assign groups to discuss predefined topics</span>
          </div>
        </button>
        <button class="use-case-card" onclick={loadRandomTemplate}>
          <span class="use-case-icon">🎲</span>
          <div class="use-case-content">
            <strong>Random Groups</strong>
            <span>Simple random distribution without criteria</span>
          </div>
        </button>
      </div>
    </section>
    
    {#if showQRCode && qrCodeDataUrl}
      <div class="qr-code-section">
        <img src={qrCodeDataUrl} alt="QR Code to share this activity" />
        <p>Scan to join this activity</p>
      </div>
    {/if}
    
    <!-- Hidden file input -->
    <input 
      type="file" 
      accept=".csv,.tsv,.txt,.xlsx,.xls"
      bind:this={fileInput}
      onchange={handleFileUpload}
      style="display: none;"
    />
    
    <!-- File Upload / Data Entry Section -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <section 
      class="data-entry-section"
      class:drag-active={dragActive}
      aria-label="Data entry area"
      ondrop={handleDrop}
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      onpaste={handlePaste}
    >
      <div class="input-header">
        <span class="section-label">Data Grid</span>
        <div class="header-actions">
          <button class="upload-btn" onclick={triggerFileUpload}>
            📁 Upload CSV
          </button>
          <button class="sample-btn" onclick={loadSampleData}>Load sample</button>
          {#if hasRealData}
            <button class="export-btn" onclick={exportCSV}>⬇️ Export CSV</button>
            <button class="clear-btn" onclick={clearData}>Clear</button>
          {/if}
        </div>
      </div>
      
      <!-- Editable Grid View -->
      <div class="grid-container" class:empty-grid={!hasRealData}>
        {#if hasRealData}
          <div class="grid-info">
            <span>{totalPeople} participant{totalPeople !== 1 ? 's' : ''} • {columns.length} columns</span>
          </div>
        {:else}
          <div class="grid-info empty">
            <span>📋 Paste data (Ctrl+V) or drag & drop a CSV file</span>
          </div>
        {/if}
        <div class="editable-grid-wrapper">
          <table class="editable-grid">
            <thead>
              <tr>
                <th class="row-number">#</th>
                {#each columns as col, i}
                  <th class:selected={i === nameColumn || i === emailColumn || i === criteriaColumn1 || i === criteriaColumn2}>
                    {#if hasHeader}
                      <input 
                        type="text" 
                        value={col} 
                        onchange={(e) => {
                          if (parsedData[0]) {
                            parsedData[0][i] = e.currentTarget.value;
                            parsedData = [...parsedData];
                          }
                        }}
                        class="header-input"
                        placeholder="Column {i + 1}"
                      />
                    {:else}
                      <span class="col-num">Col {i + 1}</span>
                    {/if}
                    <div class="col-badges">
                      {#if i === nameColumn}<span class="col-badge name">Name</span>{/if}
                      {#if i === emailColumn}<span class="col-badge email">Email</span>{/if}
                      {#if i === criteriaColumn1}<span class="col-badge criteria">C1</span>{/if}
                      {#if i === criteriaColumn2}<span class="col-badge criteria">C2</span>{/if}
                    </div>
                  </th>
                {/each}
                <th class="actions-col"></th>
              </tr>
            </thead>
            <tbody>
              {#each dataRows as row, rowIndex}
                <tr class:empty-row={!row.some(cell => cell.trim() !== '')}>
                  <td class="row-number">{rowIndex + 1}</td>
                  {#each row as cell, colIndex}
                    <td class:selected={colIndex === nameColumn || colIndex === emailColumn || colIndex === criteriaColumn1 || colIndex === criteriaColumn2}>
                      <input 
                        type="text" 
                        value={cell}
                        onchange={(e) => updateCell(rowIndex, colIndex, e.currentTarget.value)}
                        class="cell-input"
                        placeholder={rowIndex === 0 && !hasRealData ? (colIndex === 0 ? 'Alice Johnson' : colIndex === 1 ? 'alice@co.com' : colIndex === 2 ? 'Engineering' : 'NYC') : ''}
                      />
                    </td>
                  {/each}
                  <td class="actions-col">
                    <button class="delete-row-btn" onclick={() => deleteRow(rowIndex)} title="Delete row">🗑️</button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <div class="grid-footer">
          <button class="add-row-btn" onclick={addRow}>+ Add Row</button>
          <button class="add-col-btn" onclick={addColumn}>+ Add Column</button>
        </div>
      </div>
    </section>
    
    {#if parsedData.length > 0}
      <!-- Column Configuration -->
      <section class="column-config">
        <h3>📑 Column Configuration</h3>
        <p class="config-note">First row is treated as column headers. Maximum 4 columns: 2 for personal info, 2 for diversity criteria.</p>
        
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
        
        <h4>🎯 Diversity Criteria (2 max)</h4>
        <p class="config-help">Select up to 2 classification columns to maximize diversity in groups (e.g., mix departments, locations)</p>
        
        <div class="config-grid">
          <div class="config-item">
            <span class="config-label">Criteria 1</span>
            <select bind:value={criteriaColumn1}>
              <option value={null}>— None —</option>
              {#each columns as col, i}
                <option value={i}>{hasHeader ? col : `Column ${i + 1}`}</option>
              {/each}
            </select>
          </div>
          
          <div class="config-item">
            <span class="config-label">Criteria 2</span>
            <select bind:value={criteriaColumn2}>
              <option value={null}>— None —</option>
              {#each columns as col, i}
                <option value={i}>{hasHeader ? col : `Column ${i + 1}`}</option>
              {/each}
            </select>
          </div>
        </div>
      </section>
      
      <!-- Discussion Topics Config -->
      {#if showTopicsConfig || discussionTopics.length > 0}
        <section class="topics-config">
          <div class="topics-header">
            <h3>💬 Discussion Topics</h3>
            <button class="toggle-topics-btn" onclick={() => showTopicsConfig = !showTopicsConfig}>
              {showTopicsConfig ? 'Hide' : 'Edit Topics'}
            </button>
          </div>
          
          {#if showTopicsConfig}
            <p class="topics-help">Define topics to assign to each group. Topics will be distributed evenly.</p>
            
            <div class="topic-input-row">
              <input 
                type="text" 
                bind:value={newTopic}
                placeholder="Enter a discussion topic..."
                maxlength="200"
                onkeydown={(e) => e.key === 'Enter' && addTopic()}
              />
              <button onclick={addTopic} disabled={!newTopic.trim()}>+ Add</button>
            </div>
            
            {#if discussionTopics.length > 0}
              <ul class="topics-list">
                {#each discussionTopics as topic, i}
                  <li>
                    <span class="topic-number">{i + 1}</span>
                    <span class="topic-text">{topic}</span>
                    <button class="remove-topic-btn" onclick={() => removeTopic(i)}>×</button>
                  </li>
                {/each}
              </ul>
            {/if}
          {:else if discussionTopics.length > 0}
            <p class="topics-summary">{discussionTopics.length} topic{discussionTopics.length !== 1 ? 's' : ''} configured</p>
          {/if}
        </section>
      {/if}
      
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
              <div class="results-actions">
                <button class="export-btn" onclick={exportGroupsCSV}>
                  ⬇️ Export CSV
                </button>
                <button class="copy-btn" onclick={copyAdvancedGroups}>
                  {copied ? '✓ Copied!' : '📋 Copy All'}
                </button>
              </div>
            </div>
            
            <div class="teams-grid advanced">
              {#each advancedGroups as group, groupIndex}
                {@const assignedTopic = discussionTopics.length > 0 ? discussionTopics[groupIndex % discussionTopics.length] : null}
                <div class="team-card advanced">
                  <h3>{group.name}</h3>
                  {#if assignedTopic}
                    <div class="assigned-topic">
                      <span class="topic-label">💬 Topic:</span>
                      <span class="topic-value">{assignedTopic}</span>
                    </div>
                  {/if}
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
      {:else if hasRealData}
        <div class="warning-box">
          <p>Need at least 2 participants to create groups.</p>
        </div>
      {/if}
    {/if}
  {/if}
</div>

<!-- Save Activity Dialog -->
{#if showSaveDialog}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={closeSaveDialog} onkeydown={(e) => e.key === 'Escape' && closeSaveDialog()}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <h2>💾 Save Activity</h2>
      <p class="modal-subtitle">Save this shuffler to access it later or share with others</p>
      
      <form onsubmit={(e) => { e.preventDefault(); saveActivity(); }}>
        <div class="form-group">
          <label for="activity-name">Activity Name *</label>
          <input 
            id="activity-name"
            type="text" 
            bind:value={activityName}
            placeholder="e.g., Team Building Workshop"
            maxlength="100"
          />
        </div>
        
        <div class="form-group">
          <label for="activity-desc">Description (optional)</label>
          <textarea 
            id="activity-desc"
            bind:value={activityDescription}
            placeholder="Add notes about this activity..."
            rows="2"
          ></textarea>
        </div>
        
        {#if saveError}
          <div class="save-error">{saveError}</div>
        {/if}
        
        <div class="modal-actions">
          <button type="button" class="cancel-btn" onclick={closeSaveDialog}>Cancel</button>
          <button type="submit" class="save-btn" disabled={saving}>
            {saving ? 'Saving...' : 'Save Activity'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Saved confirmation -->
{#if savedActivity}
  <div class="saved-toast">
    ✅ Activity saved! Share code: <strong>{savedActivity.shareCode}</strong>
    <button onclick={() => savedActivity = null}>×</button>
  </div>
{/if}

<style>
  .shuffler-container {
    max-width: 900px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
    font-family: system-ui, -apple-system, sans-serif;
    color: #e4e4e7;
  }
  
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .back {
    color: #a1a1aa;
    text-decoration: none;
    font-size: 0.875rem;
  }
  
  .back:hover {
    color: #e4e4e7;
  }
  
  .save-activity-btn {
    padding: 0.5rem 1rem;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.8rem;
    cursor: pointer;
    font-weight: 500;
  }
  
  .save-activity-btn:hover {
    background: #059669;
  }
  
  header {
    margin-bottom: 1.5rem;
  }
  
  h1 {
    font-size: 1.75rem;
    margin: 1rem 0 0.25rem;
    color: #f4f4f5;
  }
  
  .subtitle {
    color: #a1a1aa;
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
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    color: #e4e4e7;
  }
  
  .mode-btn:hover {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.1);
  }
  
  .mode-btn.active {
    background: #6366f1;
    border-color: #6366f1;
    color: white;
  }
  
  .link-btn {
    background: none;
    border: none;
    color: #a5b4fc;
    text-decoration: underline;
    cursor: pointer;
    font: inherit;
    padding: 0;
  }
  
  .standalone-notice {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    background: rgba(99, 102, 241, 0.1);
    border: 1px solid rgba(99, 102, 241, 0.3);
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
    color: var(--color-text-secondary);
  }
  
  .qr-btn-inline {
    background: none;
    border: 1px solid rgba(99, 102, 241, 0.4);
    color: var(--color-primary);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    cursor: pointer;
    margin-left: 0.5rem;
  }
  
  .qr-btn-inline:hover {
    background: rgba(99, 102, 241, 0.2);
  }
  
  /* QR Code Section */
  .qr-code-section {
    text-align: center;
    padding: 1.5rem;
    background: var(--color-surface-secondary);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    margin-bottom: 1.5rem;
  }
  
  .qr-code-section img {
    display: block;
    margin: 0 auto;
    border-radius: 8px;
  }
  
  .qr-code-section p {
    margin: 0.75rem 0 0;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }
  
  /* Data Entry Section */
  .data-entry-section {
    margin-bottom: 1.5rem;
    transition: all 0.2s;
  }
  
  .data-entry-section.drag-active {
    background: #eff6ff;
    border-radius: 12px;
    padding: 1rem;
    margin: -1rem;
    margin-bottom: 0.5rem;
  }
  
  .upload-btn {
    padding: 0.25rem 0.75rem;
    background: #2563eb;
    border: none;
    border-radius: 4px;
    font-size: 0.75rem;
    color: white;
    cursor: pointer;
  }
  
  .upload-btn:hover {
    background: #1d4ed8;
  }
  
  .export-btn {
    padding: 0.25rem 0.5rem;
    background: #d1fae5;
    border: 1px solid #6ee7b7;
    border-radius: 4px;
    font-size: 0.75rem;
    color: #065f46;
    cursor: pointer;
  }
  
  .export-btn:hover {
    background: #a7f3d0;
  }
  
  .results-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
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
  
  .section-label {
    font-weight: 500;
    font-size: 0.9rem;
  }
  
  .header-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .clear-btn {
    padding: 0.25rem 0.5rem;
    background: none;
    border: 1px solid #fca5a5;
    border-radius: 4px;
    font-size: 0.75rem;
    color: #dc2626;
    cursor: pointer;
  }
  
  .clear-btn:hover {
    background: #fef2f2;
  }

  /* Editable Grid */
  .grid-container {
    border: 2px solid var(--color-border);
    border-radius: 10px;
    overflow: hidden;
    background: var(--color-surface-secondary);
  }
  
  .grid-info {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    font-size: 0.8rem;
    color: var(--color-text-secondary);
  }
  
  .editable-grid-wrapper {
    max-height: 400px;
    overflow: auto;
  }
  
  .editable-grid {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  
  .editable-grid th,
  .editable-grid td {
    border: 1px solid var(--color-border);
    padding: 0.25rem;
    text-align: left;
  }
  
  .editable-grid th {
    background: var(--color-surface);
    font-weight: 500;
    position: sticky;
    top: 0;
    z-index: 1;
    min-width: 100px;
  }
  
  .editable-grid th.selected,
  .editable-grid td.selected {
    background: rgba(99, 102, 241, 0.1);
  }
  
  .editable-grid th.row-number,
  .editable-grid td.row-number {
    width: 40px;
    min-width: 40px;
    text-align: center;
    background: var(--color-surface);
    color: var(--color-text-tertiary);
    font-size: 0.75rem;
    font-weight: normal;
  }
  
  .editable-grid th.actions-col,
  .editable-grid td.actions-col {
    width: 50px;
    min-width: 50px;
    text-align: center;
    background: var(--color-surface);
  }
  
  .header-input {
    width: 100%;
    padding: 0.375rem 0.5rem;
    border: none;
    background: transparent;
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--color-text-primary);
  }
  
  .header-input:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: -2px;
    background: var(--color-surface-secondary);
    border-radius: 4px;
  }
  
  .col-num {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    padding: 0.375rem 0.5rem;
    display: block;
  }
  
  .col-badges {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem 0;
    flex-wrap: wrap;
  }
  
  .cell-input {
    width: 100%;
    padding: 0.375rem 0.5rem;
    border: none;
    background: transparent;
    font-size: 0.85rem;
    color: var(--color-text-primary);
  }
  
  .cell-input::placeholder {
    color: var(--color-text-tertiary);
  }
  
  .cell-input:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: -2px;
    background: rgba(99, 102, 241, 0.1);
    border-radius: 4px;
  }
  
  .delete-row-btn {
    padding: 0.25rem;
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0.5;
    font-size: 0.9rem;
  }
  
  .delete-row-btn:hover {
    opacity: 1;
  }
  
  .grid-footer {
    display: flex;
    border-top: 1px solid var(--color-border);
  }
  
  .add-row-btn, .add-col-btn {
    flex: 1;
    padding: 0.5rem;
    background: var(--color-surface);
    border: none;
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .add-row-btn {
    border-right: 1px solid var(--color-border);
  }
  
  .add-row-btn:hover, .add-col-btn:hover {
    background: rgba(99, 102, 241, 0.1);
    color: var(--color-text-primary);
  }
  
  .grid-container.empty-grid {
    border-style: dashed;
    border-color: var(--color-border);
  }
  
  .grid-info.empty {
    text-align: center;
    justify-content: center;
    padding: 0.75rem;
    color: var(--color-text-tertiary);
  }
  
  .empty-row td {
    background: #fafafa;
  }
  
  .empty-row .cell-input::placeholder {
    color: #d1d5db;
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
    background: var(--color-surface-secondary);
    padding: 1.5rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
  }
  
  .column-config h3 {
    margin: 0 0 0.5rem;
    font-size: 1.1rem;
    color: var(--color-text-primary);
  }
  
  .column-config h4 {
    margin: 1.5rem 0 0.5rem;
    font-size: 1rem;
    color: var(--color-text-primary);
  }
  
  .config-note,
  .config-help {
    margin: 0 0 1rem;
    font-size: 0.85rem;
    color: var(--color-text-secondary);
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
    color: var(--color-text-primary);
  }
  
  .config-item select {
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    font-size: 0.9rem;
    background: var(--color-surface);
    color: var(--color-text-primary);
  }
  
  .criteria-name-input {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.85rem;
  }
  
  .col-badge {
    display: inline-block;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    font-size: 0.65rem;
    font-weight: 600;
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
    background: var(--color-surface-secondary);
    padding: 1.5rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    border: 1px solid var(--color-border);
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
    color: var(--color-text-primary);
  }
  
  .size-input {
    display: flex;
    align-items: center;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
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
    color: var(--color-text-primary);
    transition: background 0.2s;
  }
  
  .size-btn:hover:not(:disabled) {
    background: rgba(99, 102, 241, 0.1);
  }
  
  .size-btn:disabled {
    color: var(--color-text-tertiary);
    cursor: not-allowed;
  }
  
  .size-value {
    width: 40px;
    text-align: center;
    font-weight: 600;
    font-size: 1.125rem;
    color: var(--color-text-primary);
  }
  
  .team-count {
    color: var(--color-text-secondary);
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
  
  /* Modal styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }
  
  .modal-content {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
  }
  
  .modal-content h2 {
    margin: 0 0 0.5rem;
    font-size: 1.25rem;
  }
  
  .modal-subtitle {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0 0 1.5rem;
  }
  
  .modal-content .form-group {
    margin-bottom: 1rem;
  }
  
  .modal-content .form-group label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }
  
  .modal-content .form-group input,
  .modal-content .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 1rem;
    box-sizing: border-box;
  }
  
  .modal-content .form-group input:focus,
  .modal-content .form-group textarea:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
  
  .save-error {
    color: #ef4444;
    font-size: 0.875rem;
    margin-bottom: 1rem;
    padding: 0.5rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 6px;
  }
  
  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }
  
  .cancel-btn {
    padding: 0.75rem 1rem;
    background: var(--color-surface);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    font-size: 0.875rem;
    cursor: pointer;
  }
  
  .cancel-btn:hover {
    background: var(--color-surface-secondary);
  }
  
  .save-btn {
    padding: 0.75rem 1.5rem;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }
  
  .save-btn:hover:not(:disabled) {
    background: #059669;
  }
  
  .save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .saved-toast {
    position: fixed;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    background: #10b981;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.9rem;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    z-index: 1001;
  }
  
  .saved-toast button {
    background: none;
    border: none;
    color: white;
    font-size: 1.25rem;
    cursor: pointer;
    opacity: 0.8;
  }
  
  .saved-toast button:hover {
    opacity: 1;
  }
  
  /* Use Cases Section */
  .use-cases {
    margin-bottom: 1.5rem;
    padding: 1.25rem;
    background: rgba(99, 102, 241, 0.08);
    border: 1px solid rgba(99, 102, 241, 0.25);
    border-radius: 12px;
  }
  
  .use-cases h3 {
    margin: 0 0 0.5rem;
    font-size: 1.1rem;
    color: #a5b4fc;
  }
  
  .use-cases-intro {
    margin: 0 0 1rem;
    font-size: 0.85rem;
    color: #a1a1aa;
  }
  
  .use-case-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
  }
  
  .use-case-card {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
    color: #e4e4e7;
  }
  
  .use-case-card:hover {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.1);
  }
  
  .use-case-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }
  
  .use-case-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .use-case-content strong {
    font-size: 0.9rem;
    color: #f4f4f5;
  }
  
  .use-case-content span {
    font-size: 0.75rem;
    color: #a1a1aa;
    line-height: 1.4;
  }
  
  /* Topics Configuration */
  .topics-config {
    background: rgba(254, 252, 232, 0.1);
    border: 1px solid rgba(253, 224, 71, 0.3);
    border-radius: 12px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
  }
  
  .topics-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  
  .topics-header h3 {
    margin: 0;
    font-size: 1rem;
    color: var(--color-text-primary);
  }
  
  .toggle-topics-btn {
    padding: 0.25rem 0.75rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 0.75rem;
    cursor: pointer;
    color: var(--color-text-primary);
  }
  
  .toggle-topics-btn:hover {
    background: var(--color-surface-secondary);
  }
  
  .topics-help {
    margin: 0 0 1rem;
    font-size: 0.85rem;
    color: var(--color-text-secondary);
  }
  
  .topics-summary {
    margin: 0;
    font-size: 0.85rem;
    color: var(--color-text-secondary);
  }
  
  .topic-input-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .topic-input-row input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    font-size: 0.9rem;
    background: var(--color-surface);
    color: var(--color-text-primary);
  }
  
  .topic-input-row input::placeholder {
    color: var(--color-text-tertiary);
  }
  
  .topic-input-row input:focus {
    outline: none;
    border-color: #eab308;
  }
  
  .topic-input-row button {
    padding: 0.5rem 1rem;
    background: #eab308;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
  }
  
  .topic-input-row button:hover:not(:disabled) {
    background: #ca8a04;
  }
  
  .topic-input-row button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .topics-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  
  .topics-list li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;
    background: white;
    border-radius: 6px;
    margin-bottom: 0.5rem;
  }
  
  .topics-list li:last-child {
    margin-bottom: 0;
  }
  
  .topic-number {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fef08a;
    border-radius: 50%;
    font-size: 0.75rem;
    font-weight: 600;
    color: #854d0e;
    flex-shrink: 0;
  }
  
  .topic-text {
    flex: 1;
    font-size: 0.9rem;
    color: #374151;
  }
  
  .remove-topic-btn {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: #dc2626;
    font-size: 1.25rem;
    cursor: pointer;
    opacity: 0.5;
  }
  
  .remove-topic-btn:hover {
    opacity: 1;
  }
  
  /* Assigned Topic in Group Card */
  .assigned-topic {
    background: linear-gradient(135deg, #fef9c3 0%, #fef08a 100%);
    border-radius: 8px;
    padding: 0.75rem;
    margin-bottom: 0.75rem;
  }
  
  .topic-label {
    display: block;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #92400e;
    margin-bottom: 0.25rem;
  }
  
  .topic-value {
    font-size: 0.9rem;
    color: #78350f;
    font-weight: 500;
    line-height: 1.4;
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
    
    .header-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
    
    .use-case-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
