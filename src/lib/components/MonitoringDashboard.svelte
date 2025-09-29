<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  interface DashboardData {
    websocket: {
      totalConnections: number;
      activeConnections: number;
      connectionFailures: number;
      averageResponseTime: number;
      connectionQuality: string;
    };
    performance: {
      apiRequests: {
        total: number;
        successful: number;
        failed: number;
        averageResponseTime: number;
      };
    };
    health: {
      overall: string;
      components: Record<string, { status: string; metrics: any; issues: string[] }>;
    };
    alerts: Array<{
      level: string;
      message: string;
      component: string;
      timestamp: string;
    }>;
  }

  let dashboardData: DashboardData | null = null;
  let loading = true;
  let error = '';
  let refreshInterval: number;

  onMount(() => {
    fetchDashboardData();
    // Refresh every 30 seconds
    refreshInterval = setInterval(fetchDashboardData, 30000);
  });

  onDestroy(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });

  async function fetchDashboardData() {
    try {
      const response = await fetch('/api/monitoring/dashboard');
      const result = await response.json();

      if (result.success) {
        dashboardData = result.data;
        error = '';
      } else {
        error = result.error || 'Failed to fetch dashboard data';
      }
    } catch (err) {
      error = 'Network error: ' + (err instanceof Error ? err.message : String(err));
    } finally {
      loading = false;
    }
  }

  function getHealthColor(status: string): string {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  function getAlertColor(level: string): string {
    switch (level) {
      case 'warning': return 'text-yellow-800 bg-yellow-100 border-yellow-300';
      case 'critical': return 'text-red-800 bg-red-100 border-red-300';
      default: return 'text-blue-800 bg-blue-100 border-blue-300';
    }
  }
</script>

<div class="monitoring-dashboard p-6 max-w-7xl mx-auto">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-3xl font-bold text-gray-900">System Monitoring Dashboard</h1>
    <div class="flex items-center space-x-4">
      <button
        on:click={fetchDashboardData}
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        disabled={loading}
      >
        {loading ? 'Refreshing...' : 'Refresh'}
      </button>
      <div class="text-sm text-gray-500">
        Auto-refresh: 30s
      </div>
    </div>
  </div>

  {#if error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
      <strong>Error:</strong> {error}
    </div>
  {/if}

  {#if loading && !dashboardData}
    <div class="flex justify-center items-center h-64">
      <div class="text-lg text-gray-600">Loading dashboard data...</div>
    </div>
  {:else if dashboardData}
    <!-- Overall Health Status -->
    <div class="mb-8">
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 class="text-xl font-semibold mb-4">System Health</h2>
        <div class="flex items-center space-x-4">
          <div class="flex items-center">
            <span class="text-lg font-medium">Overall Status:</span>
            <span class="ml-2 px-3 py-1 rounded-full text-sm font-medium {getHealthColor(dashboardData.health.overall)}">
              {dashboardData.health.overall.toUpperCase()}
            </span>
          </div>
          <div class="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>

    <!-- Component Health Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {#each Object.entries(dashboardData.health.components) as [component, health]}
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-lg font-medium capitalize">{component}</h3>
            <span class="px-2 py-1 rounded text-xs font-medium {getHealthColor(health.status)}">
              {health.status}
            </span>
          </div>
          <div class="space-y-1 text-sm text-gray-600">
            {#if health.metrics.responseTime}
              <div>Response Time: {health.metrics.responseTime}ms</div>
            {/if}
            {#if health.metrics.connections}
              <div>Connections: {health.metrics.connections}</div>
            {/if}
            {#if health.metrics.errorRate}
              <div>Error Rate: {health.metrics.errorRate.toFixed(1)}%</div>
            {/if}
          </div>
          {#if health.issues.length > 0}
            <div class="mt-2">
              <div class="text-xs text-red-600">Issues:</div>
              {#each health.issues as issue}
                <div class="text-xs text-red-500">{issue}</div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Metrics Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      <!-- WebSocket Metrics -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 class="text-xl font-semibold mb-4">WebSocket Metrics</h3>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-blue-600">{dashboardData.websocket.activeConnections}</div>
            <div class="text-sm text-gray-600">Active Connections</div>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-green-600">{dashboardData.websocket.totalConnections}</div>
            <div class="text-sm text-gray-600">Total Connections</div>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-red-600">{dashboardData.websocket.connectionFailures}</div>
            <div class="text-sm text-gray-600">Connection Failures</div>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-purple-600">{dashboardData.websocket.averageResponseTime}ms</div>
            <div class="text-sm text-gray-600">Avg Response Time</div>
          </div>
        </div>
        <div class="mt-4 p-3 bg-blue-50 rounded-lg">
          <div class="text-sm font-medium">Connection Quality</div>
          <div class="text-lg font-bold capitalize {dashboardData.websocket.connectionQuality === 'excellent' ? 'text-green-600' :
            dashboardData.websocket.connectionQuality === 'good' ? 'text-blue-600' :
            dashboardData.websocket.connectionQuality === 'poor' ? 'text-yellow-600' : 'text-red-600'}">
            {dashboardData.websocket.connectionQuality}
          </div>
        </div>
      </div>

      <!-- API Performance Metrics -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 class="text-xl font-semibold mb-4">API Performance</h3>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-blue-600">{dashboardData.performance.apiRequests.total}</div>
            <div class="text-sm text-gray-600">Total Requests</div>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-green-600">{dashboardData.performance.apiRequests.successful}</div>
            <div class="text-sm text-gray-600">Successful</div>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-red-600">{dashboardData.performance.apiRequests.failed}</div>
            <div class="text-sm text-gray-600">Failed</div>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-purple-600">{dashboardData.performance.apiRequests.averageResponseTime}ms</div>
            <div class="text-sm text-gray-600">Avg Response Time</div>
          </div>
        </div>
        <div class="mt-4 p-3 bg-green-50 rounded-lg">
          <div class="text-sm font-medium">Success Rate</div>
          <div class="text-lg font-bold text-green-600">
            {dashboardData.performance.apiRequests.total > 0
              ? ((dashboardData.performance.apiRequests.successful / dashboardData.performance.apiRequests.total) * 100).toFixed(1)
              : 100}%
          </div>
        </div>
      </div>
    </div>

    <!-- Active Alerts -->
    {#if dashboardData.alerts.length > 0}
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 class="text-xl font-semibold mb-4">Active Alerts ({dashboardData.alerts.length})</h3>
        <div class="space-y-3">
          {#each dashboardData.alerts as alert}
            <div class="border rounded-lg p-4 {getAlertColor(alert.level)}">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <span class="font-medium">{alert.component.toUpperCase()}</span>
                  <span class="px-2 py-1 rounded text-xs font-medium bg-white">
                    {alert.level.toUpperCase()}
                  </span>
                </div>
                <div class="text-xs">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </div>
              </div>
              <div class="mt-2">{alert.message}</div>
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 class="text-xl font-semibold mb-4">Active Alerts</h3>
        <div class="text-center py-8 text-gray-500">
          <div class="text-4xl mb-2">✅</div>
          <div>No active alerts - system is running normally</div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .monitoring-dashboard {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
</style>