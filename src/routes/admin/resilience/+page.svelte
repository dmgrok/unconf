<!--
  Resilience Monitoring Dashboard
  Provides real-time monitoring and control of resilience systems
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { ConnectionStatus } from '$lib/resilience/graceful-degradation.js';
  import type { RecoveryAction, RecoveryRule } from '$lib/resilience/error-recovery.js';

  // State variables
  let connectionStatus: ConnectionStatus | null = null;
  let recoveryStatus: any = null;
  let recoveryActions: RecoveryAction[] = [];
  let recoveryRules: RecoveryRule[] = [];
  let queuedOperations: any[] = [];
  let loading = false;
  let error = '';
  let updateInterval: NodeJS.Timeout;

  // Manual operation states
  let selectedAction = '';
  let simulateErrorText = '';
  let simulateErrorContext = '';
  let manualOperationInProgress = false;

  // Auto-refresh toggle
  let autoRefresh = true;
  const refreshIntervalMs = 5000; // 5 seconds

  onMount(() => {
    loadData();
    if (autoRefresh) {
      startAutoRefresh();
    }
  });

  onDestroy(() => {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
  });

  function startAutoRefresh() {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
    updateInterval = setInterval(loadData, refreshIntervalMs);
  }

  function stopAutoRefresh() {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
  }

  $: if (autoRefresh) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }

  async function loadData() {
    if (loading) return;
    
    loading = true;
    error = '';
    
    try {
      const [statusRes, actionsRes, rulesRes, queueRes] = await Promise.all([
        fetch('/api/resilience?action=status'),
        fetch('/api/resilience?action=recovery-actions'),
        fetch('/api/resilience?action=recovery-rules'),
        fetch('/api/resilience?action=queued-operations')
      ]);

      const statusData = await statusRes.json();
      const actionsData = await actionsRes.json();
      const rulesData = await rulesRes.json();
      const queueData = await queueRes.json();

      if (statusData.success) {
        connectionStatus = statusData.data.connection;
        recoveryStatus = statusData.data.recovery;
      }

      if (actionsData.success) {
        recoveryActions = actionsData.data;
      }

      if (rulesData.success) {
        recoveryRules = rulesData.data;
      }

      if (queueData.success) {
        queuedOperations = queueData.data;
      }

    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load data';
      console.error('Error loading resilience data:', err);
    } finally {
      loading = false;
    }
  }

  async function executeAction(actionType: string, data?: any) {
    manualOperationInProgress = true;
    error = '';

    try {
      const response = await fetch(`/api/resilience?action=${actionType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: data ? JSON.stringify(data) : undefined
      });

      const result = await response.json();
      
      if (result.success) {
        await loadData(); // Refresh data
      } else {
        error = result.error || 'Operation failed';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Operation failed';
    } finally {
      manualOperationInProgress = false;
    }
  }

  function getConnectionStateColor(state: string): string {
    switch (state) {
      case 'connected': return 'text-green-600 bg-green-100';
      case 'connecting': return 'text-yellow-600 bg-yellow-100';
      case 'degraded': return 'text-orange-600 bg-orange-100';
      case 'offline': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  function getCircuitBreakerColor(state: string): string {
    switch (state) {
      case 'closed': return 'text-green-600 bg-green-100';
      case 'half-open': return 'text-yellow-600 bg-yellow-100';
      case 'open': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
</script>

<svelte:head>
  <title>Resilience Dashboard</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Resilience Dashboard</h1>
          <p class="mt-2 text-gray-600">Monitor and manage system resilience and error recovery</p>
        </div>
        
        <div class="flex items-center space-x-4">
          <label class="flex items-center space-x-2">
            <input 
              type="checkbox" 
              bind:checked={autoRefresh}
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700">Auto-refresh</span>
          </label>
          
          <button
            on:click={loadData}
            disabled={loading}
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      {#if error}
        <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div class="flex">
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Error</h3>
              <p class="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Connection Status -->
    {#if connectionStatus}
      <div class="bg-white shadow rounded-lg p-6 mb-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Connection Status</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-500">State</span>
              <span class={`px-2 py-1 text-xs font-medium rounded-full ${getConnectionStateColor(connectionStatus.state)}`}>
                {connectionStatus.state.toUpperCase()}
              </span>
            </div>
          </div>
          
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-500">Reconnect Attempts</span>
              <span class="text-sm font-bold text-gray-900">{connectionStatus.reconnectAttempts}</span>
            </div>
          </div>
          
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-500">Queued Operations</span>
              <span class="text-sm font-bold text-gray-900">{connectionStatus.queuedOperations}</span>
            </div>
          </div>
          
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-500">Offline Capability</span>
              <span class="text-sm font-bold text-gray-900">{connectionStatus.offlineCapability.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {#if connectionStatus.degradedFeatures.length > 0}
          <div class="mt-4">
            <h3 class="text-sm font-medium text-gray-700 mb-2">Degraded Features</h3>
            <div class="flex flex-wrap gap-2">
              {#each connectionStatus.degradedFeatures as feature}
                <span class="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-md">
                  {feature}
                </span>
              {/each}
            </div>
          </div>
        {/if}

        {#if connectionStatus.lastConnected}
          <div class="mt-4">
            <span class="text-sm text-gray-500">
              Last connected: {new Date(connectionStatus.lastConnected).toLocaleString()}
            </span>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Recovery Status -->
    {#if recoveryStatus}
      <div class="bg-white shadow rounded-lg p-6 mb-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Recovery Status</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-500">Auto Recovery</span>
              <span class={`px-2 py-1 text-xs font-medium rounded-full ${recoveryStatus.autoRecoveryEnabled ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}`}>
                {recoveryStatus.autoRecoveryEnabled ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>
          </div>
          
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-500">Success Rate (24h)</span>
              <span class="text-sm font-bold text-gray-900">
                {(recoveryStatus.recoveryHistory.successRate24h * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-500">Attempts (24h)</span>
              <span class="text-sm font-bold text-gray-900">{recoveryStatus.recoveryHistory.last24Hours}</span>
            </div>
          </div>
          
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-500">Attempts (1h)</span>
              <span class="text-sm font-bold text-gray-900">{recoveryStatus.recoveryHistory.lastHour}</span>
            </div>
          </div>
        </div>

        <!-- Circuit Breakers -->
        {#if recoveryStatus.circuitBreakers && recoveryStatus.circuitBreakers.length > 0}
          <div class="mb-6">
            <h3 class="text-sm font-medium text-gray-700 mb-3">Circuit Breakers</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {#each recoveryStatus.circuitBreakers as breaker}
                <div class="border border-gray-200 rounded-lg p-4">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-medium text-gray-900">{breaker.name}</span>
                    <span class={`px-2 py-1 text-xs font-medium rounded-full ${getCircuitBreakerColor(breaker.state)}`}>
                      {breaker.state.toUpperCase()}
                    </span>
                  </div>
                  <div class="text-xs text-gray-500">
                    Failures: {breaker.failureCount}/{breaker.failureThreshold}
                  </div>
                  <div class="text-xs text-gray-500">
                    Timeout: {formatDuration(breaker.timeout)}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Recent Attempts -->
        {#if recoveryStatus.recentAttempts && recoveryStatus.recentAttempts.length > 0}
          <div>
            <h3 class="text-sm font-medium text-gray-700 mb-3">Recent Recovery Attempts</h3>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  {#each recoveryStatus.recentAttempts as attempt}
                    <tr>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(attempt.timestamp).toLocaleTimeString()}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{attempt.actionId}</td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          attempt.result === 'success' ? 'bg-green-100 text-green-800' :
                          attempt.result === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {attempt.result}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDuration(attempt.duration)}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {attempt.automatic ? 'Auto' : 'Manual'}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Manual Operations -->
    <div class="bg-white shadow rounded-lg p-6 mb-6">
      <h2 class="text-lg font-medium text-gray-900 mb-4">Manual Operations</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Connection Operations -->
        <div>
          <h3 class="text-sm font-medium text-gray-700 mb-3">Connection Operations</h3>
          <div class="space-y-3">
            <button
              on:click={() => executeAction('force-reconnect')}
              disabled={manualOperationInProgress}
              class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Force Reconnection
            </button>
            
            <button
              on:click={() => executeAction('clear-queue')}
              disabled={manualOperationInProgress}
              class="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
            >
              Clear Operation Queue
            </button>
          </div>
        </div>

        <!-- Recovery Operations -->
        <div>
          <h3 class="text-sm font-medium text-gray-700 mb-3">Recovery Operations</h3>
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Recovery Action</label>
              <select 
                bind:value={selectedAction}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an action...</option>
                {#each recoveryActions as action}
                  <option value={action.id}>{action.name}</option>
                {/each}
              </select>
            </div>
            
            <button
              on:click={() => executeAction('execute-recovery', { actionId: selectedAction })}
              disabled={!selectedAction || manualOperationInProgress}
              class="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Execute Recovery Action
            </button>
            
            <button
              on:click={() => executeAction('toggle-auto-recovery', { enabled: !recoveryStatus?.autoRecoveryEnabled })}
              disabled={manualOperationInProgress}
              class="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
            >
              {recoveryStatus?.autoRecoveryEnabled ? 'Disable' : 'Enable'} Auto Recovery
            </button>
          </div>
        </div>
      </div>

      <!-- Error Simulation -->
      <div class="mt-6 pt-6 border-t border-gray-200">
        <h3 class="text-sm font-medium text-gray-700 mb-3">Error Simulation</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Error Message</label>
            <input
              type="text"
              bind:value={simulateErrorText}
              placeholder="Enter error message to simulate..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Context (JSON)</label>
            <input
              type="text"
              bind:value={simulateErrorContext}
              placeholder="JSON context (e.g. component: test)"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <button
          on:click={() => {
            let context;
            try {
              context = simulateErrorContext ? JSON.parse(simulateErrorContext) : undefined;
            } catch {
              context = { raw: simulateErrorContext };
            }
            executeAction('simulate-error', { error: simulateErrorText, context });
          }}
          disabled={!simulateErrorText || manualOperationInProgress}
          class="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          Simulate Error
        </button>
      </div>
    </div>

    <!-- Queued Operations -->
    {#if queuedOperations.length > 0}
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Queued Operations</h2>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Retries</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each queuedOperations as operation}
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {operation.id.substring(0, 8)}...
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{operation.type}</td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      operation.priority === 'high' ? 'bg-red-100 text-red-800' :
                      operation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {operation.priority}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {operation.retryCount}/{operation.maxRetries}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(operation.timestamp).toLocaleString()}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  </div>
</div>