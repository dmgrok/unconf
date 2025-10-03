<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface EventSnapshot {
		id: string;
		title: string;
		status: string;
		concurrentUsers: number;
		currentActivity?: string;
		errorCount: number;
		lastActivity: string;
		health: 'healthy' | 'degraded' | 'critical';
	}

	interface PlatformData {
		platform: {
			totalEvents: number;
			activeEvents: number;
			totalUsers: number;
			concurrentUsers: number;
			eventStatuses: {
				draft: number;
				active: number;
				paused: number;
				completed: number;
			};
		};
		events: EventSnapshot[];
		systemHealth: {
			overall: string;
			components: Record<
				string,
				{ status: string; metrics: any; lastCheck: string; issues: string[] }
			>;
		};
		errorRates: {
			overall: number;
			byEvent: Record<string, number>;
		};
		timestamp: string;
	}

	let dashboardData: PlatformData | null = null;
	let loading = true;
	let error = '';
	let refreshInterval: number;
	let selectedEvent: EventSnapshot | null = null;

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
			const response = await fetch('/api/admin/dashboard');
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

	async function suspendEvent(eventId: string) {
		if (!confirm('Are you sure you want to suspend this event?')) {
			return;
		}

		try {
			const response = await fetch('/api/admin/dashboard', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'suspend_event', eventId })
			});

			const result = await response.json();
			if (result.success) {
				await fetchDashboardData(); // Refresh data
				alert('Event suspended successfully');
			} else {
				alert('Failed to suspend event: ' + result.error);
			}
		} catch (err) {
			alert('Error suspending event: ' + (err instanceof Error ? err.message : String(err)));
		}
	}

	async function resumeEvent(eventId: string) {
		if (!confirm('Are you sure you want to resume this event?')) {
			return;
		}

		try {
			const response = await fetch('/api/admin/dashboard', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'resume_event', eventId })
			});

			const result = await response.json();
			if (result.success) {
				await fetchDashboardData(); // Refresh data
				alert('Event resumed successfully');
			} else {
				alert('Failed to resume event: ' + result.error);
			}
		} catch (err) {
			alert('Error resuming event: ' + (err instanceof Error ? err.message : String(err)));
		}
	}

	function getHealthColor(status: string): string {
		switch (status) {
			case 'healthy':
				return 'bg-green-100 text-green-800 border-green-200';
			case 'degraded':
				return 'bg-yellow-100 text-yellow-800 border-yellow-200';
			case 'critical':
				return 'bg-red-100 text-red-800 border-red-200';
			default:
				return 'bg-gray-100 text-gray-800 border-gray-200';
		}
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'active':
				return 'bg-green-100 text-green-800';
			case 'draft':
				return 'bg-gray-100 text-gray-800';
			case 'paused':
				return 'bg-yellow-100 text-yellow-800';
			case 'completed':
				return 'bg-blue-100 text-blue-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	function formatDateTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleString();
	}

	function selectEvent(event: EventSnapshot) {
		selectedEvent = selectedEvent?.id === event.id ? null : event;
	}
</script>

