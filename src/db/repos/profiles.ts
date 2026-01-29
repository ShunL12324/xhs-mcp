/**
 * @fileoverview Profile repository for database operations.
 * @module db/repos/profiles
 */

import Database from 'better-sqlite3';
import { AccountProfileRow } from '../schema.js';

/**
 * Domain model for an account's Xiaohongshu profile.
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
 * Profile repository - manages account profile CRUD operations
 */
export class ProfileRepository {
  constructor(private db: Database.Database) {}

  /**
   * Update or insert account profile
   */
  upsert(profile: AccountProfile): void {
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
  findByAccountId(accountId: string): AccountProfile | null {
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
}
