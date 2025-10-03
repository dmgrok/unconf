<!--
  Template Creation Form Component
  Allows users to create templates from existing events or from scratch
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { writable } from 'svelte/store';
  import type { Event, Topic, EventTemplate } from '../../types/entities';
  import { TemplateCategory } from '../../types/enums';

  export let mode: 'from-event' | 'from-scratch' = 'from-scratch';
  export let sourceEvent: Event | null = null;
  export let sourceTopics: Topic[] = [];
  export let currentUserId: string;
  export let organizerName = '';

  const dispatch = createEventDispatcher();

  // Form state
  let templateName = '';
  let templateDescription = '';
  let templateCategory: TemplateCategory = TemplateCategory.CUSTOM;
  let isPublic = false;
  let tags: string[] = [];
  let newTag = '';

  // Content selection for template creation from event
  let includeEventSettings = true;
  let includeTopics = true;
  let includeRooms = false;
  let selectedTopicIds = new Set<string>();

  // Template preview data
  let isSubmitting = false;
  let showPreview = false;

  const validation = writable({
    templateName: { isValid: true, message: '' },
    templateCategory: { isValid: true, message: '' },
    form: { isValid: true, canSubmit: false }
  });

  // Initialize form when source event changes
  $: if (mode === 'from-event' && sourceEvent) {
    initializeFromEvent(sourceEvent);
  }

  // Initialize selected topics when sourceTopics changes
  $: if (sourceTopics.length > 0) {
    selectedTopicIds = new Set(sourceTopics.map(t => t.id));
  }

  // Validate form
  $: validateForm(templateName, templateCategory);

  function initializeFromEvent(event: Event) {
    templateName = `${event.title} Template`;
    templateDescription = `Template created from "${event.title}" event. ${event.description || ''}`.trim();

    // Auto-select appropriate category based on event metadata or default to conference
    templateCategory = TemplateCategory.CONFERENCE;

    // Initialize content selection
    includeEventSettings = true;
    includeTopics = sourceTopics.length > 0;
    includeRooms = false; // Will be enabled when room functionality is available
  }

  function validateForm(name: string, category: TemplateCategory) {
    const nameValid = name.trim().length >= 3 && name.trim().length <= 200;
    const categoryValid = Object.values(TemplateCategory).includes(category);

    validation.update(v => ({
      ...v,
      templateName: {
        isValid: nameValid,
        message: nameValid ? '' : 'Template name must be between 3 and 200 characters'
      },
      templateCategory: {
        isValid: categoryValid,
        message: categoryValid ? '' : 'Please select a valid category'
      },
      form: {
        isValid: nameValid && categoryValid,
        canSubmit: nameValid && categoryValid && !isSubmitting
      }
    }));
  }

  function addTag() {
    const tag = newTag.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 10) {
      tags = [...tags, tag];
      newTag = '';
    }
  }

  function removeTag(tagToRemove: string) {
    tags = tags.filter(tag => tag !== tagToRemove);
  }

  function toggleTopicSelection(topicId: string) {
    if (selectedTopicIds.has(topicId)) {
      selectedTopicIds.delete(topicId);
    } else {
      selectedTopicIds.add(topicId);
    }
    selectedTopicIds = new Set(selectedTopicIds);
  }

  function togglePreview() {
    showPreview = !showPreview;
  }

  async function handleSubmit() {
    if (!$validation.form.canSubmit) return;

    isSubmitting = true;

    try {
      const templateData = {
        templateName: templateName.trim(),
        description: templateDescription.trim(),
        category: templateCategory,
        isPublic,
        tags,
        userId: currentUserId,
        eventId: mode === 'from-event' ? sourceEvent?.id : undefined,
        contentOptions: mode === 'from-event' ? {
          includeSettings: includeEventSettings,
          includeTopics: includeTopics && selectedTopicIds.size > 0,
          includeRooms: includeRooms,
          selectedTopicIds: Array.from(selectedTopicIds)
        } : undefined
      };

      dispatch('templateCreated', templateData);
    } catch (error) {
      console.error('Error creating template:', error);
      dispatch('error', { message: 'Failed to create template' });
    } finally {
      isSubmitting = false;
    }
  }

  function handleCancel() {
    dispatch('cancel');
  }

  function getPreviewData() {
    if (mode === 'from-scratch') {
      return {
        name: templateName,
        description: templateDescription,
        category: templateCategory,
        settings: 'Default event settings',
        topics: 'No topics included',
        rooms: 'No rooms included'
      };
    }

    const selectedTopics = sourceTopics.filter(t => selectedTopicIds.has(t.id));

    return {
      name: templateName,
      description: templateDescription,
      category: templateCategory,
      settings: includeEventSettings ? 'Event settings included' : 'Default settings',
      topics: includeTopics ? `${selectedTopics.length} topics included` : 'No topics included',
      rooms: includeRooms ? 'Room configurations included' : 'No rooms included'
    };
  }

  function getCategoryDisplayName(category: TemplateCategory): string {
    const categoryMap: Record<TemplateCategory, string> = {
      [TemplateCategory.CONFERENCE]: 'Conference',
      [TemplateCategory.WORKSHOP]: 'Workshop',
      [TemplateCategory.MEETING]: 'Meeting',
      [TemplateCategory.HACKATHON]: 'Hackathon',
      [TemplateCategory.NETWORKING]: 'Networking',
      [TemplateCategory.TRAINING]: 'Training',
      [TemplateCategory.CUSTOM]: 'Custom'
    };
    return categoryMap[category];
  }
