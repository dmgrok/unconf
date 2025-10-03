<!--
  Event Cloning Interface Component
  Allows users to create new events from templates with selective copying
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { writable } from 'svelte/store';
  import type { EventTemplate, Event, Topic } from '../../types/entities';

  export let template: EventTemplate;
  export let currentUserId: string;
  export let organizerName: string = '';

  const dispatch = createEventDispatcher();

  // Event configuration
  let eventTitle = template.templateData.generalSettings?.defaultTitle || `New ${template.name}`;
  let eventDescription = template.templateData.generalSettings?.defaultDescription || template.description || '';
  let organizerDisplayName = organizerName;

  // Cloning options
  let cloneOptions = {
    includeSettings: true,
    includeTopics: true,
    includeRooms: false
  };

  // Selected items for cloning
  let selectedTopicIds = new Set<string>();
  let selectedRoomIds = new Set<string>();

  // UI state
  let isCloning = false;
  let showPreview = false;
  let clonedEvent: Event | null = null;
  let error: string | null = null;

  const validation = writable({
    eventTitle: { isValid: true, message: '' },
    form: { isValid: true, canSubmit: false }
  });

  // Initialize selected items
  $: if (template.templateData.topics) {
    selectedTopicIds = new Set(template.templateData.topics.map((_, index) => index.toString()));
  }

  $: if (template.templateData.rooms) {
    selectedRoomIds = new Set(template.templateData.rooms.map((_, index) => index.toString()));
  }

  // Validate form
  $: validateForm(eventTitle);

  function validateForm(title: string) {
    const titleValid = title.trim().length >= 3 && title.trim().length <= 200;

    validation.update(v => ({
      ...v,
      eventTitle: {
        isValid: titleValid,
        message: titleValid ? '' : 'Event title must be between 3 and 200 characters'
      },
      form: {
        isValid: titleValid,
        canSubmit: titleValid && !isCloning
      }
    }));
  }

  function toggleTopicSelection(topicIndex: string) {
    if (selectedTopicIds.has(topicIndex)) {
      selectedTopicIds.delete(topicIndex);
    } else {
      selectedTopicIds.add(topicIndex);
    }
    selectedTopicIds = new Set(selectedTopicIds);
  }

  function toggleRoomSelection(roomIndex: string) {
    if (selectedRoomIds.has(roomIndex)) {
      selectedRoomIds.delete(roomIndex);
    } else {
      selectedRoomIds.add(roomIndex);
    }
    selectedRoomIds = new Set(selectedRoomIds);
  }

  function selectAllTopics() {
    if (template.templateData.topics) {
      selectedTopicIds = new Set(template.templateData.topics.map((_, index) => index.toString()));
    }
  }

  function selectNoTopics() {
    selectedTopicIds = new Set();
  }

  function selectAllRooms() {
    if (template.templateData.rooms) {
      selectedRoomIds = new Set(template.templateData.rooms.map((_, index) => index.toString()));
    }
  }

  function selectNoRooms() {
    selectedRoomIds = new Set();
  }

  function togglePreview() {
    showPreview = !showPreview;
  }

  async function handleCloneEvent() {
    if (!$validation.form.canSubmit) return;

    isCloning = true;
    error = null;

    try {
      const cloneData = {
        eventTitle: eventTitle.trim(),
        eventDescription: eventDescription.trim(),
        organizerName: organizerDisplayName,
        cloneOptions: {
          ...cloneOptions,
          selectedTopicIds: cloneOptions.includeTopics ? Array.from(selectedTopicIds) : [],
          selectedRoomIds: cloneOptions.includeRooms ? Array.from(selectedRoomIds) : []
        }
      };

      const response = await fetch(`/api/templates/${template.id}/clone?userId=${currentUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cloneData)
      });

      const result = await response.json();

      if (result.success) {
        clonedEvent = result.event;
        dispatch('eventCloned', {
          event: result.event,
          clonedTopics: result.clonedTopics || [],
          template: template
        });
      } else {
        throw new Error(result.error || 'Failed to clone event from template');
      }
    } catch (err) {
      console.error('Error cloning event:', err);
      error = err instanceof Error ? err.message : 'Failed to clone event';
    } finally {
      isCloning = false;
    }
  }

  function handleCancel() {
    dispatch('cancel');
  }

  function clearError() {
    error = null;
  }

  function getPreviewData() {
    const selectedTopics = template.templateData.topics?.filter((_, index) =>
      selectedTopicIds.has(index.toString())
    ) || [];

    const selectedRooms = template.templateData.rooms?.filter((_, index) =>
      selectedRoomIds.has(index.toString())
    ) || [];

    return {
      eventTitle,
      eventDescription,
      settingsIncluded: cloneOptions.includeSettings,
      topicsIncluded: cloneOptions.includeTopics ? selectedTopics.length : 0,
      roomsIncluded: cloneOptions.includeRooms ? selectedRooms.length : 0,
      totalTopics: template.templateData.topics?.length || 0,
      totalRooms: template.templateData.rooms?.length || 0
    };
  }
</script>

<div class="cloning-interface">
  <div class="interface-header">
    <h2>Clone Event from Template</h2>
    <p class="interface-subtitle">Create a new event based on "{template.name}"</p>
  </div>

  <!-- Error Display -->
  {#if error}
    <div class="error-banner">
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span class="error-message">{error}</span>
        <button class="error-dismiss" on:click={clearError}>×</button>
      </div>
    </div>
  {/if}

  <div class="cloning-form">
    <!-- Template Information -->
    <section class="form-section">
      <h3>Template Information</h3>
      <div class="template-info">
        <div class="template-header">
          <h4>{template.name}</h4>
          <span class="template-category">{template.category}</span>
        </div>
        {#if template.description}
          <p class="template-description">{template.description}</p>
        {/if}
        <div class="template-stats">
          <span>Used {template.usageCount} times</span>
          <span>Created by {template.createdBy === currentUserId ? 'You' : 'Another organizer'}</span>
          {#if template.lastUsedAt}
            <span>Last used {new Date(template.lastUsedAt).toLocaleDateString()}</span>
          {/if}
        </div>
      </div>
    </section>

    <!-- Event Configuration -->
    <section class="form-section">
      <h3>Event Configuration</h3>

      <div class="form-group">
        <label for="event-title" class="form-label">
          Event Title *
          <span class="char-count" class:warning={eventTitle.length > 160}>
            {eventTitle.length}/200
          </span>
        </label>
        <input
          id="event-title"
          type="text"
          bind:value={eventTitle}
          maxlength="200"
          placeholder="Enter title for your new event"
          class="form-input"
          class:invalid={!$validation.eventTitle.isValid}
          disabled={isCloning}
          required
        />
        {#if !$validation.eventTitle.isValid}
          <div class="error-message">{$validation.eventTitle.message}</div>
        {/if}
      </div>

      <div class="form-group">
        <label for="event-description" class="form-label">Description</label>
        <textarea
          id="event-description"
          bind:value={eventDescription}
          placeholder="Describe your event (optional)"
          rows="3"
          class="form-textarea"
          disabled={isCloning}
        ></textarea>
      </div>

      <div class="form-group">
        <label for="organizer-name" class="form-label">Organizer Name</label>
        <input
          id="organizer-name"
          type="text"
          bind:value={organizerDisplayName}
          placeholder="Your name as it will appear to participants"
          class="form-input"
          disabled={isCloning}
        />
      </div>
    </section>

    <!-- Cloning Options -->
    <section class="form-section">
      <h3>What to Include</h3>
      <p class="section-description">Choose which elements from the template to include in your new event</p>

      <div class="cloning-options">
        <!-- Event Settings -->
        <div class="option-group">
          <label class="checkbox-container">
            <input
              type="checkbox"
              bind:checked={cloneOptions.includeSettings}
              disabled={isCloning}
            />
            <span class="checkmark"></span>
            <div class="checkbox-content">
              <span class="checkbox-label">Event Settings</span>
              <span class="checkbox-description">
                Include voting configuration, access controls, and activity settings
              </span>
            </div>
          </label>

          {#if cloneOptions.includeSettings}
            <div class="settings-preview">
              <h4>Settings from Template</h4>
              <div class="settings-grid">
                <div class="setting-item">
                  <span class="setting-name">Guest Access:</span>
                  <span class="setting-value">
                    {template.templateData.eventSettings.allowGuestAccess ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div class="setting-item">
                  <span class="setting-name">Voting:</span>
                  <span class="setting-value">
                    {template.templateData.eventSettings.enableVoting ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div class="setting-item">
                  <span class="setting-name">Max Votes:</span>
                  <span class="setting-value">{template.templateData.eventSettings.maxVotesPerTopic}</span>
                </div>
                <div class="setting-item">
                  <span class="setting-name">Discussion Groups:</span>
                  <span class="setting-value">
                    {template.templateData.eventSettings.enableDiscussionGroups ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          {/if}
        </div>

        <!-- Topics -->
        {#if template.templateData.topics && template.templateData.topics.length > 0}
          <div class="option-group">
            <label class="checkbox-container">
              <input
                type="checkbox"
                bind:checked={cloneOptions.includeTopics}
                disabled={isCloning}
              />
              <span class="checkmark"></span>
              <div class="checkbox-content">
                <span class="checkbox-label">Topics ({template.templateData.topics.length})</span>
                <span class="checkbox-description">
                  Include discussion topics from the template
                </span>
              </div>
            </label>

            {#if cloneOptions.includeTopics}
              <div class="items-selection">
                <div class="selection-controls">
                  <button type="button" class="control-btn" on:click={selectAllTopics}>
                    Select All
                  </button>
                  <button type="button" class="control-btn" on:click={selectNoTopics}>
                    Select None
                  </button>
                  <span class="selection-count">
                    {selectedTopicIds.size} of {template.templateData.topics.length} selected
                  </span>
                </div>

                <div class="items-list">
                  {#each template.templateData.topics as topic, index}
                    <label class="item-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedTopicIds.has(index.toString())}
                        on:change={() => toggleTopicSelection(index.toString())}
                        disabled={isCloning}
                      />
                      <span class="item-info">
                        <span class="item-title">{topic.title}</span>
                        {#if topic.description}
                          <span class="item-description">{topic.description}</span>
                        {/if}
                        {#if topic.tags && topic.tags.length > 0}
                          <div class="item-tags">
                            {#each topic.tags as tag}
                              <span class="item-tag">{tag}</span>
                            {/each}
                          </div>
                        {/if}
                        <span class="item-priority priority-{topic.priority}">
                          Priority: {topic.priority}
                        </span>
                      </span>
                    </label>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Rooms -->
        {#if template.templateData.rooms && template.templateData.rooms.length > 0}
          <div class="option-group">
            <label class="checkbox-container">
              <input
                type="checkbox"
                bind:checked={cloneOptions.includeRooms}
                disabled={isCloning}
              />
              <span class="checkmark"></span>
              <div class="checkbox-content">
                <span class="checkbox-label">Room Configurations ({template.templateData.rooms.length})</span>
                <span class="checkbox-description">
                  Include discussion room setups from the template
                </span>
              </div>
            </label>

            {#if cloneOptions.includeRooms}
              <div class="items-selection">
                <div class="selection-controls">
                  <button type="button" class="control-btn" on:click={selectAllRooms}>
                    Select All
                  </button>
                  <button type="button" class="control-btn" on:click={selectNoRooms}>
                    Select None
                  </button>
                  <span class="selection-count">
                    {selectedRoomIds.size} of {template.templateData.rooms.length} selected
                  </span>
                </div>

                <div class="items-list">
                  {#each template.templateData.rooms as room, index}
                    <label class="item-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedRoomIds.has(index.toString())}
                        on:change={() => toggleRoomSelection(index.toString())}
                        disabled={isCloning}
                      />
                      <span class="item-info">
                        <span class="item-title">{room.name}</span>
                        {#if room.description}
                          <span class="item-description">{room.description}</span>
                        {/if}
                        <div class="room-details">
                          <span>Capacity: {room.capacity}</span>
                          {#if room.location}
                            <span>Location: {room.location}</span>
                          {/if}
                          {#if room.isVirtual}
                            <span>Virtual Room</span>
                          {/if}
                        </div>
                      </span>
                    </label>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {:else}
          <div class="option-group disabled">
            <label class="checkbox-container disabled">
              <input
                type="checkbox"
                bind:checked={cloneOptions.includeRooms}
                disabled={true}
              />
              <span class="checkmark"></span>
              <div class="checkbox-content">
                <span class="checkbox-label">Room Configurations</span>
                <span class="checkbox-description">
                  No room configurations available in this template
                </span>
              </div>
            </label>
          </div>
        {/if}
      </div>
    </section>

    <!-- Preview Section -->
    <section class="form-section">
      <div class="section-header">
        <h3>Clone Preview</h3>
        <button
          type="button"
          class="preview-toggle"
          on:click={togglePreview}
        >
          {showPreview ? 'Hide' : 'Show'} Preview
        </button>
      </div>

      {#if showPreview}
        <div class="clone-preview">
          {#each Object.entries(getPreviewData()) as [key, value]}
            <div class="preview-item">
              <span class="preview-label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
              <span class="preview-value">{value}</span>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </div>

  <!-- Actions -->
  <div class="interface-actions">
    <button
      type="button"
      on:click={handleCancel}
      class="btn btn-secondary"
      disabled={isCloning}
    >
      Cancel
    </button>

    <button
      type="button"
      on:click={handleCloneEvent}
      class="btn btn-primary"
      disabled={!$validation.form.canSubmit}
    >
      {#if isCloning}
        Creating Event...
      {:else}
        Create Event from Template
      {/if}
    </button>
  </div>
</div>

<style>
  .cloning-interface {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem;
    background: var(--surface-color, #ffffff);
    border-radius: 12px;
    border: 1px solid var(--border-color, #e0e0e0);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  }

  .interface-header {
    text-align: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid var(--primary-color, #3b82f6);
  }

  .interface-header h2 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1.75rem;
    font-weight: 600;
  }

  .interface-subtitle {
    color: var(--text-secondary, #6b7280);
    font-size: 1rem;
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

  .cloning-form {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .form-section {
    padding: 1.5rem;
    background: var(--section-bg, #fafbfc);
    border: 1px solid var(--border-light, #f3f4f6);
    border-radius: 12px;
  }

  .form-section h3 {
    margin: 0 0 1.5rem 0;
    color: var(--text-primary, #374151);
    font-size: 1.25rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .form-section h3::before {
    content: '▶';
    color: var(--primary-color, #3b82f6);
    font-size: 0.875rem;
  }

  .section-description {
    color: var(--text-secondary, #6b7280);
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
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

  .template-info {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid var(--border-light, #f3f4f6);
  }

  .template-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .template-header h4 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary, #1f2937);
  }

  .template-category {
    background: var(--primary-light, #eff6ff);
    color: var(--primary-color, #3b82f6);
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .template-description {
    color: var(--text-secondary, #6b7280);
    line-height: 1.5;
    margin-bottom: 1rem;
  }

  .template-stats {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
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
    color: var(--text-primary, #374151);
  }

  .char-count {
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
  }

  .char-count.warning {
    color: var(--warning-color, #f59e0b);
  }

  .form-input, .form-textarea {
    width: 100%;
    padding: 0.875rem;
    border: 1px solid var(--border-color, #d1d5db);
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s, box-shadow 0.2s;
    background: white;
  }

  .form-input:focus, .form-textarea:focus {
    outline: none;
    border-color: var(--primary-color, #3b82f6);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-input.invalid {
    border-color: var(--error-color, #ef4444);
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
  }

  .cloning-options {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .option-group {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .option-group.disabled {
    opacity: 0.6;
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

  .settings-preview, .items-selection {
    margin-left: 2rem;
    padding: 1rem;
    background: white;
    border-radius: 8px;
    border: 1px solid var(--border-light, #f3f4f6);
  }

  .settings-preview h4 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary, #374151);
  }

  .settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
  }

  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: var(--surface-secondary, #f9fafb);
    border-radius: 6px;
  }

  .setting-name {
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
  }

  .setting-value {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary, #1f2937);
  }

  .selection-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-light, #f3f4f6);
  }

  .control-btn {
    background: var(--primary-light, #eff6ff);
    color: var(--primary-color, #3b82f6);
    border: 1px solid var(--primary-color, #3b82f6);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .control-btn:hover {
    background: var(--primary-color, #3b82f6);
    color: white;
  }

  .selection-count {
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
    font-weight: 500;
  }

  .items-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .item-checkbox {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    cursor: pointer;
    padding: 0.75rem;
    border-radius: 6px;
    transition: background-color 0.2s;
    border: 1px solid var(--border-light, #f3f4f6);
  }

  .item-checkbox:hover {
    background: var(--hover-bg, #f9fafb);
  }

  .item-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
  }

  .item-title {
    font-weight: 500;
    color: var(--text-primary, #374151);
  }

  .item-description {
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
  }

  .item-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .item-tag {
    background: var(--tag-bg, #f3f4f6);
    color: var(--tag-text, #374151);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .item-priority {
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
  }

  .priority-high {
    color: var(--error-color, #ef4444);
  }

  .priority-medium {
    color: var(--warning-color, #f59e0b);
  }

  .priority-low {
    color: var(--success-color, #22c55e);
  }

  .room-details {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
  }

  .clone-preview {
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

  .interface-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    padding-top: 2rem;
    border-top: 2px solid var(--border-light, #f3f4f6);
  }

  .btn {
    padding: 1rem 2rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 180px;
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
    .cloning-interface {
      padding: 1.5rem;
      margin: 0 1rem;
    }

    .settings-grid {
      grid-template-columns: 1fr;
    }

    .template-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .template-stats {
      flex-direction: column;
      gap: 0.25rem;
    }

    .selection-controls {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .interface-actions {
      flex-direction: column;
    }

    .items-selection {
      margin-left: 0;
    }
  }
</style>