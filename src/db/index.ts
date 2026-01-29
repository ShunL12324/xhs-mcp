/**
 * @fileoverview Database access layer for xhs-mcp.
 * Provides a singleton XhsDatabase class that wraps better-sqlite3 operations.
 * All database operations are synchronous for simplicity and performance.
 * @module db
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { paths, ensureDirectories } from '../core/paths.js';
import {
  SCHEMA_SQL,
  AccountRow,
  AccountProfileRow,
  OperationLogRow,
  PublishedNoteRow,
  InteractionRow,
  DownloadRow,
  ConfigRow,
} from './schema.js';

/**
 * Domain model for a Xiaohongshu account.
 * Represents the application-level view of account data.
 */
export interface Account {
  /** Unique identifier (UUID) */
  id: string;
  /** Human-readable account name */
  name: string;
  /** Optional proxy server URL for this account */
  proxy?: string;
  /** Playwright storage state (cookies, localStorage) */
  state?: any;
  /** Account status: active, suspended, or banned */
  status: 'active' | 'suspended' | 'banned';
  /** Timestamp of last successful login */
  lastLoginAt?: Date;
  /** Timestamp of last activity */
  lastActiveAt?: Date;
  /** Account creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Domain model for an account's Xiaohongshu profile.
 * Cached information fetched from the platform.
 */
export interface AccountProfile {
  /** Account ID this profile belongs to */
  accountId: string;
  /** Xiaohongshu user ID */
  userId?: string;
  /** Xiaohongshu Red ID (numeric string shown in profile) */
  redId?: string;
  /** Display name on Xiaohongshu */
  nickname?: string;
  /** Avatar image URL */
  avatar?: string;
  /** User bio/description */
  description?: string;
  /** Gender (0 = not specified, 1 = male, 2 = female) */
  gender?: number;
  /** Number of followers */
  followers?: number;
  /** Number of users being followed */
  following?: number;
  /** Number of published notes */
  notesCount?: number;
  /** Last profile update timestamp */
  updatedAt?: Date;
}

/**
 * Domain model for an operation log entry.
 * Records all operations performed through the MCP server.
 */
export interface OperationLog {
  /** Log entry ID */
  id: number;
  /** Account that performed the operation */
  accountId: string;
  /** Action type (e.g., 'search', 'like', 'publish_content') */
  action: string;
  /** Target resource ID (e.g., note ID) */
  targetId?: string;
  /** Operation parameters */
  params?: any;
  /** Operation result */
  result?: any;
  /** Whether the operation succeeded */
  success: boolean;
  /** Error message if operation failed */
  error?: string;
  /** Operation duration in milliseconds */
  durationMs?: number;
  /** Operation timestamp */
  createdAt: Date;
}

/**
 * Aggregated statistics for an account's operations.
 */
export interface AccountStats {
  /** Total number of operations performed */
  totalOperations: number;
  /** Number of successful operations */
  successfulOperations: number;
  /** Number of failed operations */
  failedOperations: number;
  /** Breakdown of operations by action type */
  operationsByAction: Record<string, number>;
  /** Timestamp of last operation */
  lastOperation?: Date;
}

/**
 * Database access class for xhs-mcp.
 * Wraps better-sqlite3 with application-specific methods.
 * Uses WAL mode for better concurrent performance.
 */
export class XhsDatabase {
  private db: Database.Database;

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

  // ============ Accounts ============

  /**
   * Create a new account
   */
  createAccount(name: string, proxy?: string): Account {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO accounts (id, name, proxy, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, name, proxy || null, now, now);

    return {
      id,
      name,
      proxy,
      status: 'active',
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  /**
   * Get account by ID
   */
  getAccountById(id: string): Account | null {
    const stmt = this.db.prepare('SELECT * FROM accounts WHERE id = ?');
    const row = stmt.get(id) as AccountRow | undefined;
    return row ? this.rowToAccount(row) : null;
  }

  /**
   * Get account by name
   */
  getAccountByName(name: string): Account | null {
    const stmt = this.db.prepare('SELECT * FROM accounts WHERE name = ?');
    const row = stmt.get(name) as AccountRow | undefined;
    return row ? this.rowToAccount(row) : null;
  }

  /**
   * Get all accounts
   */
  getAllAccounts(): Account[] {
    const stmt = this.db.prepare('SELECT * FROM accounts ORDER BY created_at DESC');
    const rows = stmt.all() as AccountRow[];
    return rows.map((row) => this.rowToAccount(row));
  }

  /**
   * Get active accounts
   */
  getActiveAccounts(): Account[] {
    const stmt = this.db.prepare("SELECT * FROM accounts WHERE status = 'active' ORDER BY created_at DESC");
    const rows = stmt.all() as AccountRow[];
    return rows.map((row) => this.rowToAccount(row));
  }

  /**
   * Update account state (Playwright cookies)
   */
  updateAccountState(id: string, state: any): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE accounts SET state = ?, last_login_at = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(JSON.stringify(state), now, now, id);
  }

  /**
   * Update account last active time
   */
  touchAccount(id: string): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare('UPDATE accounts SET last_active_at = ?, updated_at = ? WHERE id = ?');
    stmt.run(now, now, id);
  }

