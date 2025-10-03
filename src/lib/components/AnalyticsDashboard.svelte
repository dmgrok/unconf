<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { LiveAnalytics, EventAnalytics } from '../../types/analytics';

	export let eventId: string;

	let liveAnalytics: LiveAnalytics | null = null;
	let historicalAnalytics: EventAnalytics | null = null;
	let loading = true;
	let error: string | null = null;
	let refreshInterval: ReturnType<typeof setInterval>;

	onMount(async () => {
		await fetchAnalytics();
		// Refresh every 5 seconds
		refreshInterval = setInterval(fetchLiveAnalytics, 5000);
	});

	onDestroy(() => {
		if (refreshInterval) {
			clearInterval(refreshInterval);
		}
	});

	async function fetchAnalytics() {
		await Promise.all([fetchLiveAnalytics(), fetchHistoricalAnalytics()]);
		loading = false;
	}

	async function fetchLiveAnalytics() {
		try {
			const response = await fetch(`/api/analytics/${eventId}/live`);
			if (response.ok) {
				liveAnalytics = await response.json();
				error = null;
			} else if (response.status !== 404) {
				throw new Error('Failed to fetch live analytics');
			}
		} catch (err) {
			console.error('Error fetching live analytics:', err);
			error = 'Failed to load live analytics';
		}
	}

	async function fetchHistoricalAnalytics() {
		try {
			const response = await fetch(`/api/analytics/${eventId}`);
			if (response.ok) {
				historicalAnalytics = await response.json();
				error = null;
			} else if (response.status !== 404) {
				throw new Error('Failed to fetch historical analytics');
			}
		} catch (err) {
			console.error('Error fetching historical analytics:', err);
			error = 'Failed to load historical analytics';
		}
	}

	function formatNumber(num: number, decimals: number = 0): string {
		return num.toFixed(decimals);
	}

	function formatPercentage(num: number): string {
		return `${(num * 100).toFixed(1)}%`;
	}

	function formatDuration(ms: number): string {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) {
			return `${hours}h ${minutes % 60}m`;
		}
		if (minutes > 0) {
			return `${minutes}m ${seconds % 60}s`;
		}
		return `${seconds}s`;
	}

	function getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
		return trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
	}

	function getSeverityClass(severity?: string): string {
		switch (severity) {
			case 'critical':
				return 'severity-critical';
			case 'high':
				return 'severity-high';
			case 'warning':
			case 'medium':
				return 'severity-warning';
			default:
				return 'severity-info';
		}
	}
</script>

