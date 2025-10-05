<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Check, AlertTriangle, X } from 'lucide-svelte';
  import type { LifecycleMetrics, EventHealthMetrics } from '../services/eventLifecycle';

  export let refreshInterval: number = 30000; // 30 seconds

  let metrics: LifecycleMetrics | null = null;
  let eventHealths: EventHealthMetrics[] = [];
  let isLoading = true;
  let error: string | null = null;
  let refreshTimer: NodeJS.Timeout | null = null;
  let isManagerRunning = false;

  async function fetchMetrics() {
    try {
      const response = await fetch('/api/lifecycle?action=metrics');
      const data = await response.json();
      
      if (data.success) {
        metrics = data.metrics;
        isManagerRunning = data.isRunning;
        error = null;
      } else {
        error = data.error || 'Failed to fetch metrics';
      }
    } catch (err) {
      error = 'Network error while fetching metrics';
      console.error('Metrics fetch error:', err);
    }
  }

  async function fetchEventHealth(eventIds: string[]) {
    try {
      const healthPromises = eventIds.map(async eventId => {
        const response = await fetch(`/api/lifecycle?action=health&eventId=${eventId}`);
        const data = await response.json();
        return data.success ? data.health : null;
      });

      const results = await Promise.all(healthPromises);
      eventHealths = results.filter(health => health !== null);
    } catch (err) {
      console.error('Event health fetch error:', err);
    }
  }

  async function fetchAllData() {
    isLoading = true;
    await fetchMetrics();
    
    // For now, we don't have event IDs easily available
    // In a real implementation, you'd fetch active event IDs first
    eventHealths = [];
    
    isLoading = false;
  }

  async function startManager() {
    try {
      const response = await fetch('/api/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchMetrics();
      } else {
        error = data.error || 'Failed to start manager';
      }
    } catch (err) {
      error = 'Network error while starting manager';
      console.error('Start manager error:', err);
    }
  }

  async function stopManager() {
    try {
      const response = await fetch('/api/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchMetrics();
      } else {
        error = data.error || 'Failed to stop manager';
      }
    } catch (err) {
      error = 'Network error while stopping manager';
      console.error('Stop manager error:', err);
    }
  }

  async function forceProcessing() {
    try {
      const response = await fetch('/api/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'force-processing' })
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchMetrics();
      } else {
        error = data.error || 'Failed to force processing';
      }
    } catch (err) {
      error = 'Network error while forcing processing';
      console.error('Force processing error:', err);
    }
  }

  function formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  function getHealthColor(health: 'healthy' | 'warning' | 'critical'): string {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  function getHealthIcon(health: 'healthy' | 'warning' | 'critical') {
    switch (health) {
      case 'healthy': return Check;
      case 'warning': return AlertTriangle;
      case 'critical': return X;
      default: return AlertTriangle;
    }
  }

  onMount(async () => {
    await fetchAllData();
    
    // Set up periodic refresh
    refreshTimer = setInterval(fetchAllData, refreshInterval);
  });

  onDestroy(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
  });
</script>

