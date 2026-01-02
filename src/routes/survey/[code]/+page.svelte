<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { generateId, type Survey, type SurveyQuestion, type SurveyResponse, type SurveyAnswer } from '$lib/types/tools';
  
  let shareCode = $derived($page.params.code);
  
  let survey = $state<Survey | null>(null);
  let isLoading = $state(true);
  let error = $state('');
  let submitted = $state(false);
  let isSubmitting = $state(false);
  
  // Response state
  let respondentName = $state('');
  let answers = $state<Record<string, SurveyAnswer>>({});
  let validationErrors = $state<Record<string, string>>({});
  
  onMount(async () => {
    try {
      const response = await fetch(`/api/tools/survey/code/${shareCode}`);
      if (!response.ok) {
        if (response.status === 404) {
          error = 'Survey not found';
        } else {
          error = 'Failed to load survey';
        }
        isLoading = false;
        return;
      }
      
      const data = await response.json();
      survey = data.survey;
      
      // Initialize answers
      if (survey) {
        const initialAnswers: Record<string, SurveyAnswer> = {};
        survey.questions.forEach(q => {
          if (q.type === 'multiple-choice') {
            initialAnswers[q.id] = [];
          } else if (q.type === 'rating') {
            initialAnswers[q.id] = 0;
          } else {
            initialAnswers[q.id] = '';
          }
        });
        answers = initialAnswers;
      }
      
      isLoading = false;
    } catch (err) {
      error = 'Network error';
      isLoading = false;
    }
  });
  
  function updateAnswer(questionId: string, value: SurveyAnswer) {
    answers = { ...answers, [questionId]: value };
    // Clear validation error when user answers
    if (validationErrors[questionId]) {
      validationErrors = { ...validationErrors, [questionId]: '' };
    }
  }
  
  function toggleMultiChoice(questionId: string, option: string) {
    const current = (answers[questionId] as string[]) || [];
    if (current.includes(option)) {
      updateAnswer(questionId, current.filter(o => o !== option));
    } else {
      updateAnswer(questionId, [...current, option]);
    }
  }
  
  function validate(): boolean {
    if (!survey) return false;
    
    const errors: Record<string, string> = {};
    
    for (const question of survey.questions) {
      if (question.required) {
        const answer = answers[question.id];
        let isEmpty = false;
        
        if (question.type === 'multiple-choice') {
          isEmpty = !answer || (answer as string[]).length === 0;
        } else if (question.type === 'rating') {
          isEmpty = !answer || answer === 0;
        } else {
          isEmpty = !answer || (answer as string).trim() === '';
        }
        
        if (isEmpty) {
          errors[question.id] = 'This question is required';
        }
      }
    }
    
    validationErrors = errors;
    return Object.keys(errors).length === 0;
  }
  
  async function submitResponse() {
    if (!survey || !validate()) return;
    
    isSubmitting = true;
    
    const response: SurveyResponse = {
      id: generateId(),
      surveyId: survey.id,
      respondentName: respondentName.trim() || undefined,
      answers,
      submittedAt: new Date().toISOString(),
    };
    
    try {
      const res = await fetch(`/api/tools/survey/${survey.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response),
      });
      
      if (res.ok) {
        submitted = true;
      } else {
        error = 'Failed to submit response';
      }
    } catch (err) {
      error = 'Network error';
    }
    
    isSubmitting = false;
  }
</script>

<svelte:head>
  <title>{survey?.title || 'Survey'} - unconf tools Lab</title>
</svelte:head>

<main>
  {#if isLoading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading survey...</p>
    </div>
  {:else if error}
    <div class="error-page">
      <h1>😕 {error}</h1>
      <p>The survey may have been closed or the link is incorrect.</p>
      <a href="/" class="btn">← Back to Home</a>
    </div>
  {:else if submitted}
    <div class="success-page">
      <div class="success-icon">✅</div>
      <h1>Response Submitted!</h1>
      <p>Thank you for taking the time to respond.</p>
      <a href="/" class="btn">← Back to Home</a>
    </div>
  {:else if survey}
    {#if survey.status === 'closed'}
      <div class="closed-notice">
        <h2>Survey Closed</h2>
        <p>This survey is no longer accepting responses.</p>
        <a href="/" class="btn">← Back to Home</a>
      </div>
    {:else}
      <header>
        <h1>{survey.title}</h1>
        {#if survey.description}
          <p class="description">{survey.description}</p>
        {/if}
        <p class="question-count">{survey.questions.length} question{survey.questions.length !== 1 ? 's' : ''}</p>
      </header>
      
      {#if !survey.allowAnonymous || respondentName}
        <!-- Name already provided or required -->
      {:else}
        <div class="name-section">
          <label for="name">Your name (optional)</label>
          <input 
            id="name"
            type="text" 
            bind:value={respondentName}
            placeholder="Anonymous"
          />
        </div>
      {/if}
      
      <form onsubmit={(e) => { e.preventDefault(); submitResponse(); }}>
        <div class="questions">
          {#each survey.questions as question, index}
            <div class="question-card" class:has-error={validationErrors[question.id]}>
              <div class="question-label">
                <span class="q-number">Q{index + 1}</span>
                <span class="q-text">{question.question}</span>
                {#if question.required}
                  <span class="required-star">*</span>
                {/if}
              </div>
              
              {#if question.type === 'single-choice'}
                <div class="options single">
                  {#each question.options || [] as option}
                    <label class="option-label">
                      <input 
                        type="radio" 
                        name={question.id}
                        value={option}
                        checked={answers[question.id] === option}
                        onchange={() => updateAnswer(question.id, option)}
                      />
                      <span class="option-text">{option}</span>
                    </label>
                  {/each}
                </div>
              {/if}
              
              {#if question.type === 'multiple-choice'}
                <div class="options multiple">
                  {#each question.options || [] as option}
                    <label class="option-label">
                      <input 
                        type="checkbox"
                        checked={(answers[question.id] as string[] || []).includes(option)}
                        onchange={() => toggleMultiChoice(question.id, option)}
                      />
                      <span class="option-text">{option}</span>
                    </label>
                  {/each}
                </div>
              {/if}
              
              {#if question.type === 'rating'}
                <div class="rating-input">
                  {#if question.ratingLabels}
                    <span class="rating-label-text">{question.ratingLabels[0]}</span>
                  {/if}
                  <div class="stars">
                    {#each Array(question.ratingMax || 5) as _, i}
                      <button 
                        type="button"
                        class="star-btn"
                        class:filled={(answers[question.id] as number) >= i + 1}
                        onclick={() => updateAnswer(question.id, i + 1)}
                      >
                        {(answers[question.id] as number) >= i + 1 ? '★' : '☆'}
                      </button>
                    {/each}
                  </div>
                  {#if question.ratingLabels}
                    <span class="rating-label-text">{question.ratingLabels[1]}</span>
                  {/if}
                </div>
              {/if}
              
              {#if question.type === 'yes-no'}
                <div class="yesno-input">
                  <button 
                    type="button"
                    class="yesno-btn"
                    class:selected={answers[question.id] === 'yes'}
                    onclick={() => updateAnswer(question.id, 'yes')}
                  >
                    👍 Yes
                  </button>
                  <button 
                    type="button"
                    class="yesno-btn"
                    class:selected={answers[question.id] === 'no'}
                    onclick={() => updateAnswer(question.id, 'no')}
                  >
                    👎 No
                  </button>
                </div>
              {/if}
              
              {#if question.type === 'text'}
                <textarea 
                  class="text-input"
                  placeholder={question.placeholder || 'Your answer...'}
                  value={answers[question.id] as string || ''}
                  oninput={(e) => updateAnswer(question.id, e.currentTarget.value)}
                  rows="3"
                ></textarea>
              {/if}
              
              {#if validationErrors[question.id]}
                <p class="error-message">{validationErrors[question.id]}</p>
              {/if}
            </div>
          {/each}
        </div>
        
        <button type="submit" class="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Response'}
        </button>
      </form>
    {/if}
  {/if}
</main>

<style>
  main {
    max-width: 600px;
    margin: 0 auto;
    padding: 1.5rem 1rem 3rem;
    font-family: system-ui, -apple-system, sans-serif;
    color: #e4e4e7;
  }
  
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
    color: #a1a1aa;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #27272a;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .error-page, .success-page, .closed-notice {
    text-align: center;
    padding: 4rem 1rem;
  }
  
  .success-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }
  
  .success-page h1 {
    margin: 0 0 0.5rem;
    color: #f4f4f5;
  }
  
  .success-page p, .error-page p {
    color: #a1a1aa;
    margin: 0 0 1.5rem;
  }
  
  .btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background: #6366f1;
    color: white;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 500;
  }
  
  .btn:hover {
    background: #4f46e5;
  }
  
  /* Header */
  header {
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  
  header h1 {
    font-size: 1.75rem;
    margin: 0 0 0.5rem;
    color: #f4f4f5;
  }
  
  .description {
    color: #a1a1aa;
    margin: 0 0 0.5rem;
    line-height: 1.5;
  }
  
  .question-count {
    color: #71717a;
    font-size: 0.875rem;
    margin: 0;
  }
  
  /* Name section */
  .name-section {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
  }
  
  .name-section label {
    display: block;
    font-size: 0.875rem;
    color: #a1a1aa;
    margin-bottom: 0.5rem;
  }
  
  .name-section input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    font-size: 1rem;
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.05);
    color: #e4e4e7;
  }
  
  .name-section input:focus {
    outline: none;
    border-color: #6366f1;
  }
  
  .name-section input::placeholder {
    color: #71717a;
  }
  
  /* Questions */
  .questions {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .question-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 1.25rem;
  }
  
  .question-card.has-error {
    border-color: rgba(239, 68, 68, 0.5);
    background: rgba(239, 68, 68, 0.05);
  }
  
  .question-label {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .q-number {
    background: #6366f1;
    color: white;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
    flex-shrink: 0;
  }
  
  .q-text {
    font-weight: 500;
    line-height: 1.4;
    color: #f4f4f5;
  }
  
  .required-star {
    color: #f87171;
    font-weight: bold;
  }
  
  /* Options */
  .options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .option-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .option-label:hover {
    background: rgba(255, 255, 255, 0.06);
  }
  
  .option-label input {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
  
  .option-text {
    font-size: 0.95rem;
    color: #e4e4e7;
  }
  
  /* Rating */
  .rating-input {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
  }
  
  .rating-label-text {
    font-size: 0.8rem;
    color: #a1a1aa;
  }
  
  .stars {
    display: flex;
    gap: 0.25rem;
  }
  
  .star-btn {
    font-size: 2rem;
    background: none;
    border: none;
    cursor: pointer;
    color: #52525b;
    padding: 0;
    transition: transform 0.1s;
  }
  
  .star-btn:hover {
    transform: scale(1.1);
  }
  
  .star-btn.filled {
    color: #fbbf24;
  }
  
  /* Yes/No */
  .yesno-input {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }
  
  .yesno-btn {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    color: #e4e4e7;
  }
  
  .yesno-btn:hover {
    border-color: #6366f1;
  }
  
  .yesno-btn.selected {
    background: rgba(99, 102, 241, 0.15);
    border-color: #6366f1;
  }
  
  /* Text */
  .text-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    font-size: 1rem;
    font-family: inherit;
    resize: vertical;
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.05);
    color: #e4e4e7;
  }
  
  .text-input:focus {
    outline: none;
    border-color: #6366f1;
  }
  
  .text-input::placeholder {
    color: #71717a;
  }
  
  .error-message {
    color: #f87171;
    font-size: 0.8rem;
    margin: 0.5rem 0 0;
  }
  
  /* Submit */
  .submit-btn {
    width: 100%;
    padding: 1rem;
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
  }
  
  .submit-btn:hover:not(:disabled) {
    opacity: 0.9;
  }
  
  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