<div class="analytics-dashboard">
	{#if loading}
		<div class="loading">Loading analytics...</div>
	{:else if error}
		<div class="error">{error}</div>
	{:else}
		<!-- Live Analytics Section -->
		{#if liveAnalytics}
			<div class="section live-section">
				<h3>Live Metrics</h3>
				<div class="metrics-grid">
					<div class="metric-card">
						<div class="metric-label">Active Participants</div>
						<div class="metric-value">{liveAnalytics.activeParticipants}</div>
						<div class="metric-info">Current activity: {liveAnalytics.currentActivity}</div>
					</div>

					{#each liveAnalytics.realtimeMetrics as metric}
						<div class="metric-card">
							<div class="metric-label">{metric.name}</div>
							<div class="metric-value">
								{formatNumber(metric.value, 2)} {metric.unit}
								<span class="trend">{getTrendIcon(metric.trend)}</span>
							</div>
							{#if metric.threshold}
								<div class="metric-info">Threshold: {metric.threshold}</div>
							{/if}
						</div>
					{/each}

					<div class="metric-card">
						<div class="metric-label">Response Time</div>
						<div class="metric-value">{formatNumber(liveAnalytics.performance.responseTime)}ms</div>
					</div>

					<div class="metric-card">
						<div class="metric-label">Error Rate</div>
						<div class="metric-value">{formatPercentage(liveAnalytics.performance.errorRate)}</div>
					</div>

					<div class="metric-card">
						<div class="metric-label">Active Connections</div>
						<div class="metric-value">{liveAnalytics.performance.activeConnections}</div>
					</div>
				</div>

				<!-- Alerts -->
				{#if liveAnalytics.alerts && liveAnalytics.alerts.length > 0}
					<div class="alerts-section">
						<h4>Active Alerts</h4>
						<div class="alerts-list">
							{#each liveAnalytics.alerts as alert}
								<div class="alert {getSeverityClass(alert.severity)}">
									<div class="alert-header">
										<span class="alert-type">{alert.type}</span>
										<span class="alert-severity">{alert.severity}</span>
									</div>
									<div class="alert-message">{alert.message}</div>
									<div class="alert-time">{new Date(alert.timestamp).toLocaleTimeString()}</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Historical Analytics Section -->
		{#if historicalAnalytics}
			<div class="section historical-section">
				<h3>Event Summary</h3>

				<!-- Participation Metrics -->
				<div class="subsection">
					<h4>Participation</h4>
					<div class="metrics-grid">
						<div class="metric-card">
							<div class="metric-label">Total Participants</div>
							<div class="metric-value">{historicalAnalytics.metrics.totalParticipants}</div>
						</div>
						<div class="metric-card">
							<div class="metric-label">Peak Concurrency</div>
							<div class="metric-value">{historicalAnalytics.metrics.peakConcurrency}</div>
						</div>
						<div class="metric-card">
							<div class="metric-label">Completion Rate</div>
							<div class="metric-value">{formatPercentage(historicalAnalytics.metrics.completionRate)}</div>
						</div>
						<div class="metric-card">
							<div class="metric-label">Retention Rate</div>
							<div class="metric-value">{formatPercentage(historicalAnalytics.participation.retentionRate)}</div>
						</div>
					</div>
				</div>

				<!-- Engagement Metrics -->
				<div class="subsection">
					<h4>Engagement</h4>
					<div class="metrics-grid">
						<div class="metric-card">
							<div class="metric-label">Engagement Score</div>
							<div class="metric-value">{formatNumber(historicalAnalytics.engagement.averageEngagementScore, 1)}</div>
						</div>
						<div class="metric-card">
							<div class="metric-label">Voting Participation</div>
							<div class="metric-value">{formatPercentage(historicalAnalytics.engagement.votingParticipationRate)}</div>
						</div>
						<div class="metric-card">
							<div class="metric-label">Discussion Participation</div>
							<div class="metric-value">{formatPercentage(historicalAnalytics.engagement.discussionParticipationRate)}</div>
						</div>
						<div class="metric-card">
							<div class="metric-label">Interaction Frequency</div>
							<div class="metric-value">{formatNumber(historicalAnalytics.engagement.interactionFrequency, 2)}/min</div>
						</div>
					</div>
				</div>

				<!-- Voting Analytics -->
				<div class="subsection">
					<h4>Voting</h4>
					<div class="metrics-grid">
						<div class="metric-card">
							<div class="metric-label">Total Votes</div>
							<div class="metric-value">{historicalAnalytics.voting.totalVotes}</div>
						</div>
						<div class="metric-card">
							<div class="metric-label">Unique Voters</div>
							<div class="metric-value">{historicalAnalytics.voting.uniqueVoters}</div>
						</div>
						<div class="metric-card">
							<div class="metric-label">Completion Rate</div>
							<div class="metric-value">{formatPercentage(historicalAnalytics.voting.votingCompletionRate)}</div>
						</div>
						<div class="metric-card">
							<div class="metric-label">Average Voting Time</div>
							<div class="metric-value">{formatNumber(historicalAnalytics.voting.averageVotingTime)}s</div>
						</div>
					</div>
				</div>

				<!-- Performance Metrics -->
				<div class="subsection">
					<h4>Performance</h4>
					<div class="metrics-grid">
						<div class="metric-card">
							<div class="metric-label">Response Time</div>
							<div class="metric-value">{formatNumber(historicalAnalytics.performance.averageResponseTime)}ms</div>
						</div>
						<div class="metric-card">
							<div class="metric-label">System Uptime</div>
							<div class="metric-value">{formatPercentage(historicalAnalytics.performance.systemUptime / 100)}</div>
						</div>
						<div class="metric-card">
							<div class="metric-label">Error Rate</div>
							<div class="metric-value">{formatPercentage(historicalAnalytics.performance.errorRate)}</div>
						</div>
						<div class="metric-card">
							<div class="metric-label">Activity Switch Latency</div>
							<div class="metric-value">{formatNumber(historicalAnalytics.performance.activitySwitchLatency)}ms</div>
						</div>
					</div>
				</div>

				<!-- Activity Breakdown -->
				{#if historicalAnalytics.activities && historicalAnalytics.activities.length > 0}
					<div class="subsection">
						<h4>Activity Breakdown</h4>
						<div class="activities-list">
							{#each historicalAnalytics.activities as activity}
								<div class="activity-card">
									<div class="activity-name">{activity.activityType}</div>
									<div class="activity-stats">
										<span>{activity.participantCount} participants</span>
										<span>{formatDuration(activity.duration)}</span>
										<span>Engagement: {formatNumber(activity.engagementScore, 1)}</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Summary -->
				<div class="subsection summary">
					<h4>Key Insights</h4>
					<div class="overall-score">
						Overall Score: <strong>{formatNumber(historicalAnalytics.summary.overallScore, 1)}/100</strong>
					</div>
					{#if historicalAnalytics.summary.keyInsights.length > 0}
						<ul class="insights-list">
							{#each historicalAnalytics.summary.keyInsights as insight}
								<li>{insight}</li>
							{/each}
						</ul>
					{/if}
					{#if historicalAnalytics.summary.recommendations.length > 0}
						<div class="recommendations">
							<h5>Recommendations</h5>
							<ul>
								{#each historicalAnalytics.summary.recommendations as recommendation}
									<li>{recommendation}</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Export Options -->
		<div class="export-section">
			<h4>Export Analytics</h4>
			<div class="export-buttons">
				<a href="/api/analytics/{eventId}/export?format=csv" download class="export-btn">
					Export as CSV
				</a>
				<a href="/api/analytics/{eventId}/export?format=json" download class="export-btn">
					Export as JSON
				</a>
			</div>
		</div>
	{/if}
</div>

<style>
	.analytics-dashboard {
		padding: 1rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.loading,
	.error {
		text-align: center;
		padding: 2rem;
		font-size: 1.1rem;
	}

	.error {
		color: var(--color-error, #e53e3e);
	}

	.section {
		margin-bottom: 2rem;
		background: var(--color-surface, #fff);
		border-radius: 8px;
		padding: 1.5rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.live-section {
		border-left: 4px solid var(--color-success, #48bb78);
	}

	h3 {
		margin-top: 0;
		margin-bottom: 1rem;
		font-size: 1.5rem;
		color: var(--color-text-primary, #1a202c);
	}

	h4 {
		margin-top: 1.5rem;
		margin-bottom: 1rem;
		font-size: 1.2rem;
		color: var(--color-text-secondary, #4a5568);
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.metric-card {
		background: var(--color-background, #f7fafc);
		padding: 1rem;
		border-radius: 6px;
		border: 1px solid var(--color-border, #e2e8f0);
	}

	.metric-label {
		font-size: 0.875rem;
		color: var(--color-text-secondary, #718096);
		margin-bottom: 0.5rem;
	}

	.metric-value {
		font-size: 1.75rem;
		font-weight: bold;
		color: var(--color-text-primary, #1a202c);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.metric-info {
		font-size: 0.75rem;
		color: var(--color-text-tertiary, #a0aec0);
		margin-top: 0.25rem;
	}

	.trend {
		font-size: 1.25rem;
		opacity: 0.6;
	}

	.alerts-section {
		margin-top: 1.5rem;
	}

	.alerts-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.alert {
		padding: 1rem;
		border-radius: 6px;
		border-left: 4px solid;
	}

	.severity-critical {
		background: #fff5f5;
		border-color: #e53e3e;
	}

	.severity-high {
		background: #fffaf0;
		border-color: #dd6b20;
	}

	.severity-warning {
		background: #fffff0;
		border-color: #d69e2e;
	}

	.severity-info {
		background: #ebf8ff;
		border-color: #3182ce;
	}

	.alert-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.5rem;
		font-weight: 600;
	}

	.alert-type {
		text-transform: capitalize;
	}

	.alert-severity {
		text-transform: uppercase;
		font-size: 0.75rem;
	}

	.alert-message {
		margin-bottom: 0.5rem;
	}

	.alert-time {
		font-size: 0.75rem;
		color: var(--color-text-tertiary, #a0aec0);
	}

	.subsection {
		margin-bottom: 2rem;
	}

	.activities-list {
		display: grid;
		gap: 0.75rem;
	}

	.activity-card {
		background: var(--color-background, #f7fafc);
		padding: 1rem;
		border-radius: 6px;
		border: 1px solid var(--color-border, #e2e8f0);
	}

	.activity-name {
		font-weight: 600;
		margin-bottom: 0.5rem;
		text-transform: capitalize;
	}

	.activity-stats {
		display: flex;
		gap: 1rem;
		font-size: 0.875rem;
		color: var(--color-text-secondary, #718096);
	}

	.summary {
		background: var(--color-surface-alt, #f7fafc);
		padding: 1.5rem;
		border-radius: 6px;
	}

	.overall-score {
		font-size: 1.25rem;
		margin-bottom: 1rem;
	}

	.overall-score strong {
		color: var(--color-primary, #3182ce);
		font-size: 1.5rem;
	}

	.insights-list,
	.recommendations ul {
		list-style: none;
		padding-left: 0;
	}

	.insights-list li,
	.recommendations li {
		padding: 0.5rem 0;
		padding-left: 1.5rem;
		position: relative;
	}

	.insights-list li::before,
	.recommendations li::before {
		content: '→';
		position: absolute;
		left: 0;
		color: var(--color-primary, #3182ce);
	}

	.recommendations {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--color-border, #e2e8f0);
	}

	.export-section {
		margin-top: 2rem;
		padding: 1.5rem;
		background: var(--color-surface, #fff);
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.export-buttons {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
	}

	.export-btn {
		padding: 0.75rem 1.5rem;
		background: var(--color-primary, #3182ce);
		color: white;
		border-radius: 6px;
		text-decoration: none;
		font-weight: 600;
		transition: background 0.2s;
	}

	.export-btn:hover {
		background: var(--color-primary-dark, #2c5aa0);
	}

	@media (max-width: 768px) {
		.metrics-grid {
			grid-template-columns: 1fr;
		}

		.export-buttons {
			flex-direction: column;
		}
	}
</style>
