<!--
  Alert Management Dashboard
  Provides a web interface for testing and managing the alerting system
-->

<script lang="ts">
  import { onMount } from 'svelte';

  let alertConfig: any = null;
  let alertStats: any = null;
  let testResults: any = null;
  let loading = false;
  let error = '';
  let success = '';

  // Form data
  let testAlertMessage = 'Test alert from dashboard';
  let testErrorMessage = 'Database connection failed';
  let errorCount = 3;
  let websocketFailures = 5;

  // Load data on component mount
  onMount(async () => {
    await loadConfiguration();
    await loadStats();
  });

  async function loadConfiguration() {
    try {
      loading = true;
      const response = await fetch('/api/alerting/config?action=config');
      const result = await response.json();
      if (result.success) {
        alertConfig = result.data;
      } else {
        error = 'Failed to load configuration';
      }
    } catch (err) {
      error = 'Failed to load configuration: ' + (err as Error).message;
    } finally {
      loading = false;
    }
  }

  async function loadStats() {
    try {
      const response = await fetch('/api/alerting/config?action=stats');
      const result = await response.json();
      if (result.success) {
        alertStats = result.data;
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  async function testNotificationChannels() {
    try {
      loading = true;
      success = '';
      error = '';
      
      const response = await fetch('/api/alerting/config?action=test');
      const result = await response.json();
      if (result.success) {
        testResults = result.data.testResults;
        success = 'Notification channels tested successfully';
      } else {
        error = 'Failed to test notification channels';
      }
    } catch (err) {
      error = 'Failed to test notification channels: ' + (err as Error).message;
    } finally {
      loading = false;
    }
  }

  async function triggerTestAlert() {
    try {
      loading = true;
      success = '';
      error = '';
      
      const response = await fetch('/api/alerting/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trigger-test-alert',
          message: testAlertMessage,
          severity: 'info'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        success = 'Test alert triggered successfully';
        await loadStats();
      } else {
        error = 'Failed to trigger test alert';
      }
    } catch (err) {
      error = 'Failed to trigger test alert: ' + (err as Error).message;
    } finally {
      loading = false;
    }
  }

  async function simulateWebSocketFailures() {
    try {
      loading = true;
      success = '';
      error = '';
      
      const response = await fetch('/api/alerting/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'simulate-websocket-failure',
          failures: websocketFailures
        })
      });
      
      const result = await response.json();
      if (result.success) {
        success = result.message;
        await loadStats();
      } else {
        error = 'Failed to simulate WebSocket failures';
      }
    } catch (err) {
      error = 'Failed to simulate WebSocket failures: ' + (err as Error).message;
    } finally {
      loading = false;
    }
  }

  async function simulateErrorPattern() {
    try {
      loading = true;
      success = '';
      error = '';
      
      const response = await fetch('/api/alerting/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'simulate-error-pattern',
          errorMessage: testErrorMessage,
          count: errorCount
        })
      });
      
      const result = await response.json();
      if (result.success) {
        success = result.message;
        await loadStats();
      } else {
        error = 'Failed to simulate error pattern';
      }
    } catch (err) {
      error = 'Failed to simulate error pattern: ' + (err as Error).message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="alerting-dashboard">
  <h1>🚨 Alerting System Dashboard</h1>

  {#if loading}
    <div class="loading">Loading...</div>
  {/if}

  {#if error}
    <div class="error">❌ {error}</div>
  {/if}

  {#if success}
    <div class="success">✅ {success}</div>
  {/if}

  <div class="dashboard-grid">
    <!-- Configuration Status -->
    <div class="panel">
      <h2>📋 Configuration Status</h2>
      {#if alertConfig}
        <div class="config-status">
          <div class="status-item">
            <span class="label">Alerts Enabled:</span>
            <span class="value {alertConfig.configuration.globalSettings.enabled ? 'enabled' : 'disabled'}">
              {alertConfig.configuration.globalSettings.enabled ? 'Yes' : 'No'}
            </span>
          </div>
          <div class="status-item">
            <span class="label">Email:</span>
            <span class="value {alertConfig.configuration.channels.email?.enabled ? 'enabled' : 'disabled'}">
              {alertConfig.configuration.channels.email?.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div class="status-item">
            <span class="label">Webhook:</span>
            <span class="value {alertConfig.configuration.channels.webhook?.enabled ? 'enabled' : 'disabled'}">
              {alertConfig.configuration.channels.webhook?.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div class="status-item">
            <span class="label">Active Rules:</span>
            <span class="value">{alertConfig.rules.length}</span>
          </div>
        </div>
      {/if}
    </div>

    <!-- Active Alerts -->
    <div class="panel">
      <h2>🔔 Active Alerts</h2>
      {#if alertConfig?.activeAlerts}
        {#if alertConfig.activeAlerts.length === 0}
          <p class="no-alerts">No active alerts</p>
        {:else}
          <div class="alerts-list">
            {#each alertConfig.activeAlerts as alert}
              <div class="alert-item severity-{alert.severity}">
                <div class="alert-header">
                  <span class="alert-title">{alert.title}</span>
                  <span class="alert-severity">{alert.severity}</span>
                </div>
                <div class="alert-description">{alert.description}</div>
                <div class="alert-meta">
                  <span>Component: {alert.component}</span>
                  <span>Triggered: {new Date(alert.triggeredAt).toLocaleString()}</span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    </div>

    <!-- Statistics -->
    <div class="panel">
      <h2>📊 Statistics</h2>
      {#if alertStats}
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-label">WebSocket Failures</div>
            <div class="stat-value">{alertStats.websocketStats.connectionFailures}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Recent Failure Rate</div>
            <div class="stat-value">{alertStats.websocketStats.recentFailureRate.toFixed(1)}%</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Active Alerts</div>
            <div class="stat-value">{alertStats.activeAlerts}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Error Patterns</div>
            <div class="stat-value">{Object.keys(alertStats.errorStats).length}</div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Testing Tools -->
    <div class="panel">
      <h2>🧪 Testing Tools</h2>
      
      <div class="test-section">
        <h3>Test Notification Channels</h3>
        <button on:click={testNotificationChannels} disabled={loading}>Test All Channels</button>
        {#if testResults}
          <div class="test-results">
            {#each Object.entries(testResults) as [channel, success]}
              <div class="test-result {success ? 'success' : 'failure'}">
                {channel}: {success ? '✅ Success' : '❌ Failed'}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="test-section">
        <h3>Manual Test Alert</h3>
        <input bind:value={testAlertMessage} placeholder="Test alert message" />
        <button on:click={triggerTestAlert} disabled={loading}>Trigger Test Alert</button>
      </div>

      <div class="test-section">
        <h3>Simulate WebSocket Failures</h3>
        <input type="number" bind:value={websocketFailures} min="1" max="50" />
        <button on:click={simulateWebSocketFailures} disabled={loading}>Simulate Failures</button>
      </div>

      <div class="test-section">
        <h3>Simulate Error Pattern</h3>
        <input bind:value={testErrorMessage} placeholder="Error message pattern" />
        <input type="number" bind:value={errorCount} min="1" max="20" />
        <button on:click={simulateErrorPattern} disabled={loading}>Simulate Errors</button>
      </div>
    </div>
  </div>
</div>

<style>
  .alerting-dashboard {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  h1 {
    text-align: center;
    margin-bottom: 2rem;
    color: #333;
  }

  .loading, .error, .success {
    padding: 1rem;
    margin: 1rem 0;
    border-radius: 4px;
    text-align: center;
  }

  .error {
    background: #fee;
    color: #c33;
    border: 1px solid #fcc;
  }

  .success {
    background: #efe;
    color: #393;
    border: 1px solid #cfc;
  }

  .loading {
    background: #eef;
    color: #33c;
    border: 1px solid #ccf;
  }

  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 2rem;
  }

  .panel {
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .panel h2 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #555;
  }

  .config-status {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .status-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid #eee;
  }

  .label {
    font-weight: 500;
  }

  .value {
    font-weight: bold;
  }

  .value.enabled {
    color: #28a745;
  }

  .value.disabled {
    color: #dc3545;
  }

  .no-alerts {
    color: #666;
    font-style: italic;
    text-align: center;
    margin: 2rem 0;
  }

  .alerts-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .alert-item {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 1rem;
  }

  .alert-item.severity-critical {
    border-left: 4px solid #dc3545;
    background: #fff5f5;
  }

  .alert-item.severity-warning {
    border-left: 4px solid #ffc107;
    background: #fffef5;
  }

  .alert-item.severity-info {
    border-left: 4px solid #17a2b8;
    background: #f5feff;
  }

  .alert-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .alert-title {
    font-weight: bold;
  }

  .alert-severity {
    background: #6c757d;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    text-transform: uppercase;
  }

  .alert-description {
    margin-bottom: 0.5rem;
    color: #666;
  }

  .alert-meta {
    font-size: 0.9rem;
    color: #888;
    margin-bottom: 1rem;
  }

  .alert-meta span {
    display: block;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .stat-item {
    text-align: center;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 4px;
  }

  .stat-label {
    font-size: 0.9rem;
    color: #666;
    margin-bottom: 0.5rem;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #333;
  }

  .test-section {
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #eee;
  }

  .test-section:last-child {
    border-bottom: none;
  }

  .test-section h3 {
    margin-bottom: 1rem;
    color: #666;
  }

  .test-section input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-bottom: 0.5rem;
  }

  .test-section button {
    width: 100%;
    padding: 0.75rem;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
  }

  .test-section button:hover:not(:disabled) {
    background: #0056b3;
  }

  .test-section button:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }

  .test-results {
    margin-top: 1rem;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 4px;
  }

  .test-result {
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    border-radius: 4px;
  }

  .test-result.success {
    background: #d4edda;
    color: #155724;
  }

  .test-result.failure {
    background: #f8d7da;
    color: #721c24;
  }
</style>