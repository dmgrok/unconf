/**
 * Backup Monitoring and Alerting Service
 * Monitors backup health and sends alerts on failures
 */

import type { BackupMetadata } from './backup-service';
import type { IntegrityReport } from './data-integrity';

export enum AlertSeverity {
	INFO = 'info',
	WARNING = 'warning',
	ERROR = 'error',
	CRITICAL = 'critical'
}

export interface Alert {
	id: string;
	severity: AlertSeverity;
	title: string;
	message: string;
	timestamp: Date;
	acknowledged: boolean;
	resolvedAt?: Date;
}

export interface MonitoringConfig {
	checkIntervalMinutes: number;
	maxBackupAgeHours: number;
	maxFailedBackups: number;
	minHealthyBackups: number;
	alertRecipients: string[];
}

export interface BackupHealth {
	status: 'healthy' | 'warning' | 'critical';
	lastBackup: Date | null;
	hoursSinceLastBackup: number;
	consecutiveFailures: number;
	totalBackups: number;
	successRate: number; // percentage
	alerts: Alert[];
}

export class BackupMonitoringService {
	private config: MonitoringConfig;
	private alerts: Alert[] = [];
	private monitoringTimer?: NodeJS.Timeout;
	private backupHistory: BackupMetadata[] = [];

	constructor(config: Partial<MonitoringConfig> = {}) {
		this.config = {
			checkIntervalMinutes: config.checkIntervalMinutes || 15,
			maxBackupAgeHours: config.maxBackupAgeHours || 2,
			maxFailedBackups: config.maxFailedBackups || 3,
			minHealthyBackups: config.minHealthyBackups || 24, // ~12 hours worth
			alertRecipients: config.alertRecipients || []
		};
	}

	/**
	 * Start monitoring
	 */
	start(): void {
		console.log('[Monitoring] Starting backup monitoring service...');
		console.log(`[Monitoring] Check interval: ${this.config.checkIntervalMinutes} minutes`);

		// Initial health check
		this.performHealthCheck();

		// Schedule recurring checks
		this.monitoringTimer = setInterval(
			() => {
				this.performHealthCheck();
			},
			this.config.checkIntervalMinutes * 60 * 1000
		);
	}

	/**
	 * Stop monitoring
	 */
	stop(): void {
		if (this.monitoringTimer) {
			clearInterval(this.monitoringTimer);
			this.monitoringTimer = undefined;
			console.log('[Monitoring] Monitoring service stopped');
		}
	}

	/**
	 * Perform health check
	 */
	async performHealthCheck(): Promise<BackupHealth> {
		console.log('[Monitoring] Performing backup health check...');

		const health = this.calculateBackupHealth();

		// Check for issues and create alerts
		if (health.hoursSinceLastBackup > this.config.maxBackupAgeHours) {
			this.createAlert(
				AlertSeverity.WARNING,
				'Backup Overdue',
				`No backup created in the last ${health.hoursSinceLastBackup.toFixed(1)} hours`
			);
		}

		if (health.consecutiveFailures >= this.config.maxFailedBackups) {
			this.createAlert(
				AlertSeverity.CRITICAL,
				'Multiple Backup Failures',
				`${health.consecutiveFailures} consecutive backup failures detected`
			);
		}

		if (health.totalBackups < this.config.minHealthyBackups) {
			this.createAlert(
				AlertSeverity.WARNING,
				'Low Backup Count',
				`Only ${health.totalBackups} backups available (minimum: ${this.config.minHealthyBackups})`
			);
		}

		if (health.successRate < 80) {
			this.createAlert(
				AlertSeverity.ERROR,
				'Low Success Rate',
				`Backup success rate is ${health.successRate.toFixed(1)}%`
			);
		}

		console.log(`[Monitoring] Health status: ${health.status}`);
		return health;
	}

