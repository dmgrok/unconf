/**
 * Data Integrity Verification Service
 * Validates backup integrity with checksums and corruption detection
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

export interface IntegrityCheck {
	filePath: string;
	checksum: string;
	size: number;
	lastModified: Date;
	status: 'valid' | 'corrupted' | 'missing';
	error?: string;
}

export interface IntegrityReport {
	totalFiles: number;
	validFiles: number;
	corruptedFiles: number;
	missingFiles: number;
	checks: IntegrityCheck[];
	overallStatus: 'healthy' | 'degraded' | 'critical';
	timestamp: Date;
}

export class DataIntegrityService {
	/**
	 * Verify backup integrity
	 */
	async verifyBackup(backupPath: string): Promise<IntegrityReport> {
		console.log(`[Integrity] Verifying backup: ${backupPath}`);

		const checks: IntegrityCheck[] = [];
		const files = await this.getAllFiles(backupPath);

		for (const file of files) {
			const check = await this.verifyFile(file);
			checks.push(check);
		}

		const validFiles = checks.filter((c) => c.status === 'valid').length;
		const corruptedFiles = checks.filter((c) => c.status === 'corrupted').length;
		const missingFiles = checks.filter((c) => c.status === 'missing').length;

		let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
		if (corruptedFiles > 0 || missingFiles > 0) {
			overallStatus = corruptedFiles + missingFiles > files.length * 0.1 ? 'critical' : 'degraded';
		}

		const report: IntegrityReport = {
			totalFiles: files.length,
			validFiles,
			corruptedFiles,
			missingFiles,
			checks,
			overallStatus,
			timestamp: new Date()
		};

		console.log(
			`[Integrity] Verification complete: ${validFiles}/${files.length} files valid`
		);

		return report;
	}

	/**
	 * Verify single file
	 */
	async verifyFile(filePath: string): Promise<IntegrityCheck> {
		try {
			const stats = await fs.stat(filePath);
			const checksum = await this.calculateFileChecksum(filePath);

			return {
				filePath,
				checksum,
				size: stats.size,
				lastModified: stats.mtime,
				status: 'valid'
			};
		} catch (error) {
			return {
				filePath,
				checksum: '',
				size: 0,
				lastModified: new Date(),
				status: 'missing',
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	/**
	 * Compare two files for integrity
	 */
	async compareFiles(file1: string, file2: string): Promise<boolean> {
		try {
			const checksum1 = await this.calculateFileChecksum(file1);
			const checksum2 = await this.calculateFileChecksum(file2);
			return checksum1 === checksum2;
		} catch {
			return false;
		}
	}

	/**
	 * Compare directories for integrity
	 */
	async compareDirectories(dir1: string, dir2: string): Promise<{
		identical: boolean;
		differences: {
			onlyInDir1: string[];
			onlyInDir2: string[];
			modified: string[];
		};
	}> {
		const files1 = await this.getAllFiles(dir1);
		const files2 = await this.getAllFiles(dir2);

		const relativeFiles1 = files1.map((f) => path.relative(dir1, f));
		const relativeFiles2 = files2.map((f) => path.relative(dir2, f));

		const onlyInDir1 = relativeFiles1.filter((f) => !relativeFiles2.includes(f));
		const onlyInDir2 = relativeFiles2.filter((f) => !relativeFiles1.includes(f));
		const modified: string[] = [];

		// Check common files
		const commonFiles = relativeFiles1.filter((f) => relativeFiles2.includes(f));
		for (const file of commonFiles) {
			const file1Path = path.join(dir1, file);
			const file2Path = path.join(dir2, file);
			const identical = await this.compareFiles(file1Path, file2Path);
			if (!identical) {
				modified.push(file);
			}
		}

		return {
			identical: onlyInDir1.length === 0 && onlyInDir2.length === 0 && modified.length === 0,
			differences: {
				onlyInDir1,
				onlyInDir2,
				modified
			}
		};
	}

	/**
	 * Calculate file checksum
	 */
	async calculateFileChecksum(filePath: string): Promise<string> {
		const hash = createHash('sha256');
		const content = await fs.readFile(filePath);
		hash.update(content);
		return hash.digest('hex');
	}

	/**
	 * Calculate directory checksum
	 */
	async calculateDirectoryChecksum(dirPath: string): Promise<string> {
		const hash = createHash('sha256');
		const files = await this.getAllFiles(dirPath);

		for (const file of files.sort()) {
			const fileChecksum = await this.calculateFileChecksum(file);
			hash.update(fileChecksum);
		}

		return hash.digest('hex');
	}

	/**
	 * Detect corrupted files
	 */
	async detectCorruption(
		dirPath: string,
		expectedChecksums: Record<string, string>
	): Promise<string[]> {
		const corruptedFiles: string[] = [];
		const files = await this.getAllFiles(dirPath);

		for (const file of files) {
			const relativePath = path.relative(dirPath, file);
			const expectedChecksum = expectedChecksums[relativePath];

			if (expectedChecksum) {
				const actualChecksum = await this.calculateFileChecksum(file);
				if (actualChecksum !== expectedChecksum) {
					corruptedFiles.push(relativePath);
				}
			}
		}

		return corruptedFiles;
	}

	/**
	 * Generate integrity manifest
	 */
	async generateManifest(dirPath: string): Promise<Record<string, string>> {
		const manifest: Record<string, string> = {};
		const files = await this.getAllFiles(dirPath);

		for (const file of files) {
			const relativePath = path.relative(dirPath, file);
			const checksum = await this.calculateFileChecksum(file);
			manifest[relativePath] = checksum;
		}

		return manifest;
	}

	/**
	 * Verify against manifest
	 */
	async verifyAgainstManifest(
		dirPath: string,
		manifest: Record<string, string>
	): Promise<IntegrityReport> {
		const checks: IntegrityCheck[] = [];

		for (const [relativePath, expectedChecksum] of Object.entries(manifest)) {
			const fullPath = path.join(dirPath, relativePath);
			const check = await this.verifyFile(fullPath);

			if (check.status === 'valid' && check.checksum !== expectedChecksum) {
				check.status = 'corrupted';
				check.error = 'Checksum mismatch';
			}

			checks.push(check);
		}

		const validFiles = checks.filter((c) => c.status === 'valid').length;
		const corruptedFiles = checks.filter((c) => c.status === 'corrupted').length;
		const missingFiles = checks.filter((c) => c.status === 'missing').length;

		let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
		if (corruptedFiles > 0 || missingFiles > 0) {
			overallStatus =
				corruptedFiles + missingFiles > checks.length * 0.1 ? 'critical' : 'degraded';
		}

		return {
			totalFiles: checks.length,
			validFiles,
			corruptedFiles,
			missingFiles,
			checks,
			overallStatus,
			timestamp: new Date()
		};
	}

	/**
	 * Get all files in directory recursively
	 */
	private async getAllFiles(dir: string): Promise<string[]> {
		const files: string[] = [];

		try {
			const items = await fs.readdir(dir, { withFileTypes: true });

			for (const item of items) {
				const fullPath = path.join(dir, item.name);
				if (item.isDirectory()) {
					files.push(...(await this.getAllFiles(fullPath)));
				} else if (item.name !== 'metadata.json') {
					files.push(fullPath);
				}
			}
		} catch {
			// Directory doesn't exist or not accessible
		}

		return files;
	}

	/**
	 * Export integrity report
	 */
	exportReport(report: IntegrityReport): string {
		return `
Data Integrity Report
Generated: ${report.timestamp.toISOString()}

Status: ${report.overallStatus.toUpperCase()}

Summary:
- Total Files: ${report.totalFiles}
- Valid Files: ${report.validFiles}
- Corrupted Files: ${report.corruptedFiles}
- Missing Files: ${report.missingFiles}

${report.corruptedFiles > 0 || report.missingFiles > 0 ? 'Issues Detected:\n' : ''}
${report.checks
	.filter((c) => c.status !== 'valid')
	.map((c) => `- ${c.filePath}: ${c.status.toUpperCase()} ${c.error ? `(${c.error})` : ''}`)
	.join('\n')}
		`.trim();
	}
}

export const dataIntegrityService = new DataIntegrityService();
