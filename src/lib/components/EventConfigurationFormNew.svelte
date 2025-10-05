<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { writable } from 'svelte/store';
  import type { Event } from '../../types/entities';
  import FormInput from './ui/FormInput.svelte';
  import FormTextarea from './ui/FormTextarea.svelte';
  import Button from './ui/Button.svelte';
  import ProgressSteps from './ui/ProgressSteps.svelte';

  interface EventConfigurationFormNewProps {
    eventId?: string | null;
    initialData?: Partial<Event> | null;
    organizerId: string;
    organizerName?: string;
    mode?: 'create' | 'edit';
  }

  let {
    eventId = null,
    initialData = null,
    organizerId,
    organizerName = '',
    mode = 'create'
  }: EventConfigurationFormNewProps = $props();

  const dispatch = createEventDispatcher();

  // Wizard configuration
  const steps = [
    { label: 'Basic Info', icon: '📝' },
    { label: 'Settings', icon: '⚙️' },
    { label: 'Voting Rules', icon: '🗳️' }
  ];

  let currentStep = $state(0);

  // Form constants
  const MAX_TITLE_LENGTH = 200;
  const MAX_DESCRIPTION_LENGTH = 2000;
  const MIN_CAPACITY = 5;
  const MAX_CAPACITY = 1000;
  const MAX_DURATION_DAYS = 7;
  const MIN_DURATION_DAYS = 1;
  const MAX_VOTING_ROUNDS = 10;
  const MAX_TOPICS_PER_USER = 20;
  const MAX_VOTING_TIME_MINUTES = 60;
  const MIN_VOTING_TIME_MINUTES = 1;

  const DEFAULT_DURATION_DAYS = 3;
  const DEFAULT_CAPACITY = 20;
  const DEFAULT_VOTING_ROUNDS = 1;
  const DEFAULT_MAX_TOPICS_PER_USER = 3;
  const DEFAULT_VOTING_TIME_MINUTES = 5;

  // Form state
  let title = $state(initialData?.title ?? '');
  let description = $state(initialData?.description ?? '');
  let capacity = $state(initialData?.maxParticipants ?? DEFAULT_CAPACITY);
  let duration = $state(DEFAULT_DURATION_DAYS);
  let isPrivate = $state(initialData?.settings?.allowGuestAccess === false);
  let allowGuestAccess = $state(initialData?.settings?.allowGuestAccess ?? true);
  let votingRounds = $state(DEFAULT_VOTING_ROUNDS);
  let maxTopicsPerUser = $state(initialData?.settings?.maxTopicsPerUser ?? DEFAULT_MAX_TOPICS_PER_USER);
  let votingTimeLimit = $state(
    initialData?.settings?.votingTimeLimit
      ? Math.max(MIN_VOTING_TIME_MINUTES, Math.round(initialData.settings.votingTimeLimit / 60))
      : DEFAULT_VOTING_TIME_MINUTES
  );
  let isSubmitting = $state(false);

  // Validation
  type ValidationState = {
    title: { isValid: boolean; message: string };
    description: { isValid: boolean; message: string };
    capacity: { isValid: boolean; message: string };
    duration: { isValid: boolean; message: string };
    votingRounds: { isValid: boolean; message: string };
    maxTopicsPerUser: { isValid: boolean; message: string };
    votingTimeLimit: { isValid: boolean; message: string };
  };

  const validation = writable<ValidationState>({
    title: { isValid: true, message: '' },
    description: { isValid: true, message: '' },
    capacity: { isValid: true, message: '' },
    duration: { isValid: true, message: '' },
    votingRounds: { isValid: true, message: '' },
    maxTopicsPerUser: { isValid: true, message: '' },
    votingTimeLimit: { isValid: true, message: '' }
  });

  // Validation effects
  $effect(() => { validateTitle(title); });
  $effect(() => { validateDescription(description); });
  $effect(() => { validateCapacity(capacity); });
  $effect(() => { validateDuration(duration); });
  $effect(() => { validateVotingRounds(votingRounds); });
  $effect(() => { validateMaxTopicsPerUser(maxTopicsPerUser); });
  $effect(() => { validateVotingTimeLimit(votingTimeLimit); });

  function validateTitle(value: string) {
    if (!value.trim()) {
      validation.update(v => ({ ...v, title: { isValid: false, message: 'Event title is required' } }));
    } else if (value.length < 3) {
      validation.update(v => ({ ...v, title: { isValid: false, message: 'Title must be at least 3 characters' } }));
    } else if (value.length > MAX_TITLE_LENGTH) {
      validation.update(v => ({ ...v, title: { isValid: false, message: `Title must not exceed ${MAX_TITLE_LENGTH} characters` } }));
    } else {
      validation.update(v => ({ ...v, title: { isValid: true, message: '' } }));
    }
  }

  function validateDescription(value: string) {
    if (value.length > MAX_DESCRIPTION_LENGTH) {
      validation.update(v => ({ ...v, description: { isValid: false, message: `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters` } }));
    } else {
      validation.update(v => ({ ...v, description: { isValid: true, message: '' } }));
    }
  }

  function validateCapacity(value: number | string) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      validation.update(v => ({ ...v, capacity: { isValid: false, message: 'Capacity must be a number' } }));
    } else if (numericValue < MIN_CAPACITY) {
      validation.update(v => ({ ...v, capacity: { isValid: false, message: `Minimum capacity is ${MIN_CAPACITY} participants` } }));
    } else if (numericValue > MAX_CAPACITY) {
      validation.update(v => ({ ...v, capacity: { isValid: false, message: `Maximum capacity is ${MAX_CAPACITY} participants` } }));
    } else {
      validation.update(v => ({ ...v, capacity: { isValid: true, message: '' } }));
    }
  }

  function validateDuration(value: number | string) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      validation.update(v => ({ ...v, duration: { isValid: false, message: 'Duration must be a number' } }));
    } else if (numericValue < MIN_DURATION_DAYS) {
      validation.update(v => ({ ...v, duration: { isValid: false, message: `Minimum duration is ${MIN_DURATION_DAYS} day` } }));
    } else if (numericValue > MAX_DURATION_DAYS) {
      validation.update(v => ({ ...v, duration: { isValid: false, message: `Maximum duration is ${MAX_DURATION_DAYS} days` } }));
    } else {
      validation.update(v => ({ ...v, duration: { isValid: true, message: '' } }));
    }
  }

  function validateVotingRounds(value: number | string) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      validation.update(v => ({ ...v, votingRounds: { isValid: false, message: 'Voting rounds must be a number' } }));
    } else if (numericValue < 1) {
      validation.update(v => ({ ...v, votingRounds: { isValid: false, message: 'At least 1 voting round is required' } }));
    } else if (numericValue > MAX_VOTING_ROUNDS) {
      validation.update(v => ({ ...v, votingRounds: { isValid: false, message: `Maximum ${MAX_VOTING_ROUNDS} voting rounds allowed` } }));
    } else {
      validation.update(v => ({ ...v, votingRounds: { isValid: true, message: '' } }));
    }
  }

  function validateMaxTopicsPerUser(value: number | string) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      validation.update(v => ({ ...v, maxTopicsPerUser: { isValid: false, message: 'Max topics must be a number' } }));
    } else if (numericValue < 1) {
      validation.update(v => ({ ...v, maxTopicsPerUser: { isValid: false, message: 'At least 1 topic per user is required' } }));
    } else if (numericValue > MAX_TOPICS_PER_USER) {
      validation.update(v => ({ ...v, maxTopicsPerUser: { isValid: false, message: `Maximum ${MAX_TOPICS_PER_USER} topics per user allowed` } }));
    } else {
      validation.update(v => ({ ...v, maxTopicsPerUser: { isValid: true, message: '' } }));
    }
  }

  function validateVotingTimeLimit(value: number | string) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      validation.update(v => ({ ...v, votingTimeLimit: { isValid: false, message: 'Voting time must be a number' } }));
    } else if (numericValue < MIN_VOTING_TIME_MINUTES) {
      validation.update(v => ({ ...v, votingTimeLimit: { isValid: false, message: `Minimum voting time is ${MIN_VOTING_TIME_MINUTES} minute` } }));
    } else if (numericValue > MAX_VOTING_TIME_MINUTES) {
      validation.update(v => ({ ...v, votingTimeLimit: { isValid: false, message: `Maximum voting time is ${MAX_VOTING_TIME_MINUTES} minutes` } }));
    } else {
      validation.update(v => ({ ...v, votingTimeLimit: { isValid: true, message: '' } }));
    }
  }

  // Step validation
  let canProceedToStep2 = $derived($validation.title.isValid && $validation.description.isValid);
  let canProceedToStep3 = $derived(
    canProceedToStep2 &&
    $validation.capacity.isValid &&
    $validation.duration.isValid
  );
  let canSubmit = $derived(
    canProceedToStep3 &&
    $validation.votingRounds.isValid &&
    $validation.maxTopicsPerUser.isValid &&
    $validation.votingTimeLimit.isValid &&
    title.trim().length >= 3
  );

  // Step navigation
  function nextStep() {
    if (currentStep < steps.length - 1) {
      if (currentStep === 0 && !canProceedToStep2) return;
      if (currentStep === 1 && !canProceedToStep3) return;
      currentStep++;
    }
  }

  function previousStep() {
    if (currentStep > 0) {
      currentStep--;
    }
  }

  // Form submission
  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;

    isSubmitting = true;

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    const clampedCapacity = Math.min(MAX_CAPACITY, Math.max(MIN_CAPACITY, Math.round(Number(capacity))));
    const clampedDurationDays = Math.min(MAX_DURATION_DAYS, Math.max(MIN_DURATION_DAYS, Number(duration)));
    const clampedVotingRounds = Math.min(MAX_VOTING_ROUNDS, Math.max(1, Math.round(Number(votingRounds))));
    const clampedMaxTopicsPerUser = Math.min(MAX_TOPICS_PER_USER, Math.max(1, Math.round(Number(maxTopicsPerUser))));
    const clampedVotingMinutes = Math.min(MAX_VOTING_TIME_MINUTES, Math.max(MIN_VOTING_TIME_MINUTES, Math.round(Number(votingTimeLimit))));

    const baseSettings = {
      allowGuestAccess: !isPrivate && !!allowGuestAccess,
      maxTopicsPerUser: clampedMaxTopicsPerUser,
      votingTimeLimit: clampedVotingMinutes * 60
    };

    let url = '';
    let method: 'POST' | 'PUT' = 'POST';
    let payload: Record<string, unknown> = {};

    if (mode === 'create') {
      url = '/api/events';
      method = 'POST';
      payload = {
        title: trimmedTitle,
        description: trimmedDescription,
        duration: clampedDurationDays * 24 * 60 * 60 * 1000,
        capacity: clampedCapacity,
        organizerId,
        organizerName,
        settings: {
          ...baseSettings,
          votingRounds: clampedVotingRounds
        }
      };
    } else {
      url = `/api/events/${eventId}`;
      method = 'PUT';
      payload = {
        title: trimmedTitle,
        description: trimmedDescription,
        maxParticipants: clampedCapacity,
        settings: baseSettings
      };
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        dispatch('eventSaved', { event: result.event, mode });
      } else {
        dispatch('error', {
          message: result.error || `Failed to ${mode} event. Please try again.`,
          details: result.details
        });
      }
    } catch (error) {
      console.error(`Event ${mode} error:`, error);
      dispatch('error', { message: 'Network error. Please try again.' });
    } finally {
      isSubmitting = false;
    }
  }

  function handleCancel() {
    dispatch('cancel');
  }
