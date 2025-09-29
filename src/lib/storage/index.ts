/**
 * Storage Layer for UnConf Platform
 *
 * This module provides a complete data persistence layer using JSON files
 * with repository pattern, atomic operations, backup functionality, and
 * migration utilities for future database transition.
 */

import { MigrationManager } from './MigrationManager';
import { ErrorHandler } from './ErrorHandler';
import { EventRepository } from './EventRepository';
import { UserRepository } from './UserRepository';
import { TopicRepository } from './TopicRepository';
import { VoteRepository } from './VoteRepository';

// Core interfaces and base classes
export { Repository, type RepositoryOperationResult, type QueryOptions, type ValidationResult, type RepositoryError } from './Repository';
export { JSONRepository, type JSONRepositoryConfig } from './JSONRepository';

// Entity-specific repositories
export { EventRepository } from './EventRepository';
export { UserRepository } from './UserRepository';
export { TopicRepository, type TopicWithVoteInfo } from './TopicRepository';
export { VoteRepository } from './VoteRepository';

// Migration and data management utilities
export { MigrationManager, type MigrationVersion, type MigrationScript, type ExportFormat, defaultMigrations } from './MigrationManager';

// Error handling and recovery
export {
  ErrorHandler,
  type DataIntegrityReport,
  type DataIntegrityError,
  type RecoveryOptions,
  type StorageHealthCheck
} from './ErrorHandler';

// Storage configuration and initialization
export interface StorageConfig {
  dataDir: string;
  enableBackups?: boolean;
  backupRetention?: number;
  enableIntegrityChecks?: boolean;
  enableMigrations?: boolean;
}

// Storage manager class that ties everything together
export class StorageManager {
  private readonly config: StorageConfig;
  private readonly migrationManager: MigrationManager;
  private readonly errorHandler: ErrorHandler;

  public readonly events: EventRepository;
  public readonly users: UserRepository;
  public readonly topics: TopicRepository;
  public readonly votes: VoteRepository;

  constructor(config: StorageConfig) {
    this.config = {
      enableBackups: true,
      backupRetention: 5,
      enableIntegrityChecks: true,
      enableMigrations: true,
      ...config
    };

    // Initialize utility classes
    this.migrationManager = new MigrationManager(this.config.dataDir);
    this.errorHandler = new ErrorHandler(this.config.dataDir);

    // Initialize repositories
    const repoConfig = {
      dataDir: this.config.dataDir,
      enableBackups: this.config.enableBackups,
      backupRetention: this.config.backupRetention
    };

    this.events = new EventRepository(repoConfig);
    this.users = new UserRepository(repoConfig);
    this.topics = new TopicRepository(repoConfig);
    this.votes = new VoteRepository(repoConfig);

    // Default migrations will be registered during initialization
  }

  /**
   * Initialize the storage system with health checks and migrations
   */
  async initialize(): Promise<void> {
    try {
      // Perform health check
      if (this.config.enableIntegrityChecks) {
        const healthCheck = await this.errorHandler.performHealthCheck();

        if (healthCheck.overallHealth === 'critical') {
          throw new Error(`Storage system is in critical state: ${healthCheck.issues.map(i => i.message).join(', ')}`);
        }

        // Attempt to recover from any issues
        if (healthCheck.overallHealth === 'degraded') {
          await this.attemptAutoRecovery();
        }
      }

      // Register and apply pending migrations
      if (this.config.enableMigrations) {
        await this.initializeMigrations();
        await this.applyPendingMigrations();
      }

    } catch (error) {
      throw new Error(`Failed to initialize storage system: ${error.message}`);
    }
  }

  /**
   * Perform a comprehensive health check
   */
  async healthCheck(): Promise<StorageHealthCheck> {
    return this.errorHandler.performHealthCheck();
  }

  /**
   * Check data integrity across all entity files
   */
  async checkIntegrity(): Promise<DataIntegrityReport> {
    const files = ['events.json', 'users.json', 'topics.json', 'votes.json'];
    return this.errorHandler.checkDataIntegrity(files);
  }

  /**
   * Export all data for database migration
   */
  async exportForDatabase(outputPath: string, filters?: Record<string, unknown>): Promise<ExportFormat> {
    return this.migrationManager.exportForDatabase(outputPath, filters);
  }

  /**
   * Generate SQL schema for database migration
   */
  async generateDatabaseSchema(): Promise<string> {
    return this.migrationManager.generateDatabaseSchema();
  }

  /**
   * Backup all data files manually
   */
  async createBackup(): Promise<void> {
    const repositories = [this.events, this.users, this.topics, this.votes];

    for (const repo of repositories) {
      // Force a backup by triggering a write operation
      const data = await (repo as any).readData();
      await (repo as any).writeData(data);
    }
  }

  /**
   * Attempt automatic recovery from common issues
   */
  private async attemptAutoRecovery(): Promise<void> {
    const integrityReport = await this.checkIntegrity();

    for (const error of integrityReport.errors) {
      if (error.recoverable) {
        const success = await this.errorHandler.recoverFromBackup(error.file, {
          useBackup: true,
          createNewFile: true,
          validateAfterRecovery: true
        });

        if (!success) {
          console.warn(`Failed to recover ${error.file}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Initialize and register default migrations
   */
  private async initializeMigrations(): Promise<void> {
    const { defaultMigrations } = await import('./MigrationManager');

    for (const migration of defaultMigrations) {
      this.migrationManager.registerMigration(migration);
    }
  }

  /**
   * Apply any pending migrations
   */
  private async applyPendingMigrations(): Promise<void> {
    const pendingMigrations = await this.migrationManager.getPendingMigrations();
    const entityTypes = ['events', 'users', 'topics', 'votes'];

    for (const migration of pendingMigrations) {
      for (const entityType of entityTypes) {
        try {
          await this.migrationManager.applyMigration(migration.version, entityType);
        } catch (error) {
          console.warn(`Failed to apply migration ${migration.version} to ${entityType}: ${error.message}`);
        }
      }
    }
  }
}

// Default storage instance factory
export function createStorage(config: StorageConfig): StorageManager {
  return new StorageManager(config);
}

// Storage singleton for application use
let storageInstance: StorageManager | null = null;

export function getStorage(): StorageManager {
  if (!storageInstance) {
    throw new Error('Storage not initialized. Call initializeStorage() first.');
  }
  return storageInstance;
}

export async function initializeStorage(config: StorageConfig): Promise<StorageManager> {
  storageInstance = createStorage(config);
  await storageInstance.initialize();
  return storageInstance;
}