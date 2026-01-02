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
    maxOptionsVotes: number; // How many options each person can vote for
    allowOpenResponses?: boolean;
    maxVotesPerPerson: number; // For suggestions
  };
  
  // Vote notification type
  type VoteNotification = {
    id: string;
    voterName: string;
    timestamp: number;
  };
  
  // Poll state (now server-synced!)
  let activePoll = $state<LocalPoll | null>(null);
  let voted = $state(false);
  let votedOptions = $state<string[]>([]);
  let openResponse = $state('');
  let upvotedResponses = $state<string[]>([]); // Track which responses user has upvoted
  let isLoading = $state(false);
  let errorMessage = $state('');
  
  // Voter ID for tracking votes (persisted in localStorage)
  let voterId = $state('');
  
  // Voter display name (for notifications)
  let voterName = $state('');

  // View mode: 'setup' (creating poll) | 'results' (display for participants) | 'participate' (joined via URL) | 'not-found' (poll link not found)
  let viewMode = $state<'setup' | 'results' | 'participate' | 'not-found'>('setup');
  
  // Visualization mode: 'list' | 'bubbles'
  let vizMode = $state<'list' | 'bubbles'>('list');
  
  // Vote notifications
  let voteNotifications = $state<VoteNotification[]>([]);
  let previousTotalVotes = $state(0);
  
  // Track if we came from a shared link
  let sharedPollId = $state<string | null>(null);
  
  // Create poll form
  let question = $state('');
  let options = $state(['', '']);
  let maxOptionsVotes = $state(1); // How many options each person can vote for
  let allowOpenResponses = $state(false);
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
  
  // Poll config (encoded in URL)
  let pollConfig = $state('');
  let pollId = $state('');
  
  // Polling interval for real-time updates
  let pollInterval: ReturnType<typeof setInterval> | null = null;
  
  let totalVotes = $derived(activePoll 
    ? Object.values(activePoll.votes).reduce((sum, count) => sum + count, 0)
    : 0);
  
  let wordCount = $derived(openResponse.trim() ? openResponse.trim().split(/\s+/).length : 0);
  let isOverWordLimit = $derived(activePoll ? wordCount > activePoll.maxWords : false);
  
  // Calculate max votes for bubble sizing
  let maxVoteCount = $derived(activePoll 
    ? Math.max(...Object.values(activePoll.votes), 1)
    : 1);
  
  // Generate bubble sizes (min 40px, max 200px, scales based on votes)
  function getBubbleSize(voteCount: number): number {
    if (maxVoteCount === 0) return 60;
    const minSize = 50;
    const maxSize = 180;
    const scale = voteCount / maxVoteCount;
    return minSize + (maxSize - minSize) * Math.sqrt(scale);
  }
  
  // Random names for demo notifications
  const demoNames = ['Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Charlie'];
  
  function getRandomName(): string {
    return demoNames[Math.floor(Math.random() * demoNames.length)];
  }
  
  // Add notification when new vote is detected
  function addVoteNotification(name: string) {
    const notification: VoteNotification = {
      id: Date.now().toString() + Math.random().toString(36).substring(2),
      voterName: name,
      timestamp: Date.now()
    };
    voteNotifications = [...voteNotifications, notification];
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      voteNotifications = voteNotifications.filter(n => n.id !== notification.id);
    }, 3000);
  }
  
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
  
  // Word lists for friendly poll IDs
  const adjectives = ['happy', 'swift', 'bright', 'calm', 'cool', 'bold', 'wild', 'free', 'warm', 'wise'];
  const animals = ['tiger', 'eagle', 'panda', 'whale', 'fox', 'wolf', 'hawk', 'bear', 'owl', 'lion'];
  
  // Generate a friendly, human-readable poll ID
  function generatePollId(): string {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    const num = Math.floor(Math.random() * 100);
    return `${adj}-${animal}-${num}`;
  }
  
  // Get or create voter ID
  function getVoterId(): string {
    if (!browser) return 'server';
    let id = localStorage.getItem('poll_voter_id');
    if (!id) {
      id = 'voter_' + generatePollId();
      localStorage.setItem('poll_voter_id', id);
    }
    return id;
  }
  
  // Get or create voter name
  function getVoterName(): string {
    if (!browser) return 'Someone';
    let name = localStorage.getItem('poll_voter_name');
    if (!name) {
      name = getRandomName();
      localStorage.setItem('poll_voter_name', name);
    }
    return name;
  }
  
  // Load poll from server using ID
  async function loadPoll(): Promise<LocalPoll | null> {
    try {
      const response = await fetch(`/api/tools/poll?id=${pollId}`);
      if (!response.ok) {
        if (response.status === 400 || response.status === 404) {
          return null;
        }
        throw new Error('Failed to load poll');
      }
      const data = await response.json();
      return data.poll;
    } catch (error) {
      console.error('Error loading poll:', error);
      return null;
    }
  }
  
  // Start polling for updates
  function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(async () => {
      if (pollId && activePoll) {
        const prevTotal = Object.values(activePoll.votes).reduce((sum, count) => sum + count, 0);
        const updated = await loadPoll();
        if (updated) {
          const newTotal = Object.values(updated.votes).reduce((sum, count) => sum + count, 0);
          
          // Detect new votes and show notifications
          if (newTotal > prevTotal) {
            const diff = newTotal - prevTotal;
            for (let i = 0; i < diff; i++) {
              setTimeout(() => {
                addVoteNotification(getRandomName());
              }, i * 300); // Stagger notifications
            }
          }
          
          activePoll = updated;
        }
      }
    }, 2000); // Poll every 2 seconds
  }
  
  // Stop polling
  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }
  
  // Load poll from URL on mount
  onMount(() => {
    if (!browser) return;
    
    // Get or create voter ID and name
    voterId = getVoterId();
    voterName = getVoterName();
    
    // Load voted state from localStorage
    const votedPolls = JSON.parse(localStorage.getItem('voted_polls') || '{}');
    
    // Check URL for poll ID (supports legacy 'c' param for backwards compatibility)
    const urlPollId = $page.url.searchParams.get('id');
    const urlConfig = $page.url.searchParams.get('c'); // Legacy support
    
    if (urlPollId || urlConfig) {
      isLoading = true;
      pollId = urlPollId || 'legacy-poll';
      if (urlConfig) pollConfig = urlConfig; // Keep for legacy support
      
      loadPoll().then(poll => {
        isLoading = false;
        if (poll) {
          activePoll = poll;
          pollId = poll.id; // Ensure we have the correct ID
          viewMode = 'participate';
          updateShareLink();
          startPolling();
          
          // Restore voted state
          if (votedPolls[pollId]) {
            voted = true;
            votedOptions = votedPolls[pollId].options || [];
            upvotedResponses = votedPolls[pollId].upvoted || [];
            userVoteCount = upvotedResponses.length;
          }
        } else {
          sharedPollId = pollId;
          viewMode = 'not-found';
        }
      });
    }
    
    return () => {
      stopPolling();
    };
  });
  
  // Update share link when poll is created
  function updateShareLink() {
    if (!browser || !pollId) return;
    const url = new URL(window.location.href);
    // Clean URL - only needs ID
    url.search = '';
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
  
  // Save voted state to localStorage
  function saveVotedState() {
    if (!browser || !pollId) return;
    const votedPolls = JSON.parse(localStorage.getItem('voted_polls') || '{}');
    votedPolls[pollId] = {
      options: votedOptions,
      upvoted: upvotedResponses
    };
    localStorage.setItem('voted_polls', JSON.stringify(votedPolls));
  }
  
  async function createPoll() {
    if (!question.trim()) return;
    
    const validOptions = options.filter(o => o.trim());
    if (validOptions.length < 2) return;
    
    // Generate unique poll ID
    pollId = generatePollId();
    
    const newPoll: LocalPoll = {
      id: pollId,
      question: question.trim(),
      pollType: 'options', // Always options-based now
      options: validOptions,
      votes: Object.fromEntries(validOptions.map(o => [o, 0])),
      openResponses: [],
      maxWords: allowOpenResponses ? maxWords : 10,
      status: 'open',
      maxOptionsVotes,
      maxVotesPerPerson: allowOpenResponses ? maxVotesPerPerson : 1,
      allowOpenResponses,
    };
    
    // Save to server
    isLoading = true;
    errorMessage = '';
    try {
      const response = await fetch('/api/tools/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPoll)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create poll');
      }
      
      const data = await response.json();
      activePoll = data.poll;
      pollId = data.poll.id; // Use ID from server
      
      // Update URL with clean ID-only format
      updateShareLink();
      if (browser) {
        const url = new URL(window.location.href);
        url.search = '';
        url.searchParams.set('id', pollId);
        window.history.pushState({}, '', url.toString());
      }
      
      // Start polling for updates
      startPolling();
      
      // Switch to results view
      viewMode = 'results';
    } catch (error) {
      console.error('Error creating poll:', error);
      errorMessage = 'Failed to create poll. Please try again.';
    } finally {
      isLoading = false;
    }
  }
  
  function backToSetup() {
    stopPolling();
    
    // Clear URL parameters
    if (browser) {
      const url = new URL(window.location.href);
      url.searchParams.delete('c');
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
    pollConfig = '';
    shareLink = '';
  }
  
  async function vote(option: string) {
    if (!activePoll || activePoll.pollType !== 'options') return;
    // Allow voting in both participate and results (organizer) mode
    if (viewMode !== 'participate' && viewMode !== 'results') return;
    
    const maxVotes = activePoll.maxOptionsVotes ?? 1;
    
    if (maxVotes > 1) {
      // Multiple choice - toggle selection (local only until submit)
      if (votedOptions.includes(option)) {
        votedOptions = votedOptions.filter(o => o !== option);
      } else if (votedOptions.length < maxVotes) {
        votedOptions = [...votedOptions, option];
      }
    } else {
      // Single choice - vote immediately
      if (voted) return;
      
      try {
        const response = await fetch(`/api/tools/poll?id=${pollId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'vote', option, voterId })
        });
        
        if (!response.ok) {
          const data = await response.json();
          if (data.error === 'Already voted') {
            voted = true;
            return;
          }
          throw new Error('Failed to vote');
        }
        
        const data = await response.json();
        activePoll = data.poll;
        voted = true;
        votedOptions = [option];
        saveVotedState();
      } catch (error) {
        console.error('Error voting:', error);
        errorMessage = 'Failed to submit vote. Please try again.';
      }
    }
  }
  
  async function submitOpenResponse() {
    if (!activePoll || !openResponse.trim() || isOverWordLimit) return;
    
    try {
      const response = await fetch(`/api/tools/poll?id=${pollId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addResponse', text: openResponse.trim() })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit response');
      }
      
      const data = await response.json();
      activePoll = data.poll;
      openResponse = '';
    } catch (error) {
      console.error('Error submitting response:', error);
      errorMessage = 'Failed to submit response. Please try again.';
    }
  }
  
  async function upvoteResponse(responseId: string) {
    if (!activePoll) return;
    
    const hasUpvoted = upvotedResponses.includes(responseId);
    
    if (hasUpvoted) {
      // Remove upvote (local only - server doesn't track individual upvotes)
      upvotedResponses = upvotedResponses.filter(id => id !== responseId);
      userVoteCount--;
      saveVotedState();
    } else {
      // Check vote limit
      if (userVoteCount >= activePoll.maxVotesPerPerson) {
        return; // Max votes reached
      }
      
      // Add upvote
      try {
        const response = await fetch(`/api/tools/poll?id=${pollId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'upvoteResponse', responseId })
        });
        
        if (!response.ok) {
          throw new Error('Failed to upvote');
        }
        
        const data = await response.json();
        activePoll = data.poll;
        upvotedResponses = [...upvotedResponses, responseId];
        userVoteCount++;
        saveVotedState();
      } catch (error) {
        console.error('Error upvoting:', error);
        errorMessage = 'Failed to upvote. Please try again.';
      }
    }
  }
  
  async function submitMultipleVote() {
    if (votedOptions.length === 0) return;
    
    // Submit all selected options
    try {
      for (const option of votedOptions) {
        await fetch(`/api/tools/poll?id=${pollId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'vote', option, voterId })
        });
      }
      
      // Reload poll to get updated counts
      const updated = await loadPoll();
      if (updated) {
        activePoll = updated;
      }
      
      voted = true;
      saveVotedState();
    } catch (error) {
      console.error('Error voting:', error);
      errorMessage = 'Failed to submit votes. Please try again.';
    }
  }
  
  async function closePoll() {
    stopPolling();
    
    // Close poll on server
    if (pollId) {
      try {
        await fetch(`/api/tools/poll?id=${pollId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'close' })
        });
      } catch (error) {
        console.error('Error closing poll:', error);
      }
    }
    
    // Clear URL parameters
    if (browser) {
      const url = new URL(window.location.href);
      url.searchParams.delete('c');
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
    pollConfig = '';
    shareLink = '';
    viewMode = 'setup';
  }
  
  function resetForNewPoll() {
    stopPolling();
    
    // Clear URL parameters
    if (browser) {
      const url = new URL(window.location.href);
      url.searchParams.delete('c');
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
    pollConfig = '';
    shareLink = '';
    viewMode = 'setup';
    
    // Clear form fields for new poll
    question = '';
    options = ['', ''];
    maxOptionsVotes = 1;
    allowOpenResponses = false;
    maxWords = 10;
    maxVotesPerPerson = 3;
  }
  
  function toggleQRCode() {
    showQRCode = !showQRCode;
  }
</script>

<svelte:head>
  <title>Quick Poll - unconf tools Lab</title>
  <meta name="description" content="Create instant polls with live results. Free, no signup required." />
</svelte:head>

<div class="poll-container">
  <header>
    <a href="/" class="back">← unconf tools Lab</a>
    <h1>🗳️ Quick Poll</h1>
    <p class="subtitle">Create instant polls with live results</p>
  </header>
  
  {#if isLoading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading poll...</p>
    </div>
  {/if}
  
  {#if errorMessage}
    <div class="error-message">
      <span>⚠️</span> {errorMessage}
      <button onclick={() => errorMessage = ''}>×</button>
    </div>
  {/if}
  
  <div class="standalone-notice">
    <span>🌐</span>
    <p>
      {#if activePoll && shareLink}
        <strong>Share this poll</strong> - Anyone with the link can vote!
        <button class="qr-btn-inline" onclick={toggleQRCode}>📱 {showQRCode ? 'Hide' : 'Show'} QR Code</button>
      {:else}
        <strong>Cross-device voting</strong> - Create a poll and share the link with participants.
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
          linkCopied = true;
          setTimeout(() => linkCopied = false, 2000);
        }}>{linkCopied ? '✓ Copied!' : '📋 Copy'}</button>
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
  {#if activePoll && (viewMode === 'results' || viewMode === 'participate')}
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
        This poll (<code>{sharedPollId}</code>) doesn't exist or has been closed.
      </p>
      <div class="not-found-explanation">
        <h3>What happened?</h3>
        <ul>
          <li>The poll may have been closed by its creator</li>
          <li>The poll link may have expired</li>
          <li>The poll ID might be incorrect</li>
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
          <div class="setting-row">
            <span>Votes per person:</span>
            <input 
              type="number" 
              min="1" 
              max="10" 
              bind:value={maxOptionsVotes}
              class="compact-input"
            />
          </div>
        </div>
        
        <div class="form-group vote-type-group">
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={allowOpenResponses} />
            <span>Let participants suggest additional options</span>
          </label>
          
          {#if allowOpenResponses}
            <div class="suggestion-settings">
              <div class="setting-row">
                <span>Max words:</span>
                <input 
                  type="number" 
                  min="3" 
                  max="50" 
                  bind:value={maxWords}
                  class="compact-input"
                />
              </div>
              <div class="setting-row">
                <span>Votes per suggestion:</span>
                <input 
                  type="number" 
                  min="1" 
                  max="10" 
                  bind:value={maxVotesPerPerson}
                  class="compact-input"
                />
              </div>
            </div>
          {/if}
        </div>
        
        <button 
          type="submit" 
          class="create-btn" 
          disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
        >
          🗳️ Start Poll
        </button>
      </form>
    </section>
  {:else if (viewMode === 'results' || viewMode === 'participate') && activePoll}
    <!-- Vote Notifications Toast -->
    {#if voteNotifications.length > 0}
      <div class="vote-notifications">
        {#each voteNotifications as notification (notification.id)}
          <div class="vote-notification" class:entering={Date.now() - notification.timestamp < 300}>
            <span class="notification-icon">🗳️</span>
            <span class="notification-text"><strong>{notification.voterName}</strong> has voted</span>
          </div>
        {/each}
      </div>
    {/if}
    
    <!-- Results View - Real-time Display (also used for participate mode) -->
    <section class="results-display">
      <div class="poll-header">
        <div class="live-status">
          <span class="pulse-dot">🔴</span>
          <strong>LIVE RESULTS</strong>
          <span class="auto-update-text">Auto-updating</span>
        </div>
        <h2>{activePoll.question}</h2>
        <div class="poll-meta">
          {#if (activePoll.maxOptionsVotes ?? 1) > 1}
            <span class="poll-type-badge">📊 Select up to {activePoll.maxOptionsVotes}</span>
          {:else}
            <span class="poll-type-badge single">🎯 Single choice</span>
          {/if}
          {#if activePoll.allowOpenResponses}
            <span class="poll-type-badge open">✍️ Open responses enabled</span>
          {/if}
        </div>
      </div>
      
      <!-- Visualization Mode Switcher (shared for all poll types) -->
      <div class="viz-mode-switcher">
        <button 
          class="viz-mode-btn" 
          class:active={vizMode === 'list'}
          onclick={() => vizMode = 'list'}
          title="List View"
        >
          <span class="viz-icon">📋</span>
          <span class="viz-label">List</span>
        </button>
        <button 
          class="viz-mode-btn" 
          class:active={vizMode === 'bubbles'}
          onclick={() => vizMode = 'bubbles'}
          title="Bubble View"
        >
          <span class="viz-icon">🫧</span>
          <span class="viz-label">Bubbles</span>
        </button>
      </div>
      
      <!-- List View (Original) -->
      {#if vizMode === 'list'}
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
              disabled={(activePoll.maxOptionsVotes ?? 1) === 1 && voted}
            >
              {#if (activePoll.maxOptionsVotes ?? 1) > 1 && !voted}
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
      {/if}
      
      <!-- Bubble View -->
      {#if vizMode === 'bubbles'}
        <div class="bubble-container">
          {#each activePoll.options as option, index}
            {@const voteCount = activePoll.votes[option] || 0}
            {@const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0}
            {@const bubbleSize = getBubbleSize(voteCount)}
            {@const isSelected = votedOptions.includes(option)}
            {@const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#84cc16']}
            
            <button 
              class="bubble"
              class:voted
              class:selected={isSelected}
              style="
                width: {bubbleSize}px; 
                height: {bubbleSize}px;
                background: linear-gradient(135deg, {colors[index % colors.length]}dd, {colors[index % colors.length]}99);
                box-shadow: 0 4px 20px {colors[index % colors.length]}40;
              "
              onclick={() => vote(option)}
              disabled={(activePoll.maxOptionsVotes ?? 1) === 1 && voted}
            >
              <span class="bubble-label">{option}</span>
              <span class="bubble-count">{voteCount}</span>
              {#if percentage > 0}
                <span class="bubble-percent">{percentage}%</span>
              {/if}
              {#if isSelected && voted}
                <span class="bubble-check">✓</span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
      
      <!-- Horizontal Bar Chart View -->
      
      {#if (activePoll.maxOptionsVotes ?? 1) > 1 && !voted}
        <button class="submit-vote-btn" onclick={submitMultipleVote} disabled={votedOptions.length === 0}>
          ✓ Submit Vote ({votedOptions.length}/{activePoll.maxOptionsVotes} selected)
        </button>
      {/if}
      
      {#if voted}
        <p class="total-votes">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
      {:else if (activePoll.maxOptionsVotes ?? 1) === 1}
        <p class="vote-prompt">Tap an option to vote</p>
      {:else}
        <p class="vote-prompt">Select up to {activePoll.maxOptionsVotes} options, then submit</p>
      {/if}
      
      <!-- Open Responses Section (when enabled) -->
      {#if activePoll.allowOpenResponses}
        <div class="open-responses-section">
          <h3 class="section-divider">✍️ Participant Suggestions</h3>
          
          <div class="open-response-form">
            <textarea 
              bind:value={openResponse}
              placeholder="Suggest your own option..."
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
                + Add Suggestion
              </button>
            </div>
          </div>
          
          {#if activePoll.openResponses.length > 0}
            <div class="responses-list">
              <div class="responses-header">
                <span class="response-count">{activePoll.openResponses.length} suggestion{activePoll.openResponses.length !== 1 ? 's' : ''}</span>
                <div class="vote-stats">
                  {#if totalResponseVotes > 0}
                    <span class="vote-count-badge">💙 {totalResponseVotes} vote{totalResponseVotes !== 1 ? 's' : ''}</span>
                  {/if}
                  <span class="user-votes-remaining" class:limit-reached={userVoteCount >= activePoll.maxVotesPerPerson}>
                    You: {userVoteCount}/{activePoll.maxVotesPerPerson} votes
                  </span>
                </div>
              </div>
              
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
              <p>No suggestions yet. Be the first!</p>
            </div>
          {/if}
        </div>
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
  
  /* Loading and Error States */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2rem;
    background: #f8fafc;
    border-radius: 12px;
    margin-bottom: 1.5rem;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e5e7eb;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .loading-state p {
    margin: 0;
    color: #6b7280;
    font-size: 0.875rem;
  }
  
  .error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    margin-bottom: 1rem;
    color: #dc2626;
    font-size: 0.875rem;
  }
  
  .error-message button {
    margin-left: auto;
    background: none;
    border: none;
    color: #dc2626;
    cursor: pointer;
    font-size: 1.25rem;
    padding: 0;
    line-height: 1;
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
    background: #f8fafc;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    margin-bottom: 0.75rem;
    border: 1px solid #e5e7eb;
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
  
  .suggestion-settings {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.875rem;
    color: #6b7280;
  }
  
  .compact-input {
    width: 60px;
    padding: 0.25rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    text-align: center;
  }
  
  .compact-input:focus {
    outline: none;
    border-color: #2563eb;
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
  
  /* Open Responses Section */
  .open-responses-section {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 2px solid #e5e7eb;
  }
  
  .section-divider {
    font-size: 1rem;
    font-weight: 600;
    color: #6b7280;
    margin: 0 0 1rem;
    text-align: center;
  }
  
  .response-count {
    font-weight: 600;
    color: #374151;
  }
  
  /* Open Response Form - Updated */
  .open-response-form {
    text-align: left;
    margin-bottom: 1rem;
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
  
  /* Vote Notifications */
  .vote-notifications {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    pointer-events: none;
  }
  
  .vote-notification {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.95) 0%, rgba(139, 92, 246, 0.95) 100%);
    color: white;
    border-radius: 12px;
    font-size: 0.875rem;
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
    animation: slideInRight 0.3s ease-out, fadeOut 0.5s ease-in 2.5s forwards;
    backdrop-filter: blur(8px);
  }
  
  .vote-notification.entering {
    animation: slideInRight 0.3s ease-out;
  }
  
  .notification-icon {
    font-size: 1.1rem;
  }
  
  .notification-text {
    font-weight: 400;
  }
  
  .notification-text strong {
    font-weight: 600;
  }
  
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes fadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
  
  /* Visualization Mode Switcher */
  .viz-mode-switcher {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 12px;
  }
  
  .viz-mode-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.625rem 1rem;
    background: transparent;
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #6b7280;
    font-size: 0.875rem;
  }
  
  .viz-mode-btn:hover {
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
  }
  
  .viz-mode-btn.active {
    background: white;
    border-color: #6366f1;
    color: #6366f1;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
  }
  
  .viz-icon {
    font-size: 1.1rem;
  }
  
  .viz-label {
    font-weight: 500;
  }
  
  /* Bubble Visualization */
  .bubble-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    padding: 2rem 1rem;
    min-height: 300px;
  }
  
  .bubble {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    color: white;
    text-align: center;
    padding: 1rem;
    position: relative;
    min-width: 50px;
    min-height: 50px;
  }
  
  .bubble:hover:not(:disabled) {
    transform: scale(1.1);
    z-index: 10;
  }
  
  .bubble:disabled {
    cursor: default;
  }
  
  .bubble.selected {
    box-shadow: 0 0 0 4px white, 0 0 0 6px #6366f1 !important;
  }
  
  .bubble-label {
    font-weight: 600;
    font-size: 0.8rem;
    line-height: 1.2;
    max-width: 90%;
    word-wrap: break-word;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
  
  .bubble-count {
    font-size: 1.5rem;
    font-weight: 700;
    margin-top: 0.25rem;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  .bubble-percent {
    font-size: 0.7rem;
    opacity: 0.9;
    font-weight: 500;
  }
  
  .bubble-check {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: white;
    color: #6366f1;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.8rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
</style>
