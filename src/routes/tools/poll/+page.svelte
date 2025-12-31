<script lang="ts">
  import QRCode from 'qrcode';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  
  type PollType = 'options' | 'open';
  
  type OpenResponse = {
    id: string;
    text: string;
    votes: number;
  };
  
  type LocalPoll = {
    id: string;
    question: string;
    pollType: PollType;
    options: string[];
    votes: Record<string, number>;
    openResponses: OpenResponse[];
    maxWords: number;
    status: 'open' | 'closed';
    allowMultiple: boolean;
    maxVotesPerPerson: number;
  };
  
  // Poll state (local only in standalone mode)
  let activePoll = $state<LocalPoll | null>(null);
  let voted = $state(false);
  let votedOptions = $state<string[]>([]);
  let openResponse = $state('');
  let upvotedResponses = $state<string[]>([]); // Track which responses user has upvoted
  
  // View mode: 'setup' (creating poll) | 'results' (display for participants) | 'participate' (joined via URL) | 'not-found' (poll link not found)
  let viewMode = $state<'setup' | 'results' | 'participate' | 'not-found'>('setup');
  
  // Track if we came from a shared link
  let sharedPollId = $state<string | null>(null);
  
  // Create poll form
  let question = $state('');
  let pollType = $state<PollType>('options');
  let options = $state(['', '']);
  let allowMultiple = $state(false);
  let maxWords = $state(10);
  let maxVotesPerPerson = $state(3); // Default limit for open response upvotes
  
  // Track user's vote count for limits
  let userVoteCount = $state(0);
  
  // QR Code
  let showQRCode = $state(false);
  let qrCodeDataUrl = $state('');
  
  // Share link
  let shareLink = $state('');
  let linkCopied = $state(false);
  
  // Poll ID for sharing (stored in sessionStorage for persistence)
  let pollId = $state('');
  
  let totalVotes = $derived(activePoll 
    ? Object.values(activePoll.votes).reduce((sum, count) => sum + count, 0)
    : 0);
  
  let wordCount = $derived(openResponse.trim() ? openResponse.trim().split(/\s+/).length : 0);
  let isOverWordLimit = $derived(activePoll ? wordCount > activePoll.maxWords : false);
  
  // Sort open responses by votes (highest first)
  let sortedResponses = $derived(
    activePoll?.openResponses 
      ? [...activePoll.openResponses].sort((a, b) => b.votes - a.votes)
      : []
  );
  
  let totalResponseVotes = $derived(
    activePoll?.openResponses 
      ? activePoll.openResponses.reduce((sum, r) => sum + r.votes, 0)
      : 0
  );
  
  // Generate a unique poll ID
  function generatePollId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }
  
  // Load poll from sessionStorage or URL
  onMount(() => {
    if (!browser) return;
    
    // Check URL for poll ID
    const urlPollId = $page.url.searchParams.get('id');
    
    if (urlPollId) {
      // Try to load from sessionStorage
      const storedPoll = sessionStorage.getItem(`poll_${urlPollId}`);
      if (storedPoll) {
        try {
          activePoll = JSON.parse(storedPoll);
          pollId = urlPollId;
          viewMode = 'participate';
          updateShareLink();
        } catch (e) {
          console.error('Failed to load poll:', e);
        }
      } else {
        // Poll not found - show helpful message
        sharedPollId = urlPollId;
        viewMode = 'not-found';
      }
    }
    
    // Set up storage event listener for cross-tab sync
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  });
  
  function handleStorageChange(e: StorageEvent) {
    if (e.key === `poll_${pollId}` && e.newValue && activePoll) {
      try {
        const updatedPoll = JSON.parse(e.newValue);
        activePoll = updatedPoll;
      } catch (err) {
        console.error('Failed to sync poll:', err);
      }
    }
  }
  
  // Save poll to sessionStorage
  function savePoll() {
    if (!browser || !activePoll || !pollId) return;
    sessionStorage.setItem(`poll_${pollId}`, JSON.stringify(activePoll));
    // Trigger storage event for other tabs
    window.dispatchEvent(new StorageEvent('storage', {
      key: `poll_${pollId}`,
      newValue: JSON.stringify(activePoll)
    }));
  }
  
  // Update share link when poll is created
  function updateShareLink() {
    if (!browser || !pollId) return;
    const url = new URL(window.location.href);
    url.searchParams.set('id', pollId);
    shareLink = url.toString();
  }
  
  // Generate QR code when needed
  $effect(() => {
    if (showQRCode && browser && shareLink) {
      generateQRCode();
    }
  });
  
  async function generateQRCode() {
    if (!browser || !shareLink) return;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(shareLink, {
        width: 200,
        margin: 2,
        color: { dark: '#1e3a5f', light: '#ffffff' }
      });
    } catch (err) {
      console.error('QR generation error:', err);
    }
  }
  
  async function copyShareLink() {
    if (!browser || !shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      linkCopied = true;
      setTimeout(() => linkCopied = false, 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }
  
  function addOption() {
    if (options.length < 10) {
      options = [...options, ''];
    }
  }
  
  function removeOption(index: number) {
    if (options.length > 2) {
      options = options.filter((_, i) => i !== index);
    }
  }
  
  function createPoll() {
    if (!question.trim()) return;
    
    // Generate unique poll ID
    pollId = generatePollId();
    
    if (pollType === 'options') {
      const validOptions = options.filter(o => o.trim());
      if (validOptions.length < 2) return;
      
      activePoll = {
        id: pollId,
        question: question.trim(),
        pollType: 'options',
        options: validOptions,
        votes: Object.fromEntries(validOptions.map(o => [o, 0])),
        openResponses: [],
        maxWords: 10,
        status: 'open',
        allowMultiple,
        maxVotesPerPerson: 1, // One vote per person for fixed options
      };
    } else {
      activePoll = {
        id: pollId,
        question: question.trim(),
        pollType: 'open',
        options: [],
        votes: {},
        openResponses: [],
        maxWords,
        status: 'open',
        allowMultiple: false,
        maxVotesPerPerson, // Use configurable limit for open responses
      };
    }
    
    // Save to sessionStorage and update URL
    savePoll();
    updateShareLink();
    
    // Update browser URL without navigation
    if (browser) {
      const url = new URL(window.location.href);
      url.searchParams.set('id', pollId);
      window.history.pushState({}, '', url.toString());
    }
    
    // Switch to results view for real-time display
    viewMode = 'results';
  }
  
  function backToSetup() {
    // Clear URL parameter
    if (browser) {
      const url = new URL(window.location.href);
      url.searchParams.delete('id');
      window.history.pushState({}, '', url.toString());
    }
    
    viewMode = 'setup';
    activePoll = null;
    voted = false;
    votedOptions = [];
    openResponse = '';
    upvotedResponses = [];
    userVoteCount = 0;
    pollId = '';
    shareLink = '';
  }
  
  function vote(option: string) {
    if (!activePoll || activePoll.pollType !== 'options') return;
    
    if (activePoll.allowMultiple) {
      // Toggle selection for multiple choice
      if (votedOptions.includes(option)) {
        votedOptions = votedOptions.filter(o => o !== option);
        activePoll.votes[option]--;
      } else {
        votedOptions = [...votedOptions, option];
        activePoll.votes[option]++;
      }
      activePoll = activePoll; // trigger reactivity
      savePoll();
    } else {
      // Single choice
      if (voted) return;
      activePoll.votes[option]++;
      activePoll = activePoll;
      voted = true;
      votedOptions = [option];
      savePoll();
    }
  }
  
  function submitOpenResponse() {
    if (!activePoll || !openResponse.trim() || isOverWordLimit) return;
    
    const newResponse: OpenResponse = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: openResponse.trim(),
      votes: 0,
    };
    activePoll.openResponses = [...activePoll.openResponses, newResponse];
    activePoll = activePoll;
    savePoll();
    // Don't set voted=true so user can still add more responses and upvote
    openResponse = '';
  }
  
  function upvoteResponse(responseId: string) {
    if (!activePoll) return;
    
    const hasUpvoted = upvotedResponses.includes(responseId);
    
    if (hasUpvoted) {
      // Remove upvote
      upvotedResponses = upvotedResponses.filter(id => id !== responseId);
      userVoteCount--;
      activePoll.openResponses = activePoll.openResponses.map(r => 
        r.id === responseId ? { ...r, votes: r.votes - 1 } : r
      );
    } else {
      // Check vote limit
      if (userVoteCount >= activePoll.maxVotesPerPerson) {
        return; // Max votes reached
      }
      // Add upvote
      upvotedResponses = [...upvotedResponses, responseId];
      userVoteCount++;
      activePoll.openResponses = activePoll.openResponses.map(r => 
        r.id === responseId ? { ...r, votes: r.votes + 1 } : r
      );
    }
    activePoll = activePoll; // trigger reactivity
    savePoll();
  }
  
  function submitMultipleVote() {
    if (votedOptions.length === 0) return;
    voted = true;
    savePoll();
  }
  
  function closePoll() {
    // Remove from sessionStorage
    if (browser && pollId) {
      sessionStorage.removeItem(`poll_${pollId}`);
    }
    
    // Clear URL parameter
    if (browser) {
      const url = new URL(window.location.href);
      url.searchParams.delete('id');
      window.history.pushState({}, '', url.toString());
    }
    
    activePoll = null;
    voted = false;
    votedOptions = [];
    openResponse = '';
    upvotedResponses = [];
    userVoteCount = 0;
    pollId = '';
    shareLink = '';
    viewMode = 'setup'; // Return to setup view
  }
  
  function resetForNewPoll() {
    // Remove from sessionStorage
    if (browser && pollId) {
      sessionStorage.removeItem(`poll_${pollId}`);
    }
    
    // Clear URL parameter
    if (browser) {
      const url = new URL(window.location.href);
      url.searchParams.delete('id');
      window.history.pushState({}, '', url.toString());
    }
    
    activePoll = null;
    voted = false;
    votedOptions = [];
    openResponse = '';
    upvotedResponses = [];
    userVoteCount = 0;
    pollId = '';
    shareLink = '';
    viewMode = 'setup'; // Return to setup view
    // Clear form fields for new poll
    question = '';
    options = ['', ''];
    allowMultiple = false;
    maxWords = 10;
    maxVotesPerPerson = 3;
  }
  
  function toggleQRCode() {
    showQRCode = !showQRCode;
  }
</script>

<svelte:head>
  <title>Quick Poll - Event Tools Lab</title>
  <meta name="description" content="Create instant polls with live results. Free, no signup required." />
</svelte:head>

<div class="poll-container">
  <header>
    <a href="/" class="back">← Event Tools Lab</a>
    <h1>🗳️ Quick Poll</h1>
    <p class="subtitle">Create instant polls with live results</p>
  </header>
  
  <div class="standalone-notice">
    <span>💡</span>
    <p>
      {#if activePoll && shareLink}
        <strong>Share this poll</strong> - Copy link or scan QR to let others vote.
        <button class="qr-btn-inline" onclick={toggleQRCode}>📱 {showQRCode ? 'Hide' : 'Show'} QR Code</button>
      {:else}
        <strong>Standalone mode</strong> - Create a poll to get a shareable link.
        <button class="qr-btn-inline" onclick={toggleQRCode}>📱 {showQRCode ? 'Hide' : 'Show'} QR Code</button>
      {/if}
    </p>
  </div>
  
  {#if activePoll && shareLink}
    <div class="share-section">
      <div class="share-link-container">
        <input type="text" readonly value={shareLink} class="share-link-input" />
        <button class="copy-btn" onclick={() => { 
          navigator.clipboard.writeText(shareLink);
          // Could add a toast here
        }}>📋 Copy</button>
      </div>
    </div>
  {/if}
  
  {#if showQRCode && qrCodeDataUrl}
    <div class="qr-code-section">
      <img src={qrCodeDataUrl} alt="QR Code to share this poll" />
      <p>{activePoll ? 'Scan to join this poll' : 'Scan to open poll tool'}</p>
    </div>
  {/if}
  
  <!-- View Mode Selector (shown when poll is active) -->
  {#if activePoll && viewMode === 'results'}
    <div class="view-mode-controls">
      <button class="back-to-setup-btn" onclick={backToSetup}>
        ← Back to Setup
      </button>
      <div class="view-info">
        <span class="live-indicator">🟢</span>
        <strong>Live Results View</strong> - Display this screen for participants to see responses in real-time
      </div>
    </div>
  {/if}
  
  {#if viewMode === 'not-found'}
    <section class="poll-not-found">
      <div class="not-found-icon">🔍</div>
      <h2>Poll Not Found</h2>
      <p class="not-found-message">
        This poll link (<code>{sharedPollId}</code>) doesn't exist on this device.
      </p>
      <div class="not-found-explanation">
        <h3>Why?</h3>
        <p>
          The standalone Quick Poll stores data <strong>locally in your browser</strong>. 
          This means polls can only be accessed from the same device/browser that created them.
        </p>
        <h3>Solutions:</h3>
        <ul>
          <li>📺 <strong>Share your screen</strong> - The poll creator can display results for everyone</li>
          <li>🎫 <strong>Use Event Mode</strong> - <a href="/create">Create an event</a> for cross-device polling with real-time sync</li>
          <li>➕ <strong>Create your own poll</strong> below</li>
        </ul>
      </div>
      <button class="create-new-btn" onclick={() => { viewMode = 'setup'; sharedPollId = null; }}>
        ➕ Create New Poll
      </button>
    </section>
  {/if}
  
  {#if viewMode === 'setup' && !activePoll}
    <section class="create-poll">
      <h2>Create a Poll</h2>
      
      <form onsubmit={(e) => { e.preventDefault(); createPoll(); }}>
        <div class="form-group">
          <label for="question">Question</label>
          <input 
            id="question"
            type="text" 
            bind:value={question}
            placeholder="What should we discuss next?"
            maxlength="200"
          />
        </div>
        
        <div class="form-group poll-type-selector">
          <span class="form-label">Response Type</span>
          <div class="type-options">
            <button 
              type="button" 
              class="type-option" 
              class:active={pollType === 'options'}
              onclick={() => pollType = 'options'}
            >
              <span class="type-icon">📊</span>
              <span class="type-name">Fixed Options</span>
              <span class="type-desc">Participants choose from your options</span>
            </button>
            <button 
              type="button" 
              class="type-option" 
              class:active={pollType === 'open'}
              onclick={() => pollType = 'open'}
            >
              <span class="type-icon">✍️</span>
              <span class="type-name">Open Responses</span>
              <span class="type-desc">Participants write their own answers</span>
            </button>
          </div>
        </div>
        
        {#if pollType === 'options'}
          <div class="form-group">
            <span class="form-label">Options</span>
            {#each options as option, i}
              <div class="option-row">
                <input 
                  type="text" 
                  bind:value={options[i]}
                  placeholder="Option {i + 1}"
                  maxlength="100"
                />
                {#if options.length > 2}
                  <button type="button" class="remove-btn" onclick={() => removeOption(i)}>×</button>
                {/if}
              </div>
            {/each}
            {#if options.length < 10}
              <button type="button" class="add-option-btn" onclick={addOption}>
                + Add option
              </button>
            {/if}
          </div>
          
          <div class="form-group vote-type-group">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={allowMultiple} />
              <span>Allow multiple selections</span>
            </label>
            <p class="help-text">{allowMultiple ? 'Participants can select multiple options' : 'Participants can only select one option'}</p>
          </div>
        {:else}
          <div class="form-group word-limit-group">
            <label for="maxWords">Word Limit</label>
            <div class="word-limit-control">
              <input 
                id="maxWords"
                type="range" 
                min="3" 
                max="50" 
                bind:value={maxWords}
              />
              <span class="word-limit-value">{maxWords} words</span>
            </div>
            <p class="help-text">Responses will be limited to {maxWords} words maximum</p>
          </div>
          
          <div class="form-group vote-limit-group">
            <label for="maxVotesPerPerson">Votes Per Person</label>
            <div class="vote-limit-control">
              <input 
                id="maxVotesPerPerson"
                type="range" 
                min="1" 
                max="10" 
                bind:value={maxVotesPerPerson}
              />
              <span class="vote-limit-value">{maxVotesPerPerson} vote{maxVotesPerPerson !== 1 ? 's' : ''}</span>
            </div>
            <p class="help-text">Each participant can vote for up to {maxVotesPerPerson} response{maxVotesPerPerson !== 1 ? 's' : ''}</p>
          </div>
        {/if}
        
        <button 
          type="submit" 
          class="create-btn" 
          disabled={!question.trim() || (pollType === 'options' && options.filter(o => o.trim()).length < 2)}
        >
          🗳️ Start Poll
        </button>
      </form>
    </section>
  {:else if viewMode === 'results' && activePoll}
    <!-- Results View - Real-time Display -->
    <section class="results-display">
      <div class="poll-header">
        <div class="live-status">
          <span class="pulse-dot">🔴</span>
          <strong>LIVE RESULTS</strong>
          <span class="auto-update-text">Auto-updating</span>
        </div>
        <h2>{activePoll.question}</h2>
        <div class="poll-meta">
          {#if activePoll.pollType === 'options'}
            {#if activePoll.allowMultiple}
              <span class="poll-type-badge">📊 Multiple choice</span>
            {:else}
              <span class="poll-type-badge single">🎯 Single choice</span>
            {/if}
          {:else}
            <span class="poll-type-badge open">✍️ Open responses • {activePoll.maxWords} words max</span>
            <span class="poll-type-badge votes-limit">👆 {activePoll.maxVotesPerPerson} vote{activePoll.maxVotesPerPerson !== 1 ? 's' : ''} per person</span>
          {/if}
        </div>
      </div>
      
      {#if activePoll.pollType === 'options'}
        <div class="poll-options">
          {#each activePoll.options as option}
            {@const voteCount = activePoll.votes[option] || 0}
            {@const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0}
            {@const isSelected = votedOptions.includes(option)}
            
            <button 
              class="poll-option"
              class:voted
              class:selected={isSelected}
              onclick={() => vote(option)}
              disabled={!activePoll.allowMultiple && voted}
            >
              {#if activePoll.allowMultiple && !voted}
                <span class="checkbox-indicator" class:checked={isSelected}>{isSelected ? '☑' : '☐'}</span>
              {/if}
              <span class="option-text">{option}</span>
              <span class="vote-count">{voteCount} vote{voteCount !== 1 ? 's' : ''} ({percentage}%)</span>
              <div class="bar" style="width: {percentage}%"></div>
              {#if isSelected && voted}
                <span class="check">✓</span>
              {/if}
            </button>
          {/each}
        </div>
        
        {#if activePoll.allowMultiple && !voted}
          <button class="submit-vote-btn" onclick={submitMultipleVote} disabled={votedOptions.length === 0}>
            ✓ Submit Vote ({votedOptions.length} selected)
          </button>
        {/if}
        
        {#if voted}
          <p class="total-votes">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
        {:else if !activePoll.allowMultiple}
          <p class="vote-prompt">Tap an option to vote</p>
        {:else}
          <p class="vote-prompt">Select one or more options, then submit</p>
        {/if}
      {:else}
        <!-- Open Response Mode -->
        <div class="open-response-form">
          <textarea 
            bind:value={openResponse}
            placeholder="Propose a response..."
            rows="2"
            class:over-limit={isOverWordLimit}
          ></textarea>
          <div class="response-form-footer">
            <span class="word-counter" class:over-limit={isOverWordLimit}>
              {wordCount} / {activePoll.maxWords} words
            </span>
            <button 
              class="submit-response-btn" 
              onclick={submitOpenResponse}
              disabled={!openResponse.trim() || isOverWordLimit}
            >
              + Add Response
            </button>
          </div>
        </div>
        
        {#if activePoll.openResponses.length > 0}
          <div class="responses-list">
            <div class="responses-header">
              <h3>Responses ({activePoll.openResponses.length})</h3>
              <div class="vote-stats">
                {#if totalResponseVotes > 0}
                  <span class="vote-count-badge">💙 {totalResponseVotes} total vote{totalResponseVotes !== 1 ? 's' : ''}</span>
                {/if}
                <span class="user-votes-remaining" class:limit-reached={userVoteCount >= activePoll.maxVotesPerPerson}>
                  You: {userVoteCount}/{activePoll.maxVotesPerPerson} votes used
                </span>
              </div>
            </div>
            <p class="responses-hint">👆 Click to vote for responses you like (up to {activePoll.maxVotesPerPerson})</p>
            <div class="responses-grid">
              {#each sortedResponses as response (response.id)}
                {@const hasUpvoted = upvotedResponses.includes(response.id)}
                {@const canVote = hasUpvoted || userVoteCount < activePoll.maxVotesPerPerson}
                <button 
                  class="response-card" 
                  class:upvoted={hasUpvoted}
                  class:disabled={!canVote}
                  onclick={() => upvoteResponse(response.id)}
                  disabled={!canVote}
                >
                  <span class="response-text">"{response.text}"</span>
                  <span class="response-vote-btn" class:active={hasUpvoted}>
                    {#if hasUpvoted}
                      <span class="vote-icon">💙</span>
                    {:else if canVote}
                      <span class="vote-icon">🤍</span>
                    {:else}
                      <span class="vote-icon disabled">🚫</span>
                    {/if}
                    <span class="vote-count">{response.votes}</span>
                  </span>
                </button>
              {/each}
            </div>
          </div>
        {:else}
          <div class="no-responses">
            <p>No responses yet. Be the first to propose one!</p>
          </div>
        {/if}
      {/if}
      
      <div class="poll-actions">
        <button class="new-poll-btn" onclick={resetForNewPoll}>
          + New Poll
        </button>
        <button class="close-poll-btn" onclick={closePoll}>
          Close Poll
        </button>
      </div>
    </section>
  {/if}
</div>

<style>
  .poll-container {
    max-width: 900px; /* Wider for results display */
    margin: 0 auto;
    padding: 1.5rem 1rem;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  /* Poll Not Found Section */
  .poll-not-found {
    max-width: 500px;
    margin: 0 auto;
    text-align: center;
    padding: 2rem;
    background: var(--color-surface-secondary);
    border-radius: 12px;
    border: 1px solid var(--color-border);
  }
  
  .not-found-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  
  .poll-not-found h2 {
    margin: 0 0 0.75rem;
    color: var(--color-text-primary);
  }
  
  .not-found-message {
    color: var(--color-text-secondary);
    margin-bottom: 1.5rem;
  }
  
  .not-found-message code {
    background: var(--color-surface);
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    font-size: 0.875rem;
    color: var(--color-primary);
  }
  
  .not-found-explanation {
    text-align: left;
    background: var(--color-surface);
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
  }
  
  .not-found-explanation h3 {
    margin: 0 0 0.5rem;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .not-found-explanation p {
    margin: 0 0 1rem;
    color: var(--color-text-primary);
    font-size: 0.9375rem;
    line-height: 1.5;
  }
  
  .not-found-explanation ul {
    margin: 0;
    padding-left: 0;
    list-style: none;
  }
  
  .not-found-explanation li {
    margin-bottom: 0.5rem;
    color: var(--color-text-primary);
    font-size: 0.9375rem;
  }
  
  .not-found-explanation a {
    color: var(--color-primary);
    text-decoration: underline;
  }
  
  .create-new-btn {
    padding: 0.75rem 1.5rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
  }
  
  .create-new-btn:hover {
    background: var(--color-primary-hover);
  }

  /* Setup view narrower */
  .create-poll {
    max-width: 500px;
    margin: 0 auto;
  }
  
  /* View Mode Controls */
  .view-mode-controls {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%);
    border: 2px solid rgba(34, 197, 94, 0.3);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .back-to-setup-btn {
    padding: 0.5rem 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--color-text-primary);
    font-weight: 500;
    align-self: flex-start;
  }
  
  .back-to-setup-btn:hover {
    background: var(--color-surface-secondary);
  }
  
  .view-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }
  
  .live-indicator {
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  /* Results Display (larger for projection) */
  .results-display {
    background: var(--color-surface);
    border-radius: 14px;
    padding: 2.5rem;
    border: 2px solid var(--color-border);
    min-height: 400px; /* Ensure visible even with no votes yet */
  }
  
  .results-display .poll-header {
    margin-bottom: 2rem;
  }
  
  .live-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%);
    border: 2px solid rgba(239, 68, 68, 0.3);
    border-radius: 12px;
    margin-bottom: 1.5rem;
  }
  
  .live-status strong {
    color: var(--color-text-primary);
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: 0.05em;
  }
  
  .pulse-dot {
    animation: pulse-glow 2s infinite;
  }
  
  @keyframes pulse-glow {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.1); }
  }
  
  .auto-update-text {
    color: var(--color-text-secondary);
    font-size: 0.8rem;
    font-style: italic;
  }
  
  .poll-meta {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .results-display .poll-header h2 {
    font-size: 2rem;
    text-align: center;
    margin-bottom: 1rem;
    color: var(--color-text-primary);
  }
  
  .results-display .poll-option {
    font-size: 1.1rem;
    padding: 1.5rem;
    margin-bottom: 1rem;
  }
  
  .results-display .vote-count {
    font-size: 0.95rem;
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
  
  .qr-btn-inline {
    background: none;
    border: 1px solid #bae6fd;
    color: #0284c7;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    cursor: pointer;
    margin-left: 0.5rem;
  }
  
  .qr-btn-inline:hover {
    background: #e0f2fe;
  }
  
  /* Share Section */
  .share-section {
    margin-bottom: 1rem;
  }
  
  .share-link-container {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .share-link-input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: white;
    font-size: 0.875rem;
    color: #374151;
  }
  
  .copy-btn {
    padding: 0.5rem 1rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    white-space: nowrap;
  }
  
  .copy-btn:hover {
    background: var(--color-primary-hover);
  }

  /* QR Code Section */
  .qr-code-section {
    text-align: center;
    padding: 1.5rem;
    background: white;
    border: 1px solid #e5e7eb;
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
    color: #6b7280;
    font-size: 0.875rem;
  }

  /* Create Poll Form */
  .create-poll {
    background: var(--color-surface-secondary);
    padding: 1.5rem;
    border-radius: 12px;
  }
  
  .create-poll h2 {
    margin: 0 0 1.5rem;
    font-size: 1.25rem;
    color: var(--color-text-primary);
  }
  
  .form-group {
    margin-bottom: 1.25rem;
  }
  
  .form-group label, .form-label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }
  
  .form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 1rem;
    box-sizing: border-box;
  }
  
  .form-group input:focus {
    outline: none;
    border-color: #2563eb;
  }
  
  .option-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .option-row input {
    flex: 1;
  }
  
  .remove-btn {
    width: 40px;
    background: #fee2e2;
    color: #b91c1c;
    border: none;
    border-radius: 8px;
    font-size: 1.25rem;
    cursor: pointer;
  }
  
  .add-option-btn {
    width: 100%;
    padding: 0.75rem;
    background: none;
    border: 2px dashed #d1d5db;
    border-radius: 8px;
    color: #6b7280;
    cursor: pointer;
    font-size: 0.875rem;
  }
  
  .add-option-btn:hover {
    border-color: #9ca3af;
    color: #374151;
  }
  
  .vote-type-group {
    background: #f0f9ff;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
  }
  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-weight: 500;
  }
  
  .checkbox-label input {
    width: 18px;
    height: 18px;
  }
  
  .help-text {
    margin: 0.5rem 0 0;
    font-size: 0.8rem;
    color: #6b7280;
  }
  
  .create-btn {
    width: 100%;
    padding: 1rem;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
  }
  
  .create-btn:hover:not(:disabled) {
    background: #1d4ed8;
  }
  
  .create-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* Poll Display */
  .poll-header {
    margin-bottom: 1.5rem;
  }
  
  .poll-header h2 {
    font-size: 1.5rem;
    margin: 0 0 0.5rem;
  }
  
  .poll-type-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background: #dbeafe;
    color: #1e40af;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .poll-type-badge.single {
    background: #fef3c7;
    color: #92400e;
  }
  
  .poll-options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .poll-option {
    position: relative;
    padding: 1rem 1.25rem;
    background: #f8fafc;
    border: 2px solid #e5e7eb;
    border-radius: 10px;
    text-align: left;
    cursor: pointer;
    overflow: hidden;
    transition: border-color 0.2s;
  }
  
  .poll-option:not(:disabled):hover {
    border-color: #2563eb;
  }
  
  .poll-option:disabled {
    cursor: default;
  }
  
  .poll-option.voted {
    background: white;
  }
  
  .poll-option.selected {
    border-color: #2563eb;
    background: #eff6ff;
  }
  
  .checkbox-indicator {
    margin-right: 0.5rem;
    font-size: 1.1rem;
  }
  
  .checkbox-indicator.checked {
    color: #2563eb;
  }
  
  .option-text {
    position: relative;
    z-index: 1;
    font-size: 1rem;
  }
  
  .vote-count {
    position: relative;
    z-index: 1;
    float: right;
    color: #6b7280;
    font-size: 0.875rem;
  }
  
  .bar {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: #dbeafe;
    transition: width 0.3s ease;
    z-index: 0;
  }
  
  .check {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: #2563eb;
    font-weight: bold;
    z-index: 1;
  }
  
  .submit-vote-btn {
    width: 100%;
    margin-top: 1rem;
    padding: 1rem;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
  }
  
  .submit-vote-btn:hover:not(:disabled) {
    background: #059669;
  }
  
  .submit-vote-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .total-votes {
    margin: 1.5rem 0 0;
    color: #6b7280;
  }
  
  .vote-prompt {
    margin: 1rem 0 0;
    color: #9ca3af;
    font-size: 0.875rem;
  }
  
  .poll-actions {
    margin-top: 2rem;
    display: flex;
    gap: 0.75rem;
    justify-content: center;
  }
  
  .new-poll-btn {
    padding: 0.75rem 1.5rem;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    cursor: pointer;
  }
  
  .new-poll-btn:hover {
    background: #1d4ed8;
  }
  
  .close-poll-btn {
    padding: 0.75rem 1.5rem;
    background: #fee2e2;
    color: #b91c1c;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    cursor: pointer;
  }
  
  .close-poll-btn:hover {
    background: #fecaca;
  }
  
  /* Poll Type Selector */
  .poll-type-selector {
    margin-bottom: 1.5rem;
  }
  
  .type-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  
  .type-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 1rem;
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }
  
  .type-option:hover {
    border-color: #2563eb;
  }
  
  .type-option.active {
    border-color: #2563eb;
    background: #eff6ff;
  }
  
  .type-icon {
    font-size: 1.5rem;
  }
  
  .type-name {
    font-weight: 600;
    font-size: 0.875rem;
  }
  
  .type-desc {
    font-size: 0.7rem;
    color: #6b7280;
  }
  
  /* Word Limit Control */
  .word-limit-group {
    background: #f0f9ff;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
  }
  
  .vote-limit-group {
    background: #eff6ff;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
  }
  
  .word-limit-control,
  .vote-limit-control {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .word-limit-control input[type="range"],
  .vote-limit-control input[type="range"] {
    flex: 1;
    height: 8px;
    border-radius: 4px;
    background: #dbeafe;
    -webkit-appearance: none;
    appearance: none;
  }
  
  .word-limit-control input[type="range"]::-webkit-slider-thumb,
  .vote-limit-control input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #2563eb;
    cursor: pointer;
  }
  
  .word-limit-value,
  .vote-limit-value {
    font-weight: 600;
    color: #2563eb;
    min-width: 70px;
  }
  
  /* Open Response Form */
  .open-response-form {
    text-align: left;
  }
  
  .open-response-form textarea {
    width: 100%;
    padding: 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 10px;
    font-size: 1rem;
    resize: vertical;
    box-sizing: border-box;
    font-family: inherit;
  }
  
  .open-response-form textarea:focus {
    outline: none;
    border-color: #2563eb;
  }
  
  .open-response-form textarea.over-limit {
    border-color: #ef4444;
    background: #fef2f2;
  }
  
  .word-counter {
    text-align: right;
    font-size: 0.8rem;
    color: #6b7280;
    margin: 0.5rem 0;
  }
  
  .word-counter.over-limit {
    color: #ef4444;
    font-weight: 600;
  }
  
  /* Responses List */
  .responses-list {
    margin-top: 2rem;
    text-align: left;
  }
  
  .responses-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.25rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .vote-stats {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .user-votes-remaining {
    padding: 0.35rem 0.75rem;
    background: rgba(59, 130, 246, 0.1);
    color: #2563eb;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }
  
  .user-votes-remaining.limit-reached {
    background: rgba(239, 68, 68, 0.1);
    color: #dc2626;
    border-color: rgba(239, 68, 68, 0.3);
  }
  
  .responses-list h3 {
    font-size: 1rem;
    margin: 0;
    color: #374151;
  }
  
  .vote-count-badge {
    background: #dbeafe;
    color: #1e40af;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .responses-hint {
    font-size: 0.8rem;
    color: #9ca3af;
    margin: 0 0 0.75rem;
  }
  
  .responses-grid {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .response-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    background: #f8fafc;
    border: 2px solid #e5e7eb;
    border-radius: 10px;
    font-size: 0.95rem;
    color: #374151;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
  }
  
  .response-card:hover {
    border-color: #2563eb;
    background: #eff6ff;
  }
  
  .response-card.upvoted {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%);
    border-color: rgba(59, 130, 246, 0.4);
  }
  
  .response-card.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .response-card.disabled:hover {
    transform: none;
    border-color: #e5e7eb;
  }
  
  .response-text {
    flex: 1;
    font-style: italic;
  }
  
  .response-vote-btn {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.2s ease;
  }
  
  .response-vote-btn .vote-icon {
    font-size: 1.1rem;
    line-height: 1;
  }
  
  .response-vote-btn .vote-icon.disabled {
    opacity: 0.4;
  }
  
  .response-vote-btn .vote-count {
    min-width: 1.5rem;
    text-align: center;
    color: var(--color-text-primary);
  }
  
  .response-vote-btn.active {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border-color: #2563eb;
  }
  
  .response-vote-btn.active .vote-count {
    color: white;
  }
  
  .no-responses {
    background: #f8fafc;
    border: 2px dashed #d1d5db;
    padding: 2rem;
    border-radius: 12px;
    text-align: center;
    margin-top: 1rem;
  }
  
  .no-responses p {
    margin: 0;
    color: #6b7280;
    font-size: 0.9rem;
  }
  
  /* Open Response Form - Updated */
  .open-response-form {
    text-align: left;
    margin-bottom: 0.5rem;
  }
  
  .open-response-form textarea {
    width: 100%;
    padding: 0.875rem 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 10px;
    font-size: 1rem;
    resize: vertical;
    box-sizing: border-box;
    font-family: inherit;
    min-height: 60px;
  }
  
  .open-response-form textarea:focus {
    outline: none;
    border-color: #2563eb;
  }
  
  .open-response-form textarea.over-limit {
    border-color: #ef4444;
    background: #fef2f2;
  }
  
  .response-form-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.5rem;
  }
  
  .word-counter {
    font-size: 0.8rem;
    color: #6b7280;
  }
  
  .word-counter.over-limit {
    color: #ef4444;
    font-weight: 600;
  }
  
  .submit-response-btn {
    padding: 0.5rem 1rem;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }
  
  .submit-response-btn:hover:not(:disabled) {
    background: #059669;
  }
  
  .submit-response-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .poll-type-badge.open {
    background: rgba(139, 92, 246, 0.1);
    color: #7c3aed;
    border: 1px solid rgba(139, 92, 246, 0.3);
  }
  
  .poll-type-badge.votes-limit {
    background: rgba(59, 130, 246, 0.1);
    color: #2563eb;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }
  
</style>
