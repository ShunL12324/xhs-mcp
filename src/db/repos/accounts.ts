/**
 * @fileoverview Account repository for database operations.
 * @module db/repos/accounts
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { AccountRow } from '../schema.js';

/**
 * Domain model for a Xiaohongshu account.
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
 * Account repository - manages account CRUD operations
 */
export class AccountRepository {
  constructor(private db: Database.Database) {}

  /**
   * Create a new account
   */
  create(name: string, proxy?: string): Account {
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
  findById(id: string): Account | null {
    const stmt = this.db.prepare('SELECT * FROM accounts WHERE id = ?');
    const row = stmt.get(id) as AccountRow | undefined;
    return row ? this.rowToAccount(row) : null;
  }

  /**
   * Get account by name
   */
  findByName(name: string): Account | null {
    const stmt = this.db.prepare('SELECT * FROM accounts WHERE name = ?');
    const row = stmt.get(name) as AccountRow | undefined;
    return row ? this.rowToAccount(row) : null;
  }

  /**
   * Get all accounts
   */
  findAll(): Account[] {
    const stmt = this.db.prepare('SELECT * FROM accounts ORDER BY created_at DESC');
    const rows = stmt.all() as AccountRow[];
    return rows.map((row) => this.rowToAccount(row));
  }

  /**
   * Get active accounts
   */
  findActive(): Account[] {
    const stmt = this.db.prepare("SELECT * FROM accounts WHERE status = 'active' ORDER BY created_at DESC");
    const rows = stmt.all() as AccountRow[];
    return rows.map((row) => this.rowToAccount(row));
  }

  /**
   * Update account state (Playwright cookies)
   */
  updateState(id: string, state: any): void {
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
  touch(id: string): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare('UPDATE accounts SET last_active_at = ?, updated_at = ? WHERE id = ?');
    stmt.run(now, now, id);
  }

  /**
   * Update account configuration
   */
  updateConfig(
    id: string,
    updates: { name?: string; proxy?: string; status?: 'active' | 'suspended' | 'banned' },
  ): void {
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
  delete(id: string): boolean {
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
}
