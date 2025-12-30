import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface DataIntegrityReport {
	isValid: boolean;
	errors: DataIntegrityError[];
	warnings: string[];
	checkedFiles: string[];
	timestamp: Date;
}

export interface DataIntegrityError {
	file: string;
	type: 'corruption' | 'missing' | 'invalid_json' | 'checksum_mismatch' | 'schema_violation';
	message: string;
	severity: 'critical' | 'high' | 'medium' | 'low';
	recoverable: boolean;
}

export interface RecoveryOptions {
	useBackup: boolean;
	backupTimestamp?: Date;
	createNewFile: boolean;
	validateAfterRecovery: boolean;
}

export interface StorageHealthCheck {
	timestamp: Date;
	overallHealth: 'healthy' | 'degraded' | 'critical';
	issues: Array<{
		type: string;
		severity: 'info' | 'warning' | 'error' | 'critical';
		message: string;
		affectedFiles?: string[];
	}>;
	recommendations: string[];
	metrics: {
		totalFiles: number;
		corruptedFiles: number;
		missingFiles: number;
		totalSize: number;
		availableSpace: number;
	};
}

export class ErrorHandler {
	private readonly dataDir: string;
	private readonly backupDir: string;
	private readonly logDir: string;
	private readonly logFile: string;

	constructor(dataDir: string) {
		this.dataDir = dataDir;
		this.backupDir = path.join(dataDir, 'backups');
		this.logDir = path.join(dataDir, 'logs');
		this.logFile = path.join(this.logDir, 'error.log');
		this.ensureDirectories();
	}

	private async ensureDirectories(): Promise<void> {
		await Promise.all([
			fs.mkdir(this.backupDir, { recursive: true }),
			fs.mkdir(this.logDir, { recursive: true })
		]);
	}

