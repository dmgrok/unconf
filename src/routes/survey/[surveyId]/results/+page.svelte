<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import type { Survey, SurveyResults, QuestionResult } from '$lib/types/tools';
  
  let surveyId = $derived($page.params.surveyId);
  
  let survey = $state<Survey | null>(null);
  let results = $state<SurveyResults | null>(null);
  let isLoading = $state(true);
  let error = $state('');
  let shareUrl = $state('');
  let copied = $state(false);
  
  onMount(async () => {
    try {
      // Check if user is creator
      const isCreator = sessionStorage.getItem(`survey_${surveyId}_creator`);
      
      const response = await fetch(`/api/tools/survey/${surveyId}/results`);
      if (!response.ok) {
        if (response.status === 404) {
          error = 'Survey not found';
        } else if (response.status === 403) {
          error = 'You do not have access to view these results';
        } else {
          error = 'Failed to load results';
        }
        isLoading = false;
        return;
      }
      
      const data = await response.json();
      survey = data.survey;
      results = data.results;
      
      if (survey) {
        shareUrl = `${window.location.origin}/survey/${survey.shareCode}`;
      }
      
      isLoading = false;
    } catch (err) {
      error = 'Network error';
      isLoading = false;
    }
  });
  
  function copyShareUrl() {
    navigator.clipboard.writeText(shareUrl);
    copied = true;
    setTimeout(() => copied = false, 2000);
  }
  
  async function toggleStatus() {
    if (!survey) return;
    
    const newStatus = survey.status === 'open' ? 'closed' : 'open';
    
    try {
      const response = await fetch(`/api/tools/survey/${surveyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (response.ok) {
        survey = { ...survey, status: newStatus };
      }
    } catch (err) {
      console.error('Failed to update status');
    }
  }
  
  function getQuestionById(id: string) {
    return survey?.questions.find(q => q.id === id);
  }
  
  function getPercentage(count: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  }
</script>

<svelte:head>
  <title>Results: {survey?.title || 'Survey'} - unconf tools Lab</title>
</svelte:head>

<main>
  {#if isLoading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading results...</p>
    </div>
  {:else if error}
    <div class="error-page">
      <h1>😕 {error}</h1>
      <a href="/tools/survey" class="btn">← Back to Survey Builder</a>
    </div>
  {:else if survey && results}
    <header>
      <a href="/tools/survey" class="back">← Create New Survey</a>
      <h1>{survey.title}</h1>
      <div class="meta-row">
        <span class="response-count">{results.totalResponses} response{results.totalResponses !== 1 ? 's' : ''}</span>
        <span class="status-badge" class:open={survey.status === 'open'} class:closed={survey.status === 'closed'}>
          {survey.status === 'open' ? '🟢 Open' : '🔴 Closed'}
        </span>
      </div>
    </header>
    
    <section class="actions-bar">
      <div class="share-section">
        <input type="text" readonly value={shareUrl} class="share-url" />
        <button class="copy-btn" onclick={copyShareUrl}>
          {copied ? '✓' : '📋'}
        </button>
      </div>
      <button class="toggle-btn" onclick={toggleStatus}>
        {survey.status === 'open' ? '🔒 Close Survey' : '🔓 Reopen Survey'}
      </button>
    </section>
    
    {#if results.totalResponses === 0}
      <div class="no-responses">
        <p>📭 No responses yet</p>
        <p class="hint">Share the survey link to start collecting responses.</p>
      </div>
    {:else}
      <div class="results-list">
        {#each survey.questions as question, index}
          {@const result = results.questionResults[question.id]}
          <div class="result-card">
            <div class="result-header">
              <span class="q-number">Q{index + 1}</span>
              <span class="q-text">{question.question}</span>
              {#if result}
                <span class="response-count-small">{result.responseCount} answers</span>
              {/if}
            </div>
            
            {#if result}
              {#if question.type === 'single-choice' || question.type === 'multiple-choice'}
                <div class="choice-results">
                  {#each question.options || [] as option}
                    {@const count = result.choiceCounts?.[option] || 0}
                    {@const pct = getPercentage(count, result.responseCount)}
                    <div class="choice-row">
                      <div class="choice-label">{option}</div>
                      <div class="choice-bar-wrapper">
                        <div class="choice-bar" style="width: {pct}%"></div>
                      </div>
                      <div class="choice-stats">{count} ({pct}%)</div>
                    </div>
                  {/each}
                </div>
              {/if}
              
              {#if question.type === 'rating'}
                <div class="rating-results">
                  <div class="average-rating">
                    <span class="avg-number">{result.averageRating?.toFixed(1) || '—'}</span>
                    <span class="avg-label">average</span>
                    <div class="avg-stars">
                      {#each Array(question.ratingMax || 5) as _, i}
                        <span class:filled={(result.averageRating || 0) >= i + 0.5}>
                          {(result.averageRating || 0) >= i + 0.5 ? '★' : '☆'}
                        </span>
                      {/each}
                    </div>
                  </div>
                  <div class="rating-distribution">
                    {#each Array(question.ratingMax || 5) as _, i}
                      {@const rating = i + 1}
                      {@const count = result.ratingDistribution?.[rating] || 0}
                      {@const pct = getPercentage(count, result.responseCount)}
                      <div class="rating-row">
                        <span class="rating-value">{rating}★</span>
                        <div class="rating-bar-wrapper">
                          <div class="rating-bar" style="width: {pct}%"></div>
                        </div>
                        <span class="rating-count">{count}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
              
              {#if question.type === 'yes-no'}
                {@const yesCount = result.choiceCounts?.['yes'] || 0}
                {@const noCount = result.choiceCounts?.['no'] || 0}
                {@const yesPct = getPercentage(yesCount, result.responseCount)}
                {@const noPct = getPercentage(noCount, result.responseCount)}
                <div class="yesno-results">
                  <div class="yesno-bar">
                    <div class="yes-portion" style="width: {yesPct}%">
                      {#if yesPct > 15}👍 {yesPct}%{/if}
                    </div>
                    <div class="no-portion" style="width: {noPct}%">
                      {#if noPct > 15}👎 {noPct}%{/if}
                    </div>
                  </div>
                  <div class="yesno-legend">
                    <span>👍 Yes: {yesCount}</span>
                    <span>👎 No: {noCount}</span>
                  </div>
                </div>
              {/if}
              
              {#if question.type === 'text' && result.textResponses}
                <div class="text-results">
                  {#each result.textResponses.slice(0, 10) as response}
                    <div class="text-response">"{response}"</div>
                  {/each}
                  {#if result.textResponses.length > 10}
                    <p class="more-responses">+ {result.textResponses.length - 10} more responses</p>
                  {/if}
                </div>
              {/if}
            {:else}
              <p class="no-data">No responses for this question</p>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</main>

<style>
  main {
    max-width: 700px;
    margin: 0 auto;
    padding: 1.5rem 1rem 3rem;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
    color: #6b7280;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e5e7eb;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .error-page {
    text-align: center;
    padding: 4rem 1rem;
  }
  
  .btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background: #2563eb;
    color: white;
    border-radius: 8px;
    text-decoration: none;
  }
  
  .back {
    color: #6b7280;
    text-decoration: none;
    font-size: 0.875rem;
  }
  
  header {
    margin-bottom: 1.5rem;
  }
  
  header h1 {
    font-size: 1.5rem;
    margin: 0.75rem 0 0.5rem;
  }
  
  .meta-row {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  
  .response-count {
    color: #6b7280;
    font-size: 0.9rem;
  }
  
  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 500;
  }
  
  .status-badge.open {
    background: #dcfce7;
    color: #15803d;
  }
  
  .status-badge.closed {
    background: #fee2e2;
    color: #b91c1c;
  }
  
  /* Actions bar */
  .actions-bar {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }
  
  .share-section {
    display: flex;
    flex: 1;
    min-width: 200px;
  }
  
  .share-url {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 6px 0 0 6px;
    font-size: 0.85rem;
  }
  
  .copy-btn {
    padding: 0.5rem 0.75rem;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-left: none;
    border-radius: 0 6px 6px 0;
    cursor: pointer;
  }
  
  .toggle-btn {
    padding: 0.5rem 1rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-size: 0.85rem;
    cursor: pointer;
  }
  
  .toggle-btn:hover {
    background: #f9fafb;
  }
  
  /* No responses */
  .no-responses {
    text-align: center;
    padding: 3rem 1rem;
    background: #f8fafc;
    border-radius: 12px;
  }
  
  .no-responses p {
    margin: 0;
    font-size: 1.25rem;
  }
  
  .no-responses .hint {
    color: #6b7280;
    font-size: 0.9rem;
    margin-top: 0.5rem;
  }
  
  /* Results list */
  .results-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .result-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1.25rem;
  }
  
  .result-header {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  
  .q-number {
    background: #2563eb;
    color: white;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
  }
  
  .q-text {
    flex: 1;
    font-weight: 500;
    min-width: 150px;
  }
  
  .response-count-small {
    color: #9ca3af;
    font-size: 0.8rem;
  }
  
  /* Choice results */
  .choice-results {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .choice-row {
    display: grid;
    grid-template-columns: 120px 1fr 70px;
    gap: 0.75rem;
    align-items: center;
  }
  
  .choice-label {
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .choice-bar-wrapper {
    height: 24px;
    background: #f3f4f6;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .choice-bar {
    height: 100%;
    background: linear-gradient(90deg, #2563eb, #3b82f6);
    border-radius: 4px;
    transition: width 0.3s ease;
  }
  
  .choice-stats {
    font-size: 0.85rem;
    color: #6b7280;
    text-align: right;
  }
  
  /* Rating results */
  .rating-results {
    display: flex;
    gap: 2rem;
    align-items: center;
  }
  
  .average-rating {
    text-align: center;
    padding: 1rem;
    background: #fef3c7;
    border-radius: 12px;
    min-width: 100px;
  }
  
  .avg-number {
    font-size: 2rem;
    font-weight: 700;
    color: #92400e;
    display: block;
  }
  
  .avg-label {
    font-size: 0.75rem;
    color: #a16207;
  }
  
  .avg-stars {
    margin-top: 0.25rem;
    color: #fbbf24;
    font-size: 1rem;
  }
  
  .avg-stars .filled {
    color: #fbbf24;
  }
  
  .rating-distribution {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .rating-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .rating-value {
    width: 30px;
    font-size: 0.8rem;
    color: #6b7280;
  }
  
  .rating-bar-wrapper {
    flex: 1;
    height: 16px;
    background: #f3f4f6;
    border-radius: 3px;
  }
  
  .rating-bar {
    height: 100%;
    background: #fbbf24;
    border-radius: 3px;
  }
  
  .rating-count {
    width: 30px;
    font-size: 0.8rem;
    color: #6b7280;
    text-align: right;
  }
  
  /* Yes/No results */
  .yesno-results {
    text-align: center;
  }
  
  .yesno-bar {
    display: flex;
    height: 40px;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }
  
  .yes-portion {
    background: #86efac;
    color: #15803d;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.9rem;
  }
  
  .no-portion {
    background: #fca5a5;
    color: #b91c1c;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.9rem;
  }
  
  .yesno-legend {
    display: flex;
    justify-content: center;
    gap: 2rem;
    font-size: 0.85rem;
    color: #6b7280;
  }
  
  /* Text results */
  .text-results {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .text-response {
    padding: 0.75rem;
    background: #f8fafc;
    border-radius: 8px;
    font-size: 0.9rem;
    font-style: italic;
    color: #374151;
  }
  
  .more-responses {
    color: #6b7280;
    font-size: 0.85rem;
    text-align: center;
    margin: 0.5rem 0 0;
  }
  
  .no-data {
    color: #9ca3af;
    font-size: 0.9rem;
    text-align: center;
  }
  
  @media (max-width: 600px) {
    .choice-row {
      grid-template-columns: 1fr;
      gap: 0.25rem;
    }
    
    .choice-stats {
      text-align: left;
    }
    
    .rating-results {
      flex-direction: column;
    }
  }
</style>
