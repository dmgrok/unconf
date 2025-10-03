/**
 * Automated Backup System
 * Implements 30-minute interval backups with 7-day retention
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

export interface BackupMetadata {
	id: string;
	timestamp: Date;
	type: 'full' | 'incremental';
	size: number;
	checksum: string;
	duration: number; // milliseconds
	status: 'success' | 'failed' | 'partial';
	filesBackedUp: number;
	errorMessage?: string;
}

export interface BackupConfig {
	backupDir: string;
	dataDir: string;
	intervalMinutes: number;
	retentionDays: number;
	compressionEnabled: boolean;
}

export class BackupService {
	private config: BackupConfig;
	private backupTimer?: NodeJS.Timeout;
	private backupHistory: BackupMetadata[] = [];

	constructor(config: Partial<BackupConfig> = {}) {
		this.config = {
			backupDir: config.backupDir || './backups',
			dataDir: config.dataDir || './data',
			intervalMinutes: config.intervalMinutes || 30,
			retentionDays: config.retentionDays || 7,
			compressionEnabled: config.compressionEnabled ?? true
		};
	}

	/**
	 * Start automated backup scheduler
	 */
	async start(): Promise<void> {
		console.log('[Backup] Starting automated backup service...');
		console.log(`[Backup] Interval: ${this.config.intervalMinutes} minutes`);
		console.log(`[Backup] Retention: ${this.config.retentionDays} days`);

		// Ensure backup directory exists
		await this.ensureBackupDirectory();

		// Run initial backup
		await this.createBackup();

		// Schedule recurring backups
		this.backupTimer = setInterval(
			async () => {
				await this.createBackup();
			},
			this.config.intervalMinutes * 60 * 1000
		);

		// Schedule daily cleanup
		setInterval(
			async () => {
				await this.cleanupOldBackups();
			},
			24 * 60 * 60 * 1000
		);
	}

	/**
	 * Stop automated backup scheduler
	 */
	stop(): void {
		if (this.backupTimer) {
			clearInterval(this.backupTimer);
			this.backupTimer = undefined;
			console.log('[Backup] Backup service stopped');
		}
	}

	/**
	 * Create a backup
	 */
	async createBackup(type: 'full' | 'incremental' = 'full'): Promise<BackupMetadata> {
		const startTime = Date.now();
		const backupId = this.generateBackupId();

		console.log(`[Backup] Starting ${type} backup: ${backupId}`);

		try {
			// Create backup directory for this backup
			const backupPath = path.join(this.config.backupDir, backupId);
			await fs.mkdir(backupPath, { recursive: true });

			// Copy data files
			const filesBackedUp = await this.copyDataFiles(backupPath);

			// Generate checksum
			const checksum = await this.generateChecksum(backupPath);

			// Get backup size
			const size = await this.getDirectorySize(backupPath);

			const metadata: BackupMetadata = {
				id: backupId,
				timestamp: new Date(),
				type,
				size,
				checksum,
				duration: Date.now() - startTime,
				status: 'success',
				filesBackedUp
			};

			// Save metadata
			await this.saveMetadata(backupPath, metadata);

			// Add to history
			this.backupHistory.push(metadata);

			console.log(
				`[Backup] Backup completed: ${backupId} (${filesBackedUp} files, ${this.formatSize(size)})`
			);

			return metadata;
		} catch (error) {
			const metadata: BackupMetadata = {
				id: backupId,
				timestamp: new Date(),
				type,
				size: 0,
				checksum: '',
				duration: Date.now() - startTime,
				status: 'failed',
				filesBackedUp: 0,
				errorMessage: error instanceof Error ? error.message : String(error)
			};

			this.backupHistory.push(metadata);
			console.error(`[Backup] Backup failed: ${backupId}`, error);

			throw error;
		}
	}

	/**
	 * List all backups
	 */
	async listBackups(): Promise<BackupMetadata[]> {
		try {
			const backups = await fs.readdir(this.config.backupDir);
			const metadata: BackupMetadata[] = [];

			for (const backupId of backups) {
				try {
					const meta = await this.loadMetadata(
						path.join(this.config.backupDir, backupId)
					);
					metadata.push(meta);
				} catch {
					// Skip invalid backups
				}
			}

			return metadata.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
		} catch {
			return [];
		}
	}

	/**
	 * Get backup by ID
	 */
	async getBackup(backupId: string): Promise<BackupMetadata | null> {
		try {
			const backupPath = path.join(this.config.backupDir, backupId);
			return await this.loadMetadata(backupPath);
		} catch {
			return null;
		}
	}

	/**
	 * Delete specific backup
	 */
	async deleteBackup(backupId: string): Promise<void> {
		const backupPath = path.join(this.config.backupDir, backupId);
		await fs.rm(backupPath, { recursive: true, force: true });
		console.log(`[Backup] Deleted backup: ${backupId}`);
	}

	/**
	 * Cleanup old backups based on retention policy
	 */
	async cleanupOldBackups(): Promise<number> {
		console.log('[Backup] Running cleanup of old backups...');

		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

		const backups = await this.listBackups();
		let deletedCount = 0;

		for (const backup of backups) {
			if (new Date(backup.timestamp) < cutoffDate) {
				await this.deleteBackup(backup.id);
				deletedCount++;
			}
		}

		console.log(`[Backup] Cleanup complete: ${deletedCount} backups deleted`);
		return deletedCount;
	}

	/**
	 * Get backup statistics
	 */
	async getStatistics(): Promise<{
		totalBackups: number;
		totalSize: number;
		successfulBackups: number;
		failedBackups: number;
		oldestBackup: Date | null;
		newestBackup: Date | null;
		averageBackupSize: number;
	}> {
		const backups = await this.listBackups();

		const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
		const successfulBackups = backups.filter((b) => b.status === 'success').length;
		const failedBackups = backups.filter((b) => b.status === 'failed').length;

		return {
			totalBackups: backups.length,
			totalSize,
			successfulBackups,
			failedBackups,
			oldestBackup: backups.length > 0 ? new Date(backups[backups.length - 1].timestamp) : null,
			newestBackup: backups.length > 0 ? new Date(backups[0].timestamp) : null,
			averageBackupSize: backups.length > 0 ? totalSize / backups.length : 0
		};
	}

	/**
	 * Copy data files to backup location
	 */
	private async copyDataFiles(backupPath: string): Promise<number> {
		let filesBackedUp = 0;

		try {
			const files = await fs.readdir(this.config.dataDir, { withFileTypes: true });

			for (const file of files) {
				const srcPath = path.join(this.config.dataDir, file.name);
				const destPath = path.join(backupPath, file.name);

				if (file.isDirectory()) {
					await fs.mkdir(destPath, { recursive: true });
					filesBackedUp += await this.copyDirectory(srcPath, destPath);
				} else {
					await fs.copyFile(srcPath, destPath);
					filesBackedUp++;
				}
			}
		} catch (error) {
			console.error('[Backup] Error copying files:', error);
		}

		return filesBackedUp;
	}

	/**
	 * Recursively copy directory
	 */
	private async copyDirectory(src: string, dest: string): Promise<number> {
		let count = 0;
		const files = await fs.readdir(src, { withFileTypes: true });

		for (const file of files) {
			const srcPath = path.join(src, file.name);
			const destPath = path.join(dest, file.name);

			if (file.isDirectory()) {
				await fs.mkdir(destPath, { recursive: true });
				count += await this.copyDirectory(srcPath, destPath);
			} else {
				await fs.copyFile(srcPath, destPath);
				count++;
			}
		}

		return count;
	}

	/**
	 * Generate checksum for backup
	 */
	private async generateChecksum(backupPath: string): Promise<string> {
		const hash = createHash('sha256');
		const files = await this.getAllFiles(backupPath);

		for (const file of files.sort()) {
			const content = await fs.readFile(file);
			hash.update(content);
		}

		return hash.digest('hex');
	}

	/**
	 * Get all files in directory recursively
	 */
	private async getAllFiles(dir: string): Promise<string[]> {
		const files: string[] = [];
		const items = await fs.readdir(dir, { withFileTypes: true });

		for (const item of items) {
			const fullPath = path.join(dir, item.name);
			if (item.isDirectory()) {
				files.push(...(await this.getAllFiles(fullPath)));
			} else if (item.name !== 'metadata.json') {
				files.push(fullPath);
			}
		}

		return files;
	}

	/**
	 * Get directory size
	 */
	private async getDirectorySize(dir: string): Promise<number> {
		let size = 0;
		const files = await fs.readdir(dir, { withFileTypes: true });

		for (const file of files) {
			const fullPath = path.join(dir, file.name);
			if (file.isDirectory()) {
				size += await this.getDirectorySize(fullPath);
			} else {
				const stat = await fs.stat(fullPath);
				size += stat.size;
			}
		}

		return size;
	}

	/**
	 * Save backup metadata
	 */
	private async saveMetadata(backupPath: string, metadata: BackupMetadata): Promise<void> {
		const metadataPath = path.join(backupPath, 'metadata.json');
		await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
	}

	/**
	 * Load backup metadata
	 */
	private async loadMetadata(backupPath: string): Promise<BackupMetadata> {
		const metadataPath = path.join(backupPath, 'metadata.json');
		const content = await fs.readFile(metadataPath, 'utf-8');
		const metadata = JSON.parse(content);
		// Convert timestamp string back to Date
		metadata.timestamp = new Date(metadata.timestamp);
		return metadata;
	}

	/**
	 * Ensure backup directory exists
	 */
	private async ensureBackupDirectory(): Promise<void> {
		await fs.mkdir(this.config.backupDir, { recursive: true });
	}

	/**
	 * Generate unique backup ID
	 */
	private generateBackupId(): string {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		return `backup_${timestamp}`;
	}

	/**
	 * Format file size
	 */
	private formatSize(bytes: number): string {
		const units = ['B', 'KB', 'MB', 'GB'];
		let size = bytes;
		let unitIndex = 0;

		while (size >= 1024 && unitIndex < units.length - 1) {
			size /= 1024;
			unitIndex++;
		}

		return `${size.toFixed(2)} ${units[unitIndex]}`;
	}
}

export const backupService = new BackupService();
