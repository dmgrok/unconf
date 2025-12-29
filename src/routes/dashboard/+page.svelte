<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { Calendar, Users, FileText, TrendingUp, Plus, Settings, BarChart3 } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	function getStatusBadgeClass(status: string) {
		switch (status) {
			case 'active':
				return 'badge-active';
			case 'draft':
				return 'badge-draft';
			case 'completed':
				return 'badge-completed';
			case 'paused':
				return 'badge-paused';
			default:
				return '';
		}
	}

	function formatDate(dateString: string | Date) {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(date);
	}
</script>

<svelte:head>
	<title>Dashboard - UnConf</title>
	<meta name="description" content="Organizer dashboard for managing unconferences" />
</svelte:head>

<div class="dashboard">
	<!-- Header -->
	<div class="dashboard-header">
		<div class="header-content">
			<h1>Welcome back, {data.user.name}!</h1>
			<p class="subtitle">Here's what's happening with your events</p>
		</div>
		<button class="btn-primary" onclick={() => goto('/events/create')}>
			<Plus size={20} />
			<span>Create Event</span>
		</button>
	</div>

	<!-- Quick Stats -->
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-icon" style="background: #dbeafe;">
				<Calendar size={24} color="#3b82f6" />
			</div>
			<div class="stat-content">
				<div class="stat-value">{data.stats.activeEvents}</div>
				<div class="stat-label">Active Events</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon" style="background: #fef3c7;">
				<FileText size={24} color="#f59e0b" />
			</div>
			<div class="stat-content">
				<div class="stat-value">{data.stats.totalEvents}</div>
				<div class="stat-label">Total Events</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon" style="background: #d1fae5;">
				<Users size={24} color="#10b981" />
			</div>
			<div class="stat-content">
				<div class="stat-value">{data.stats.totalParticipants}</div>
				<div class="stat-label">Participants</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon" style="background: #e9d5ff;">
				<TrendingUp size={24} color="#a855f7" />
			</div>
			<div class="stat-content">
				<div class="stat-value">{data.stats.totalTopics}</div>
				<div class="stat-label">Topics Created</div>
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="dashboard-content">
		<!-- Recent Events -->
		<div class="section">
			<div class="section-header">
				<h2>Recent Events</h2>
				<a href="/events" class="link">View All →</a>
			</div>

			{#if data.hasEvents}
				<div class="events-list">
					{#each data.recentEvents as event}
						<div class="event-card">
							<div class="event-info">
								<div class="event-title-row">
									<h3>{event.title}</h3>
									<span class="status-badge {getStatusBadgeClass(event.status)}">
										{event.status}
									</span>
								</div>
								<p class="event-meta">Updated {formatDate(event.updatedAt)}</p>
							</div>
							<div class="event-actions">
								<button class="btn-secondary" onclick={() => goto(`/events/${event.id}`)}>
									View
								</button>
								<button class="btn-secondary" onclick={() => goto(`/events/${event.id}/edit`)}>
									Edit
								</button>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="empty-state">
					<Calendar size={48} color="#9ca3af" />
					<h3>No events yet</h3>
					<p>Create your first unconference event to get started</p>
					<button class="btn-primary" onclick={() => goto('/events/create')}>
						<Plus size={20} />
						<span>Create Your First Event</span>
					</button>
				</div>
			{/if}
		</div>

		<!-- Quick Actions -->
		<div class="section">
			<div class="section-header">
				<h2>Quick Actions</h2>
			</div>

			<div class="quick-actions">
				<button class="action-card" onclick={() => goto('/events/create')}>
					<Plus size={24} />
					<span>Create Event</span>
				</button>

				<button class="action-card" onclick={() => goto('/analytics')}>
					<BarChart3 size={24} />
					<span>View Analytics</span>
				</button>

				<button class="action-card" onclick={() => goto('/settings')}>
					<Settings size={24} />
					<span>Settings</span>
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.dashboard {
		min-height: 100vh;
		background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
		padding: 2rem;
	}

	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
		gap: 1rem;
	}

	.header-content h1 {
		font-size: 2rem;
		font-weight: 700;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.subtitle {
		color: #6b7280;
		margin: 0;
		font-size: 1rem;
	}

	.btn-primary {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: #3b82f6;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.btn-primary:hover {
		background: #2563eb;
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
		margin-bottom: 3rem;
	}

	.stat-card {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.stat-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.stat-icon {
		width: 56px;
		height: 56px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.stat-content {
		flex: 1;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		color: #1f2937;
		line-height: 1;
		margin-bottom: 0.25rem;
	}

	.stat-label {
		font-size: 0.875rem;
		color: #6b7280;
		font-weight: 500;
	}

	.dashboard-content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.section {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.section-header h2 {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
		margin: 0;
	}

	.link {
		color: #3b82f6;
		text-decoration: none;
		font-weight: 500;
		font-size: 0.95rem;
		transition: color 0.2s;
	}

	.link:hover {
		color: #2563eb;
	}

	.events-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.event-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		transition: all 0.2s;
		gap: 1rem;
	}

	.event-card:hover {
		border-color: #3b82f6;
		background: #f9fafb;
	}

	.event-info {
		flex: 1;
		min-width: 0;
	}

	.event-title-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.event-card h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.status-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		flex-shrink: 0;
	}

	.badge-active {
		background: #d1fae5;
		color: #065f46;
	}

	.badge-draft {
		background: #fef3c7;
		color: #92400e;
	}

	.badge-completed {
		background: #e0e7ff;
		color: #3730a3;
	}

	.badge-paused {
		background: #fee2e2;
		color: #991b1b;
	}

	.event-meta {
		font-size: 0.875rem;
		color: #6b7280;
		margin: 0;
	}

	.event-actions {
		display: flex;
		gap: 0.75rem;
		flex-shrink: 0;
	}

	.btn-secondary {
		padding: 0.5rem 1rem;
		background: white;
		color: #374151;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-secondary:hover {
		background: #f9fafb;
		border-color: #9ca3af;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
		gap: 1rem;
	}

	.empty-state h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0.5rem 0 0.25rem 0;
	}

	.empty-state p {
		color: #6b7280;
		margin: 0 0 1.5rem 0;
	}

	.quick-actions {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.action-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
		background: #f9fafb;
		border: 2px dashed #d1d5db;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
		gap: 0.75rem;
		font-size: 1rem;
		font-weight: 500;
		color: #374151;
	}

	.action-card:hover {
		background: #f3f4f6;
		border-color: #3b82f6;
		color: #3b82f6;
	}

	@media (max-width: 768px) {
		.dashboard {
			padding: 1rem;
		}

		.dashboard-header {
			flex-direction: column;
		}

		.header-content h1 {
			font-size: 1.5rem;
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}

		.event-card {
			flex-direction: column;
			align-items: flex-start;
		}

		.event-actions {
			width: 100%;
			justify-content: flex-end;
		}

		.quick-actions {
			grid-template-columns: 1fr;
		}
	}
</style>