<svelte:head>
	<title>Admin Platform Dashboard - UnConf</title>
	<meta name="description" content="Platform-wide monitoring and management dashboard" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex justify-between items-center">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Admin Platform Dashboard</h1>
					<p class="mt-2 text-sm text-gray-600">
						Cross-event monitoring and platform management
					</p>
				</div>
				<div class="flex items-center space-x-4">
					<button
						on:click={fetchDashboardData}
						class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
						disabled={loading}
					>
						{loading ? 'Refreshing...' : 'Refresh'}
					</button>
					<div class="text-sm text-gray-500">Auto-refresh: 30s</div>
				</div>
			</div>
		</div>

		{#if error}
			<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
				<strong>Error:</strong>
				{error}
			</div>
		{/if}

		{#if loading && !dashboardData}
			<div class="flex justify-center items-center h-64">
				<div class="text-lg text-gray-600">Loading platform data...</div>
			</div>
		{:else if dashboardData}
			<!-- Platform Overview Cards -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-gray-600">Total Events</p>
							<p class="text-3xl font-bold text-gray-900">
								{dashboardData.platform.totalEvents}
							</p>
						</div>
						<div class="p-3 bg-blue-100 rounded-lg">
							<svg
								class="w-8 h-8 text-blue-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
								/>
							</svg>
						</div>
					</div>
					<div class="mt-4 text-sm text-gray-600">
						{dashboardData.platform.activeEvents} active
					</div>
				</div>

				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-gray-600">Concurrent Users</p>
							<p class="text-3xl font-bold text-gray-900">
								{dashboardData.platform.concurrentUsers}
							</p>
						</div>
						<div class="p-3 bg-green-100 rounded-lg">
							<svg
								class="w-8 h-8 text-green-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
								/>
							</svg>
						</div>
					</div>
					<div class="mt-4 text-sm text-gray-600">
						{dashboardData.platform.totalUsers} total users
					</div>
				</div>

				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-gray-600">System Health</p>
							<p class="text-3xl font-bold capitalize {dashboardData.systemHealth.overall ===
							'healthy'
								? 'text-green-600'
								: dashboardData.systemHealth.overall === 'degraded'
									? 'text-yellow-600'
									: 'text-red-600'}">
								{dashboardData.systemHealth.overall}
							</p>
						</div>
						<div
							class="p-3 rounded-lg {dashboardData.systemHealth.overall === 'healthy'
								? 'bg-green-100'
								: dashboardData.systemHealth.overall === 'degraded'
									? 'bg-yellow-100'
									: 'bg-red-100'}"
						>
							<svg
								class="w-8 h-8 {dashboardData.systemHealth.overall === 'healthy'
									? 'text-green-600'
									: dashboardData.systemHealth.overall === 'degraded'
										? 'text-yellow-600'
										: 'text-red-600'}"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
					</div>
					<div class="mt-4 text-sm text-gray-600">All systems monitored</div>
				</div>

				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-gray-600">Error Rate</p>
							<p class="text-3xl font-bold text-gray-900">
								{dashboardData.errorRates.overall.toFixed(1)}
							</p>
						</div>
						<div class="p-3 bg-purple-100 rounded-lg">
							<svg
								class="w-8 h-8 text-purple-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
								/>
							</svg>
						</div>
					</div>
					<div class="mt-4 text-sm text-gray-600">errors per event</div>
				</div>
			</div>

			<!-- Event Status Distribution -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
				<h2 class="text-xl font-semibold mb-4">Event Status Distribution</h2>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div class="text-center p-4 bg-green-50 rounded-lg">
						<div class="text-3xl font-bold text-green-600">
							{dashboardData.platform.eventStatuses.active}
						</div>
						<div class="text-sm text-gray-600 mt-1">Active</div>
					</div>
					<div class="text-center p-4 bg-gray-50 rounded-lg">
						<div class="text-3xl font-bold text-gray-600">
							{dashboardData.platform.eventStatuses.draft}
						</div>
						<div class="text-sm text-gray-600 mt-1">Draft</div>
					</div>
					<div class="text-center p-4 bg-yellow-50 rounded-lg">
						<div class="text-3xl font-bold text-yellow-600">
							{dashboardData.platform.eventStatuses.paused}
						</div>
						<div class="text-sm text-gray-600 mt-1">Paused</div>
					</div>
					<div class="text-center p-4 bg-blue-50 rounded-lg">
						<div class="text-3xl font-bold text-blue-600">
							{dashboardData.platform.eventStatuses.completed}
						</div>
						<div class="text-sm text-gray-600 mt-1">Completed</div>
					</div>
				</div>
			</div>

			<!-- Events Table -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
				<div class="px-6 py-4 border-b border-gray-200">
					<h2 class="text-xl font-semibold">Event Overview</h2>
				</div>
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Event
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Status
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Users
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Activity
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Health
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Errors
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Actions
								</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each dashboardData.events as event}
								<tr
									class="hover:bg-gray-50 cursor-pointer"
									on:click={() => selectEvent(event)}
								>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="text-sm font-medium text-gray-900">{event.title}</div>
										<div class="text-sm text-gray-500">{event.id.substring(0, 8)}</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<span
											class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full {getStatusColor(
												event.status
											)}"
										>
											{event.status}
										</span>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										{event.concurrentUsers}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										{event.currentActivity || 'None'}
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<span
											class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border {getHealthColor(
												event.health
											)}"
										>
											{event.health}
										</span>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										{event.errorCount}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
										{#if event.status === 'active'}
											<button
												on:click|stopPropagation={() => suspendEvent(event.id)}
												class="text-yellow-600 hover:text-yellow-900"
											>
												Suspend
											</button>
										{:else if event.status === 'paused'}
											<button
												on:click|stopPropagation={() => resumeEvent(event.id)}
												class="text-green-600 hover:text-green-900"
											>
												Resume
											</button>
										{/if}
										<a href="/events/{event.id}" class="text-blue-600 hover:text-blue-900">
											View
										</a>
									</td>
								</tr>
								{#if selectedEvent?.id === event.id}
									<tr>
										<td colspan="7" class="px-6 py-4 bg-gray-50">
											<div class="space-y-2 text-sm">
												<div>
													<span class="font-medium">Last Activity:</span>
													{formatDateTime(event.lastActivity)}
												</div>
												{#if event.currentActivity}
													<div>
														<span class="font-medium">Current Activity:</span>
														{event.currentActivity}
													</div>
												{/if}
												<div>
													<span class="font-medium">Error Count:</span>
													{event.errorCount} errors
												</div>
											</div>
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<!-- Last Updated -->
			<div class="mt-6 text-center text-sm text-gray-500">
				Last updated: {formatDateTime(dashboardData.timestamp)}
			</div>
		{/if}
	</div>
</div>

<style>
	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}
</style>