</script>

<div class="event-wizard">
  <!-- Header -->
  <div class="wizard-header">
    <h1 class="wizard-title">
      {mode === 'create' ? 'Create Your Event' : 'Edit Event'}
    </h1>
    <p class="wizard-subtitle">
      {mode === 'create'
        ? 'Set up your unconference in a few simple steps'
        : 'Update your event settings'}
    </p>
  </div>

  <!-- Progress Steps (only show in create mode) -->
  {#if mode === 'create'}
    <ProgressSteps {steps} {currentStep} />
  {/if}

  <!-- Form -->
  <form onsubmit={handleSubmit} class="wizard-form">
    <!-- Step 1: Basic Information -->
    {#if currentStep === 0 || mode === 'edit'}
      <div class="wizard-step" class:hidden={mode === 'create' && currentStep !== 0}>
        <div class="step-header">
          <h2 class="step-title">📝 Basic Information</h2>
          <p class="step-description">Tell us about your event</p>
        </div>

        <div class="step-content">
          <FormInput
            label="Event Title"
            icon="🎯"
            bind:value={title}
            placeholder="e.g., Tech Unconference 2024"
            required
            disabled={isSubmitting}
            maxlength={MAX_TITLE_LENGTH}
            characterCount={{ current: title.length, max: MAX_TITLE_LENGTH }}
            error={!$validation.title.isValid ? $validation.title.message : ''}
            tooltip="Give your event a clear, descriptive name that attendees will recognize"
          />

          <FormTextarea
            label="Description"
            icon="📄"
            bind:value={description}
            placeholder="Describe what makes your unconference special, the topics you'll cover, and what participants can expect..."
            disabled={isSubmitting}
            maxlength={MAX_DESCRIPTION_LENGTH}
            characterCount={{ current: description.length, max: MAX_DESCRIPTION_LENGTH }}
            error={!$validation.description.isValid ? $validation.description.message : ''}
            helpText="Optional but recommended - help participants understand what your event is about"
            tooltip="A good description helps attract the right participants and sets expectations"
          />
        </div>
      </div>
    {/if}

    <!-- Step 2: Event Settings -->
    {#if currentStep === 1 || mode === 'edit'}
      <div class="wizard-step" class:hidden={mode === 'create' && currentStep !== 1}>
        <div class="step-header">
          <h2 class="step-title">⚙️ Event Settings</h2>
          <p class="step-description">Configure capacity and access</p>
        </div>

        <div class="step-content">
          <div class="form-grid">
            <FormInput
              label="Maximum Participants"
              icon="👥"
              type="number"
              bind:value={capacity}
              min={MIN_CAPACITY}
              max={MAX_CAPACITY}
              required
              disabled={isSubmitting}
              error={!$validation.capacity.isValid ? $validation.capacity.message : ''}
              helpText={`Between ${MIN_CAPACITY} and ${MAX_CAPACITY} people`}
              tooltip="The maximum number of people who can join your event"
            />

            <FormInput
              label="Duration (days)"
              icon="📅"
              type="number"
              bind:value={duration}
              min={MIN_DURATION_DAYS}
              max={MAX_DURATION_DAYS}
              step="0.5"
              required
              disabled={isSubmitting}
              error={!$validation.duration.isValid ? $validation.duration.message : ''}
              helpText={`Up to ${MAX_DURATION_DAYS} days`}
              tooltip="How long your event will run (can use half-days like 1.5)"
            />
          </div>

          <div class="privacy-section">
            <h3 class="section-subtitle">Privacy Settings</h3>

            <label class="checkbox-card">
              <input
                type="checkbox"
                bind:checked={isPrivate}
                disabled={isSubmitting}
              />
              <div class="checkbox-content">
                <div class="checkbox-header">
                  <span class="checkbox-icon">🔒</span>
                  <span class="checkbox-label">Private Event</span>
                </div>
                <p class="checkbox-description">
                  Only people you invite can join this event
                </p>
              </div>
            </label>

            {#if !isPrivate}
              <label class="checkbox-card">
                <input
                  type="checkbox"
                  bind:checked={allowGuestAccess}
                  disabled={isSubmitting}
                />
                <div class="checkbox-content">
                  <div class="checkbox-header">
                    <span class="checkbox-icon">🚪</span>
                    <span class="checkbox-label">Allow Guest Access</span>
                  </div>
                  <p class="checkbox-description">
                    Let people join without creating an account
                  </p>
                </div>
              </label>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- Step 3: Voting Configuration -->
    {#if currentStep === 2 || mode === 'edit'}
      <div class="wizard-step" class:hidden={mode === 'create' && currentStep !== 2}>
        <div class="step-header">
          <h2 class="step-title">🗳️ Voting Rules</h2>
          <p class="step-description">Configure how voting will work</p>
        </div>

        <div class="step-content">
          <div class="form-grid">
            <FormInput
              label="Voting Rounds"
              icon="🔄"
              type="number"
              bind:value={votingRounds}
              min="1"
              max={MAX_VOTING_ROUNDS}
              required
              disabled={isSubmitting}
              error={!$validation.votingRounds.isValid ? $validation.votingRounds.message : ''}
              helpText="Number of voting sessions"
              tooltip="Multiple rounds let you refine topic selection progressively"
            />

            <FormInput
              label="Voting Time Limit (minutes)"
              icon="⏱️"
              type="number"
              bind:value={votingTimeLimit}
              min={MIN_VOTING_TIME_MINUTES}
              max={MAX_VOTING_TIME_MINUTES}
              required
              disabled={isSubmitting}
              error={!$validation.votingTimeLimit.isValid ? $validation.votingTimeLimit.message : ''}
              helpText="How long participants have to vote"
              tooltip="Recommended: 5-10 minutes for most events"
            />
          </div>

          <FormInput
            label="Max Topics per Participant"
            icon="💡"
            type="number"
            bind:value={maxTopicsPerUser}
            min="1"
            max={MAX_TOPICS_PER_USER}
            required
            disabled={isSubmitting}
            error={!$validation.maxTopicsPerUser.isValid ? $validation.maxTopicsPerUser.message : ''}
            helpText="How many topics each person can submit"
            tooltip="Keep it low (3-5) to encourage quality over quantity"
          />

          {#if mode === 'create'}
            <div class="info-card">
              <span class="info-icon">ℹ️</span>
              <div class="info-content">
                <h4>About Weighted Voting</h4>
                <p>
                  Participants will rank topics with 1st (3 points), 2nd (2 points), and 3rd choice (1 point).
                  This ensures fair prioritization based on collective preferences.
                </p>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Form Actions -->
    <div class="wizard-actions">
      <div class="actions-left">
        <Button
          type="button"
          variant="outline"
          onclick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>

      <div class="actions-right">
        {#if mode === 'create'}
          {#if currentStep > 0}
            <Button
              type="button"
              variant="secondary"
              onclick={previousStep}
              disabled={isSubmitting}
            >
              ← Previous
            </Button>
          {/if}

          {#if currentStep < steps.length - 1}
            <Button
              type="button"
              variant="primary"
              onclick={nextStep}
              disabled={currentStep === 0 ? !canProceedToStep2 : !canProceedToStep3}
            >
              Next →
            </Button>
          {:else}
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Event'}
            </Button>
          {/if}
        {:else}
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        {/if}
      </div>
    </div>
  </form>
</div>

<style>
  .event-wizard {
    max-width: 800px;
    margin: 0 auto;
    padding: var(--spacing-6);
  }

  .wizard-header {
    text-align: center;
    margin-bottom: var(--spacing-8);
  }

  .wizard-title {
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    margin: 0 0 var(--spacing-3) 0;
  }

  .wizard-subtitle {
    font-size: var(--font-size-lg);
    color: var(--color-text-secondary);
    margin: 0;
  }

  .wizard-form {
    background: var(--color-surface);
    border-radius: var(--radius-xl);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
  }

  .wizard-step {
    padding: var(--spacing-8);
  }

  .wizard-step.hidden {
    display: none;
  }

  .step-header {
    margin-bottom: var(--spacing-6);
    padding-bottom: var(--spacing-4);
    border-bottom: 2px solid var(--color-border);
  }

  .step-title {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    margin: 0 0 var(--spacing-2) 0;
  }

  .step-description {
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
    margin: 0;
  }

  .step-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-6);
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-6);
  }

  .privacy-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .section-subtitle {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    margin: 0;
  }

  .checkbox-card {
    display: flex;
    gap: var(--spacing-4);
    padding: var(--spacing-4);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--transition-fast);
    background: var(--color-surface);
  }

  .checkbox-card:hover {
    border-color: var(--color-primary);
    background: var(--color-primary-light);
  }

  .checkbox-card input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .checkbox-content {
    flex: 1;
  }

  .checkbox-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-1);
  }

  .checkbox-icon {
    font-size: 1.25rem;
  }

  .checkbox-label {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  .checkbox-description {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin: 0;
  }

  .info-card {
    display: flex;
    gap: var(--spacing-3);
    padding: var(--spacing-4);
    background: var(--color-primary-light);
    border: 1px solid var(--color-primary-200);
    border-radius: var(--radius-lg);
  }

  .info-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .info-content h4 {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    color: var(--color-primary);
    margin: 0 0 var(--spacing-1) 0;
  }

  .info-content p {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin: 0;
    line-height: var(--line-height-normal);
  }

  .wizard-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-6);
    background: var(--color-surface-secondary);
    border-top: 1px solid var(--color-border);
  }

  .actions-left,
  .actions-right {
    display: flex;
    gap: var(--spacing-3);
  }

  @media (max-width: 768px) {
    .event-wizard {
      padding: var(--spacing-4);
    }

    .wizard-step {
      padding: var(--spacing-6);
    }

    .form-grid {
      grid-template-columns: 1fr;
      gap: var(--spacing-4);
    }

    .wizard-actions {
      flex-direction: column;
      gap: var(--spacing-4);
    }

    .actions-left,
    .actions-right {
      width: 100%;
      flex-direction: column;
    }

    .actions-right {
      flex-direction: column-reverse;
    }
  }

  @media (max-width: 640px) {
    .wizard-step {
      padding: var(--spacing-4);
    }

    .step-content {
      gap: var(--spacing-4);
    }
  }
</style>
