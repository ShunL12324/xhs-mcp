/**
 * @fileoverview Database access layer for xhs-mcp.
 * Provides a singleton XhsDatabase class that composes all repositories.
 * All database operations are synchronous for simplicity and performance.
 * @module db
 */

import Database from 'better-sqlite3';
import { paths, ensureDirectories } from '../core/paths.js';
import { SCHEMA_SQL } from './schema.js';

// Import repositories
import {
  AccountRepository,
  ProfileRepository,
  OperationRepository,
  PublishedRepository,
  InteractionRepository,
  DownloadRepository,
  ConfigRepository,
} from './repos/index.js';

// Re-export domain models
export type { Account } from './repos/accounts.js';
export type { AccountProfile } from './repos/profiles.js';
export type { OperationLog, AccountStats } from './repos/operations.js';

// Re-export schema types
export type {
  AccountRow,
  AccountProfileRow,
  OperationLogRow,
  PublishedNoteRow,
  InteractionRow,
  DownloadRow,
  ConfigRow,
  NoteDraftRow,
} from './schema.js';

/**
 * Database access class for xhs-mcp.
 * Composes all repositories with application-specific methods.
 * Uses WAL mode for better concurrent performance.
 */
export class XhsDatabase {
  private db: Database.Database;

  // Repositories
  readonly accounts: AccountRepository;
  readonly profiles: ProfileRepository;
  readonly operations: OperationRepository;
  readonly published: PublishedRepository;
  readonly interactions: InteractionRepository;
  readonly downloads: DownloadRepository;
  readonly config: ConfigRepository;

  /**
   * Create a new database instance.
   * @param dbPath - Path to the SQLite database file
   */
  constructor(dbPath: string = paths.database) {
    this.db = new Database(dbPath);
    // Enable WAL mode for better write performance
    this.db.pragma('journal_mode = WAL');
    // Enable foreign key constraints
    this.db.pragma('foreign_keys = ON');

    // Initialize repositories
    this.accounts = new AccountRepository(this.db);
    this.profiles = new ProfileRepository(this.db);
    this.operations = new OperationRepository(this.db);
    this.published = new PublishedRepository(this.db);
    this.interactions = new InteractionRepository(this.db);
    this.downloads = new DownloadRepository(this.db);
    this.config = new ConfigRepository(this.db);
  }

  /**
   * Initialize the database schema
   */
  async init(): Promise<void> {
    await ensureDirectories();
    this.db.exec(SCHEMA_SQL);
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }

  // ============ Generic Query Methods ============

  /**
   * Execute a SQL statement with parameters
   */
  run(sql: string, params: any[] = []): Database.RunResult {
    const stmt = this.db.prepare(sql);
    return stmt.run(...params);
  }

  /**
   * Get a single row from the database
   */
  get(sql: string, params: any[] = []): any {
    const stmt = this.db.prepare(sql);
    return stmt.get(...params);
  }

  /**
   * Get all rows from the database
   */
  all(sql: string, params: any[] = []): any[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }
}

// Singleton instance
let dbInstance: XhsDatabase | null = null;

/**
 * Get the database instance (singleton)
 * Note: This is synchronous and assumes directories already exist.
 * Use initDatabase() for initial setup.
 */
export function getDatabase(): XhsDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}

/**
 * Initialize the database
 */
export async function initDatabase(): Promise<XhsDatabase> {
  if (!dbInstance) {
    await ensureDirectories();
    dbInstance = new XhsDatabase();
    await dbInstance.init();
  }
  return dbInstance;
}
