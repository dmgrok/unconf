import { promises as fs } from 'fs';
import path from 'path';
import type { BaseEntity } from '../../types/entities';

export interface MigrationVersion {
	version: string;
	timestamp: Date;
	description: string;
	applied: boolean;
}

export interface MigrationScript {
	version: string;
	description: string;
	up: (data: any[]) => Promise<any[]>;
	down: (data: any[]) => Promise<any[]>;
}

export interface ExportFormat {
	version: string;
	timestamp: Date;
	entities: {
		events: any[];
		users: any[];
		topics: any[];
		votes: any[];
	};
	metadata: {
		totalRecords: number;
		exportType: 'full' | 'filtered';
		filters?: Record<string, unknown>;
	};
}

export class MigrationManager {
	private readonly dataDir: string;
	private readonly migrationDir: string;
	private readonly migrationLogPath: string;
	private readonly migrations: Map<string, MigrationScript> = new Map();

	constructor(dataDir: string) {
		this.dataDir = dataDir;
		this.migrationDir = path.join(dataDir, 'migrations');
		this.migrationLogPath = path.join(this.migrationDir, 'migration_log.json');
		this.ensureDirectories();
	}

	private async ensureDirectories(): Promise<void> {
		await fs.mkdir(this.migrationDir, { recursive: true });
	}

	registerMigration(migration: MigrationScript): void {
		this.migrations.set(migration.version, migration);
	}

	async getMigrationHistory(): Promise<MigrationVersion[]> {
		try {
			const exists = await this.fileExists(this.migrationLogPath);
			if (!exists) {
				return [];
			}

			const content = await fs.readFile(this.migrationLogPath, 'utf-8');
			const history = JSON.parse(content);

			return history.map((entry: any) => ({
				...entry,
				timestamp: new Date(entry.timestamp)
			}));
		} catch (error) {
			console.warn(`Failed to read migration history: ${error instanceof Error ? error.message : String(error)}`);
			return [];
		}
	}

	async saveMigrationHistory(history: MigrationVersion[]): Promise<void> {
		const serializedHistory = history.map(entry => ({
			...entry,
			timestamp: entry.timestamp.toISOString()
		}));

		await fs.writeFile(
			this.migrationLogPath,
			JSON.stringify(serializedHistory, null, 2),
			'utf-8'
		);
	}

	async getPendingMigrations(): Promise<MigrationScript[]> {
		const history = await this.getMigrationHistory();
		const appliedVersions = new Set(
			history.filter(h => h.applied).map(h => h.version)
		);

		return Array.from(this.migrations.values())
			.filter(migration => !appliedVersions.has(migration.version))
			.sort((a, b) => a.version.localeCompare(b.version));
	}

	async applyMigration(version: string, entityType: string): Promise<void> {
		const migration = this.migrations.get(version);
		if (!migration) {
			throw new Error(`Migration ${version} not found`);
		}

		const filePath = path.join(this.dataDir, `${entityType}.json`);
		const backupPath = path.join(
			this.migrationDir,
			`${entityType}_pre_${version}_${Date.now()}.backup`
		);

		try {
			// Create backup
			const exists = await this.fileExists(filePath);
			if (exists) {
				await fs.copyFile(filePath, backupPath);
			}

			// Read current data
			const data = exists ? JSON.parse(await fs.readFile(filePath, 'utf-8')) : [];

			// Apply migration
			const migratedData = await migration.up(data);

			// Write migrated data
			await fs.writeFile(filePath, JSON.stringify(migratedData, null, 2), 'utf-8');

			// Update migration history
			const history = await this.getMigrationHistory();
			const existingEntry = history.find(h => h.version === version);

			if (existingEntry) {
				existingEntry.applied = true;
				existingEntry.timestamp = new Date();
			} else {
				history.push({
					version,
					description: migration.description,
					timestamp: new Date(),
					applied: true
				});
			}

			await this.saveMigrationHistory(history);

		} catch (error) {
			// Attempt to restore from backup on failure
			try {
				const backupExists = await this.fileExists(backupPath);
				if (backupExists) {
					await fs.copyFile(backupPath, filePath);
				}
			} catch (restoreError) {
				console.error(`Failed to restore backup: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`);
			}
			throw error;
		}
	}

	async rollbackMigration(version: string, entityType: string): Promise<void> {
		const migration = this.migrations.get(version);
		if (!migration) {
			throw new Error(`Migration ${version} not found`);
		}

		const filePath = path.join(this.dataDir, `${entityType}.json`);
		const backupPath = path.join(
			this.migrationDir,
			`${entityType}_pre_rollback_${version}_${Date.now()}.backup`
		);

		try {
			// Create backup before rollback
			const exists = await this.fileExists(filePath);
			if (exists) {
				await fs.copyFile(filePath, backupPath);
			}

			// Read current data
			const data = exists ? JSON.parse(await fs.readFile(filePath, 'utf-8')) : [];

			// Apply rollback
			const rolledBackData = await migration.down(data);

			// Write rolled back data
			await fs.writeFile(filePath, JSON.stringify(rolledBackData, null, 2), 'utf-8');

			// Update migration history
			const history = await this.getMigrationHistory();
			const existingEntry = history.find(h => h.version === version);

			if (existingEntry) {
				existingEntry.applied = false;
				existingEntry.timestamp = new Date();
			}

			await this.saveMigrationHistory(history);

		} catch (error) {
			// Attempt to restore from backup on failure
			try {
				const backupExists = await this.fileExists(backupPath);
				if (backupExists) {
					await fs.copyFile(backupPath, filePath);
				}
			} catch (restoreError) {
				console.error(`Failed to restore backup: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`);
			}
			throw error;
		}
	}