  /**
   * Update account configuration
   */
  updateAccountConfig(id: string, updates: { name?: string; proxy?: string; status?: 'active' | 'suspended' | 'banned' }): void {
    const now = new Date().toISOString();
    const sets: string[] = ['updated_at = ?'];
    const values: any[] = [now];

    if (updates.name !== undefined) {
      sets.push('name = ?');
      values.push(updates.name);
    }
    if (updates.proxy !== undefined) {
      sets.push('proxy = ?');
      values.push(updates.proxy || null);
    }
    if (updates.status !== undefined) {
      sets.push('status = ?');
      values.push(updates.status);
    }

    values.push(id);
    const stmt = this.db.prepare(`UPDATE accounts SET ${sets.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  }

  /**
   * Delete an account
   */
  deleteAccount(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM accounts WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  private rowToAccount(row: AccountRow): Account {
    return {
      id: row.id,
      name: row.name,
      proxy: row.proxy || undefined,
      state: row.state ? JSON.parse(row.state) : undefined,
      status: row.status,
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined,
      lastActiveAt: row.last_active_at ? new Date(row.last_active_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  // ============ Account Profiles ============

  /**
   * Update or insert account profile
   */
  upsertAccountProfile(profile: AccountProfile): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO account_profiles (account_id, user_id, red_id, nickname, avatar, description, gender, followers, following, notes_count, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(account_id) DO UPDATE SET
        user_id = excluded.user_id,
        red_id = excluded.red_id,
        nickname = excluded.nickname,
        avatar = excluded.avatar,
        description = excluded.description,
        gender = excluded.gender,
        followers = excluded.followers,
        following = excluded.following,
        notes_count = excluded.notes_count,
        updated_at = excluded.updated_at
    `);
    stmt.run(
      profile.accountId,
      profile.userId || null,
      profile.redId || null,
      profile.nickname || null,
      profile.avatar || null,
      profile.description || null,
      profile.gender ?? null,
      profile.followers || null,
      profile.following || null,
      profile.notesCount || null,
      now
    );
  }

  /**
   * Get account profile
   */
  getAccountProfile(accountId: string): AccountProfile | null {
    const stmt = this.db.prepare('SELECT * FROM account_profiles WHERE account_id = ?');
    const row = stmt.get(accountId) as AccountProfileRow | undefined;
    if (!row) return null;

    return {
      accountId: row.account_id,
      userId: row.user_id || undefined,
      redId: row.red_id || undefined,
      nickname: row.nickname || undefined,
      avatar: row.avatar || undefined,
      description: row.description || undefined,
      gender: row.gender ?? undefined,
      followers: row.followers || undefined,
      following: row.following || undefined,
      notesCount: row.notes_count || undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    };
  }

  // ============ Operation Logs ============