</script>

<div class="template-creation-form">
  <div class="form-header">
    <h2>
      {mode === 'from-event' ? 'Create Template from Event' : 'Create New Template'}
    </h2>
    <p class="form-subtitle">
      {mode === 'from-event'
        ? `Creating a reusable template from "${sourceEvent?.title}"`
        : 'Create a new template from scratch'}
    </p>
  </div>

  <form on:submit|preventDefault={handleSubmit} class="template-form">
    <!-- Basic Template Information -->
    <section class="form-section">
      <h3>Template Information</h3>

      <div class="form-group">
        <label for="template-name" class="form-label">
          Template Name *
          <span class="char-count" class:warning={templateName.length > 160}>
            {templateName.length}/200
          </span>
        </label>
        <input
          id="template-name"
          type="text"
          bind:value={templateName}
          maxlength="200"
          placeholder="Enter a descriptive name for your template"
          class="form-input"
          class:invalid={!$validation.templateName.isValid}
          disabled={isSubmitting}
          required
        />
        {#if !$validation.templateName.isValid}
          <div class="error-message">{$validation.templateName.message}</div>
        {/if}
      </div>

      <div class="form-group">
        <label for="template-description" class="form-label">
          Description
          <span class="char-count" class:warning={templateDescription.length > 800}>
            {templateDescription.length}/1000
          </span>
        </label>
        <textarea
          id="template-description"
          bind:value={templateDescription}
          maxlength="1000"
          placeholder="Describe what this template is for and when to use it"
          rows="4"
          class="form-textarea"
          disabled={isSubmitting}
        ></textarea>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="template-category" class="form-label">Category *</label>
          <select
            id="template-category"
            bind:value={templateCategory}
            class="form-select"
            disabled={isSubmitting}
            required
          >
            {#each Object.values(TemplateCategory) as category}
              <option value={category}>{getCategoryDisplayName(category)}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label class="checkbox-container">
            <input
              type="checkbox"
              bind:checked={isPublic}
              disabled={isSubmitting}
            />
            <span class="checkmark"></span>
            <div class="checkbox-content">
              <span class="checkbox-label">Make Public</span>
              <span class="checkbox-description">Allow other organizers to discover and use this template</span>
            </div>
          </label>
        </div>
      </div>

      <!-- Tags -->
      <div class="form-group">
        <label class="form-label">Tags</label>
        <div class="tags-input">
          <div class="tags-list">
            {#each tags as tag}
              <span class="tag">
                {tag}
                <button
                  type="button"
                  class="tag-remove"
                  on:click={() => removeTag(tag)}
                  disabled={isSubmitting}
                >×</button>
              </span>
            {/each}
          </div>
          <div class="tag-input-group">
            <input
              type="text"
              bind:value={newTag}
              placeholder="Add a tag..."
              class="tag-input"
              disabled={isSubmitting || tags.length >= 10}
              on:keydown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            />
            <button
              type="button"
              class="tag-add-btn"
              on:click={addTag}
              disabled={isSubmitting || !newTag.trim() || tags.length >= 10}
            >
              Add
            </button>
          </div>
        </div>
        <small class="help-text">Add up to 10 tags to help others discover your template</small>
      </div>
    </section>

    <!-- Content Selection (only for from-event mode) -->
    {#if mode === 'from-event' && sourceEvent}
      <section class="form-section">
        <h3>Template Content</h3>
        <p class="section-description">Choose what to include in your template</p>

        <div class="content-options">
          <label class="checkbox-container">
            <input
              type="checkbox"
              bind:checked={includeEventSettings}
              disabled={isSubmitting}
            />
            <span class="checkmark"></span>
            <div class="checkbox-content">
              <span class="checkbox-label">Event Settings</span>
              <span class="checkbox-description">
                Include voting configuration, access controls, and activity settings
              </span>
            </div>
          </label>

          {#if sourceTopics.length > 0}
            <label class="checkbox-container">
              <input
                type="checkbox"
                bind:checked={includeTopics}
                disabled={isSubmitting}
              />
              <span class="checkmark"></span>
              <div class="checkbox-content">
                <span class="checkbox-label">Topics ({sourceTopics.length})</span>
                <span class="checkbox-description">
                  Include discussion topics from this event
                </span>
              </div>
            </label>

            {#if includeTopics}
              <div class="topics-selection">
                <h4>Select Topics to Include</h4>
                <div class="topics-list">
                  {#each sourceTopics as topic}
                    <label class="topic-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedTopicIds.has(topic.id)}
                        on:change={() => toggleTopicSelection(topic.id)}
                        disabled={isSubmitting}
                      />
                      <span class="topic-info">
                        <span class="topic-title">{topic.title}</span>
                        {#if topic.description}
                          <span class="topic-description">{topic.description}</span>
                        {/if}
                        {#if topic.tags && topic.tags.length > 0}
                          <div class="topic-tags">
                            {#each topic.tags as tag}
                              <span class="topic-tag">{tag}</span>
                            {/each}
                          </div>
                        {/if}
                      </span>
                    </label>
                  {/each}
                </div>
              </div>
            {/if}
          {/if}

          <!-- Room configuration (placeholder for future functionality) -->
          <label class="checkbox-container disabled">
            <input
              type="checkbox"
              bind:checked={includeRooms}
              disabled={true}
            />
            <span class="checkmark"></span>
            <div class="checkbox-content">
              <span class="checkbox-label">Room Configurations</span>
              <span class="checkbox-description">
                Include discussion room setups (Coming soon)
              </span>
            </div>
          </label>
        </div>
      </section>
    {/if}

    <!-- Template Preview -->
    <section class="form-section">
      <div class="section-header">
        <h3>Template Preview</h3>
        <button
          type="button"
          class="preview-toggle"
          on:click={togglePreview}
        >
          {showPreview ? 'Hide' : 'Show'} Preview
        </button>
      </div>

      {#if showPreview}
        <div class="template-preview">
          {#each Object.entries(getPreviewData()) as [key, value]}
            <div class="preview-item">
              <span class="preview-label">{key.charAt(0).toUpperCase() + key.slice(1)}:</span>
              <span class="preview-value">{value}</span>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <!-- Form Actions -->
    <div class="form-actions">
      <button
        type="button"
        on:click={handleCancel}
        class="btn btn-secondary"
        disabled={isSubmitting}
      >
        Cancel
      </button>

      <button
        type="submit"
        class="btn btn-primary"
        disabled={!$validation.form.canSubmit}
      >
        {#if isSubmitting}
          Creating Template...
        {:else}
          Create Template
        {/if}
      </button>
    </div>
  </form>
</div>

<style>
  .template-creation-form {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    background: var(--surface-color, #ffffff);
    border-radius: 12px;
    border: 1px solid var(--border-color, #e0e0e0);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  }

  .form-header {
    margin-bottom: 2rem;
    text-align: center;
  }

  .form-header h2 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1.75rem;
    font-weight: 600;
  }

  .form-subtitle {
    color: var(--text-secondary, #6b7280);
    font-size: 1rem;
    margin: 0;
  }

  .template-form {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .form-section {
    padding: 1.5rem;
    border: 1px solid var(--border-light, #f3f4f6);
    border-radius: 8px;
    background: var(--section-bg, #fafbfc);
  }

  .form-section h3 {
    margin: 0 0 1rem 0;
    color: var(--text-primary, #374151);
    font-size: 1.25rem;
    font-weight: 600;
    border-bottom: 2px solid var(--primary-color, #3b82f6);
    padding-bottom: 0.5rem;
  }

  .section-description {
    color: var(--text-secondary, #6b7280);
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .preview-toggle {
    background: none;
    border: 1px solid var(--primary-color, #3b82f6);
    color: var(--primary-color, #3b82f6);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s ease;
  }

  .preview-toggle:hover {
    background: var(--primary-color, #3b82f6);
    color: white;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }

  .form-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: var(--text-primary, #374151);
  }

  .char-count {
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
  }

  .char-count.warning {
    color: var(--warning-color, #f59e0b);
  }

  .form-input, .form-textarea, .form-select {
    width: 100%;
    padding: 0.875rem;
    border: 1px solid var(--border-color, #d1d5db);
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s, box-shadow 0.2s;
    background: white;
  }

  .form-input:focus, .form-textarea:focus, .form-select:focus {
    outline: none;
    border-color: var(--primary-color, #3b82f6);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-input.invalid, .form-textarea.invalid {
    border-color: var(--error-color, #ef4444);
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
  }

  .checkbox-container {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    cursor: pointer;
    padding: 0.75rem;
    border-radius: 8px;
    transition: background-color 0.2s;
  }

  .checkbox-container:hover:not(.disabled) {
    background: var(--hover-bg, #f9fafb);
  }

  .checkbox-container.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .checkbox-container input[type="checkbox"] {
    display: none;
  }

  .checkmark {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-color, #d1d5db);
    border-radius: 4px;
    background: white;
    position: relative;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .checkbox-container input[type="checkbox"]:checked + .checkmark {
    background: var(--primary-color, #3b82f6);
    border-color: var(--primary-color, #3b82f6);
  }

  .checkbox-container input[type="checkbox"]:checked + .checkmark::after {
    content: '';
    position: absolute;
    left: 6px;
    top: 2px;
    width: 6px;
    height: 10px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  .checkbox-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .checkbox-label {
    font-weight: 500;
    color: var(--text-primary, #374151);
  }

  .checkbox-description {
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
  }

  .tags-input {
    border: 1px solid var(--border-color, #d1d5db);
    border-radius: 8px;
    padding: 0.5rem;
    background: white;
  }

  .tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--primary-light, #eff6ff);
    color: var(--primary-color, #3b82f6);
    padding: 0.25rem 0.5rem;
    border-radius: 1rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .tag-remove {
    background: none;
    border: none;
    color: var(--primary-color, #3b82f6);
    cursor: pointer;
    font-size: 1rem;
    padding: 0;
    margin-left: 0.25rem;
  }

  .tag-input-group {
    display: flex;
    gap: 0.5rem;
  }

  .tag-input {
    flex: 1;
    border: none;
    padding: 0.5rem;
    font-size: 0.875rem;
  }

  .tag-input:focus {
    outline: none;
  }

  .tag-add-btn {
    background: var(--primary-color, #3b82f6);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .tag-add-btn:hover:not(:disabled) {
    background: var(--primary-hover, #2563eb);
  }

  .tag-add-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .content-options {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .topics-selection {
    margin-left: 2rem;
    margin-top: 1rem;
    padding: 1rem;
    background: white;
    border-radius: 8px;
    border: 1px solid var(--border-light, #f3f4f6);
  }

  .topics-selection h4 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary, #374151);
  }

  .topics-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .topic-checkbox {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 6px;
    transition: background-color 0.2s;
  }

  .topic-checkbox:hover {
    background: var(--hover-bg, #f9fafb);
  }

  .topic-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .topic-title {
    font-weight: 500;
    color: var(--text-primary, #374151);
  }

  .topic-description {
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
  }

  .topic-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .topic-tag {
    background: var(--tag-bg, #f3f4f6);
    color: var(--tag-text, #374151);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
  }

  .template-preview {
    background: white;
    border: 1px solid var(--border-light, #f3f4f6);
    border-radius: 8px;
    padding: 1rem;
  }

  .preview-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border-light, #f3f4f6);
  }

  .preview-item:last-child {
    border-bottom: none;
  }

  .preview-label {
    font-weight: 500;
    color: var(--text-primary, #374151);
  }

  .preview-value {
    color: var(--text-secondary, #6b7280);
  }

  .error-message {
    color: var(--error-color, #ef4444);
    font-size: 0.875rem;
    margin-top: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .error-message::before {
    content: '⚠';
    font-size: 1rem;
  }

  .help-text {
    color: var(--text-secondary, #6b7280);
    font-size: 0.875rem;
    margin-top: 0.5rem;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border-light, #f3f4f6);
  }

  .btn {
    padding: 0.875rem 1.75rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 120px;
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
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
  }

  .btn-secondary {
    background: var(--secondary-bg, #f9fafb);
    color: var(--text-primary, #374151);
    border: 1px solid var(--border-color, #d1d5db);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--secondary-hover, #f3f4f6);
    border-color: var(--border-hover, #9ca3af);
  }

  @media (max-width: 768px) {
    .template-creation-form {
      padding: 1.5rem;
      margin: 0 1rem;
    }

    .form-row {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .form-actions {
      flex-direction: column;
    }

    .form-section {
      padding: 1rem;
    }

    .topics-selection {
      margin-left: 0;
    }
  }
</style>