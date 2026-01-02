<!--
  FeedbackModal.svelte
  
  Modal for collecting detailed feedback on tools and concepts.
  Used in Ideas Lab for concept voting and suggestions.
-->
<script lang="ts">
  import { browser } from '$app/environment';
  import type { GraduatedToolConfig } from '$lib/types/graduation';
  import type { FeedbackSubmission, ConceptVote, SubmitFeedbackResponse } from '$lib/types/feedback';
  
  interface Props {
    tool: GraduatedToolConfig;
    type: 'concept_vote' | 'improvement' | 'bug_report' | 'feature_request';
    preselectedVote?: 'build_it' | 'not_interested' | null;
    onClose: () => void;
    onSuccess?: (vote?: string) => void;
  }
  
  let { tool, type, preselectedVote = null, onClose, onSuccess }: Props = $props();
  
  // Form state - initialize with preselected vote if provided
  let selectedVote = $state<ConceptVote | null>(preselectedVote);
  let message = $state('');
  let email = $state('');
  let name = $state('');
  let isSubmitting = $state(false);
  let submitResult = $state<{ success: boolean; message?: string; error?: string } | null>(null);
  
  // Character limits
  const MAX_MESSAGE_LENGTH = 1000;
  let messageLength = $derived(message.length);
  
  // Get session ID from cookie or generate
  function getSessionId(): string {
    if (!browser) return 'server';
    
    // Try to get existing session ID
    const cookies = document.cookie.split(';').map(c => c.trim());
    const sessionCookie = cookies.find(c => c.startsWith('session_id='));
    if (sessionCookie) {
      return sessionCookie.split('=')[1];
    }
    
    // Generate new session ID
    const newId = crypto.randomUUID();
    document.cookie = `session_id=${newId}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=strict`;
    return newId;
  }
  
  async function handleSubmit() {
    if (isSubmitting) return;
    
    // Validation
    if (type === 'concept_vote' && !selectedVote) {
      submitResult = { success: false, error: 'Please select your vote' };
      return;
    }
    
    if (type !== 'concept_vote' && !message.trim()) {
      submitResult = { success: false, error: 'Please enter your feedback' };
      return;
    }
    
    isSubmitting = true;
    submitResult = null;
    
    const feedback: FeedbackSubmission = {
      type,
      toolId: tool.toolId,
      sessionId: getSessionId(),
      vote: type === 'concept_vote' ? selectedVote || undefined : undefined,
      message: message.trim() || undefined,
      email: email.trim() || undefined,
      name: name.trim() || undefined,
    };
    
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      });
      
      const result: SubmitFeedbackResponse = await response.json();
      
      if (result.success) {
        submitResult = { success: true, message: result.message };
        
        // Store that user voted (for this tool)
        if (browser && type === 'concept_vote' && selectedVote) {
          const voted = JSON.parse(localStorage.getItem('ideasLabVotes') || '{}');
          voted[tool.toolId] = selectedVote;
          localStorage.setItem('ideasLabVotes', JSON.stringify(voted));
        }
        
        // Call success callback
        if (onSuccess) {
          onSuccess(type === 'concept_vote' ? selectedVote || undefined : undefined);
        }
        
        // Close after showing success
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        submitResult = { success: false, error: result.error || 'Failed to submit feedback' };
      }
    } catch (err) {
      console.error('[Feedback] Submit error:', err);
      submitResult = { success: false, error: 'Network error. Please try again.' };
    } finally {
      isSubmitting = false;
    }
  }
  
  // Close on escape key
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={onClose} role="presentation">
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">
    <button class="close-btn" onclick={onClose} aria-label="Close">×</button>
    
    <div class="modal-header">
      <span class="emoji">{tool.emoji}</span>
      <h2 id="modal-title">{tool.name}</h2>
    </div>
    
    {#if submitResult?.success}
      <!-- Success State -->
      <div class="success-state">
        <div class="success-icon">✓</div>
        <p>{submitResult.message}</p>
      </div>
    {:else}
      <!-- Form -->
      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        
        {#if type === 'concept_vote'}
          <!-- Concept Vote -->
          <div class="section">
            <p class="section-label" id="vote-question">Would this be useful for your events?</p>
            <div class="vote-options" role="group" aria-labelledby="vote-question">
              <button 
                type="button"
                class="vote-option {selectedVote === 'build_it' ? 'selected' : ''}"
                onclick={() => selectedVote = 'build_it'}
              >
                <span class="vote-icon">👍</span>
                <span class="vote-text">Yes, build it!</span>
              </button>
              <button 
                type="button"
                class="vote-option {selectedVote === 'needs_changes' ? 'selected' : ''}"
                onclick={() => selectedVote = 'needs_changes'}
              >
                <span class="vote-icon">🤔</span>
                <span class="vote-text">Maybe, with changes</span>
              </button>
              <button 
                type="button"
                class="vote-option {selectedVote === 'not_interested' ? 'selected' : ''}"
                onclick={() => selectedVote = 'not_interested'}
              >
                <span class="vote-icon">👎</span>
                <span class="vote-text">Not for me</span>
              </button>
            </div>
          </div>
          
          <div class="section">
            <label for="feedback-message" class="section-label">
              Any thoughts? <span class="optional">(optional)</span>
            </label>
            <textarea
              id="feedback-message"
              bind:value={message}
              placeholder="What would make this useful for you? Any specific features?"
              maxlength={MAX_MESSAGE_LENGTH}
              rows="3"
            ></textarea>
            <div class="char-count">{messageLength}/{MAX_MESSAGE_LENGTH}</div>
          </div>
          
        {:else}
          <!-- Other Feedback Types -->
          <div class="section">
            <label for="feedback-message" class="section-label">
              {#if type === 'improvement'}
                What would you like to see?
              {:else if type === 'bug_report'}
                What went wrong?
              {:else}
                Your feedback
              {/if}
            </label>
            <textarea
              id="feedback-message"
              bind:value={message}
              placeholder={type === 'improvement' 
                ? "Describe your idea or suggestion..." 
                : type === 'bug_report'
                ? "What happened? What did you expect to happen?"
                : "Share your thoughts..."}
              maxlength={MAX_MESSAGE_LENGTH}
              rows="4"
              required
            ></textarea>
            <div class="char-count">{messageLength}/{MAX_MESSAGE_LENGTH}</div>
          </div>
        {/if}
        
        <!-- Optional Contact Info -->
        <details class="contact-section">
          <summary>Want us to follow up? <span class="optional">(optional)</span></summary>
          <div class="contact-fields">
            <div class="field">
              <label for="feedback-name">Name</label>
              <input 
                type="text" 
                id="feedback-name"
                bind:value={name}
                placeholder="Your name"
                maxlength="100"
              />
            </div>
            <div class="field">
              <label for="feedback-email">Email</label>
              <input 
                type="email" 
                id="feedback-email"
                bind:value={email}
                placeholder="your@email.com"
                maxlength="200"
              />
            </div>
          </div>
        </details>
        
        <!-- Error Message -->
        {#if submitResult?.error}
          <div class="error-message">
            <span class="error-icon">⚠️</span>
            {submitResult.error}
          </div>
        {/if}
        
        <!-- Submit Button -->
        <div class="actions">
          <button type="button" class="cancel-btn" onclick={onClose}>
            Cancel
          </button>
          <button type="submit" class="submit-btn" disabled={isSubmitting}>
            {#if isSubmitting}
              Submitting...
            {:else}
              Send Feedback
            {/if}
          </button>
        </div>
        
        <p class="privacy-note">
          Your feedback helps us build better tools. 
          {#if message.length > 0}
            Feedback is moderated before being shared publicly.
          {/if}
        </p>
      </form>
    {/if}
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    z-index: 1000;
  }
  
  .modal {
    background: #18181b;
    border: 1px solid #27272a;
    border-radius: 16px;
    width: 100%;
    max-width: 480px;
    max-height: 90vh;
    overflow-y: auto;
    padding: 1.5rem;
    position: relative;
  }
  
  .close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: none;
    border: none;
    color: #71717a;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    line-height: 1;
  }
  
  .close-btn:hover {
    color: #a1a1aa;
  }
  
  .modal-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
  
  .emoji {
    font-size: 2rem;
  }
  
  .modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    color: #f4f4f5;
  }
  
  /* Success State */
  .success-state {
    text-align: center;
    padding: 2rem 1rem;
  }
  
  .success-icon {
    width: 64px;
    height: 64px;
    background: rgba(34, 197, 94, 0.15);
    border: 2px solid rgba(34, 197, 94, 0.4);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1rem;
    font-size: 2rem;
    color: #4ade80;
  }
  
  .success-state p {
    color: #d4d4d8;
    margin: 0;
  }
  
  /* Form Sections */
  .section {
    margin-bottom: 1.25rem;
  }
  
  .section-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #d4d4d8;
    margin-bottom: 0.5rem;
  }
  
  .optional {
    color: #71717a;
    font-weight: 400;
  }
  
  /* Vote Options */
  .vote-options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .vote-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: rgba(39, 39, 42, 0.5);
    border: 1px solid #27272a;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
  }
  
  .vote-option:hover {
    background: rgba(39, 39, 42, 0.8);
    border-color: #3f3f46;
  }
  
  .vote-option.selected {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.5);
  }
  
  .vote-icon {
    font-size: 1.25rem;
  }
  
  .vote-text {
    color: #e4e4e7;
    font-size: 0.875rem;
  }
  
  /* Textarea */
  textarea {
    width: 100%;
    padding: 0.75rem;
    background: rgba(39, 39, 42, 0.5);
    border: 1px solid #27272a;
    border-radius: 8px;
    color: #e4e4e7;
    font-size: 0.875rem;
    font-family: inherit;
    resize: vertical;
    min-height: 80px;
  }
  
  textarea:focus {
    outline: none;
    border-color: #6366f1;
  }
  
  textarea::placeholder {
    color: #52525b;
  }
  
  .char-count {
    text-align: right;
    font-size: 0.75rem;
    color: #52525b;
    margin-top: 0.25rem;
  }
  
  /* Contact Section */
  .contact-section {
    margin-bottom: 1.25rem;
  }
  
  .contact-section summary {
    cursor: pointer;
    font-size: 0.875rem;
    color: #a1a1aa;
    padding: 0.5rem 0;
  }
  
  .contact-section summary:hover {
    color: #d4d4d8;
  }
  
  .contact-fields {
    display: grid;
    gap: 0.75rem;
    margin-top: 0.75rem;
  }
  
  .field label {
    display: block;
    font-size: 0.75rem;
    color: #71717a;
    margin-bottom: 0.25rem;
  }
  
  .field input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: rgba(39, 39, 42, 0.5);
    border: 1px solid #27272a;
    border-radius: 6px;
    color: #e4e4e7;
    font-size: 0.875rem;
  }
  
  .field input:focus {
    outline: none;
    border-color: #6366f1;
  }
  
  /* Error Message */
  .error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    padding: 0.75rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
    color: #fca5a5;
  }
  
  /* Actions */
  .actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }
  
  .cancel-btn {
    flex: 1;
    padding: 0.75rem;
    background: transparent;
    border: 1px solid #27272a;
    border-radius: 8px;
    color: #a1a1aa;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s;
  }
  
  .cancel-btn:hover {
    background: rgba(39, 39, 42, 0.5);
    color: #d4d4d8;
  }
  
  .submit-btn {
    flex: 2;
    padding: 0.75rem;
    background: #6366f1;
    border: none;
    border-radius: 8px;
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }
  
  .submit-btn:hover:not(:disabled) {
    background: #4f46e5;
  }
  
  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  /* Privacy Note */
  .privacy-note {
    font-size: 0.75rem;
    color: #52525b;
    text-align: center;
    margin-top: 1rem;
    margin-bottom: 0;
  }
  
  /* Mobile */
  @media (max-width: 480px) {
    .modal {
      padding: 1.25rem;
    }
    
    .vote-options {
      gap: 0.375rem;
    }
    
    .vote-option {
      padding: 0.625rem 0.875rem;
    }
  }
</style>
