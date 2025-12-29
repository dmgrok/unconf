<script lang="ts">
  import QRCode from 'qrcode';
  import { browser } from '$app/environment';
  
  type PollType = 'options' | 'open';
  
  type OpenResponse = {
    id: string;
    text: string;
    votes: number;
  };
  
  type LocalPoll = {
    question: string;
    pollType: PollType;
    options: string[];
    votes: Record<string, number>;
    openResponses: OpenResponse[];
    maxWords: number;
    status: 'open' | 'closed';
    allowMultiple: boolean;
  };
  
  // Poll state (local only in standalone mode)
  let activePoll = $state<LocalPoll | null>(null);
  let voted = $state(false);
  let votedOptions = $state<string[]>([]);
  let openResponse = $state('');
  let upvotedResponses = $state<string[]>([]); // Track which responses user has upvoted
  
  // Create poll form
  let question = $state('');
  let pollType = $state<PollType>('options');
  let options = $state(['', '']);
  let allowMultiple = $state(false);
  let maxWords = $state(10);
  
  // QR Code
  let showQRCode = $state(false);
  let qrCodeDataUrl = $state('');
  
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
  
  // Generate QR code when needed
  $effect(() => {
    if (showQRCode && browser) {
      generateQRCode();
    }
  });
  
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
    
    if (pollType === 'options') {
      const validOptions = options.filter(o => o.trim());
      if (validOptions.length < 2) return;
      
      activePoll = {
        question: question.trim(),
        pollType: 'options',
        options: validOptions,
        votes: Object.fromEntries(validOptions.map(o => [o, 0])),
        openResponses: [],
        maxWords: 10,
        status: 'open',
        allowMultiple,
      };
    } else {
      activePoll = {
        question: question.trim(),
        pollType: 'open',
        options: [],
        votes: {},
        openResponses: [],
        maxWords,
        status: 'open',
        allowMultiple: false,
      };
    }
    
    question = '';
    options = ['', ''];
    allowMultiple = false;
    pollType = 'options';
    maxWords = 10;
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
    } else {
      // Single choice
      if (voted) return;
      activePoll.votes[option]++;
      activePoll = activePoll;
      voted = true;
      votedOptions = [option];
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
    // Don't set voted=true so user can still add more responses and upvote
    openResponse = '';
  }
  
  function upvoteResponse(responseId: string) {
    if (!activePoll) return;
    
    const hasUpvoted = upvotedResponses.includes(responseId);
    
    if (hasUpvoted) {
      // Remove upvote
      upvotedResponses = upvotedResponses.filter(id => id !== responseId);
      activePoll.openResponses = activePoll.openResponses.map(r => 
        r.id === responseId ? { ...r, votes: r.votes - 1 } : r
      );
    } else {
      // Add upvote
      upvotedResponses = [...upvotedResponses, responseId];
      activePoll.openResponses = activePoll.openResponses.map(r => 
        r.id === responseId ? { ...r, votes: r.votes + 1 } : r
      );
    }
    activePoll = activePoll; // trigger reactivity
  }
  
  function submitMultipleVote() {
    if (votedOptions.length === 0) return;
    voted = true;
  }
  
  function closePoll() {
    activePoll = null;
    voted = false;
    votedOptions = [];
    openResponse = '';
    upvotedResponses = [];
  }
  
  function resetForNewPoll() {
    activePoll = null;
    voted = false;
    votedOptions = [];
    openResponse = '';
    upvotedResponses = [];
  }
  
  function toggleQRCode() {
    showQRCode = !showQRCode;
  }
</script>

<svelte:head>
  <title>Quick Poll - Event Tools Lab</title>
  <meta name="description" content="Create instant polls with live results. Free, no signup required." />
</svelte:head>

