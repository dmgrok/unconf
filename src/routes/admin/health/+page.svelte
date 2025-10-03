<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface HealthMetric {
		name: string;
		value: number;
		unit: string;
		status: 'healthy' | 'warning' | 'critical';
		threshold: {
			warning: number;
			critical: number;
		};
		lastUpdated: string;
	}

	interface ComponentHealth {
		name: string;
		status: 'healthy' | 'degraded' | 'critical' | 'unknown';
		uptime: number;
		responseTime: number;
		errorRate: number;
		lastCheck: string;
		issues: string[];
		metrics: Record<string, any>;
	}

	interface HealthData {
		overall: 'healthy' | 'degraded' | 'critical';
		components: Record<string, ComponentHealth>;
		metrics: {
			system: HealthMetric[];
			database: HealthMetric[];
			websocket: HealthMetric[];
			api: HealthMetric[];
		};
		alerts: Alert[];
		timestamp: string;
	}

	interface Alert {
		id: string;
		severity: 'info' | 'warning' | 'error' | 'critical';
		component: string;
		message: string;
		timestamp: string;
		acknowledged: boolean;
	}

	let healthData: HealthData | null = null;
	let loading = true;
	let error = '';
	let refreshInterval: number;
	let autoRefresh = true;
	let selectedComponent: string | null = null;

	onMount(() => {
		fetchHealthData();
		if (autoRefresh) {
			refreshInterval = setInterval(fetchHealthData, 10000); // Every 10 seconds
		}
	});

	onDestroy(() => {
		if (refreshInterval) {
			clearInterval(refreshInterval);
		}
	});

	async function fetchHealthData() {
		try {
			const response = await fetch('/api/admin/health');
			const result = await response.json();

			if (result.success) {
				healthData = result.data;
				error = '';
			} else {
				error = result.error || 'Failed to fetch health data';
			}
		} catch (err) {
			error = 'Network error: ' + (err instanceof Error ? err.message : String(err));
		} finally {
			loading = false;
		}
	}

	async function acknowledgeAlert(alertId: string) {
		try {
			const response = await fetch('/api/admin/health', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'acknowledge_alert', alertId })
			});

			const result = await response.json();
			if (result.success) {
				await fetchHealthData();
			} else {
				alert('Failed to acknowledge alert: ' + result.error);
			}
		} catch (err) {
			alert('Error acknowledging alert: ' + (err instanceof Error ? err.message : String(err)));
		}
	}

	function toggleAutoRefresh() {
		autoRefresh = !autoRefresh;
		if (autoRefresh) {
			refreshInterval = setInterval(fetchHealthData, 10000);
		} else if (refreshInterval) {
			clearInterval(refreshInterval);
		}
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'healthy':
				return 'bg-green-100 text-green-800 border-green-200';
			case 'degraded':
			case 'warning':
				return 'bg-yellow-100 text-yellow-800 border-yellow-200';
			case 'critical':
			case 'error':
				return 'bg-red-100 text-red-800 border-red-200';
			default:
				return 'bg-gray-100 text-gray-800 border-gray-200';
		}
	}

	function getSeverityColor(severity: string): string {
		switch (severity) {
			case 'info':
				return 'bg-blue-100 text-blue-800';
			case 'warning':
				return 'bg-yellow-100 text-yellow-800';
			case 'error':
				return 'bg-orange-100 text-orange-800';
			case 'critical':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	function formatDateTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleString();
	}

	function formatUptime(seconds: number): string {
		const days = Math.floor(seconds / 86400);
		const hours = Math.floor((seconds % 86400) / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		return `${days}d ${hours}h ${minutes}m`;
	}
</script>

<svelte:head>
	<title>Platform Health Monitoring - UnConf Admin</title>
	<meta name="description" content="Real-time platform health and performance monitoring" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex justify-between items-center">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Platform Health Monitoring</h1>
					<p class="mt-2 text-sm text-gray-600">
						Real-time metrics and system health monitoring
					</p>
				</div>
				<div class="flex items-center space-x-4">
					<label class="flex items-center space-x-2">
						<input type="checkbox" checked={autoRefresh} on:change={toggleAutoRefresh} class="rounded" />
						<span class="text-sm text-gray-700">Auto-refresh (10s)</span>
					</label>
					<button
						on:click={fetchHealthData}
						class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
						disabled={loading}
					>
						{loading ? 'Refreshing...' : 'Refresh'}
					</button>
				</div>
			</div>
		</div>

		{#if error}
			<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
				<strong>Error:</strong>
				{error}
			</div>
		{/if}

		{#if loading && !healthData}
			<div class="flex justify-center items-center h-64">
				<div class="text-lg text-gray-600">Loading health data...</div>
			</div>
		{:else if healthData}
			<!-- Overall Status -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-2xl font-semibold mb-2">System Status</h2>
						<p class="text-sm text-gray-600">Last updated: {formatDateTime(healthData.timestamp)}</p>
					</div>
					<div>
						<span
							class="px-6 py-3 inline-flex text-lg leading-5 font-semibold rounded-full border {getStatusColor(
								healthData.overall
							)}"
						>
							{healthData.overall.toUpperCase()}
						</span>
					</div>
				</div>
			</div>

			<!-- Alerts -->
			{#if healthData.alerts && healthData.alerts.length > 0}
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
					<div class="px-6 py-4 border-b border-gray-200">
						<h2 class="text-xl font-semibold">Active Alerts ({healthData.alerts.length})</h2>
					</div>
					<div class="divide-y divide-gray-200">
						{#each healthData.alerts as alert}
							<div class="px-6 py-4 flex items-center justify-between">
								<div class="flex-1">
									<div class="flex items-center space-x-3">
										<span
											class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full {getSeverityColor(
												alert.severity
											)}"
										>
											{alert.severity}
										</span>
										<span class="text-sm font-medium text-gray-900">{alert.component}</span>
									</div>
									<p class="mt-2 text-sm text-gray-600">{alert.message}</p>
									<p class="mt-1 text-xs text-gray-500">{formatDateTime(alert.timestamp)}</p>
								</div>
								{#if !alert.acknowledged}
									<button
										on:click={() => acknowledgeAlert(alert.id)}
										class="ml-4 px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
									>
										Acknowledge
									</button>
								{:else}
									<span class="ml-4 text-sm text-gray-500">Acknowledged</span>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Component Health -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
				<div class="px-6 py-4 border-b border-gray-200">
					<h2 class="text-xl font-semibold">Component Health</h2>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
					{#each Object.entries(healthData.components) as [name, component]}
						<div
							class="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
							on:click={() => (selectedComponent = name)}
						>
							<div class="flex items-center justify-between mb-3">
								<h3 class="font-semibold text-gray-900">{name}</h3>
								<span
									class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border {getStatusColor(
										component.status
									)}"
								>
									{component.status}
								</span>
							</div>
							<div class="space-y-2 text-sm">
								<div class="flex justify-between">
									<span class="text-gray-600">Uptime:</span>
									<span class="font-medium">{formatUptime(component.uptime)}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-600">Response Time:</span>
									<span class="font-medium">{component.responseTime}ms</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-600">Error Rate:</span>
									<span class="font-medium">{component.errorRate.toFixed(2)}%</span>
								</div>
							</div>
							{#if component.issues.length > 0}
								<div class="mt-3 pt-3 border-t border-gray-200">
									<p class="text-xs text-red-600 font-medium">
										{component.issues.length} issue(s)
									</p>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Metrics -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<!-- System Metrics -->
				<div class="bg-white rounded-lg shadow-sm border border-gray-200">
					<div class="px-6 py-4 border-b border-gray-200">
						<h2 class="text-xl font-semibold">System Metrics</h2>
					</div>
					<div class="p-6 space-y-4">
						{#each healthData.metrics.system as metric}
							<div>
								<div class="flex justify-between items-center mb-2">
									<span class="text-sm font-medium text-gray-700">{metric.name}</span>
									<span
										class="px-2 py-1 text-xs font-semibold rounded-full {getStatusColor(
											metric.status
										)}"
									>
										{metric.value}
										{metric.unit}
									</span>
								</div>
								<div class="w-full bg-gray-200 rounded-full h-2">
									<div
										class="h-2 rounded-full {metric.status === 'healthy'
											? 'bg-green-500'
											: metric.status === 'warning'
												? 'bg-yellow-500'
												: 'bg-red-500'}"
										style="width: {Math.min((metric.value / metric.threshold.critical) * 100, 100)}%"
									></div>
								</div>
								<div class="flex justify-between text-xs text-gray-500 mt-1">
									<span>Warning: {metric.threshold.warning}{metric.unit}</span>
									<span>Critical: {metric.threshold.critical}{metric.unit}</span>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Database Metrics -->
				<div class="bg-white rounded-lg shadow-sm border border-gray-200">
					<div class="px-6 py-4 border-b border-gray-200">
						<h2 class="text-xl font-semibold">Database Metrics</h2>
					</div>
					<div class="p-6 space-y-4">
						{#each healthData.metrics.database as metric}
							<div>
								<div class="flex justify-between items-center mb-2">
									<span class="text-sm font-medium text-gray-700">{metric.name}</span>
									<span
										class="px-2 py-1 text-xs font-semibold rounded-full {getStatusColor(
											metric.status
										)}"
									>
										{metric.value}
										{metric.unit}
									</span>
								</div>
								<div class="w-full bg-gray-200 rounded-full h-2">
									<div
										class="h-2 rounded-full {metric.status === 'healthy'
											? 'bg-green-500'
											: metric.status === 'warning'
												? 'bg-yellow-500'
												: 'bg-red-500'}"
										style="width: {Math.min((metric.value / metric.threshold.critical) * 100, 100)}%"
									></div>
								</div>
								<div class="flex justify-between text-xs text-gray-500 mt-1">
									<span>Warning: {metric.threshold.warning}{metric.unit}</span>
									<span>Critical: {metric.threshold.critical}{metric.unit}</span>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- WebSocket Metrics -->
				<div class="bg-white rounded-lg shadow-sm border border-gray-200">
					<div class="px-6 py-4 border-b border-gray-200">
						<h2 class="text-xl font-semibold">WebSocket Metrics</h2>
					</div>
					<div class="p-6 space-y-4">
						{#each healthData.metrics.websocket as metric}
							<div>
								<div class="flex justify-between items-center mb-2">
									<span class="text-sm font-medium text-gray-700">{metric.name}</span>
									<span
										class="px-2 py-1 text-xs font-semibold rounded-full {getStatusColor(
											metric.status
										)}"
									>
										{metric.value}
										{metric.unit}
									</span>
								</div>
								<div class="w-full bg-gray-200 rounded-full h-2">
									<div
										class="h-2 rounded-full {metric.status === 'healthy'
											? 'bg-green-500'
											: metric.status === 'warning'
												? 'bg-yellow-500'
												: 'bg-red-500'}"
										style="width: {Math.min((metric.value / metric.threshold.critical) * 100, 100)}%"
									></div>
								</div>
								<div class="flex justify-between text-xs text-gray-500 mt-1">
									<span>Warning: {metric.threshold.warning}{metric.unit}</span>
									<span>Critical: {metric.threshold.critical}{metric.unit}</span>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- API Metrics -->
				<div class="bg-white rounded-lg shadow-sm border border-gray-200">
					<div class="px-6 py-4 border-b border-gray-200">
						<h2 class="text-xl font-semibold">API Metrics</h2>
					</div>
					<div class="p-6 space-y-4">
						{#each healthData.metrics.api as metric}
							<div>
								<div class="flex justify-between items-center mb-2">
									<span class="text-sm font-medium text-gray-700">{metric.name}</span>
									<span
										class="px-2 py-1 text-xs font-semibold rounded-full {getStatusColor(
											metric.status
										)}"
									>
										{metric.value}
										{metric.unit}
									</span>
								</div>
								<div class="w-full bg-gray-200 rounded-full h-2">
									<div
										class="h-2 rounded-full {metric.status === 'healthy'
											? 'bg-green-500'
											: metric.status === 'warning'
												? 'bg-yellow-500'
												: 'bg-red-500'}"
										style="width: {Math.min((metric.value / metric.threshold.critical) * 100, 100)}%"
									></div>
								</div>
								<div class="flex justify-between text-xs text-gray-500 mt-1">
									<span>Warning: {metric.threshold.warning}{metric.unit}</span>
									<span>Critical: {metric.threshold.critical}{metric.unit}</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Component Detail Modal -->
{#if selectedComponent && healthData}
	{@const component = healthData.components[selectedComponent]}
	<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
		<div class="relative top-20 mx-auto p-5 border w-5/6 max-w-2xl shadow-lg rounded-md bg-white">
			<div class="mt-3">
				<div class="flex justify-between items-center mb-4">
					<h3 class="text-lg font-medium leading-6 text-gray-900">{selectedComponent} Details</h3>
					<button
						on:click={() => (selectedComponent = null)}
						class="text-gray-400 hover:text-gray-600"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<div class="space-y-4">
					<div class="flex items-center justify-between p-4 bg-gray-50 rounded">
						<span class="font-medium">Status:</span>
						<span
							class="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full border {getStatusColor(
								component.status
							)}"
						>
							{component.status}
						</span>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div class="p-4 bg-gray-50 rounded">
							<div class="text-sm text-gray-600">Uptime</div>
							<div class="text-lg font-semibold">{formatUptime(component.uptime)}</div>
						</div>
						<div class="p-4 bg-gray-50 rounded">
							<div class="text-sm text-gray-600">Response Time</div>
							<div class="text-lg font-semibold">{component.responseTime}ms</div>
						</div>
						<div class="p-4 bg-gray-50 rounded">
							<div class="text-sm text-gray-600">Error Rate</div>
							<div class="text-lg font-semibold">{component.errorRate.toFixed(2)}%</div>
						</div>
						<div class="p-4 bg-gray-50 rounded">
							<div class="text-sm text-gray-600">Last Check</div>
							<div class="text-sm font-semibold">{formatDateTime(component.lastCheck)}</div>
						</div>
					</div>

					{#if component.issues.length > 0}
						<div>
							<h4 class="font-medium mb-2">Issues:</h4>
							<ul class="list-disc list-inside space-y-1">
								{#each component.issues as issue}
									<li class="text-sm text-red-600">{issue}</li>
								{/each}
							</ul>
						</div>
					{/if}

					{#if Object.keys(component.metrics).length > 0}
						<div>
							<h4 class="font-medium mb-2">Additional Metrics:</h4>
							<div class="bg-gray-50 rounded p-4">
								<pre class="text-xs">{JSON.stringify(component.metrics, null, 2)}</pre>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}
</style>
