/**
 * @fileoverview Operations repository for database operations.
 * @module db/repos/operations
 */

import Database from 'better-sqlite3';
import { OperationLogRow } from '../schema.js';

/**
 * Domain model for an operation log entry.
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
 * Operations repository - manages operation log CRUD operations
 */
export class OperationRepository {
  constructor(private db: Database.Database) {}

  /**
   * Log an operation
   */
  log(params: {
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
      params.durationMs || null,
    );
    return info.lastInsertRowid as number;
  }

  /**
   * Get operation logs for an account
   */
  findByAccountId(accountId: string, options?: { limit?: number; offset?: number; action?: string }): OperationLog[] {
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
  getStats(accountId: string): AccountStats {
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM operation_logs WHERE account_id = ?');
    const successStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM operation_logs WHERE account_id = ? AND success = 1',
    );
    const byActionStmt = this.db.prepare(
      'SELECT action, COUNT(*) as count FROM operation_logs WHERE account_id = ? GROUP BY action',
    );
    const lastOpStmt = this.db.prepare(
      'SELECT created_at FROM operation_logs WHERE account_id = ? ORDER BY created_at DESC LIMIT 1',
    );

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
}
