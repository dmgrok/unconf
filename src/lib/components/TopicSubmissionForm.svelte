<!--
  Topic Submission Form Component
  Real-time validation with character limits and input sanitization
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { writable } from 'svelte/store';
  import { topicActions } from '../stores/topicStore.js';
  
  export let eventId: string;
  export let userId: string;
  export let userName: string = '';
  export let maxTitleLength = 100;
  export let maxDescriptionLength = 500;
  export let maxTags = 10;
  
  const dispatch = createEventDispatcher();
  
  // Form state
  let title = '';
  let description = '';
  let tags: string[] = [];
  let newTag = '';
  let isSubmitting = false;
  
  // Validation state
  const validation = writable({
    title: { isValid: true, message: '' },
    description: { isValid: true, message: '' },
    tags: { isValid: true, message: '' },
    form: { isValid: true, canSubmit: false }
  });
  
  // Reactive validation
  $: validateTitle(title);
  $: validateDescription(description);
  $: validateTags(tags);
  $: updateFormValidation();
  
  function validateTitle(value: string) {
    validation.update(v => {
      if (!value.trim()) {
        v.title = { isValid: false, message: 'Title is required' };
      } else if (value.length < 3) {
        v.title = { isValid: false, message: 'Title must be at least 3 characters' };
      } else if (value.length > maxTitleLength) {
        v.title = { isValid: false, message: `Title must not exceed ${maxTitleLength} characters` };
      } else {
        v.title = { isValid: true, message: '' };
      }
      return v;
    });
  }
  
  function validateDescription(value: string) {
    validation.update(v => {
      if (value.length > maxDescriptionLength) {
        v.description = { isValid: false, message: `Description must not exceed ${maxDescriptionLength} characters` };
      } else {
        v.description = { isValid: true, message: '' };
      }
      return v;
    });
  }
  
  function validateTags(tagList: string[]) {
    validation.update(v => {
      if (tagList.length > maxTags) {
        v.tags = { isValid: false, message: `Maximum ${maxTags} tags allowed` };
      } else {
        v.tags = { isValid: true, message: '' };
      }
      return v;
    });
  }
  
  function updateFormValidation() {
    validation.update(v => {
      const isFormValid = v.title.isValid && v.description.isValid && v.tags.isValid;
      const canSubmit = isFormValid && title.trim().length >= 3;
      v.form = { isValid: isFormValid, canSubmit };
      return v;
    });
  }
  
  function addTag() {
    const tag = newTag.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < maxTags) {
      tags = [...tags, tag];
      newTag = '';
    }
  }
  
  function removeTag(tagToRemove: string) {
    tags = tags.filter(tag => tag !== tagToRemove);
  }
  
  function handleTagKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addTag();
    }
  }
  
  async function handleSubmit() {
    if (!$validation.form.canSubmit || isSubmitting) return;
    
    isSubmitting = true;
    
    try {
      const newTopic = await topicActions.createTopic(eventId, {
        title: title.trim(),
        description: description.trim() || '',
        tags: tags.length > 0 ? tags : [],
        userId,
        userName: userName || 'Anonymous'
      });
      
      if (newTopic) {
        dispatch('topicCreated', { topic: newTopic });
        
        // Reset form
        title = '';
        description = '';
        tags = [];
        newTag = '';
      } else {
        dispatch('error', { message: 'Failed to create topic. Please try again.' });
      }
    } catch (error) {
      console.error('Topic submission error:', error);
      dispatch('error', { message: 'Network error. Please try again.' });
    } finally {
      isSubmitting = false;
    }
  }
  
  function resetForm() {
    title = '';
    description = '';
    tags = [];
    newTag = '';
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="topic-form">
  <div class="form-group">
    <label for="topic-title" class="form-label">
      Topic Title *
      <span class="char-count" class:warning={title.length > maxTitleLength * 0.8}>
        {title.length}/{maxTitleLength}
      </span>
    </label>
    <input
      id="topic-title"
      type="text"
      bind:value={title}
      maxlength={maxTitleLength}
      placeholder="Enter a concise, descriptive title for your topic"
      class="form-input"
      class:invalid={!$validation.title.isValid}
      disabled={isSubmitting}
      required
    />
    {#if !$validation.title.isValid}
      <div class="error-message">{$validation.title.message}</div>
    {/if}
  </div>
  
  <div class="form-group">
    <label for="topic-description" class="form-label">
      Description (Optional)
      <span class="char-count" class:warning={description.length > maxDescriptionLength * 0.8}>
        {description.length}/{maxDescriptionLength}
      </span>
    </label>
    <textarea
      id="topic-description"
      bind:value={description}
      maxlength={maxDescriptionLength}
      placeholder="Provide additional context, background, or details about your topic"
      rows="4"
      class="form-textarea"
      class:invalid={!$validation.description.isValid}
      disabled={isSubmitting}
    ></textarea>
    {#if !$validation.description.isValid}
      <div class="error-message">{$validation.description.message}</div>
    {/if}
  </div>
  
  <div class="form-group">
    <label for="topic-tags" class="form-label">
      Tags (Optional)
      <span class="tag-count">
        {tags.length}/{maxTags} tags
      </span>
    </label>
    
    <div class="tag-input-container">
      <input
        id="topic-tags"
        type="text"
        bind:value={newTag}
        on:keydown={handleTagKeydown}
        placeholder="Add tags to categorize your topic"
        class="form-input"
        disabled={isSubmitting || tags.length >= maxTags}
      />
      <button
        type="button"
        on:click={addTag}
        class="add-tag-btn"
        disabled={!newTag.trim() || tags.includes(newTag.trim().toLowerCase()) || tags.length >= maxTags}
      >
        Add
      </button>
    </div>
    
    {#if tags.length > 0}
      <div class="tags-container">
        {#each tags as tag}
          <span class="tag">
            {tag}
            <button
              type="button"
              on:click={() => removeTag(tag)}
              class="remove-tag"
              disabled={isSubmitting}
              aria-label="Remove {tag} tag"
            >
              ×
            </button>
          </span>
        {/each}
      </div>
    {/if}
    
    {#if !$validation.tags.isValid}
      <div class="error-message">{$validation.tags.message}</div>
    {/if}
  </div>
  
  <div class="form-actions">
    <button
      type="button"
      on:click={resetForm}
      class="btn btn-secondary"
      disabled={isSubmitting}
    >
      Clear
    </button>
    
    <button
      type="submit"
      class="btn btn-primary"
      disabled={!$validation.form.canSubmit || isSubmitting}
    >
      {#if isSubmitting}
        Submitting...
      {:else}
        Submit Topic
      {/if}
    </button>
  </div>
  
  <div class="form-footer">
    <small class="help-text">
      * Required fields. Topics start as drafts and can be edited until activated.
    </small>
  </div>
</form>

<style>
  .topic-form {
    max-width: 600px;
    margin: 0 auto;
    padding: 1.5rem;
    background: var(--surface-color, #ffffff);
    border-radius: 8px;
    border: 1px solid var(--border-color, #e0e0e0);
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  .form-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: var(--text-primary, #333);
  }
  
  .char-count, .tag-count {
    font-size: 0.875rem;
    color: var(--text-secondary, #666);
  }
  
  .char-count.warning, .tag-count.warning {
    color: var(--warning-color, #f59e0b);
  }
  
  .form-input, .form-textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color, #d1d5db);
    border-radius: 6px;
    font-size: 1rem;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  
  .form-input:focus, .form-textarea:focus {
    outline: none;
    border-color: var(--primary-color, #3b82f6);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .form-input.invalid, .form-textarea.invalid {
    border-color: var(--error-color, #ef4444);
  }
  
  .form-input:disabled, .form-textarea:disabled {
    background-color: var(--disabled-bg, #f9fafb);
    color: var(--disabled-text, #9ca3af);
    cursor: not-allowed;
  }
  
  .tag-input-container {
    display: flex;
    gap: 0.5rem;
  }
  
  .add-tag-btn {
    padding: 0.75rem 1rem;
    background: var(--primary-color, #3b82f6);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s;
    white-space: nowrap;
  }
  
  .add-tag-btn:hover:not(:disabled) {
    background: var(--primary-hover, #2563eb);
  }
  
  .add-tag-btn:disabled {
    background: var(--disabled-bg, #d1d5db);
    cursor: not-allowed;
  }
  
  .tags-container {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
  
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    background: var(--tag-bg, #f3f4f6);
    color: var(--tag-text, #374151);
    border-radius: 16px;
    font-size: 0.875rem;
  }
  
  .remove-tag {
    background: none;
    border: none;
    color: var(--text-secondary, #6b7280);
    cursor: pointer;
    padding: 0;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    line-height: 1;
  }
  
  .remove-tag:hover:not(:disabled) {
    background: var(--error-color, #ef4444);
    color: white;
  }
  
  .error-message {
    color: var(--error-color, #ef4444);
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }
  
  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
  }
  
  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  
  .btn:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  
  .btn-primary {
    background: var(--primary-color, #3b82f6);
    color: white;
  }
  
  .btn-primary:hover:not(:disabled) {
    background: var(--primary-hover, #2563eb);
  }
  
  .btn-secondary {
    background: var(--secondary-bg, #f9fafb);
    color: var(--text-primary, #374151);
    border: 1px solid var(--border-color, #d1d5db);
  }
  
  .btn-secondary:hover:not(:disabled) {
    background: var(--secondary-hover, #f3f4f6);
  }
  
  .form-footer {
    margin-top: 1rem;
    text-align: center;
  }
  
  .help-text {
    color: var(--text-secondary, #6b7280);
    font-size: 0.875rem;
  }
  
  @media (max-width: 640px) {
    .topic-form {
      padding: 1rem;
      margin: 0 1rem;
    }
    
    .form-actions {
      flex-direction: column;
    }
    
    .tag-input-container {
      flex-direction: column;
    }
  }
</style>