	/**
	 * Calculate backup health
	 */
	calculateBackupHealth(): BackupHealth {
		const now = Date.now();
		let lastBackup: Date | null = null;
		let consecutiveFailures = 0;
		let successfulBackups = 0;

		// Sort by timestamp descending
		const sortedBackups = [...this.backupHistory].sort(
			(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
		);

		if (sortedBackups.length > 0) {
			lastBackup = new Date(sortedBackups[0].timestamp);

			// Count consecutive failures from most recent
			for (const backup of sortedBackups) {
				if (backup.status === 'failed') {
					consecutiveFailures++;
				} else {
					break;
				}
			}

			successfulBackups = sortedBackups.filter((b) => b.status === 'success').length;
		}

		const hoursSinceLastBackup = lastBackup ? (now - lastBackup.getTime()) / (1000 * 60 * 60) : Infinity;
		const successRate = sortedBackups.length > 0 ? (successfulBackups / sortedBackups.length) * 100 : 0;

		let status: 'healthy' | 'warning' | 'critical' = 'healthy';
		if (
			consecutiveFailures >= this.config.maxFailedBackups ||
			hoursSinceLastBackup > this.config.maxBackupAgeHours * 2
		) {
			status = 'critical';
		} else if (
			hoursSinceLastBackup > this.config.maxBackupAgeHours ||
			successRate < 80 ||
			sortedBackups.length < this.config.minHealthyBackups
		) {
			status = 'warning';
		}

		return {
			status,
			lastBackup,
			hoursSinceLastBackup,
			consecutiveFailures,
			totalBackups: sortedBackups.length,
			successRate,
			alerts: this.getActiveAlerts()
		};
	}

	/**
	 * Register backup completion
	 */
	registerBackup(metadata: BackupMetadata): void {
		this.backupHistory.push(metadata);

		// Trim history to reasonable size
		if (this.backupHistory.length > 1000) {
			this.backupHistory = this.backupHistory.slice(-1000);
		}

		// Create alert if backup failed
		if (metadata.status === 'failed') {
			this.createAlert(
				AlertSeverity.ERROR,
				'Backup Failed',
				`Backup ${metadata.id} failed: ${metadata.errorMessage || 'Unknown error'}`
			);
		}
	}

	/**
	 * Register integrity check result
	 */
	registerIntegrityCheck(report: IntegrityReport): void {
		if (report.overallStatus === 'critical') {
			this.createAlert(
				AlertSeverity.CRITICAL,
				'Data Integrity Critical',
				`${report.corruptedFiles} corrupted files, ${report.missingFiles} missing files`
			);
		} else if (report.overallStatus === 'degraded') {
			this.createAlert(
				AlertSeverity.WARNING,
				'Data Integrity Degraded',
				`${report.corruptedFiles} corrupted files, ${report.missingFiles} missing files`
			);
		}
	}

	/**
	 * Create alert
	 */
	createAlert(severity: AlertSeverity, title: string, message: string): Alert {
		const alert: Alert = {
			id: this.generateAlertId(),
			severity,
			title,
			message,
			timestamp: new Date(),
			acknowledged: false
		};

		this.alerts.push(alert);

		console.log(`[Monitoring] Alert created: [${severity.toUpperCase()}] ${title}`);

		// Send notifications
		this.sendNotification(alert);

		return alert;
	}

	/**
	 * Acknowledge alert
	 */
	acknowledgeAlert(alertId: string): boolean {
		const alert = this.alerts.find((a) => a.id === alertId);
		if (alert) {
			alert.acknowledged = true;
			console.log(`[Monitoring] Alert acknowledged: ${alertId}`);
			return true;
		}
		return false;
	}

	/**
	 * Resolve alert
	 */
	resolveAlert(alertId: string): boolean {
		const alert = this.alerts.find((a) => a.id === alertId);
		if (alert) {
			alert.resolvedAt = new Date();
			console.log(`[Monitoring] Alert resolved: ${alertId}`);
			return true;
		}
		return false;
	}

	/**
	 * Get active alerts
	 */
	getActiveAlerts(): Alert[] {
		return this.alerts.filter((a) => !a.resolvedAt);
	}

	/**
	 * Get all alerts
	 */
	getAllAlerts(): Alert[] {
		return [...this.alerts].sort(
			(a, b) => b.timestamp.getTime() - a.timestamp.getTime()
		);
	}

	/**
	 * Clear old resolved alerts
	 */
	clearOldAlerts(daysOld: number = 30): number {
		const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
		const initialCount = this.alerts.length;

		this.alerts = this.alerts.filter((alert) => {
			return !alert.resolvedAt || new Date(alert.resolvedAt).getTime() > cutoff;
		});

		const removed = initialCount - this.alerts.length;
		console.log(`[Monitoring] Cleared ${removed} old alerts`);
		return removed;
	}

	/**
	 * Send notification (placeholder for actual implementation)
	 */
	private sendNotification(alert: Alert): void {
		// In production, this would send emails, SMS, or push notifications
		console.log(`[Monitoring] Notification sent: ${alert.title}`);

		// Example integrations:
		// - Email via SMTP
		// - Slack webhook
		// - PagerDuty
		// - Discord webhook
		// - SMS via Twilio
	}

	/**
	 * Generate monitoring report
	 */
	generateReport(): {
		health: BackupHealth;
		recentAlerts: Alert[];
		statistics: {
			totalAlerts: number;
			criticalAlerts: number;
			unresolvedAlerts: number;
			averageResolutionTime: number;
		};
	} {
		const health = this.calculateBackupHealth();
		const recentAlerts = this.alerts.slice(-20);
		const unresolvedAlerts = this.getActiveAlerts().length;
		const criticalAlerts = this.alerts.filter(
			(a) => a.severity === AlertSeverity.CRITICAL
		).length;

		// Calculate average resolution time
		const resolvedAlerts = this.alerts.filter((a) => a.resolvedAt);
		const totalResolutionTime = resolvedAlerts.reduce((sum, alert) => {
			const duration = alert.resolvedAt!.getTime() - alert.timestamp.getTime();
			return sum + duration;
		}, 0);
		const averageResolutionTime =
			resolvedAlerts.length > 0
				? totalResolutionTime / resolvedAlerts.length / (1000 * 60) // minutes
				: 0;

		return {
			health,
			recentAlerts,
			statistics: {
				totalAlerts: this.alerts.length,
				criticalAlerts,
				unresolvedAlerts,
				averageResolutionTime
			}
		};
	}

	/**
	 * Generate alert ID
	 */
	private generateAlertId(): string {
		return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}
}

export const backupMonitoringService = new BackupMonitoringService();
