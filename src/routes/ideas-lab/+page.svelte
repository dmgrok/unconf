<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { 
    getIdeasLabTools, 
    getMainListTools,
    type GraduatedToolConfig,
    type GraduationStatus 
  } from '$lib/types/graduation';
  import type { FeedbackStats } from '$lib/types/feedback';
  import FeedbackModal from '$lib/components/feature-flags/FeedbackModal.svelte';
  
  // Get tools organized by status
  const wireframeTools = getIdeasLabTools();
  const mainTools = getMainListTools();
  const betaTools = mainTools.filter(t => t.status === 'beta');
  const standardTools = mainTools.filter(t => t.status === 'standard');
  
  // Feedback modal state
  let showFeedbackModal = $state(false);
  let selectedTool = $state<GraduatedToolConfig | null>(null);
  let selectedVote = $state<'build_it' | 'not_interested' | null>(null);
  let feedbackType = $state<'concept_vote' | 'improvement'>('concept_vote');
  
  // Vote stats for each tool
  let voteStats = $state<Record<string, FeedbackStats>>({});
  
  // Track which tools the user has already voted on
  let votedTools = $state<Record<string, string>>({});
  
  // Load voted tools from localStorage
  onMount(() => {
    if (browser) {
      const stored = localStorage.getItem('ideasLabVotes');
      if (stored) {
        try {
          votedTools = JSON.parse(stored);
        } catch {
          votedTools = {};
        }
      }
      
      // Load vote stats for all concepts
      loadAllStats();
    }
  });
  
  // Fetch vote stats for all wireframe tools
  async function loadAllStats() {
    for (const tool of wireframeTools) {
      try {
        const response = await fetch(`/api/feedback?toolId=${tool.toolId}`);
        const data = await response.json();
        if (data.success && data.stats) {
          voteStats[tool.toolId] = data.stats;
        }
      } catch (err) {
        console.error(`Failed to load stats for ${tool.toolId}:`, err);
      }
    }
  }
  
  function openFeedback(tool: GraduatedToolConfig, type: 'concept_vote' | 'improvement', vote?: 'build_it' | 'not_interested') {
    // Check if already voted
    if (type === 'concept_vote' && votedTools[tool.toolId]) {
      return; // Don't open modal if already voted
    }
    
    selectedTool = tool;
    feedbackType = type;
    selectedVote = vote || null;
    showFeedbackModal = true;
  }
  
  function closeFeedback() {
    showFeedbackModal = false;
    selectedTool = null;
    selectedVote = null;
  }
  
  function handleFeedbackSuccess(toolId: string, vote?: string) {
    // Mark as voted in local state
    if (vote) {
      votedTools[toolId] = vote;
      
      // Update localStorage
      if (browser) {
        localStorage.setItem('ideasLabVotes', JSON.stringify(votedTools));
      }
      
      // Optimistically update vote counts
      if (voteStats[toolId]?.conceptVotes) {
        if (vote === 'build_it') {
          voteStats[toolId].conceptVotes!.buildIt++;
        } else if (vote === 'not_interested') {
          voteStats[toolId].conceptVotes!.notInterested++;
        } else if (vote === 'needs_changes') {
          voteStats[toolId].conceptVotes!.needsChanges++;
        }
      }
    }
    
    closeFeedback();
  }
  
  // Get vote count display
  function getVoteDisplay(toolId: string): { buildIt: number; notInterested: number; total: number } {
    const stats = voteStats[toolId];
    if (!stats?.conceptVotes) {
      return { buildIt: 0, notInterested: 0, total: 0 };
    }
    return {
      buildIt: stats.conceptVotes.buildIt,
      notInterested: stats.conceptVotes.notInterested,
      total: stats.conceptVotes.buildIt + stats.conceptVotes.notInterested + stats.conceptVotes.needsChanges,
    };
  }
  
  // Check if user already voted
  function hasVoted(toolId: string): boolean {
    return !!votedTools[toolId];
  }
  
  // Get what user voted for
  function getUserVote(toolId: string): string | null {
    return votedTools[toolId] || null;
  }
</script>

<svelte:head>
  <title>Ideas Lab - unconf tools Lab</title>
  <meta name="description" content="Help shape the future of unconf tools Lab! Vote on concepts, try beta features, and give feedback." />
</svelte:head>