<main>
  <header>
    <a href="/" class="back">← Event Tools Lab</a>
    <h1>🗳️ Quick Poll</h1>
    <p class="subtitle">Create instant polls with live results</p>
  </header>
  
  <!-- Use Case Examples -->
  <section class="use-cases">
    <h3>🎯 Common Use Cases</h3>
    <div class="use-case-grid">
      <div class="use-case-card">
        <span class="use-case-icon">🎤</span>
        <div class="use-case-content">
          <strong>Session Topic Vote</strong>
          <span>Let attendees choose which topic to discuss next</span>
        </div>
      </div>
      <div class="use-case-card">
        <span class="use-case-icon">☕</span>
        <div class="use-case-content">
          <strong>Quick Decisions</strong>
          <span>"Should we take a break?" or "Lunch preferences?"</span>
        </div>
      </div>
      <div class="use-case-card">
        <span class="use-case-icon">💡</span>
        <div class="use-case-content">
          <strong>Idea Collection</strong>
          <span>Gather open-ended suggestions from participants</span>
        </div>
      </div>
      <div class="use-case-card">
        <span class="use-case-icon">🌡️</span>
        <div class="use-case-content">
          <strong>Temperature Check</strong>
          <span>Quick sentiment gauge: "How's the energy?"</span>
        </div>
      </div>
    </div>
  </section>
  
  <div class="standalone-notice">
    <span>💡</span>
    <p>
      <strong>Standalone mode</strong> - Votes are local to this browser session.
      <button class="qr-btn-inline" onclick={toggleQRCode}>📱 {showQRCode ? 'Hide' : 'Show'} QR Code</button>
    </p>
  </div>
  
  {#if showQRCode && qrCodeDataUrl}
    <div class="qr-code-section">
      <img src={qrCodeDataUrl} alt="QR Code to share this poll" />
      <p>Scan to join this poll</p>
    </div>
  {/if}
  
  {#if !activePoll}
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
  {:else}
    <section class="active-poll">
      <div class="poll-header">
        <h2>{activePoll.question}</h2>
        {#if activePoll.pollType === 'options'}
          {#if activePoll.allowMultiple}
            <span class="poll-type-badge">Multiple choice</span>
          {:else}
            <span class="poll-type-badge single">Single choice</span>
          {/if}
        {:else}
          <span class="poll-type-badge open">Open responses • {activePoll.maxWords} words max</span>
        {/if}
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
              {#if voted}
                <span class="vote-count">{voteCount} ({percentage}%)</span>
              {/if}
              {#if voted}
                <div class="bar" style="width: {percentage}%"></div>
              {/if}
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
              {#if totalResponseVotes > 0}
                <span class="vote-count-badge">{totalResponseVotes} vote{totalResponseVotes !== 1 ? 's' : ''}</span>
              {/if}
            </div>
            <p class="responses-hint">👆 Tap to upvote responses you agree with</p>
            <div class="responses-grid">
              {#each sortedResponses as response (response.id)}
                {@const hasUpvoted = upvotedResponses.includes(response.id)}
                <button 
                  class="response-card" 
                  class:upvoted={hasUpvoted}
                  onclick={() => upvoteResponse(response.id)}
                >
                  <span class="response-text">"{response.text}"</span>
                  <span class="response-vote-btn" class:active={hasUpvoted}>
                    {hasUpvoted ? '👍' : '👆'} {response.votes > 0 ? response.votes : ''}
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
</main>

<style>
  main {
    max-width: 500px;
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
    background: #f8fafc;
    padding: 1.5rem;
    border-radius: 12px;
  }
  
  .create-poll h2 {
    margin: 0 0 1.5rem;
    font-size: 1.25rem;
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
  
  /* Active Poll */
  .active-poll {
    text-align: center;
  }
  
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
    margin-bottom: 1.5rem;
  }
  
  .word-limit-control {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .word-limit-control input[type="range"] {
    flex: 1;
    height: 8px;
    border-radius: 4px;
    background: #dbeafe;
    -webkit-appearance: none;
    appearance: none;
  }
  
  .word-limit-control input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #2563eb;
    cursor: pointer;
  }
  
  .word-limit-value {
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
    border-color: #2563eb;
    background: #dbeafe;
  }
  
  .response-text {
    flex: 1;
    font-style: italic;
  }
  
  .response-vote-btn {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    background: white;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    color: #6b7280;
    min-width: 40px;
    justify-content: center;
  }
  
  .response-vote-btn.active {
    background: #2563eb;
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
    background: #f0fdf4;
    color: #15803d;
  }
  
  /* Use Cases Section */
  .use-cases {
    margin-bottom: 1.5rem;
  }
  
  .use-cases h3 {
    font-size: 1rem;
    margin: 0 0 0.75rem;
    color: #374151;
  }
  
  .use-case-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
  
  .use-case-card {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
  }
  
  .use-case-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }
  
  .use-case-content {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }
  
  .use-case-content strong {
    font-size: 0.85rem;
    color: #1f2937;
  }
  
  .use-case-content span {
    font-size: 0.75rem;
    color: #6b7280;
  }
  
  @media (max-width: 480px) {
    .use-case-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
