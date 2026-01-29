/**
 * @fileoverview Config repository for database operations.
 * @module db/repos/config
 */

import Database from 'better-sqlite3';

/**
 * Config repository - manages key-value configuration
 */
export class ConfigRepository {
  constructor(private db: Database.Database) {}

  /**
   * Set a config value
   */
  set(key: string, value: any): void {
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
  get<T = any>(key: string): T | null {
    const stmt = this.db.prepare('SELECT value FROM config WHERE key = ?');
    const row = stmt.get(key) as { value: string } | undefined;
    return row?.value ? JSON.parse(row.value) : null;
  }

  /**
   * Delete a config value
   */
  delete(key: string): boolean {
    const stmt = this.db.prepare('DELETE FROM config WHERE key = ?');
    const result = stmt.run(key);
    return result.changes > 0;
  }
}
