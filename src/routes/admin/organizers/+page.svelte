<script lang="ts">
	import { onMount } from 'svelte';
	import type { User } from '../../../types';

	interface OrganizerInfo extends User {
		eventCount: number;
		lastActiveAt: string;
	}

	interface RoleHistoryEntry {
		userId: string;
		userName: string;
		action: 'assigned' | 'revoked';
		fromRole: string;
		toRole: string;
		performedBy: string;
		performedAt: string;
		reason?: string;
	}

	let organizers: OrganizerInfo[] = [];
	let allUsers: User[] = [];
	let roleHistory: RoleHistoryEntry[] = [];
	let loading = true;
	let error = '';
	let searchQuery = '';
	let selectedUser: User | null = null;
	let showAssignDialog = false;
	let showRevokeDialog = false;
	let showHistoryDialog = false;
	let actionReason = '';
	let selectedRole: 'organizer' | 'participant' | 'guest' = 'organizer';

	onMount(() => {
		fetchData();
	});

	async function fetchData() {
		try {
			const response = await fetch('/api/admin/organizers');
			const result = await response.json();

			if (result.success) {
				organizers = result.data.organizers;
				allUsers = result.data.allUsers;
				roleHistory = result.data.roleHistory || [];
				error = '';
			} else {
				error = result.error || 'Failed to fetch organizer data';
			}
		} catch (err) {
			error = 'Network error: ' + (err instanceof Error ? err.message : String(err));
		} finally {
			loading = false;
		}
	}

	async function assignRole(userId: string, role: string, reason: string) {
		try {
			const response = await fetch('/api/admin/organizers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'assign_role', userId, role, reason })
			});

			const result = await response.json();
			if (result.success) {
				await fetchData();
				showAssignDialog = false;
				selectedUser = null;
				actionReason = '';
				alert('Role assigned successfully');
			} else {
				alert('Failed to assign role: ' + result.error);
			}
		} catch (err) {
			alert('Error assigning role: ' + (err instanceof Error ? err.message : String(err)));
		}
	}

	async function revokeRole(userId: string, reason: string) {
		try {
			const response = await fetch('/api/admin/organizers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'revoke_role', userId, reason })
			});

			const result = await response.json();
			if (result.success) {
				await fetchData();
				showRevokeDialog = false;
				selectedUser = null;
				actionReason = '';
				alert('Role revoked successfully');
			} else {
				alert('Failed to revoke role: ' + result.error);
			}
		} catch (err) {
			alert('Error revoking role: ' + (err instanceof Error ? err.message : String(err)));
		}
	}

	function openAssignDialog(user: User) {
		selectedUser = user;
		selectedRole = 'organizer';
		actionReason = '';
		showAssignDialog = true;
	}

	function openRevokeDialog(user: User) {
		selectedUser = user;
		actionReason = '';
		showRevokeDialog = true;
	}

	function openHistoryDialog() {
		showHistoryDialog = true;
	}

	function formatDateTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleString();
	}

	function getRoleColor(role: string): string {
		switch (role) {
			case 'admin':
				return 'bg-red-100 text-red-800';
			case 'organizer':
				return 'bg-blue-100 text-blue-800';
			case 'participant':
				return 'bg-green-100 text-green-800';
			case 'guest':
				return 'bg-gray-100 text-gray-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	$: filteredUsers = allUsers.filter(
		(user) =>
			user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			user.email?.toLowerCase().includes(searchQuery.toLowerCase())
	);
</script>

<svelte:head>
	<title>Organizer Access Management - UnConf Admin</title>
	<meta name="description" content="Manage organizer roles and permissions" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex justify-between items-center">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Organizer Access Management</h1>
					<p class="mt-2 text-sm text-gray-600">
						Manage organizer roles, permissions, and access levels
					</p>
				</div>
				<div class="flex items-center space-x-4">
					<button
						on:click={openHistoryDialog}
						class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
					>
						Role History
					</button>
					<button
						on:click={fetchData}
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

		{#if loading}
			<div class="flex justify-center items-center h-64">
				<div class="text-lg text-gray-600">Loading organizer data...</div>
			</div>
		{:else}
			<!-- Current Organizers -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
				<div class="px-6 py-4 border-b border-gray-200">
					<h2 class="text-xl font-semibold">Current Organizers</h2>
					<p class="text-sm text-gray-600 mt-1">{organizers.length} organizers</p>
				</div>
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Name
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Email
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Role
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Events
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Last Active
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Actions
								</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each organizers as organizer}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="text-sm font-medium text-gray-900">{organizer.name}</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="text-sm text-gray-500">{organizer.email || 'N/A'}</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<span
											class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full {getRoleColor(
												organizer.role
											)}"
										>
											{organizer.role}
										</span>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										{organizer.eventCount} events
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										{formatDateTime(organizer.lastActiveAt)}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
										{#if organizer.role !== 'admin'}
											<button
												on:click={() => openRevokeDialog(organizer)}
												class="text-red-600 hover:text-red-900"
											>
												Revoke
											</button>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<!-- User Search & Assignment -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200">
				<div class="px-6 py-4 border-b border-gray-200">
					<h2 class="text-xl font-semibold">Assign New Organizer</h2>
					<p class="text-sm text-gray-600 mt-1">Search for users and assign organizer role</p>
				</div>
				<div class="p-6">
					<div class="mb-4">
						<label for="userSearch" class="block text-sm font-medium text-gray-700 mb-2">
							Search Users
						</label>
						<input
							id="userSearch"
							type="text"
							bind:value={searchQuery}
							placeholder="Search by name or email..."
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>

					{#if searchQuery.length > 0}
						<div class="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
							<table class="min-w-full divide-y divide-gray-200">
								<thead class="bg-gray-50">
									<tr>
										<th
											class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Name
										</th>
										<th
											class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Email
										</th>
										<th
											class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Current Role
										</th>
										<th
											class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Actions
										</th>
									</tr>
								</thead>
								<tbody class="bg-white divide-y divide-gray-200">
									{#each filteredUsers.slice(0, 20) as user}
										<tr class="hover:bg-gray-50">
											<td class="px-6 py-4 whitespace-nowrap">
												<div class="text-sm font-medium text-gray-900">{user.name}</div>
											</td>
											<td class="px-6 py-4 whitespace-nowrap">
												<div class="text-sm text-gray-500">{user.email || 'N/A'}</div>
											</td>
											<td class="px-6 py-4 whitespace-nowrap">
												<span
													class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full {getRoleColor(
														user.role
													)}"
												>
													{user.role}
												</span>
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
												{#if user.role === 'admin'}
													<span class="text-gray-400">Admin</span>
												{:else if user.role === 'organizer'}
													<button
														on:click={() => openRevokeDialog(user)}
														class="text-red-600 hover:text-red-900"
													>
														Revoke
													</button>
												{:else}
													<button
														on:click={() => openAssignDialog(user)}
														class="text-blue-600 hover:text-blue-900"
													>
														Assign Role
													</button>
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Assign Role Dialog -->
{#if showAssignDialog && selectedUser}
	<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
		<div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
			<div class="mt-3">
				<h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">Assign Role</h3>
				<div class="mb-4">
					<p class="text-sm text-gray-600">
						User: <strong>{selectedUser.name}</strong>
					</p>
					<p class="text-sm text-gray-600">
						Current Role: <strong>{selectedUser.role}</strong>
					</p>
				</div>
				<div class="mb-4">
					<label for="roleSelect" class="block text-sm font-medium text-gray-700 mb-2">
						New Role
					</label>
					<select
						id="roleSelect"
						bind:value={selectedRole}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
					>
						<option value="organizer">Organizer</option>
						<option value="participant">Participant</option>
						<option value="guest">Guest</option>
					</select>
				</div>
				<div class="mb-4">
					<label for="assignReason" class="block text-sm font-medium text-gray-700 mb-2">
						Reason
					</label>
					<textarea
						id="assignReason"
						bind:value={actionReason}
						rows="3"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
						placeholder="Enter reason for role assignment..."
					></textarea>
				</div>
				<div class="flex justify-end space-x-3">
					<button
						on:click={() => {
							showAssignDialog = false;
							selectedUser = null;
							actionReason = '';
						}}
						class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
					>
						Cancel
					</button>
					<button
						on:click={() => assignRole(selectedUser!.id, selectedRole, actionReason)}
						class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
					>
						Assign Role
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Revoke Role Dialog -->
{#if showRevokeDialog && selectedUser}
	<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
		<div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
			<div class="mt-3">
				<h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">Revoke Organizer Role</h3>
				<div class="mb-4">
					<p class="text-sm text-gray-600">
						User: <strong>{selectedUser.name}</strong>
					</p>
					<p class="text-sm text-gray-600">
						Current Role: <strong>{selectedUser.role}</strong>
					</p>
					<p class="text-sm text-red-600 mt-2">
						This will revoke organizer privileges and revert to participant role.
					</p>
				</div>
				<div class="mb-4">
					<label for="revokeReason" class="block text-sm font-medium text-gray-700 mb-2">
						Reason (Required)
					</label>
					<textarea
						id="revokeReason"
						bind:value={actionReason}
						rows="3"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
						placeholder="Enter reason for revocation..."
					></textarea>
				</div>
				<div class="flex justify-end space-x-3">
					<button
						on:click={() => {
							showRevokeDialog = false;
							selectedUser = null;
							actionReason = '';
						}}
						class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
					>
						Cancel
					</button>
					<button
						on:click={() => revokeRole(selectedUser!.id, actionReason)}
						disabled={!actionReason.trim()}
						class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
					>
						Revoke Role
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Role History Dialog -->
{#if showHistoryDialog}
	<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
		<div class="relative top-10 mx-auto p-5 border w-5/6 max-w-4xl shadow-lg rounded-md bg-white">
			<div class="mt-3">
				<div class="flex justify-between items-center mb-4">
					<h3 class="text-lg font-medium leading-6 text-gray-900">Role Change History</h3>
					<button
						on:click={() => (showHistoryDialog = false)}
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
				<div class="overflow-x-auto max-h-96">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
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
									Role Change
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Performed By
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Date
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Reason
								</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each roleHistory as entry}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										{entry.userName}
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<span
											class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full {entry.action ===
											'assigned'
												? 'bg-green-100 text-green-800'
												: 'bg-red-100 text-red-800'}"
										>
											{entry.action}
										</span>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										{entry.fromRole} → {entry.toRole}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										{entry.performedBy}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
										{formatDateTime(entry.performedAt)}
									</td>
									<td class="px-6 py-4 text-sm text-gray-500">
										{entry.reason || 'N/A'}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
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
