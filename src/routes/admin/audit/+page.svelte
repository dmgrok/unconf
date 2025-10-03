<script lang="ts">
	import { onMount } from 'svelte';

	interface AuditLogEntry {
		id: string;
		userId?: string;
		userName?: string;
		eventId?: string;
		eventName?: string;
		action: string;
		entityType: string;
		entityId: string;
		success: boolean;
		ipAddress?: string;
		userAgent?: string;
		metadata?: Record<string, any>;
		createdAt: string;
	}

	let auditLogs: AuditLogEntry[] = [];
	let loading = true;
	let error = '';
	let searchQuery = '';
	let filterAction = '';
	let filterEntityType = '';
	let filterUser = '';
	let filterDateFrom = '';
	let filterDateTo = '';
	let selectedLog: AuditLogEntry | null = null;
	let showDetailModal = false;
	let currentPage = 1;
	let pageSize = 50;
	let totalLogs = 0;

	const actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VOTE', 'ACTIVITY_CHANGE', 'JOIN_EVENT', 'LEAVE_EVENT', 'ROLE_CHANGED'];
	const entityTypes = ['EVENT', 'USER', 'TOPIC', 'VOTE', 'ROUND', 'ROOM', 'TEAM'];

	onMount(() => {
		fetchAuditLogs();
	});

	async function fetchAuditLogs() {
		loading = true;
		try {
			const params = new URLSearchParams({
				page: currentPage.toString(),
				pageSize: pageSize.toString(),
				...(filterAction && { action: filterAction }),
				...(filterEntityType && { entityType: filterEntityType }),
				...(filterUser && { userId: filterUser }),
				...(filterDateFrom && { dateFrom: filterDateFrom }),
				...(filterDateTo && { dateTo: filterDateTo }),
				...(searchQuery && { search: searchQuery })
			});

			const response = await fetch(`/api/admin/audit?${params}`);
			const result = await response.json();

			if (result.success) {
				auditLogs = result.data.logs;
				totalLogs = result.data.total;
				error = '';
			} else {
				error = result.error || 'Failed to fetch audit logs';
			}
		} catch (err) {
			error = 'Network error: ' + (err instanceof Error ? err.message : String(err));
		} finally {
			loading = false;
		}
	}

	async function exportLogs() {
		try {
			const params = new URLSearchParams({
				export: 'true',
				...(filterAction && { action: filterAction }),
				...(filterEntityType && { entityType: filterEntityType }),
				...(filterUser && { userId: filterUser }),
				...(filterDateFrom && { dateFrom: filterDateFrom }),
				...(filterDateTo && { dateTo: filterDateTo }),
				...(searchQuery && { search: searchQuery })
			});

			const response = await fetch(`/api/admin/audit?${params}`);
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `audit-logs-${new Date().toISOString()}.csv`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (err) {
			alert('Failed to export logs: ' + (err instanceof Error ? err.message : String(err)));
		}
	}

	function applyFilters() {
		currentPage = 1;
		fetchAuditLogs();
	}

	function clearFilters() {
		searchQuery = '';
		filterAction = '';
		filterEntityType = '';
		filterUser = '';
		filterDateFrom = '';
		filterDateTo = '';
		currentPage = 1;
		fetchAuditLogs();
	}

	function showDetails(log: AuditLogEntry) {
		selectedLog = log;
		showDetailModal = true;
	}

	function nextPage() {
		if (currentPage * pageSize < totalLogs) {
			currentPage++;
			fetchAuditLogs();
		}
	}

	function prevPage() {
		if (currentPage > 1) {
			currentPage--;
			fetchAuditLogs();
		}
	}

	function formatDateTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleString();
	}

	function getActionColor(action: string): string {
		switch (action) {
			case 'CREATE':
				return 'bg-green-100 text-green-800';
			case 'UPDATE':
				return 'bg-blue-100 text-blue-800';
			case 'DELETE':
				return 'bg-red-100 text-red-800';
			case 'LOGIN':
			case 'LOGOUT':
				return 'bg-purple-100 text-purple-800';
			case 'ROLE_CHANGED':
				return 'bg-yellow-100 text-yellow-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	$: totalPages = Math.ceil(totalLogs / pageSize);
</script>

<svelte:head>
	<title>Audit Trail - UnConf Admin</title>
	<meta name="description" content="Comprehensive audit log viewer and compliance reporting" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex justify-between items-center">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Audit Trail</h1>
					<p class="mt-2 text-sm text-gray-600">
						Comprehensive audit log viewer and compliance reporting
					</p>
				</div>
				<div class="flex items-center space-x-4">
					<button
						on:click={exportLogs}
						class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
					>
						Export CSV
					</button>
					<button
						on:click={fetchAuditLogs}
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

		<!-- Filters -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
			<h2 class="text-lg font-semibold mb-4">Filters</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				<div>
					<label for="searchQuery" class="block text-sm font-medium text-gray-700 mb-2">
						Search
					</label>
					<input
						id="searchQuery"
						type="text"
						bind:value={searchQuery}
						placeholder="Search logs..."
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<div>
					<label for="filterAction" class="block text-sm font-medium text-gray-700 mb-2">
						Action
					</label>
					<select
						id="filterAction"
						bind:value={filterAction}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
					>
						<option value="">All Actions</option>
						{#each actions as action}
							<option value={action}>{action}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="filterEntityType" class="block text-sm font-medium text-gray-700 mb-2">
						Entity Type
					</label>
					<select
						id="filterEntityType"
						bind:value={filterEntityType}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
					>
						<option value="">All Types</option>
						{#each entityTypes as type}
							<option value={type}>{type}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="filterDateFrom" class="block text-sm font-medium text-gray-700 mb-2">
						Date From
					</label>
					<input
						id="filterDateFrom"
						type="datetime-local"
						bind:value={filterDateFrom}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<div>
					<label for="filterDateTo" class="block text-sm font-medium text-gray-700 mb-2">
						Date To
					</label>
					<input
						id="filterDateTo"
						type="datetime-local"
						bind:value={filterDateTo}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<div class="flex items-end space-x-2">
					<button
						on:click={applyFilters}
						class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					>
						Apply
					</button>
					<button
						on:click={clearFilters}
						class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
					>
						Clear
					</button>
				</div>
			</div>
		</div>

		<!-- Audit Logs Table -->
		{#if loading}
			<div class="flex justify-center items-center h-64">
				<div class="text-lg text-gray-600">Loading audit logs...</div>
			</div>
		{:else}
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
				<div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
					<h2 class="text-xl font-semibold">
						Audit Logs ({totalLogs.toLocaleString()} total)
					</h2>
					<div class="text-sm text-gray-600">
						Page {currentPage} of {totalPages}
					</div>
				</div>
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Timestamp
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									User
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Action
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Entity
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Status
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									IP Address
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Actions
								</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each auditLogs as log}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										{formatDateTime(log.createdAt)}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										{log.userName || log.userId || 'System'}
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<span
											class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full {getActionColor(
												log.action
											)}"
										>
											{log.action}
										</span>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										{log.entityType}
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<span
											class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full {log.success
												? 'bg-green-100 text-green-800'
												: 'bg-red-100 text-red-800'}"
										>
											{log.success ? 'Success' : 'Failed'}
										</span>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										{log.ipAddress || 'N/A'}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
										<button
											on:click={() => showDetails(log)}
											class="text-blue-600 hover:text-blue-900"
										>
											Details
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Pagination -->
				<div class="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
					<button
						on:click={prevPage}
						disabled={currentPage === 1}
						class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Previous
					</button>
					<span class="text-sm text-gray-600">
						Showing {(currentPage - 1) * pageSize + 1} - {Math.min(
							currentPage * pageSize,
							totalLogs
						)} of {totalLogs}
					</span>
					<button
						on:click={nextPage}
						disabled={currentPage >= totalPages}
						class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Next
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Detail Modal -->
{#if showDetailModal && selectedLog}
	<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
		<div class="relative top-20 mx-auto p-5 border w-5/6 max-w-3xl shadow-lg rounded-md bg-white">
			<div class="mt-3">
				<div class="flex justify-between items-center mb-4">
					<h3 class="text-lg font-medium leading-6 text-gray-900">Audit Log Details</h3>
					<button
						on:click={() => (showDetailModal = false)}
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
					<div class="grid grid-cols-2 gap-4">
						<div class="p-3 bg-gray-50 rounded">
							<div class="text-sm text-gray-600">Log ID</div>
							<div class="font-mono text-sm">{selectedLog.id}</div>
						</div>
						<div class="p-3 bg-gray-50 rounded">
							<div class="text-sm text-gray-600">Timestamp</div>
							<div class="text-sm">{formatDateTime(selectedLog.createdAt)}</div>
						</div>
						<div class="p-3 bg-gray-50 rounded">
							<div class="text-sm text-gray-600">User</div>
							<div class="text-sm">{selectedLog.userName || selectedLog.userId || 'System'}</div>
						</div>
						<div class="p-3 bg-gray-50 rounded">
							<div class="text-sm text-gray-600">Action</div>
							<div class="text-sm">
								<span class="px-2 py-1 rounded-full {getActionColor(selectedLog.action)}">
									{selectedLog.action}
								</span>
							</div>
						</div>
						<div class="p-3 bg-gray-50 rounded">
							<div class="text-sm text-gray-600">Entity Type</div>
							<div class="text-sm">{selectedLog.entityType}</div>
						</div>
						<div class="p-3 bg-gray-50 rounded">
							<div class="text-sm text-gray-600">Entity ID</div>
							<div class="font-mono text-sm">{selectedLog.entityId}</div>
						</div>
						<div class="p-3 bg-gray-50 rounded">
							<div class="text-sm text-gray-600">Status</div>
							<div class="text-sm">
								<span
									class="px-2 py-1 rounded-full {selectedLog.success
										? 'bg-green-100 text-green-800'
										: 'bg-red-100 text-red-800'}"
								>
									{selectedLog.success ? 'Success' : 'Failed'}
								</span>
							</div>
						</div>
						<div class="p-3 bg-gray-50 rounded">
							<div class="text-sm text-gray-600">IP Address</div>
							<div class="text-sm">{selectedLog.ipAddress || 'N/A'}</div>
						</div>
					</div>

					{#if selectedLog.userAgent}
						<div class="p-3 bg-gray-50 rounded">
							<div class="text-sm text-gray-600 mb-1">User Agent</div>
							<div class="text-xs font-mono break-all">{selectedLog.userAgent}</div>
						</div>
					{/if}

					{#if selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0}
						<div class="p-3 bg-gray-50 rounded">
							<div class="text-sm text-gray-600 mb-2">Metadata</div>
							<pre class="text-xs font-mono overflow-auto max-h-64">{JSON.stringify(
									selectedLog.metadata,
									null,
									2
								)}</pre>
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
