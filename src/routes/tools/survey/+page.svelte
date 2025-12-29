<script lang="ts">
  import { generateId, generateSurveyCode, type Survey, type SurveyQuestion, type QuestionType } from '$lib/types/tools';
  import { goto } from '$app/navigation';
  
  // Survey being created
  let title = $state('');
  let description = $state('');
  let allowAnonymous = $state(true);
  let questions = $state<SurveyQuestion[]>([]);
  
  // UI state
  let isCreating = $state(false);
  let error = $state('');
  let shareUrl = $state('');
  let resultsUrl = $state('');
  let copied = $state(false);
  
  const questionTypes: { type: QuestionType; label: string; icon: string }[] = [
    { type: 'single-choice', label: 'Single Choice', icon: '○' },
    { type: 'multiple-choice', label: 'Multiple Choice', icon: '☑' },
    { type: 'rating', label: 'Rating Scale', icon: '⭐' },
    { type: 'yes-no', label: 'Yes / No', icon: '✓✗' },
    { type: 'text', label: 'Text Answer', icon: '✎' },
  ];
  
  function addQuestion(type: QuestionType) {
    const newQuestion: SurveyQuestion = {
      id: generateId(),
      type,
      question: '',
      required: false,
      options: type === 'single-choice' || type === 'multiple-choice' ? ['', ''] : undefined,
      ratingMax: type === 'rating' ? 5 : undefined,
      ratingLabels: type === 'rating' ? ['Poor', 'Excellent'] : undefined,
      placeholder: type === 'text' ? 'Your answer...' : undefined,
    };
    questions = [...questions, newQuestion];
  }
  
  function removeQuestion(id: string) {
    questions = questions.filter(q => q.id !== id);
  }
  
  function moveQuestion(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;
    
    const newQuestions = [...questions];
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    questions = newQuestions;
  }
  
  function addOption(questionId: string) {
    questions = questions.map(q => {
      if (q.id === questionId && q.options && q.options.length < 8) {
        return { ...q, options: [...q.options, ''] };
      }
      return q;
    });
  }
  
  function removeOption(questionId: string, index: number) {
    questions = questions.map(q => {
      if (q.id === questionId && q.options && q.options.length > 2) {
        return { ...q, options: q.options.filter((_, i) => i !== index) };
      }
      return q;
    });
  }
  
  function updateOption(questionId: string, index: number, value: string) {
    questions = questions.map(q => {
      if (q.id === questionId && q.options) {
        const newOptions = [...q.options];
        newOptions[index] = value;
        return { ...q, options: newOptions };
      }
      return q;
    });
  }
  
  function updateQuestion(questionId: string, field: string, value: any) {
    questions = questions.map(q => {
      if (q.id === questionId) {
        return { ...q, [field]: value };
      }
      return q;
    });
  }
  
  async function createSurvey() {
    // Validation
    if (!title.trim()) {
      error = 'Please enter a survey title';
      return;
    }
    if (questions.length === 0) {
      error = 'Add at least one question';
      return;
    }
    
    // Validate each question
    for (const q of questions) {
      if (!q.question.trim()) {
        error = 'All questions must have text';
        return;
      }
      if ((q.type === 'single-choice' || q.type === 'multiple-choice') && q.options) {
        const validOptions = q.options.filter(o => o.trim());
        if (validOptions.length < 2) {
          error = 'Choice questions need at least 2 options';
          return;
        }
      }
    }
    
    error = '';
    isCreating = true;
    
    // Clean up questions (remove empty options)
    const cleanedQuestions = questions.map(q => {
      if (q.options) {
        return { ...q, options: q.options.filter(o => o.trim()) };
      }
      return q;
    });
    
    const survey: Survey = {
      id: generateId(),
      title: title.trim(),
      description: description.trim() || undefined,
      questions: cleanedQuestions,
      status: 'open',
      shareCode: generateSurveyCode(),
      allowAnonymous,
      createdBy: 'anonymous', // Could be linked to session
      createdAt: new Date().toISOString(),
    };
    
    try {
      const response = await fetch('/api/tools/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(survey),
      });
      
      if (response.ok) {
        const data = await response.json();
        shareUrl = `${window.location.origin}/survey/${data.survey.shareCode}`;
        resultsUrl = `${window.location.origin}/survey/${data.survey.id}/results`;
        // Store in session for results access
        sessionStorage.setItem(`survey_${data.survey.id}_creator`, 'true');
      } else {
        error = 'Failed to create survey';
      }
    } catch (err) {
      error = 'Network error. Please try again.';
    }
    
    isCreating = false;
  }
  
  function copyShareUrl() {
    navigator.clipboard.writeText(shareUrl);
    copied = true;
    setTimeout(() => copied = false, 2000);
  }
  
  function startNew() {
    title = '';
    description = '';
    questions = [];
    shareUrl = '';
    resultsUrl = '';
    error = '';
  }