	async exportForDatabase(outputPath: string, filters?: Record<string, unknown>): Promise<ExportFormat> {
		const exportData: ExportFormat = {
			version: '1.0.0',
			timestamp: new Date(),
			entities: {
				events: [],
				users: [],
				topics: [],
				votes: []
			},
			metadata: {
				totalRecords: 0,
				exportType: filters ? 'filtered' : 'full',
				filters
			}
		};

		const entityTypes = ['events', 'users', 'topics', 'votes'];

		for (const entityType of entityTypes) {
			try {
				const filePath = path.join(this.dataDir, `${entityType}.json`);
				const exists = await this.fileExists(filePath);

				if (exists) {
					const content = await fs.readFile(filePath, 'utf-8');
					let data = JSON.parse(content);

					// Apply filters if provided
					if (filters) {
						data = this.applyFilters(data, filters);
					}

					exportData.entities[entityType as keyof typeof exportData.entities] = data;
					exportData.metadata.totalRecords += data.length;
				}
			} catch (error) {
				console.warn(`Failed to export ${entityType}: ${error instanceof Error ? error.message : String(error)}`);
			}
		}

		// Write export file
		await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2), 'utf-8');

		return exportData;
	}

	async generateDatabaseSchema(): Promise<string> {
		// Generate SQL schema for future database migration
		return `
-- UnConf Database Schema
-- Generated on ${new Date().toISOString()}

-- Events table
CREATE TABLE events (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status ENUM('draft', 'active', 'paused', 'completed') NOT NULL DEFAULT 'draft',
    organizer_id VARCHAR(255) NOT NULL,
    max_participants INT NULL,
    access_code VARCHAR(20) NOT NULL UNIQUE,
    qr_code TEXT NULL,
    start_time TIMESTAMP NULL,
    end_time TIMESTAMP NULL,
    current_activity ENUM('voting', 'intelligence', 'discussion', 'teams') NULL,
    settings JSON NOT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_events_status (status),
    INDEX idx_events_organizer (organizer_id),
    INDEX idx_events_access_code (access_code),
    INDEX idx_events_start_time (start_time)
);

-- Users table
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NULL UNIQUE,
    role ENUM('guest', 'participant', 'organizer', 'admin') NOT NULL DEFAULT 'participant',
    is_guest BOOLEAN NOT NULL DEFAULT FALSE,
    avatar TEXT NULL,
    current_event_id VARCHAR(255) NULL,
    last_active_at TIMESTAMP NOT NULL,
    preferences JSON NULL,
    metadata JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_current_event (current_event_id),
    INDEX idx_users_last_active (last_active_at),
    FOREIGN KEY (current_event_id) REFERENCES events(id) ON DELETE SET NULL
);

-- Topics table
CREATE TABLE topics (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    event_id VARCHAR(255) NOT NULL,
    submitted_by VARCHAR(255) NOT NULL,
    status ENUM('draft', 'active', 'frozen', 'archived') NOT NULL DEFAULT 'draft',
    tags JSON NULL,
    vote_count INT NOT NULL DEFAULT 0,
    total_vote_weight INT NOT NULL DEFAULT 0,
    average_weight DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    last_voted_at TIMESTAMP NULL,
    metadata JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_topics_event (event_id),
    INDEX idx_topics_submitter (submitted_by),
    INDEX idx_topics_status (status),
    INDEX idx_topics_vote_weight (total_vote_weight),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Votes table
CREATE TABLE votes (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    topic_id VARCHAR(255) NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    weight ENUM('first', 'second', 'third') NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_user_topic_vote (user_id, topic_id, is_active),
    INDEX idx_votes_user (user_id),
    INDEX idx_votes_topic (topic_id),
    INDEX idx_votes_event (event_id),
    INDEX idx_votes_weight (weight),
    INDEX idx_votes_timestamp (timestamp),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_events_datetime_range ON events(start_time, end_time);
CREATE INDEX idx_users_guest_active ON users(is_guest, last_active_at);
CREATE INDEX idx_topics_event_status_votes ON topics(event_id, status, total_vote_weight);
CREATE INDEX idx_votes_active_weight ON votes(is_active, weight, timestamp);
`;
	}

	private applyFilters(data: any[], filters: Record<string, unknown>): any[] {
		return data.filter(item => {
			return Object.entries(filters).every(([key, value]) => {
				if (Array.isArray(value)) {
					return value.includes(item[key]);
				}
				return item[key] === value;
			});
		});
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

// Built-in migrations
export const defaultMigrations: MigrationScript[] = [
	{
		version: '1.0.0',
		description: 'Initial schema setup',
		up: async (data: any[]) => {
			// Ensure all entities have required base fields
			return data.map(item => ({
				...item,
				id: item.id || `migrated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				createdAt: item.createdAt || new Date().toISOString(),
				updatedAt: item.updatedAt || new Date().toISOString()
			}));
		},
		down: async (data: any[]) => data
	},
	{
		version: '1.1.0',
		description: 'Add metadata fields to all entities',
		up: async (data: any[]) => {
			return data.map(item => ({
				...item,
				metadata: item.metadata || {}
			}));
		},
		down: async (data: any[]) => {
			return data.map(item => {
				const { metadata, ...rest } = item;
				return rest;
			});
		}
	}
];