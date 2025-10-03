<!--
  Template Creation Wizard Component
  Orchestrates the complete template creation flow
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { writable } from 'svelte/store';
  import EventSelector from './EventSelector.svelte';
  import TemplateCreationForm from './TemplateCreationForm.svelte';
  import TemplatePreview from './TemplatePreview.svelte';
  import type { Event, Topic, EventTemplate } from '../../types/entities';
  import { TemplateCategory } from '../../types/enums';

  export let currentUserId: string;
  export let organizerName: string = '';
  export let initialMode: 'from-event' | 'from-scratch' = 'from-scratch';

  const dispatch = createEventDispatcher();

  type WizardStep = 'select-mode' | 'select-event' | 'create-template' | 'preview' | 'saving' | 'complete';

  let currentStep: WizardStep = initialMode === 'from-event' ? 'select-event' : 'create-template';
  let selectedMode: 'from-event' | 'from-scratch' = initialMode;
  let selectedEvent: Event | null = null;
  let selectedTopics: Topic[] = [];
  let templateData: any = null;
  let createdTemplate: EventTemplate | null = null;
  let error: string | null = null;

  const progress = writable(0);

  $: updateProgress(currentStep);

  function updateProgress(step: WizardStep) {
    const stepProgress: Record<WizardStep, number> = {
      'select-mode': 0,
      'select-event': 25,
      'create-template': 50,
      'preview': 75,
      'saving': 90,
      'complete': 100
    };
    progress.set(stepProgress[step] || 0);
  }

  function handleModeSelection(mode: 'from-event' | 'from-scratch') {
    selectedMode = mode;
    if (mode === 'from-event') {
      currentStep = 'select-event';
    } else {
      currentStep = 'create-template';
    }
  }

  function handleEventSelected(event: CustomEvent) {
    selectedEvent = event.detail.event;
    selectedTopics = event.detail.topics;
    currentStep = 'create-template';
  }

  function handleTemplateCreated(event: CustomEvent) {
    templateData = event.detail;
    currentStep = 'preview';
  }

  function handlePreviewEdit() {
    currentStep = 'create-template';
  }

  async function handlePreviewConfirm(event: CustomEvent) {
    currentStep = 'saving';
    error = null;

    try {
      const requestData = {
        name: templateData.templateName,
        description: templateData.description,
        category: templateData.category,
        isPublic: templateData.isPublic,
        tags: templateData.tags,
        userId: currentUserId,
        eventId: selectedEvent?.id,
        contentOptions: templateData.contentOptions
      };

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();

      if (result.success) {
        createdTemplate = result.template;
        currentStep = 'complete';
        dispatch('templateCreated', { template: createdTemplate });
      } else {
        throw new Error(result.error || 'Failed to create template');
      }
    } catch (err) {
      console.error('Error creating template:', err);
      error = err instanceof Error ? err.message : 'Failed to create template';
      currentStep = 'preview'; // Go back to preview to allow retry
    }
  }

  function handleCancel() {
    dispatch('cancel');
  }

  function handleError(event: CustomEvent) {
    error = event.detail.message;
  }

  function clearError() {
    error = null;
  }

  function handleBackToStart() {
    currentStep = 'select-mode';
    selectedEvent = null;
    selectedTopics = [];
    templateData = null;
    createdTemplate = null;
    error = null;
  }

  function handleCreateAnother() {
    currentStep = 'select-mode';
    selectedEvent = null;
    selectedTopics = [];
    templateData = null;
    createdTemplate = null;
    error = null;
  }

  function getStepTitle(step: WizardStep): string {
    const titles: Record<WizardStep, string> = {
      'select-mode': 'Choose Creation Method',
      'select-event': 'Select Source Event',
      'create-template': 'Configure Template',
      'preview': 'Review Template',
      'saving': 'Saving Template',
      'complete': 'Template Created'
    };
    return titles[step];
  }

  function getStepDescription(step: WizardStep): string {
    const descriptions: Record<WizardStep, string> = {
      'select-mode': 'Choose how you want to create your template',
      'select-event': 'Select an existing event to base your template on',
      'create-template': 'Configure your template settings and content',
      'preview': 'Review your template before saving',
      'saving': 'Creating your template...',
      'complete': 'Your template has been successfully created'
    };
    return descriptions[step];
  }