<main>
  <header>
    <a href="/" class="back">← unconf tools Lab</a>
    <div class="title-row">
      <h1>💡 Ideas Lab</h1>
      <span class="preview-badge">Help us build!</span>
    </div>
    <p class="subtitle">
      Your feedback shapes what we build. Vote on concepts, try beta features, and tell us what you think.
    </p>
  </header>

  <!-- CONCEPTS SECTION - Wireframes with NO functionality -->
  <section class="concepts-section">
    <div class="section-header">
      <h2>🌱 Concepts</h2>
      <p class="section-desc">
        These are <strong>just ideas</strong> — no functionality yet! 
        Your votes decide what we build next.
      </p>
    </div>
    
    <div class="concept-cards">
      {#each wireframeTools as tool}
        {@const votes = getVoteDisplay(tool.toolId)}
        {@const voted = hasVoted(tool.toolId)}
        {@const userVote = getUserVote(tool.toolId)}
        
        <article class="concept-card" class:voted>
          <div class="concept-header">
            <span class="emoji">{tool.emoji}</span>
            <span class="concept-badge">💡 CONCEPT</span>
          </div>
          
          <h3>{tool.name}</h3>
          <p class="description">{tool.description}</p>
          
          {#if tool.suggestedBy}
            <div class="suggested-by">
              <span class="suggested-icon">💭</span>
              <span class="suggested-text">
                Suggested by <strong>{tool.suggestedBy.name}</strong>
                {#if tool.suggestedBy.role}
                  <span class="suggested-role">({tool.suggestedBy.role})</span>
                {/if}
              </span>
            </div>
          {/if}
          
          {#if tool.longDescription}
            <p class="long-description">{tool.longDescription}</p>
          {/if}
          
          <div class="no-functionality-notice">
            <span class="notice-icon">⚠️</span>
            <span>This is a concept only — no working feature yet</span>
          </div>
          
          <!-- Vote counts display -->
          {#if votes.total > 0}
            <div class="vote-counts">
              <div class="vote-count build">
                <span class="count-icon">👍</span>
                <span class="count-num">{votes.buildIt}</span>
              </div>
              <div class="vote-count not-interested">
                <span class="count-icon">👎</span>
                <span class="count-num">{votes.notInterested}</span>
              </div>
              <span class="vote-total">{votes.total} vote{votes.total !== 1 ? 's' : ''}</span>
            </div>
          {/if}
          
          <div class="vote-section">
            {#if voted}
              <!-- Already voted state -->
              <div class="already-voted">
                <span class="voted-icon">✓</span>
                <span>
                  You voted: 
                  {#if userVote === 'build_it'}
                    👍 Build it!
                  {:else if userVote === 'not_interested'}
                    👎 Not for me
                  {:else}
                    🤔 Needs changes
                  {/if}
                </span>
              </div>
              <button 
                class="feedback-link"
                onclick={() => openFeedback(tool, 'improvement')}
              >
                💬 Add more feedback
              </button>
            {:else}
              <!-- Voting buttons -->
              <p class="vote-prompt">Would this be useful for your events?</p>
              <div class="vote-buttons">
                <button 
                  class="vote-btn build-it"
                  onclick={() => openFeedback(tool, 'concept_vote', 'build_it')}
                >
                  👍 Build it!
                </button>
                <button 
                  class="vote-btn not-interested"
                  onclick={() => openFeedback(tool, 'concept_vote', 'not_interested')}
                >
                  👎 Not for me
                </button>
              </div>
              <button 
                class="feedback-link"
                onclick={() => openFeedback(tool, 'improvement')}
              >
                💬 Have ideas or suggestions?
              </button>
            {/if}
          </div>
        </article>
      {/each}
    </div>
    
    {#if wireframeTools.length === 0}
      <p class="empty-state">No concepts right now — check back soon!</p>
    {/if}
  </section>

  <!-- BETA SECTION - Working features collecting feedback -->
  {#if betaTools.length > 0}
    <section class="beta-section">
      <div class="section-header">
        <h2>🧪 Beta</h2>
        <p class="section-desc">
          These tools work but are still being refined. Your feedback shapes the final version.
        </p>
      </div>
      
      <div class="tool-list">
        {#each betaTools as tool}
          <a href={tool.path} class="tool-row beta">
            <span class="tool-emoji">{tool.emoji}</span>
            <div class="tool-info">
              <div class="tool-title">
                <h3>{tool.name}</h3>
                <span class="status-badge beta">BETA</span>
              </div>
              <p>{tool.description}</p>
            </div>
            <span class="arrow">→</span>
          </a>
        {/each}
      </div>
    </section>
  {/if}

  <!-- STANDARD SECTION - Graduated features -->
  <section class="standard-section">
    <div class="section-header">
      <h2>✅ Available Tools</h2>
      <p class="section-desc">
        Production-ready tools. We still love feedback on these!
      </p>
    </div>
    
    <div class="tool-list">
      {#each standardTools as tool}
        <a href={tool.path} class="tool-row standard">
          <span class="tool-emoji">{tool.emoji}</span>
          <div class="tool-info">
            <h3>{tool.name}</h3>
            <p>{tool.description}</p>
          </div>
          <span class="arrow">→</span>
        </a>
      {/each}
    </div>
  </section>

  <!-- REQUEST NEW TOOL -->
  <section class="request-section">
    <h2>🎯 Don't see what you need?</h2>
    <p>This project is community-driven. Suggest a new tool and we'll consider it!</p>
    <button 
      class="request-btn"
      onclick={() => {
        selectedTool = { toolId: 'new', name: 'New Tool', emoji: '🆕', description: '', status: 'wireframe', statusSince: '', enabled: true, path: null };
        feedbackType = 'improvement';
        showFeedbackModal = true;
      }}
    >
      📬 Suggest a Tool
    </button>
  </section>
</main>

<!-- Feedback Modal -->
{#if showFeedbackModal && selectedTool}
  <FeedbackModal
    tool={selectedTool}
    type={feedbackType}
    preselectedVote={selectedVote}
    onClose={closeFeedback}
    onSuccess={(vote) => handleFeedbackSuccess(selectedTool!.toolId, vote)}
  />
{/if}

<style>
  main {
    max-width: 800px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
    font-family: system-ui, -apple-system, sans-serif;
    color: #e4e4e7;
  }
  
  .back {
    color: #6b7280;
    text-decoration: none;
    font-size: 0.875rem;
  }
  
  .back:hover {
    color: #9ca3af;
  }
  
  .title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }
  
  h1 {
    font-size: 2rem;
    margin: 0;
    color: #f4f4f5;
  }
  
  .preview-badge {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: #0a0a0f;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  
  .subtitle {
    color: #a1a1aa;
    margin-top: 0.5rem;
    line-height: 1.5;
  }
  
  /* Section Headers */
  section {
    margin-top: 2.5rem;
  }
  
  .section-header {
    margin-bottom: 1rem;
  }
  
  .section-header h2 {
    font-size: 1.25rem;
    margin: 0;
    color: #f4f4f5;
  }
  
  .section-desc {
    color: #a1a1aa;
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }
  
  /* Concepts Section */
  .concepts-section {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(245, 158, 11, 0.02));
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: 16px;
    padding: 1.5rem;
  }
  
  .concept-cards {
    display: grid;
    gap: 1.5rem;
  }
  
  .concept-card {
    background: rgba(10, 10, 15, 0.8);
    border: 1px solid #27272a;
    border-radius: 12px;
    padding: 1.25rem;
    transition: border-color 0.2s;
  }
  
  .concept-card.voted {
    border-color: rgba(34, 197, 94, 0.3);
  }
  
  .concept-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  
  .emoji {
    font-size: 2rem;
  }
  
  .concept-badge {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  
  .concept-card h3 {
    font-size: 1.125rem;
    margin: 0 0 0.5rem;
    color: #f4f4f5;
  }
  
  .description {
    color: #a1a1aa;
    font-size: 0.875rem;
    margin: 0;
  }
  
  .long-description {
    color: #71717a;
    font-size: 0.8rem;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px dashed #27272a;
    line-height: 1.5;
  }
  
  /* Attribution */
  .suggested-by {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: rgba(99, 102, 241, 0.1);
    border-radius: 8px;
    font-size: 0.75rem;
    color: #a5b4fc;
  }
  
  .suggested-icon {
    font-size: 0.875rem;
  }
  
  .suggested-text strong {
    color: #c7d2fe;
  }
  
  .suggested-role {
    color: #818cf8;
    font-style: italic;
  }
  
  .no-functionality-notice {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(245, 158, 11, 0.1);
    border: 1px dashed rgba(245, 158, 11, 0.3);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    margin-top: 1rem;
    font-size: 0.75rem;
    color: #fbbf24;
  }
  
  /* Vote Counts */
  .vote-counts {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
    padding: 0.5rem 0.75rem;
    background: rgba(39, 39, 42, 0.5);
    border-radius: 8px;
  }
  
  .vote-count {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .count-icon {
    font-size: 0.875rem;
  }
  
  .count-num {
    font-weight: 600;
    color: #d4d4d8;
  }
  
  .vote-count.build .count-num {
    color: #4ade80;
  }
  
  .vote-count.not-interested .count-num {
    color: #f87171;
  }
  
  .vote-total {
    margin-left: auto;
    font-size: 0.75rem;
    color: #71717a;
  }
  
  .vote-section {
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid #27272a;
  }
  
  .vote-prompt {
    font-size: 0.875rem;
    color: #d4d4d8;
    margin: 0 0 0.75rem;
    font-weight: 500;
  }
  
  .vote-buttons {
    display: flex;
    gap: 0.75rem;
  }
  
  .vote-btn {
    flex: 1;
    padding: 0.625rem 1rem;
    border-radius: 8px;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s;
    border: none;
  }
  
  .vote-btn.build-it {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }
  
  .vote-btn.build-it:hover {
    background: rgba(34, 197, 94, 0.25);
  }
  
  .vote-btn.not-interested {
    background: rgba(239, 68, 68, 0.1);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }
  
  .vote-btn.not-interested:hover {
    background: rgba(239, 68, 68, 0.2);
  }
  
  /* Already Voted State */
  .already-voted {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.2);
    border-radius: 8px;
    font-size: 0.875rem;
    color: #4ade80;
  }
  
  .voted-icon {
    width: 20px;
    height: 20px;
    background: rgba(34, 197, 94, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
  }
  
  .feedback-link {
    display: block;
    width: 100%;
    margin-top: 0.75rem;
    padding: 0.5rem;
    background: transparent;
    border: none;
    color: #6366f1;
    font-size: 0.8rem;
    cursor: pointer;
    text-align: center;
  }
  
  .feedback-link:hover {
    color: #818cf8;
    text-decoration: underline;
  }
  
  /* Beta Section */
  .beta-section {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(139, 92, 246, 0.02));
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 16px;
    padding: 1.5rem;
  }
  
  /* Tool List (Beta & Standard) */
  .tool-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .tool-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: rgba(10, 10, 15, 0.6);
    border: 1px solid #27272a;
    border-radius: 12px;
    text-decoration: none;
    transition: all 0.15s;
  }
  
  .tool-row:hover {
    background: rgba(10, 10, 15, 0.9);
    border-color: #3f3f46;
  }
  
  .tool-row.beta:hover {
    border-color: rgba(139, 92, 246, 0.4);
  }
  
  .tool-emoji {
    font-size: 1.5rem;
  }
  
  .tool-info {
    flex: 1;
  }
  
  .tool-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .tool-info h3 {
    margin: 0;
    font-size: 1rem;
    color: #f4f4f5;
  }
  
  .tool-info p {
    margin: 0.25rem 0 0;
    font-size: 0.8rem;
    color: #a1a1aa;
  }
  
  .status-badge {
    font-size: 0.65rem;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    font-weight: 600;
    letter-spacing: 0.03em;
  }
  
  .status-badge.beta {
    background: rgba(139, 92, 246, 0.15);
    color: #a78bfa;
  }
  
  .arrow {
    color: #52525b;
    font-size: 1.25rem;
  }
  
  /* Standard Section */
  .standard-section .tool-row {
    background: rgba(10, 10, 15, 0.4);
  }
  
  /* Request Section */
  .request-section {
    text-align: center;
    padding: 2rem;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(99, 102, 241, 0.02));
    border: 1px dashed rgba(99, 102, 241, 0.3);
    border-radius: 16px;
  }
  
  .request-section h2 {
    margin: 0 0 0.5rem;
    font-size: 1.125rem;
  }
  
  .request-section p {
    color: #a1a1aa;
    font-size: 0.875rem;
    margin: 0 0 1rem;
  }
  
  .request-btn {
    background: #6366f1;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }
  
  .request-btn:hover {
    background: #4f46e5;
  }
  
  .empty-state {
    text-align: center;
    color: #71717a;
    padding: 2rem;
  }
  
  /* Mobile */
  @media (max-width: 640px) {
    .vote-buttons {
      flex-direction: column;
    }
  }
</style>