  /**
   * Log an operation
   */
  logOperation(params: {
    accountId: string;
    action: string;
    targetId?: string;
    params?: any;
    result?: any;
    success: boolean;
    error?: string;
    durationMs?: number;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO operation_logs (account_id, action, target_id, params, result, success, error, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      params.accountId,
      params.action,
      params.targetId || null,
      params.params ? JSON.stringify(params.params) : null,
      params.result ? JSON.stringify(params.result) : null,
      params.success ? 1 : 0,
      params.error || null,
      params.durationMs || null
    );
    return info.lastInsertRowid as number;
  }

  /**
   * Get operation logs for an account
   */
  getOperationLogs(accountId: string, options?: { limit?: number; offset?: number; action?: string }): OperationLog[] {
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    let sql = 'SELECT * FROM operation_logs WHERE account_id = ?';
    const params: any[] = [accountId];

    if (options?.action) {
      sql += ' AND action = ?';
      params.push(options.action);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as OperationLogRow[];

    return rows.map((row) => ({
      id: row.id,
      accountId: row.account_id,
      action: row.action,
      targetId: row.target_id || undefined,
      params: row.params ? JSON.parse(row.params) : undefined,
      result: row.result ? JSON.parse(row.result) : undefined,
      success: Boolean(row.success),
      error: row.error || undefined,
      durationMs: row.duration_ms || undefined,
      createdAt: new Date(row.created_at),
    }));
  }

  /**
   * Get account statistics
   */
  getAccountStats(accountId: string): AccountStats {
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM operation_logs WHERE account_id = ?');
    const successStmt = this.db.prepare('SELECT COUNT(*) as count FROM operation_logs WHERE account_id = ? AND success = 1');
    const byActionStmt = this.db.prepare('SELECT action, COUNT(*) as count FROM operation_logs WHERE account_id = ? GROUP BY action');
    const lastOpStmt = this.db.prepare('SELECT created_at FROM operation_logs WHERE account_id = ? ORDER BY created_at DESC LIMIT 1');

    const total = (totalStmt.get(accountId) as { count: number }).count;
    const successful = (successStmt.get(accountId) as { count: number }).count;
    const byAction = byActionStmt.all(accountId) as { action: string; count: number }[];
    const lastOp = lastOpStmt.get(accountId) as { created_at: string } | undefined;

    const operationsByAction: Record<string, number> = {};
    for (const row of byAction) {
      operationsByAction[row.action] = row.count;
    }

    return {
      totalOperations: total,
      successfulOperations: successful,
      failedOperations: total - successful,
      operationsByAction,
      lastOperation: lastOp ? new Date(lastOp.created_at) : undefined,
    };
  }

  // ============ Published Notes ============

  /**
   * Record a published note
   */
  recordPublishedNote(params: {
    accountId: string;
    noteId?: string;
    title: string;
    content?: string;
    noteType: 'image' | 'video';
    images?: string[];
    videoPath?: string;
    tags?: string[];
    status?: 'draft' | 'scheduled' | 'published' | 'deleted';
    publishedAt?: Date;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO published_notes (account_id, note_id, title, content, note_type, images, video_path, tags, status, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      params.accountId,
      params.noteId || null,
      params.title,
      params.content || null,
      params.noteType,
      params.images ? JSON.stringify(params.images) : null,
      params.videoPath || null,
      params.tags ? JSON.stringify(params.tags) : null,
      params.status || 'published',
      params.publishedAt?.toISOString() || new Date().toISOString()
    );
    return info.lastInsertRowid as number;
  }

  // ============ Interactions ============

  /**
   * Record an interaction
   */
  recordInteraction(params: {
    accountId: string;
    targetNoteId: string;
    targetUserId?: string;
    action: 'like' | 'unlike' | 'favorite' | 'unfavorite' | 'comment' | 'reply';
    commentId?: string;
    commentContent?: string;
    success: boolean;
    error?: string;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO interactions (account_id, target_note_id, target_user_id, action, comment_id, comment_content, success, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      params.accountId,
      params.targetNoteId,
      params.targetUserId || null,
      params.action,
      params.commentId || null,
      params.commentContent || null,
      params.success ? 1 : 0,
      params.error || null
    );
    return info.lastInsertRowid as number;
  }

  // ============ Downloads ============

  /**
   * Record a download
   */
  recordDownload(params: {
    noteId: string;
    fileType: 'image' | 'video';
    filePath: string;
    originalUrl?: string;
    fileSize?: number;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO downloads (note_id, file_type, file_path, original_url, file_size)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      params.noteId,
      params.fileType,
      params.filePath,
      params.originalUrl || null,
      params.fileSize || null
    );
    return info.lastInsertRowid as number;
  }

  /**
   * Get downloads for a note
   */
  getDownloadsForNote(noteId: string): DownloadRow[] {
    const stmt = this.db.prepare('SELECT * FROM downloads WHERE note_id = ? ORDER BY created_at DESC');
    return stmt.all(noteId) as DownloadRow[];
  }

  // ============ Config ============

  /**
   * Set a config value
   */
  setConfig(key: string, value: any): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO config (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
    stmt.run(key, JSON.stringify(value), now);
  }

  /**
   * Get a config value
   */
  getConfig<T = any>(key: string): T | null {
    const stmt = this.db.prepare('SELECT value FROM config WHERE key = ?');
    const row = stmt.get(key) as { value: string } | undefined;
    return row?.value ? JSON.parse(row.value) : null;
  }

  /**
   * Delete a config value
   */
  deleteConfig(key: string): boolean {
    const stmt = this.db.prepare('DELETE FROM config WHERE key = ?');
    const result = stmt.run(key);
    return result.changes > 0;
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