	async checkDataIntegrity(files: string[]): Promise<DataIntegrityReport> {
		const report: DataIntegrityReport = {
			isValid: true,
			errors: [],
			warnings: [],
			checkedFiles: [],
			timestamp: new Date()
		};

		for (const filename of files) {
			const filePath = path.join(this.dataDir, filename);
			report.checkedFiles.push(filename);

			try {
				// Check if file exists
				const exists = await this.fileExists(filePath);
				if (!exists) {
					report.errors.push({
						file: filename,
						type: 'missing',
						message: 'File does not exist',
						severity: 'critical',
						recoverable: true
					});
					report.isValid = false;
					continue;
				}

				// Check file size
				const stats = await fs.stat(filePath);
				if (stats.size === 0) {
					report.warnings.push(`${filename} is empty`);
				} else if (stats.size > 100 * 1024 * 1024) { // 100MB
					report.warnings.push(`${filename} is unusually large (${Math.round(stats.size / 1024 / 1024)}MB)`);
				}

				// Check JSON validity
				const content = await fs.readFile(filePath, 'utf-8');
				let data: any;

				try {
					data = JSON.parse(content);
				} catch (jsonError) {
					report.errors.push({
						file: filename,
						type: 'invalid_json',
						message: `Invalid JSON: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`,
						severity: 'critical',
						recoverable: true
					});
					report.isValid = false;
					continue;
				}

				// Check data structure
				if (!Array.isArray(data)) {
					report.errors.push({
						file: filename,
						type: 'schema_violation',
						message: 'Root element is not an array',
						severity: 'high',
						recoverable: true
					});
					report.isValid = false;
				}

				// Check entity structure
				if (Array.isArray(data)) {
					const invalidEntities = data.filter(entity =>
						!entity.id || !entity.createdAt || !entity.updatedAt
					);

					if (invalidEntities.length > 0) {
						report.errors.push({
							file: filename,
							type: 'schema_violation',
							message: `${invalidEntities.length} entities missing required fields (id, createdAt, updatedAt)`,
							severity: 'medium',
							recoverable: true
						});
					}
				}

				// Verify checksums if available
				await this.verifyChecksum(filePath, report);

			} catch (error) {
				report.errors.push({
					file: filename,
					type: 'corruption',
					message: `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
					severity: 'critical',
					recoverable: true
				});
				report.isValid = false;
			}
		}

		await this.logIntegrityReport(report);
		return report;
	}

	async recoverFromBackup(filename: string, options: RecoveryOptions = { useBackup: true, createNewFile: false, validateAfterRecovery: true }): Promise<boolean> {
		const filePath = path.join(this.dataDir, filename);

		try {
			if (options.useBackup) {
				const backupFile = await this.findLatestBackup(filename, options.backupTimestamp);
				if (backupFile) {
					await fs.copyFile(backupFile, filePath);
					await this.log('info', `Recovered ${filename} from backup ${backupFile}`);
				} else if (options.createNewFile) {
					await this.createEmptyDataFile(filePath);
					await this.log('info', `Created new empty file ${filename}`);
				} else {
					await this.log('error', `No backup found for ${filename} and createNewFile is false`);
					return false;
				}
			} else if (options.createNewFile) {
				await this.createEmptyDataFile(filePath);
				await this.log('info', `Created new empty file ${filename}`);
			}

			// Validate after recovery
			if (options.validateAfterRecovery) {
				const report = await this.checkDataIntegrity([filename]);
				if (!report.isValid) {
					await this.log('error', `Validation failed after recovery for ${filename}`);
					return false;
				}
			}

			return true;

		} catch (error) {
			await this.log('error', `Recovery failed for ${filename}: ${error instanceof Error ? error.message : String(error)}`);
			return false;
		}
	}

	async performHealthCheck(): Promise<StorageHealthCheck> {
		const healthCheck: StorageHealthCheck = {
			timestamp: new Date(),
			overallHealth: 'healthy',
			issues: [],
			recommendations: [],
			metrics: {
				totalFiles: 0,
				corruptedFiles: 0,
				missingFiles: 0,
				totalSize: 0,
				availableSpace: 0
			}
		};

		const expectedFiles = ['events.json', 'users.json', 'topics.json', 'votes.json'];

		try {
			// Check data directory existence
			const dataDirExists = await this.fileExists(this.dataDir);
			if (!dataDirExists) {
				healthCheck.issues.push({
					type: 'missing_directory',
					severity: 'critical',
					message: 'Data directory does not exist'
				});
				healthCheck.overallHealth = 'critical';
				return healthCheck;
			}

			// Check disk space
			const stats = await fs.stat(this.dataDir);
			// Note: fs.stat doesn't provide available space, would need different approach for real implementation
			healthCheck.metrics.availableSpace = 1024 * 1024 * 1024; // Mock 1GB available

			// Check each expected file
			for (const filename of expectedFiles) {
				const filePath = path.join(this.dataDir, filename);

				try {
					const exists = await this.fileExists(filePath);
					if (!exists) {
						healthCheck.metrics.missingFiles++;
						healthCheck.issues.push({
							type: 'missing_file',
							severity: 'warning',
							message: `Missing data file: ${filename}`,
							affectedFiles: [filename]
						});
					} else {
						healthCheck.metrics.totalFiles++;
						const fileStats = await fs.stat(filePath);
						healthCheck.metrics.totalSize += fileStats.size;

						// Quick corruption check
						try {
							const content = await fs.readFile(filePath, 'utf-8');
							JSON.parse(content);
						} catch {
							healthCheck.metrics.corruptedFiles++;
							healthCheck.issues.push({
								type: 'corrupted_file',
								severity: 'error',
								message: `Corrupted data file: ${filename}`,
								affectedFiles: [filename]
							});
						}
					}
				} catch (error) {
					healthCheck.issues.push({
						type: 'file_access_error',
						severity: 'error',
						message: `Cannot access ${filename}: ${error instanceof Error ? error.message : String(error)}`,
						affectedFiles: [filename]
					});
				}
			}

			// Check backup directory
			const backupDirExists = await this.fileExists(this.backupDir);
			if (!backupDirExists) {
				healthCheck.issues.push({
					type: 'missing_backup_directory',
					severity: 'warning',
					message: 'Backup directory does not exist'
				});
			} else {
				const backupFiles = await fs.readdir(this.backupDir);
				if (backupFiles.length === 0) {
					healthCheck.issues.push({
						type: 'no_backups',
						severity: 'info',
						message: 'No backup files found'
					});
				}
			}

			// Determine overall health
			const criticalIssues = healthCheck.issues.filter(issue => issue.severity === 'critical');
			const errorIssues = healthCheck.issues.filter(issue => issue.severity === 'error');

			if (criticalIssues.length > 0) {
				healthCheck.overallHealth = 'critical';
			} else if (errorIssues.length > 0 || healthCheck.metrics.corruptedFiles > 0) {
				healthCheck.overallHealth = 'degraded';
			}

			// Generate recommendations
			this.generateRecommendations(healthCheck);

		} catch (error) {
			healthCheck.issues.push({
				type: 'health_check_error',
				severity: 'critical',
				message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`
			});
			healthCheck.overallHealth = 'critical';
		}

		await this.logHealthCheck(healthCheck);
		return healthCheck;
	}

	async createChecksum(filePath: string): Promise<string> {
		const content = await fs.readFile(filePath);
		return crypto.createHash('sha256').update(content).digest('hex');
	}

	async saveChecksum(filePath: string): Promise<void> {
		const checksum = await this.createChecksum(filePath);
		const checksumPath = `${filePath}.checksum`;
		await fs.writeFile(checksumPath, checksum, 'utf-8');
	}

	async verifyChecksum(filePath: string, report: DataIntegrityReport): Promise<boolean> {
		const checksumPath = `${filePath}.checksum`;

		try {
			const checksumExists = await this.fileExists(checksumPath);
			if (!checksumExists) {
				return true; // No checksum to verify
			}

			const savedChecksum = await fs.readFile(checksumPath, 'utf-8');
			const currentChecksum = await this.createChecksum(filePath);

			if (savedChecksum.trim() !== currentChecksum) {
				report.errors.push({
					file: path.basename(filePath),
					type: 'checksum_mismatch',
					message: 'File checksum does not match saved checksum',
					severity: 'high',
					recoverable: true
				});
				return false;
			}

			return true;
		} catch (error) {
			report.warnings.push(`Could not verify checksum for ${path.basename(filePath)}: ${error instanceof Error ? error.message : String(error)}`);
			return true; // Don't fail on checksum verification errors
		}
	}

	private async findLatestBackup(filename: string, before?: Date): Promise<string | null> {
		try {
			const backupFiles = await fs.readdir(this.backupDir);
			const relevantBackups = backupFiles
				.filter(file => file.startsWith(filename) && file.endsWith('.backup'))
				.map(file => ({
					path: path.join(this.backupDir, file),
					name: file
				}));

			if (relevantBackups.length === 0) {
				return null;
			}

			// Sort by modification time
			const backupsWithStats = await Promise.all(
				relevantBackups.map(async backup => ({
					...backup,
					stats: await fs.stat(backup.path)
				}))
			);

			backupsWithStats.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

			if (before) {
				const validBackup = backupsWithStats.find(backup => backup.stats.mtime <= before);
				return validBackup?.path || null;
			}

			return backupsWithStats[0]?.path || null;
		} catch {
			return null;
		}
	}

	private async createEmptyDataFile(filePath: string): Promise<void> {
		await fs.writeFile(filePath, '[]', 'utf-8');
	}

	private generateRecommendations(healthCheck: StorageHealthCheck): void {
		if (healthCheck.metrics.missingFiles > 0) {
			healthCheck.recommendations.push('Initialize missing data files or restore from backups');
		}

		if (healthCheck.metrics.corruptedFiles > 0) {
			healthCheck.recommendations.push('Restore corrupted files from recent backups');
		}

		if (healthCheck.issues.some(issue => issue.type === 'no_backups')) {
			healthCheck.recommendations.push('Enable automatic backup creation');
		}

		if (healthCheck.metrics.totalSize > 50 * 1024 * 1024) { // 50MB
			healthCheck.recommendations.push('Consider archiving old data or implementing data retention policies');
		}

		if (healthCheck.metrics.availableSpace < 100 * 1024 * 1024) { // 100MB
			healthCheck.recommendations.push('Monitor disk space usage and consider cleanup procedures');
		}
	}

	private async log(level: 'info' | 'warn' | 'error', message: string): Promise<void> {
		const timestamp = new Date().toISOString();
		const logEntry = `${timestamp} [${level.toUpperCase()}] ${message}\n`;

		try {
			await fs.appendFile(this.logFile, logEntry, 'utf-8');
		} catch (error) {
			console.error('Failed to write to log file:', error);
		}
	}

	private async logIntegrityReport(report: DataIntegrityReport): Promise<void> {
		const summary = `Data integrity check: ${report.isValid ? 'PASSED' : 'FAILED'} - ${report.errors.length} errors, ${report.warnings.length} warnings`;
		await this.log(report.isValid ? 'info' : 'error', summary);

		for (const error of report.errors) {
			await this.log('error', `${error.file}: ${error instanceof Error ? error.message : String(error)} (${error.severity})`);
		}
	}

	private async logHealthCheck(healthCheck: StorageHealthCheck): Promise<void> {
		const summary = `Health check: ${healthCheck.overallHealth} - ${healthCheck.issues.length} issues found`;
		await this.log('info', summary);

		for (const issue of healthCheck.issues) {
			await this.log(issue.severity === 'info' ? 'info' : 'warn', `${issue.type}: ${issue.message}`);
		}
	}

	private async fileExists(path: string): Promise<boolean> {
		try {
			await fs.access(path);
			return true;
		} catch {
			return false;
		}
	}
}