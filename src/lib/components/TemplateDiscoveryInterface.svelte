<!--
  Template Discovery Interface Component
  Comprehensive template browsing with search, filtering, and discovery
-->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { TemplateCategory } from '../../types/enums';
  import type { EventTemplate } from '../../types/entities';
  import TemplatePreviewModal from './TemplatePreviewModal.svelte';

  export let currentUserId: string;
  export let showMyTemplatesOnly: boolean = false;
  export let initialCategory: TemplateCategory | null = null;

  const dispatch = createEventDispatcher();

  interface SearchFilters {
    query: string;
    categories: TemplateCategory[];
    creator: string;
    tags: string[];
    minUsageCount: number | null;
    maxUsageCount: number | null;
    isPublic: boolean | null;
    includeSharedWith: boolean;
    sortBy: 'name' | 'createdAt' | 'lastUsedAt' | 'usageCount' | 'relevance';
    sortOrder: 'asc' | 'desc';
  }

  interface SearchMetadata {
    categoryStats: Record<string, number>;
    popularTags: Array<{ tag: string; count: number }>;
    totalAccessible: number;
  }

  let templates: EventTemplate[] = [];
  let filteredTemplates: EventTemplate[] = [];
  let isLoading = false;
  let error: string | null = null;
  let searchMetadata: SearchMetadata | null = null;

  // Search and filter state
  let filters: SearchFilters = {
    query: '',
    categories: initialCategory ? [initialCategory] : [],
    creator: showMyTemplatesOnly ? currentUserId : '',
    tags: [],
    minUsageCount: null,
    maxUsageCount: null,
    isPublic: null,
    includeSharedWith: true,
    sortBy: 'relevance',
    sortOrder: 'desc'
  };

  // Pagination
  let currentPage = 1;
  let pageSize = 12;
  let totalResults = 0;
  let hasMore = false;

  // UI state
  let showAdvancedFilters = false;
  let viewMode: 'grid' | 'list' = 'grid';
  let selectedTemplate: EventTemplate | null = null;
  let showPreview = false;

  // Category options with descriptions
  const categoryOptions = [
    { value: TemplateCategory.CONFERENCE, label: 'Conference', description: 'Large multi-day events with sessions' },
    { value: TemplateCategory.WORKSHOP, label: 'Workshop', description: 'Hands-on learning sessions' },
    { value: TemplateCategory.MEETING, label: 'Meeting', description: 'Team meetings and discussions' },
    { value: TemplateCategory.HACKATHON, label: 'Hackathon', description: 'Coding competitions and innovation events' },
    { value: TemplateCategory.NETWORKING, label: 'Networking', description: 'Professional networking events' },
    { value: TemplateCategory.TRAINING, label: 'Training', description: 'Educational and skill-building sessions' },
    { value: TemplateCategory.CUSTOM, label: 'Custom', description: 'Custom event types' }
  ];

  // Sort options
  const sortOptions = [
    { value: 'relevance', label: 'Most Relevant' },
    { value: 'usageCount', label: 'Most Popular' },
    { value: 'createdAt', label: 'Newest First' },
    { value: 'lastUsedAt', label: 'Recently Used' },
    { value: 'name', label: 'Name (A-Z)' }
  ];

  onMount(async () => {
    await searchTemplates();
  });

  async function searchTemplates(reset = true) {
    if (reset) {
      currentPage = 1;
      templates = [];
    }

    isLoading = true;
    error = null;

    try {
      const params = new URLSearchParams({
        userId: currentUserId,
        offset: ((currentPage - 1) * pageSize).toString(),
        limit: pageSize.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        includeShared: filters.includeSharedWith.toString()
      });

      // Add optional filters
      if (filters.query.trim()) params.set('q', filters.query.trim());
      if (filters.categories.length > 0) params.set('categories', filters.categories.join(','));
      if (filters.creator.trim()) params.set('creator', filters.creator.trim());
      if (filters.tags.length > 0) params.set('tags', filters.tags.join(','));
      if (filters.minUsageCount !== null) params.set('minUsage', filters.minUsageCount.toString());
      if (filters.maxUsageCount !== null) params.set('maxUsage', filters.maxUsageCount.toString());
      if (filters.isPublic !== null) params.set('isPublic', filters.isPublic.toString());

      const response = await fetch(`/api/templates/search?${params}`);
      const result = await response.json();

      if (result.success) {
        if (reset) {
          templates = result.templates;
        } else {
          templates = [...templates, ...result.templates];
        }

        totalResults = result.pagination.total;
        hasMore = result.pagination.hasMore;
        searchMetadata = result.metadata;

        dispatch('templatesLoaded', {
          templates: result.templates,
          total: totalResults,
          metadata: searchMetadata
        });
      } else {
        error = result.error || 'Failed to search templates';
      }
    } catch (err) {
      console.error('Error searching templates:', err);
      error = 'Failed to search templates';
    } finally {
      isLoading = false;
    }
  }

  async function loadMoreTemplates() {
    if (isLoading || !hasMore) return;
    currentPage++;
    await searchTemplates(false);
  }

  function handleFilterChange() {
    searchTemplates(true);
  }

  function toggleCategory(category: TemplateCategory) {
    if (filters.categories.includes(category)) {
      filters.categories = filters.categories.filter(c => c !== category);
    } else {
      filters.categories = [...filters.categories, category];
    }
    handleFilterChange();
  }

  function toggleTag(tag: string) {
    if (filters.tags.includes(tag)) {
      filters.tags = filters.tags.filter(t => t !== tag);
    } else {
      filters.tags = [...filters.tags, tag];
    }
    handleFilterChange();
  }

  function clearFilters() {
    filters = {
      query: '',
      categories: [],
      creator: showMyTemplatesOnly ? currentUserId : '',
      tags: [],
      minUsageCount: null,
      maxUsageCount: null,
      isPublic: null,
      includeSharedWith: true,
      sortBy: 'relevance',
      sortOrder: 'desc'
    };
    handleFilterChange();
  }

  function handleTemplateSelect(template: EventTemplate) {
    selectedTemplate = template;
    showPreview = true;
    dispatch('templateSelected', { template });
  }

  function handleTemplateUse(template: EventTemplate) {
    dispatch('templateUse', { template });
  }

  function closePreview() {
    showPreview = false;
    selectedTemplate = null;
  }

  function clearError() {
    error = null;
  }

  function formatUsageCount(count: number): string {
    if (count === 0) return 'Never used';
    if (count === 1) return 'Used once';
    return `Used ${count} times`;
  }

  function formatLastUsed(lastUsedAt?: Date): string {
    if (!lastUsedAt) return 'Never used';

    const now = new Date();
    const diffMs = now.getTime() - lastUsedAt.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Used today';
    if (diffDays === 1) return 'Used yesterday';
    if (diffDays < 7) return `Used ${diffDays} days ago`;
    if (diffDays < 30) return `Used ${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `Used ${Math.floor(diffDays / 30)} months ago`;
    return `Used ${Math.floor(diffDays / 365)} years ago`;
  }

  function getCategoryIcon(category: TemplateCategory): string {
    const icons = {
      [TemplateCategory.CONFERENCE]: '🎪',
      [TemplateCategory.WORKSHOP]: '🛠️',
      [TemplateCategory.MEETING]: '💼',
      [TemplateCategory.HACKATHON]: '💻',
      [TemplateCategory.NETWORKING]: '🤝',
      [TemplateCategory.TRAINING]: '📚',
      [TemplateCategory.CUSTOM]: '⚙️'
    };
    return icons[category] || '📄';
  }
</script>

<div class="template-discovery">
  <!-- Header -->
  <div class="discovery-header">
    <h2>Discover Templates</h2>
    <p class="subtitle">Find the perfect template for your next event</p>
  </div>

  <!-- Search Bar -->
  <div class="search-section">
    <div class="search-bar">
      <div class="search-input-wrapper">
        <input
          type="text"
          bind:value={filters.query}
          placeholder="Search templates by name, description, or tags..."
          class="search-input"
          on:input={handleFilterChange}
        />
        <span class="search-icon">🔍</span>
      </div>

      <div class="search-controls">
        <select bind:value={filters.sortBy} on:change={handleFilterChange} class="sort-select">
          {#each sortOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>

        <button
          class="view-toggle"
          class:active={viewMode === 'grid'}
          on:click={() => viewMode = 'grid'}
          title="Grid view"
        >
          ⊞
        </button>
        <button
          class="view-toggle"
          class:active={viewMode === 'list'}
          on:click={() => viewMode = 'list'}
          title="List view"
        >
          ☰
        </button>

        <button
          class="filter-toggle"
          class:active={showAdvancedFilters}
          on:click={() => showAdvancedFilters = !showAdvancedFilters}
        >
          Filters {showAdvancedFilters ? '▼' : '▶'}
        </button>
      </div>
    </div>

    <!-- Advanced Filters -->
    {#if showAdvancedFilters}
      <div class="advanced-filters">
        <!-- Category Filters -->
        <div class="filter-group">
          <h4>Categories</h4>
          <div class="category-chips">
            {#each categoryOptions as category}
              <button
                class="category-chip"
                class:active={filters.categories.includes(category.value)}
                on:click={() => toggleCategory(category.value)}
                title={category.description}
              >
                <span class="category-icon">{getCategoryIcon(category.value)}</span>
                {category.label}
                {#if searchMetadata?.categoryStats[category.value]}
                  <span class="count">({searchMetadata.categoryStats[category.value]})</span>
                {/if}
              </button>
            {/each}
          </div>
        </div>

        <!-- Popular Tags -->
        {#if searchMetadata?.popularTags && searchMetadata.popularTags.length > 0}
          <div class="filter-group">
            <h4>Popular Tags</h4>
            <div class="tag-chips">
              {#each searchMetadata.popularTags.slice(0, 10) as tagInfo}
                <button
                  class="tag-chip"
                  class:active={filters.tags.includes(tagInfo.tag)}
                  on:click={() => toggleTag(tagInfo.tag)}
                >
                  {tagInfo.tag}
                  <span class="count">({tagInfo.count})</span>
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Usage Filters -->
        <div class="filter-group">
          <h4>Usage Count</h4>
          <div class="usage-filters">
            <input
              type="number"
              bind:value={filters.minUsageCount}
              placeholder="Min"
              class="usage-input"
              on:change={handleFilterChange}
            />
            <span>to</span>
            <input
              type="number"
              bind:value={filters.maxUsageCount}
              placeholder="Max"
              class="usage-input"
              on:change={handleFilterChange}
            />
          </div>
        </div>

        <!-- Visibility Filter -->
        <div class="filter-group">
          <h4>Visibility</h4>
          <div class="visibility-filters">
            <label class="checkbox-label">
              <input
                type="radio"
                bind:group={filters.isPublic}
                value={null}
                on:change={handleFilterChange}
              />
              All Templates
            </label>
            <label class="checkbox-label">
              <input
                type="radio"
                bind:group={filters.isPublic}
                value={true}
                on:change={handleFilterChange}
              />
              Public Only
            </label>
            <label class="checkbox-label">
              <input
                type="radio"
                bind:group={filters.isPublic}
                value={false}
                on:change={handleFilterChange}
              />
              Private Only
            </label>
          </div>
        </div>

        <div class="filter-actions">
          <button class="clear-filters" on:click={clearFilters}>
            Clear All Filters
          </button>
        </div>
      </div>
    {/if}
  </div>

  <!-- Error Banner -->
  {#if error}
    <div class="error-banner">
      <span class="error-icon">⚠️</span>
      <span class="error-message">{error}</span>
      <button class="error-dismiss" on:click={clearError}>×</button>
    </div>
  {/if}

  <!-- Results Summary -->
  {#if searchMetadata}
    <div class="results-summary">
      <p>
        Showing {templates.length} of {totalResults} templates
        {#if searchMetadata.totalAccessible !== totalResults}
          ({searchMetadata.totalAccessible} total accessible)
        {/if}
      </p>
    </div>
  {/if}

  <!-- Templates Grid/List -->
  {#if isLoading && templates.length === 0}
    <div class="loading-state">
      <span class="spinner"></span>
      Loading templates...
    </div>
  {:else if templates.length === 0}
    <div class="empty-state">
      <div class="empty-icon">📋</div>
      <h3>No Templates Found</h3>
      <p>Try adjusting your search criteria or filters</p>
      <button class="btn btn-primary" on:click={clearFilters}>
        Clear Filters
      </button>
    </div>
  {:else}
    <div class="templates-container" class:grid={viewMode === 'grid'} class:list={viewMode === 'list'}>
      {#each templates as template}
        <div class="template-card" class:list-view={viewMode === 'list'}>
          <div class="template-header">
            <div class="template-category">
              <span class="category-icon">{getCategoryIcon(template.category)}</span>
              <span class="category-label">{template.category}</span>
            </div>
            <div class="template-visibility">
              {#if template.isPublic}
                <span class="public-badge">🌐 Public</span>
              {:else}
                <span class="private-badge">🔒 Private</span>
              {/if}
            </div>
          </div>

          <div class="template-content">
            <h3 class="template-title">{template.name}</h3>
            {#if template.description}
              <p class="template-description">{template.description}</p>
            {/if}

            <div class="template-meta">
              <div class="meta-item">
                <span class="meta-label">Creator:</span>
                <span class="meta-value">{template.createdBy}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Usage:</span>
                <span class="meta-value">{formatUsageCount(template.usageCount)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Last used:</span>
                <span class="meta-value">{formatLastUsed(template.lastUsedAt)}</span>
              </div>
            </div>

            {#if template.tags && template.tags.length > 0}
              <div class="template-tags">
                {#each template.tags.slice(0, 3) as tag}
                  <span class="tag">{tag}</span>
                {/each}
                {#if template.tags.length > 3}
                  <span class="tag more">+{template.tags.length - 3} more</span>
                {/if}
              </div>
            {/if}
          </div>

          <div class="template-actions">
            <button
              class="btn btn-secondary"
              on:click={() => handleTemplateSelect(template)}
            >
              Preview
            </button>
            <button
              class="btn btn-primary"
              on:click={() => handleTemplateUse(template)}
            >
              Use Template
            </button>
          </div>
        </div>
      {/each}
    </div>

    <!-- Load More -->
    {#if hasMore}
      <div class="load-more">
        <button
          class="load-more-button"
          on:click={loadMoreTemplates}
          disabled={isLoading}
        >
          {#if isLoading}
            <span class="spinner small"></span>
            Loading...
          {:else}
            Load More Templates
          {/if}
        </button>
      </div>
    {/if}
  {/if}
</div>

<!-- Template Preview Modal -->
{#if selectedTemplate}
  <TemplatePreviewModal
    template={selectedTemplate}
    bind:isVisible={showPreview}
    {currentUserId}
    on:close={closePreview}
    on:useTemplate={(e) => {
      handleTemplateUse(e.detail.template);
      closePreview();
    }}
    on:editTemplate={(e) => {
      dispatch('editTemplate', e.detail);
      closePreview();
    }}
    on:shareTemplate={(e) => {
      dispatch('shareTemplate', e.detail);
    }}
  />
{/if}

<style>
  .template-discovery {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .discovery-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .discovery-header h2 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 2rem;
    font-weight: 700;
  }

  .subtitle {
    color: var(--text-secondary, #6b7280);
    margin: 0;
    font-size: 1.125rem;
  }

  .search-section {
    background: var(--surface-color, #ffffff);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .search-bar {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .search-input-wrapper {
    position: relative;
    flex: 1;
    min-width: 300px;
  }

  .search-input {
    width: 100%;
    padding: 0.875rem 1rem 0.875rem 3rem;
    border: 1px solid var(--border-color, #d1d5db);
    border-radius: 8px;
    font-size: 1rem;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--primary-color, #3b82f6);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .search-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1.125rem;
    color: var(--text-secondary, #6b7280);
  }

  .search-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .sort-select {
    padding: 0.875rem 1rem;
    border: 1px solid var(--border-color, #d1d5db);
    border-radius: 8px;
    background: var(--surface-color, #ffffff);
    font-size: 0.875rem;
  }

  .view-toggle {
    padding: 0.875rem;
    border: 1px solid var(--border-color, #d1d5db);
    border-radius: 8px;
    background: var(--surface-color, #ffffff);
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
  }

  .view-toggle.active {
    background: var(--primary-color, #3b82f6);
    color: white;
    border-color: var(--primary-color, #3b82f6);
  }

  .filter-toggle {
    padding: 0.875rem 1rem;
    border: 1px solid var(--border-color, #d1d5db);
    border-radius: 8px;
    background: var(--surface-color, #ffffff);
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .filter-toggle.active {
    background: var(--primary-light, #dbeafe);
    border-color: var(--primary-color, #3b82f6);
  }

  .advanced-filters {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border-light, #f3f4f6);
  }

  .filter-group {
    margin-bottom: 1.5rem;
  }

  .filter-group h4 {
    margin: 0 0 0.75rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1rem;
    font-weight: 600;
  }

  .category-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .category-chip {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color, #d1d5db);
    border-radius: 20px;
    background: var(--surface-color, #ffffff);
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .category-chip.active {
    background: var(--primary-color, #3b82f6);
    color: white;
    border-color: var(--primary-color, #3b82f6);
  }

  .category-icon {
    font-size: 1rem;
  }

  .count {
    opacity: 0.7;
    font-size: 0.8rem;
  }

  .tag-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag-chip {
    padding: 0.375rem 0.75rem;
    border: 1px solid var(--border-color, #d1d5db);
    border-radius: 16px;
    background: var(--surface-color, #ffffff);
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.2s;
  }

  .tag-chip.active {
    background: var(--primary-color, #3b82f6);
    color: white;
    border-color: var(--primary-color, #3b82f6);
  }

  .usage-filters {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .usage-input {
    width: 80px;
    padding: 0.5rem;
    border: 1px solid var(--border-color, #d1d5db);
    border-radius: 6px;
    font-size: 0.875rem;
  }

  .visibility-filters {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .filter-actions {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-light, #f3f4f6);
  }

  .clear-filters {
    padding: 0.5rem 1rem;
    background: var(--error-light, #fef2f2);
    color: var(--error-color, #ef4444);
    border: 1px solid var(--error-color, #ef4444);
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .error-banner {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--error-light, #fef2f2);
    border: 1px solid var(--error-color, #ef4444);
    border-radius: 8px;
    margin-bottom: 1.5rem;
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
  }

  .results-summary {
    margin-bottom: 1.5rem;
    color: var(--text-secondary, #6b7280);
    font-size: 0.875rem;
  }

  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 3rem;
    color: var(--text-secondary, #6b7280);
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .empty-state h3 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1.25rem;
    font-weight: 600;
  }

  .empty-state p {
    color: var(--text-secondary, #6b7280);
    margin-bottom: 1.5rem;
  }

  .templates-container {
    margin-bottom: 2rem;
  }

  .templates-container.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
  }

  .templates-container.list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .template-card {
    background: var(--surface-color, #ffffff);
    border: 1px solid var(--border-light, #f3f4f6);
    border-radius: 12px;
    padding: 1.5rem;
    transition: all 0.2s;
  }

  .template-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  .template-card.list-view {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 1rem 1.5rem;
  }

  .template-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .template-category {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--text-secondary, #6b7280);
  }

  .template-visibility {
    font-size: 0.8rem;
  }

  .public-badge {
    color: var(--success-color, #22c55e);
  }

  .private-badge {
    color: var(--warning-color, #f59e0b);
  }

  .template-content {
    margin-bottom: 1.5rem;
  }

  .template-card.list-view .template-content {
    flex: 1;
    margin-bottom: 0;
  }

  .template-title {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1.125rem;
    font-weight: 600;
  }

  .template-description {
    color: var(--text-secondary, #6b7280);
    font-size: 0.875rem;
    line-height: 1.5;
    margin-bottom: 1rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .template-meta {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 1rem;
    font-size: 0.8rem;
  }

  .meta-item {
    display: flex;
    gap: 0.5rem;
  }

  .meta-label {
    color: var(--text-secondary, #6b7280);
    font-weight: 500;
  }

  .meta-value {
    color: var(--text-primary, #1f2937);
  }

  .template-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag {
    padding: 0.25rem 0.5rem;
    background: var(--bg-light, #f9fafb);
    border: 1px solid var(--border-light, #f3f4f6);
    border-radius: 12px;
    font-size: 0.75rem;
    color: var(--text-secondary, #6b7280);
  }

  .tag.more {
    background: var(--primary-light, #dbeafe);
    color: var(--primary-color, #3b82f6);
  }

  .template-actions {
    display: flex;
    gap: 0.75rem;
  }

  .load-more {
    display: flex;
    justify-content: center;
    margin-top: 2rem;
  }

  .load-more-button {
    padding: 0.875rem 1.75rem;
    background: var(--secondary-bg, #f9fafb);
    color: var(--text-primary, #374151);
    border: 1px solid var(--border-color, #d1d5db);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .load-more-button:hover:not(:disabled) {
    background: var(--secondary-hover, #f3f4f6);
  }

  .load-more-button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
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

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-light, #f3f4f6);
    border-top: 2px solid var(--primary-color, #3b82f6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .spinner.small {
    width: 16px;
    height: 16px;
    border-width: 2px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }


  @media (max-width: 768px) {
    .template-discovery {
      padding: 1rem;
    }

    .search-bar {
      flex-direction: column;
      align-items: stretch;
    }

    .search-input-wrapper {
      min-width: auto;
    }

    .search-controls {
      justify-content: space-between;
    }

    .templates-container.grid {
      grid-template-columns: 1fr;
    }

    .template-card.list-view {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }

    .category-chips,
    .tag-chips {
      justify-content: center;
    }
  }
</style>