</script>

<svelte:head>
  <title>Create Survey - Event Tools Lab</title>
  <meta name="description" content="Create surveys with multiple question types. Free, no signup required." />
</svelte:head>

<main>
  {#if shareUrl}
    <!-- Success state -->
    <div class="success-container">
      <div class="success-icon">✅</div>
      <h1>Survey Created!</h1>
      <p class="success-message">Share this link with respondents:</p>
      
      <div class="share-box">
        <input type="text" readonly value={shareUrl} class="share-url" />
        <button class="copy-btn" onclick={copyShareUrl}>
          {copied ? '✓ Copied!' : '📋 Copy'}
        </button>
      </div>
      
      <div class="success-actions">
        <a href={shareUrl} class="btn primary" target="_blank">Preview Survey →</a>
        <a href={resultsUrl} class="btn secondary">View Results 📊</a>
        <button class="btn outline" onclick={startNew}>Create Another</button>
      </div>
    </div>
  {:else}
    <!-- Builder state -->
    <header>
      <a href="/tools" class="back">← All Tools</a>
      <h1>📋 Survey Builder</h1>
      <p class="subtitle">Create multi-question surveys with various question types</p>
    </header>
    
    <div class="standalone-notice">
      <span>💡</span>
      <p>
        <strong>Standalone mode</strong> - Surveys work independently. 
        <a href="/create">Create an event</a> to link surveys to participants.
      </p>
    </div>
    
    {#if error}
      <div class="error-box">{error}</div>
    {/if}
    
    <section class="survey-meta">
      <div class="form-group">
        <label for="title">Survey Title *</label>
        <input 
          id="title"
          type="text" 
          bind:value={title}
          placeholder="e.g., Session Feedback, Event Satisfaction"
          maxlength="100"
        />
      </div>
      
      <div class="form-group">
        <label for="description">Description (optional)</label>
        <textarea 
          id="description"
          bind:value={description}
          placeholder="Brief instructions or context for respondents..."
          rows="2"
        ></textarea>
      </div>
      
      <label class="checkbox-label">
        <input type="checkbox" bind:checked={allowAnonymous} />
        <span>Allow anonymous responses</span>
      </label>
    </section>
    
    <section class="questions-section">
      <div class="section-header">
        <h2>Questions ({questions.length})</h2>
      </div>
      
      {#if questions.length === 0}
        <div class="empty-questions">
          <p>No questions yet. Add your first question below.</p>
        </div>
      {:else}
        <div class="questions-list">
          {#each questions as question, index (question.id)}
            <div class="question-card">
              <div class="question-header">
                <span class="question-number">Q{index + 1}</span>
                <span class="question-type-badge">{questionTypes.find(t => t.type === question.type)?.label}</span>
                <div class="question-actions">
                  <button 
                    class="move-btn" 
                    onclick={() => moveQuestion(index, 'up')}
                    disabled={index === 0}
                    title="Move up"
                  >↑</button>
                  <button 
                    class="move-btn" 
                    onclick={() => moveQuestion(index, 'down')}
                    disabled={index === questions.length - 1}
                    title="Move down"
                  >↓</button>
                  <button 
                    class="remove-btn" 
                    onclick={() => removeQuestion(question.id)}
                    title="Remove"
                  >×</button>
                </div>
              </div>
              
              <input 
                type="text"
                class="question-input"
                placeholder="Enter your question..."
                value={question.question}
                oninput={(e) => updateQuestion(question.id, 'question', e.currentTarget.value)}
              />
              
              {#if question.type === 'single-choice' || question.type === 'multiple-choice'}
                <div class="options-list">
                  {#each question.options || [] as option, i}
                    <div class="option-row">
                      <span class="option-icon">{question.type === 'single-choice' ? '○' : '☐'}</span>
                      <input 
                        type="text"
                        placeholder="Option {i + 1}"
                        value={option}
                        oninput={(e) => updateOption(question.id, i, e.currentTarget.value)}
                      />
                      {#if (question.options?.length || 0) > 2}
                        <button class="remove-option-btn" onclick={() => removeOption(question.id, i)}>×</button>
                      {/if}
                    </div>
                  {/each}
                  {#if (question.options?.length || 0) < 8}
                    <button class="add-option-btn" onclick={() => addOption(question.id)}>
                      + Add option
                    </button>
                  {/if}
                </div>
              {/if}
              
              {#if question.type === 'rating'}
                <div class="rating-preview">
                  <span class="rating-label">{question.ratingLabels?.[0]}</span>
                  <div class="rating-stars">
                    {#each Array(question.ratingMax || 5) as _, i}
                      <span class="star">☆</span>
                    {/each}
                  </div>
                  <span class="rating-label">{question.ratingLabels?.[1]}</span>
                </div>
              {/if}
              
              {#if question.type === 'yes-no'}
                <div class="yesno-preview">
                  <span class="yesno-option">👍 Yes</span>
                  <span class="yesno-option">👎 No</span>
                </div>
              {/if}
              
              {#if question.type === 'text'}
                <div class="text-preview">
                  <input type="text" disabled placeholder={question.placeholder} />
                </div>
              {/if}
              
              <label class="required-toggle">
                <input 
                  type="checkbox" 
                  checked={question.required}
                  onchange={(e) => updateQuestion(question.id, 'required', e.currentTarget.checked)}
                />
                <span>Required</span>
              </label>
            </div>
          {/each}
        </div>
      {/if}
      
      <div class="add-question-section">
        <p class="add-label">Add question:</p>
        <div class="question-type-grid">
          {#each questionTypes as qt}
            <button class="type-btn" onclick={() => addQuestion(qt.type)}>
              <span class="type-icon">{qt.icon}</span>
              <span class="type-label">{qt.label}</span>
            </button>
          {/each}
        </div>
      </div>
    </section>
    
    <div class="create-actions">
      <button 
        class="create-btn" 
        onclick={createSurvey}
        disabled={isCreating || !title.trim() || questions.length === 0}
      >
        {isCreating ? 'Creating...' : '🚀 Create & Share Survey'}
      </button>
    </div>
  {/if}
</main>

<style>
  main {
    max-width: 700px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  .back {
    color: #6b7280;
    text-decoration: none;
    font-size: 0.875rem;
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
  
  .error-box {
    background: #fee2e2;
    border: 1px solid #fecaca;
    color: #b91c1c;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }
  
  /* Survey Meta */
  .survey-meta {
    background: #f8fafc;
    padding: 1.5rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .form-group label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }
  
  .form-group input, .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 1rem;
    box-sizing: border-box;
  }
  
  .form-group input:focus, .form-group textarea:focus {
    outline: none;
    border-color: #2563eb;
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
  
  /* Questions Section */
  .questions-section {
    margin-bottom: 1.5rem;
  }
  
  .section-header {
    margin-bottom: 1rem;
  }
  
  .section-header h2 {
    font-size: 1.1rem;
    margin: 0;
  }
  
  .empty-questions {
    background: #f8fafc;
    border: 2px dashed #d1d5db;
    padding: 2rem;
    border-radius: 12px;
    text-align: center;
    color: #6b7280;
  }
  
  .questions-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .question-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1rem;
  }
  
  .question-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  
  .question-number {
    background: #2563eb;
    color: white;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  
  .question-type-badge {
    background: #f3f4f6;
    color: #4b5563;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
  }
  
  .question-actions {
    margin-left: auto;
    display: flex;
    gap: 0.25rem;
  }
  
  .move-btn, .remove-btn {
    width: 28px;
    height: 28px;
    border: 1px solid #e5e7eb;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
  }
  
  .move-btn:hover:not(:disabled) {
    background: #f3f4f6;
  }
  
  .move-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  
  .remove-btn {
    color: #b91c1c;
    border-color: #fecaca;
  }
  
  .remove-btn:hover {
    background: #fee2e2;
  }
  
  .question-input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 1rem;
    box-sizing: border-box;
    margin-bottom: 0.75rem;
  }
  
  .question-input:focus {
    outline: none;
    border-color: #2563eb;
  }
  
  /* Options */
  .options-list {
    margin-bottom: 0.75rem;
  }
  
  .option-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .option-icon {
    color: #9ca3af;
    font-size: 1rem;
  }
  
  .option-row input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-size: 0.9rem;
  }
  
  .remove-option-btn {
    width: 28px;
    height: 28px;
    background: #fee2e2;
    color: #b91c1c;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .add-option-btn {
    width: 100%;
    padding: 0.5rem;
    background: none;
    border: 1px dashed #d1d5db;
    border-radius: 6px;
    color: #6b7280;
    cursor: pointer;
    font-size: 0.85rem;
  }
  
  .add-option-btn:hover {
    border-color: #9ca3af;
  }
  
  /* Rating preview */
  .rating-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: #f8fafc;
    border-radius: 8px;
    margin-bottom: 0.75rem;
  }
  
  .rating-label {
    font-size: 0.8rem;
    color: #6b7280;
  }
  
  .rating-stars {
    display: flex;
    gap: 0.25rem;
  }
  
  .star {
    font-size: 1.5rem;
    color: #fbbf24;
  }
  
  /* Yes/No preview */
  .yesno-preview {
    display: flex;
    gap: 1rem;
    justify-content: center;
    padding: 0.75rem;
    background: #f8fafc;
    border-radius: 8px;
    margin-bottom: 0.75rem;
  }
  
  .yesno-option {
    padding: 0.5rem 1rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-size: 0.9rem;
  }
  
  /* Text preview */
  .text-preview input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: #f8fafc;
    margin-bottom: 0.75rem;
  }
  
  .required-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: #6b7280;
    cursor: pointer;
  }
  
  .required-toggle input {
    width: 14px;
    height: 14px;
  }
  
  /* Add question section */
  .add-question-section {
    background: #f8fafc;
    padding: 1rem;
    border-radius: 12px;
  }
  
  .add-label {
    font-size: 0.85rem;
    color: #6b7280;
    margin: 0 0 0.75rem;
  }
  
  .question-type-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.5rem;
  }
  
  .type-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.75rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  
  .type-btn:hover {
    border-color: #2563eb;
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1);
  }
  
  .type-icon {
    font-size: 1.25rem;
  }
  
  .type-label {
    font-size: 0.75rem;
    color: #4b5563;
  }
  
  /* Create button */
  .create-actions {
    padding-top: 1rem;
  }
  
  .create-btn {
    width: 100%;
    padding: 1rem;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
  }
  
  .create-btn:hover:not(:disabled) {
    opacity: 0.9;
  }
  
  .create-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* Success state */
  .success-container {
    text-align: center;
    padding: 3rem 1rem;
  }
  
  .success-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }
  
  .success-container h1 {
    margin: 0 0 0.5rem;
  }
  
  .success-message {
    color: #6b7280;
    margin: 0 0 1.5rem;
  }
  
  .share-box {
    display: flex;
    gap: 0.5rem;
    max-width: 500px;
    margin: 0 auto 2rem;
  }
  
  .share-url {
    flex: 1;
    padding: 0.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 0.9rem;
    text-align: center;
  }
  
  .copy-btn {
    padding: 0.75rem 1rem;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
  }
  
  .success-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 500;
    text-decoration: none;
    font-size: 0.95rem;
    border: none;
    cursor: pointer;
  }
  
  .btn.primary {
    background: #2563eb;
    color: white;
  }
  
  .btn.secondary {
    background: #f3f4f6;
    color: #374151;
  }
  
  .btn.outline {
    background: white;
    color: #6b7280;
    border: 1px solid #e5e7eb;
  }
  
  @media (max-width: 500px) {
    .question-type-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