<div class="lifecycle-dashboard">
  <div class="dashboard-header">
    <h2>Event Lifecycle Management</h2>
    <div class="dashboard-controls">
      <button 
        on:click={fetchAllData} 
        disabled={isLoading}
        class="btn btn-secondary"
      >
        {isLoading ? 'Refreshing...' : 'Refresh'}
      </button>
      
      {#if isManagerRunning}
        <button on:click={stopManager} class="btn btn-warning">Stop Manager</button>
        <button on:click={forceProcessing} class="btn btn-primary">Force Processing</button>
      {:else}
        <button on:click={startManager} class="btn btn-success">Start Manager</button>
      {/if}
    </div>
  </div>

  {#if error}
    <div class="error-banner">
      <span class="error-icon">
        <AlertTriangle size={20} />
      </span>
      {error}
    </div>
  {/if}

  {#if isLoading && !metrics}
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading lifecycle metrics...</p>
    </div>
  {:else if metrics}
    <!-- Manager Status -->
    <div class="status-card">
      <h3>Manager Status</h3>
      <div class="status-indicator">
        <span class="status-dot" class:running={isManagerRunning} class:stopped={!isManagerRunning}></span>
        <span class="status-text">
          {isManagerRunning ? 'Running' : 'Stopped'}
        </span>
      </div>
      {#if metrics.lastProcessingTime}
        <p class="last-processing">
          Last processing: {new Date(metrics.lastProcessingTime).toLocaleString()}
        </p>
      {/if}
    </div>

    <!-- Event Overview -->
    <div class="metrics-grid">
      <div class="metric-card">
        <h4>Total Events</h4>
        <div class="metric-value">{metrics.totalEvents}</div>
      </div>
      
      <div class="metric-card">
        <h4>Active Events</h4>
        <div class="metric-value active">{metrics.activeEvents}</div>
      </div>
      
      <div class="metric-card">
        <h4>Draft Events</h4>
        <div class="metric-value draft">{metrics.draftEvents}</div>
      </div>
      
      <div class="metric-card">
        <h4>Paused Events</h4>
        <div class="metric-value paused">{metrics.pausedEvents}</div>
      </div>
      
      <div class="metric-card">
        <h4>Completed Events</h4>
        <div class="metric-value completed">{metrics.completedEvents}</div>
      </div>
    </div>

    <!-- Processing Statistics -->
    <div class="stats-section">
      <h3>Processing Statistics</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">Events Processed:</span>
          <span class="stat-value">{metrics.eventsProcessed}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Transitions Executed:</span>
          <span class="stat-value">{metrics.transitionsExecuted}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Cleanup Actions:</span>
          <span class="stat-value">{metrics.cleanupActions}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Errors:</span>
          <span class="stat-value error">{metrics.errors}</span>
        </div>
      </div>
    </div>

    <!-- Event Health (if available) -->
    {#if eventHealths.length > 0}
      <div class="health-section">
        <h3>Event Health Status</h3>
        <div class="health-list">
          {#each eventHealths as health}
            <div class="health-item">
              <div class="health-header">
                <span class="health-icon {getHealthColor(health.health)}">
                  <svelte:component this={getHealthIcon(health.health)} size={20} />
                </span>
                <span class="event-id">{health.eventId}</span>
                <span class="event-status">{health.status}</span>
              </div>
              
              <div class="health-details">
                <span class="participants">{health.participantCount} participants</span>
                <span class="activities">{health.activityCount} activities</span>
                <span class="uptime">Uptime: {formatUptime(health.uptime)}</span>
              </div>
              
              {#if health.issues.length > 0}
                <div class="health-issues">
                  {#each health.issues as issue}
                    <div class="issue">{issue}</div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .lifecycle-dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid var(--border-color, #e0e0e0);
  }

  .dashboard-header h2 {
    margin: 0;
    color: var(--text-primary, #1f2937);
    font-size: 1.875rem;
    font-weight: 600;
  }

  .dashboard-controls {
    display: flex;
    gap: 0.75rem;
  }

  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--primary-color, #3b82f6);
    color: white;
  }

  .btn-secondary {
    background: var(--secondary-color, #6b7280);
    color: white;
  }

  .btn-success {
    background: #10b981;
    color: white;
  }

  .btn-warning {
    background: #f59e0b;
    color: white;
  }

  .error-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    color: #dc2626;
    margin-bottom: 1.5rem;
  }

  .error-icon {
    font-weight: bold;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 3rem;
    color: var(--text-secondary, #6b7280);
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f3f4f6;
    border-top: 3px solid var(--primary-color, #3b82f6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .status-card {
    background: var(--surface-color, #ffffff);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .status-card h3 {
    margin: 0 0 1rem 0;
    color: var(--text-primary, #1f2937);
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    transition: background-color 0.2s;
  }

  .status-dot.running {
    background: #10b981;
  }

  .status-dot.stopped {
    background: #ef4444;
  }

  .status-text {
    font-weight: 500;
    color: var(--text-primary, #1f2937);
  }

  .last-processing {
    margin: 0;
    color: var(--text-secondary, #6b7280);
    font-size: 0.875rem;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .metric-card {
    background: var(--surface-color, #ffffff);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
  }

  .metric-card h4 {
    margin: 0 0 0.5rem 0;
    color: var(--text-secondary, #6b7280);
    font-size: 0.875rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .metric-value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary, #1f2937);
  }

  .metric-value.active { color: #10b981; }
  .metric-value.draft { color: #6b7280; }
  .metric-value.paused { color: #f59e0b; }
  .metric-value.completed { color: #3b82f6; }

  .stats-section, .health-section {
    background: var(--surface-color, #ffffff);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .stats-section h3, .health-section h3 {
    margin: 0 0 1rem 0;
    color: var(--text-primary, #1f2937);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: var(--section-bg, #f9fafb);
    border-radius: 6px;
  }

  .stat-label {
    color: var(--text-secondary, #6b7280);
    font-weight: 500;
  }

  .stat-value {
    font-weight: 600;
    color: var(--text-primary, #1f2937);
  }

  .stat-value.error {
    color: #dc2626;
  }

  .health-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .health-item {
    border: 1px solid var(--border-light, #f3f4f6);
    border-radius: 6px;
    padding: 1rem;
    background: var(--section-bg, #f9fafb);
  }

  .health-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .health-icon {
    font-weight: bold;
    font-size: 1.25rem;
  }

  .event-id {
    font-weight: 600;
    color: var(--text-primary, #1f2937);
  }

  .event-status {
    padding: 0.25rem 0.5rem;
    background: var(--primary-color, #3b82f6);
    color: white;
    border-radius: 4px;
    font-size: 0.75rem;
    text-transform: uppercase;
    font-weight: 500;
  }

  .health-details {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.5rem;
    color: var(--text-secondary, #6b7280);
    font-size: 0.875rem;
  }

  .health-issues {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .issue {
    padding: 0.5rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 4px;
    color: #dc2626;
    font-size: 0.875rem;
  }
</style>