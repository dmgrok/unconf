<script lang="ts">
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';
	import {
		initWebVitals,
		logWebVitals,
		sendWebVitalsToAnalytics,
		type WebVitalsReport
	} from '$lib/utils/web-vitals';

	interface Props {
		showInProduction?: boolean;
		sendToAnalytics?: boolean;
	}

	let { showInProduction = false, sendToAnalytics = true }: Props = $props();

	let report = $state<WebVitalsReport>({});
	let showMonitor = $state(dev || showInProduction);

	onMount(() => {
		const cleanup = initWebVitals((updatedReport) => {
			report = updatedReport;

			// Log in development
			if (dev) {
				logWebVitals(updatedReport);
			}

			// Send to analytics in production
			if (!dev && sendToAnalytics) {
				sendWebVitalsToAnalytics(updatedReport);
			}
		});

		return cleanup;
	});

	function getRatingColor(rating?: string): string {
		switch (rating) {
			case 'good':
				return '#0cce6b';
			case 'needs-improvement':
				return '#ffa400';
			case 'poor':
				return '#ff4e42';
			default:
				return '#666';
		}
	}

	function formatValue(name: string, value?: number): string {
		if (!value) return '-';
		if (name === 'CLS') {
			return value.toFixed(3);
		}
		return `${value.toFixed(0)}ms`;
	}
</script>

{#if showMonitor && Object.keys(report).length > 0}
	<div class="web-vitals-monitor">
		<div class="monitor-header">
			<span class="monitor-title">📊 Core Web Vitals</span>
		</div>
		<div class="metrics">
			{#if report.lcp}
				<div class="metric">
					<div class="metric-name">LCP</div>
					<div class="metric-value" style="color: {getRatingColor(report.lcp.rating)}">
						{formatValue('LCP', report.lcp.value)}
					</div>
					<div class="metric-target">Target: &lt; 2.5s</div>
				</div>
			{/if}

			{#if report.fid}
				<div class="metric">
					<div class="metric-name">FID</div>
					<div class="metric-value" style="color: {getRatingColor(report.fid.rating)}">
						{formatValue('FID', report.fid.value)}
					</div>
					<div class="metric-target">Target: &lt; 100ms</div>
				</div>
			{/if}

			{#if report.cls}
				<div class="metric">
					<div class="metric-name">CLS</div>
					<div class="metric-value" style="color: {getRatingColor(report.cls.rating)}">
						{formatValue('CLS', report.cls.value)}
					</div>
					<div class="metric-target">Target: &lt; 0.1</div>
				</div>
			{/if}

			{#if report.fcp}
				<div class="metric">
					<div class="metric-name">FCP</div>
					<div class="metric-value" style="color: {getRatingColor(report.fcp.rating)}">
						{formatValue('FCP', report.fcp.value)}
					</div>
					<div class="metric-target">Target: &lt; 1.8s</div>
				</div>
			{/if}

			{#if report.ttfb}
				<div class="metric">
					<div class="metric-name">TTFB</div>
					<div class="metric-value" style="color: {getRatingColor(report.ttfb.rating)}">
						{formatValue('TTFB', report.ttfb.value)}
					</div>
					<div class="metric-target">Target: &lt; 800ms</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.web-vitals-monitor {
		position: fixed;
		bottom: 20px;
		right: 20px;
		background: white;
		border: 2px solid #e2e8f0;
		border-radius: 8px;
		padding: 12px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		z-index: 9999;
		font-family: monospace;
		font-size: 12px;
		min-width: 200px;
	}

	.monitor-header {
		margin-bottom: 8px;
		padding-bottom: 8px;
		border-bottom: 1px solid #e2e8f0;
	}

	.monitor-title {
		font-weight: bold;
		font-size: 14px;
	}

	.metrics {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
		gap: 12px;
	}

	.metric {
		text-align: center;
	}

	.metric-name {
		font-weight: bold;
		font-size: 11px;
		color: #666;
		margin-bottom: 4px;
	}

	.metric-value {
		font-size: 16px;
		font-weight: bold;
		margin-bottom: 2px;
	}

	.metric-target {
		font-size: 9px;
		color: #999;
	}

	/* Mobile responsiveness */
	@media (max-width: 767px) {
		.web-vitals-monitor {
			bottom: 80px; /* Above bottom nav */
			right: 10px;
			left: 10px;
			min-width: auto;
		}

		.metrics {
			grid-template-columns: repeat(3, 1fr);
			gap: 8px;
		}

		.metric-name {
			font-size: 10px;
		}

		.metric-value {
			font-size: 14px;
		}

		.metric-target {
			font-size: 8px;
		}
	}
</style>