</script>

<div class="template-wizard">
  <!-- Progress Bar -->
  <div class="wizard-progress">
    <div class="progress-bar">
      <div class="progress-fill" style="width: {$progress}%"></div>
    </div>
    <div class="progress-text">{$progress}% Complete</div>
  </div>

  <!-- Step Header -->
  <div class="step-header">
    <h1 class="step-title">{getStepTitle(currentStep)}</h1>
    <p class="step-description">{getStepDescription(currentStep)}</p>
  </div>

  <!-- Error Message -->
  {#if error}
    <div class="error-banner">
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span class="error-message">{error}</span>
        <button class="error-dismiss" on:click={clearError}>×</button>
      </div>
    </div>
  {/if}

  <!-- Step Content -->
  <div class="step-content">
    {#if currentStep === 'select-mode'}
      <div class="mode-selection">
        <div class="mode-options">
          <button
            class="mode-option"
            on:click={() => handleModeSelection('from-event')}
          >
            <div class="mode-icon">📋</div>
            <h3>From Existing Event</h3>
            <p>Create a template based on an event you've already organized</p>
            <ul class="mode-benefits">
              <li>Copy proven event configurations</li>
              <li>Include successful topics and settings</li>
              <li>Save time on setup</li>
            </ul>
          </button>

          <button
            class="mode-option"
            on:click={() => handleModeSelection('from-scratch')}
          >
            <div class="mode-icon">✨</div>
            <h3>From Scratch</h3>
            <p>Start with a blank template and configure everything yourself</p>
            <ul class="mode-benefits">
              <li>Full creative control</li>
              <li>Build custom configurations</li>
              <li>Perfect for new event types</li>
            </ul>
          </button>
        </div>

        <div class="mode-actions">
          <button class="btn btn-secondary" on:click={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    {:else if currentStep === 'select-event'}
      <EventSelector
        {currentUserId}
        on:eventSelected={handleEventSelected}
        on:cancel={handleBackToStart}
        on:error={handleError}
        on:createEvent={() => dispatch('createEvent')}
      />
    {:else if currentStep === 'create-template'}
      <TemplateCreationForm
        mode={selectedMode}
        sourceEvent={selectedEvent}
        sourceTopics={selectedTopics}
        {currentUserId}
        {organizerName}
        on:templateCreated={handleTemplateCreated}
        on:cancel={selectedMode === 'from-event' ? () => currentStep = 'select-event' : handleBackToStart}
        on:error={handleError}
      />
    {:else if currentStep === 'preview'}
      <TemplatePreview
        templateName={templateData.templateName}
        templateDescription={templateData.description}
        templateCategory={templateData.category}
        isPublic={templateData.isPublic}
        tags={templateData.tags}
        sourceEvent={selectedEvent}
        sourceTopics={selectedTopics}
        contentOptions={templateData.contentOptions || {
          includeSettings: true,
          includeTopics: true,
          includeRooms: false
        }}
        on:confirm={handlePreviewConfirm}
        on:edit={handlePreviewEdit}
      />
    {:else if currentStep === 'saving'}
      <div class="saving-state">
        <div class="saving-animation">
          <div class="spinner large"></div>
        </div>
        <h3>Creating Your Template</h3>
        <p>Please wait while we save your template configuration...</p>
      </div>
    {:else if currentStep === 'complete'}
      <div class="completion-state">
        <div class="success-icon">🎉</div>
        <h3>Template Created Successfully!</h3>
        <p>Your template "{createdTemplate?.name}" is now available for creating events.</p>

        {#if createdTemplate}
          <div class="template-summary">
            <div class="summary-card">
              <h4>{createdTemplate.name}</h4>
              <p>{createdTemplate.description || 'No description provided'}</p>
              <div class="summary-stats">
                <span>Category: {createdTemplate.category}</span>
                <span>Visibility: {createdTemplate.isPublic ? 'Public' : 'Private'}</span>
                <span>Created: {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        {/if}

        <div class="completion-actions">
          <button class="btn btn-secondary" on:click={handleCreateAnother}>
            Create Another Template
          </button>
          <button class="btn btn-primary" on:click={() => dispatch('viewTemplates')}>
            View All Templates
          </button>
          <button class="btn btn-primary" on:click={() => dispatch('useTemplate', { template: createdTemplate })}>
            Use This Template
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .template-wizard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .wizard-progress {
    margin-bottom: 2rem;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: var(--border-light, #f3f4f6);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary-color, #3b82f6), var(--primary-hover, #2563eb));
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .progress-text {
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
    text-align: center;
  }

  .step-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .step-title {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 2rem;
    font-weight: 700;
  }

  .step-description {
    color: var(--text-secondary, #6b7280);
    font-size: 1.125rem;
    margin: 0;
  }

  .error-banner {
    margin-bottom: 2rem;
    padding: 1rem;
    background: var(--error-light, #fef2f2);
    border: 1px solid var(--error-color, #ef4444);
    border-radius: 8px;
  }

  .error-content {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .error-icon {
    font-size: 1.25rem;
  }

  .error-message {
    flex: 1;
    color: var(--error-color, #ef4444);
    font-weight: 500;
  }

  .error-dismiss {
    background: none;
    border: none;
    color: var(--error-color, #ef4444);
    cursor: pointer;
    font-size: 1.25rem;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .step-content {
    min-height: 400px;
  }

  .mode-selection {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .mode-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 2rem;
  }

  .mode-option {
    background: var(--surface-color, #ffffff);
    border: 2px solid var(--border-color, #e5e7eb);
    border-radius: 16px;
    padding: 2rem;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
  }

  .mode-option:hover {
    border-color: var(--primary-color, #3b82f6);
    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
    transform: translateY(-2px);
  }

  .mode-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .mode-option h3 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1.5rem;
    font-weight: 600;
  }

  .mode-option p {
    color: var(--text-secondary, #6b7280);
    line-height: 1.5;
    margin-bottom: 1.5rem;
  }

  .mode-benefits {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .mode-benefits li {
    color: var(--text-secondary, #6b7280);
    font-size: 0.875rem;
    padding: 0.25rem 0;
    position: relative;
    padding-left: 1.5rem;
  }

  .mode-benefits li::before {
    content: '✓';
    position: absolute;
    left: 0;
    color: var(--success-color, #22c55e);
    font-weight: bold;
  }

  .mode-actions {
    display: flex;
    justify-content: center;
  }

  .saving-state, .completion-state {
    text-align: center;
    padding: 3rem 2rem;
  }

  .saving-animation {
    margin-bottom: 2rem;
  }

  .spinner {
    border: 3px solid var(--border-light, #f3f4f6);
    border-top: 3px solid var(--primary-color, #3b82f6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto;
  }

  .spinner.large {
    width: 48px;
    height: 48px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .saving-state h3, .completion-state h3 {
    margin: 0 0 1rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1.5rem;
    font-weight: 600;
  }

  .saving-state p, .completion-state p {
    color: var(--text-secondary, #6b7280);
    font-size: 1.125rem;
    margin: 0;
  }

  .success-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .template-summary {
    margin: 2rem 0;
  }

  .summary-card {
    background: var(--surface-color, #ffffff);
    border: 1px solid var(--border-light, #f3f4f6);
    border-radius: 12px;
    padding: 2rem;
    text-align: left;
    max-width: 500px;
    margin: 0 auto;
  }

  .summary-card h4 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1.25rem;
    font-weight: 600;
  }

  .summary-card p {
    color: var(--text-secondary, #6b7280);
    margin-bottom: 1rem;
  }

  .summary-stats {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
  }

  .completion-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
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
    min-width: 140px;
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
    .template-wizard {
      padding: 1rem;
    }

    .mode-options {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .mode-option {
      padding: 1.5rem;
    }

    .completion-actions {
      flex-direction: column;
      align-items: center;
    }

    .summary-stats {
      text-align: center;
    }

    .step-title {
      font-size: 1.5rem;
    }

    .step-description {
      font-size: 1rem;
    }
  }
</style>