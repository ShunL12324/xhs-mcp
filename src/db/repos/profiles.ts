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
  /** IP location (e.g., "浙江") */
  ipLocation?: string;
  /** Number of followers (粉丝) */
  followers?: number;
  /** Number of users being followed (关注) */
  following?: number;
  /** Total likes and collects received (获赞与收藏) */
  likeAndCollect?: number;
  /** Number of published notes */
  notesCount?: number;
  /** Whether account is banned by platform */
  isBanned?: boolean;
  /** Ban code from platform */
  banCode?: number;
  /** Ban reason from platform */
  banReason?: string;
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
      INSERT INTO account_profiles (
        account_id, user_id, red_id, nickname, avatar, description, gender,
        ip_location, followers, following, like_and_collect, notes_count,
        is_banned, ban_code, ban_reason, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(account_id) DO UPDATE SET
        user_id = excluded.user_id,
        red_id = excluded.red_id,
        nickname = excluded.nickname,
        avatar = excluded.avatar,
        description = excluded.description,
        gender = excluded.gender,
        ip_location = excluded.ip_location,
        followers = excluded.followers,
        following = excluded.following,
        like_and_collect = excluded.like_and_collect,
        notes_count = excluded.notes_count,
        is_banned = excluded.is_banned,
        ban_code = excluded.ban_code,
        ban_reason = excluded.ban_reason,
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
      profile.ipLocation || null,
      profile.followers ?? null,
      profile.following ?? null,
      profile.likeAndCollect ?? null,
      profile.notesCount || null,
      profile.isBanned !== undefined ? (profile.isBanned ? 1 : 0) : null,
      profile.banCode ?? null,
      profile.banReason || null,
      now,
    );
  }

  /**
   * Get account profile
   */
  findByAccountId(accountId: string): AccountProfile | null {
    const stmt = this.db.prepare('SELECT * FROM account_profiles WHERE account_id = ?');
    const row = stmt.get(accountId) as AccountProfileRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  /**
   * 通过小红书 userId 查找关联的账户资料
   * 用于登录时检测是否为已有账户的重新登录
   */
  findByUserId(userId: string): AccountProfile | null {
    const stmt = this.db.prepare('SELECT * FROM account_profiles WHERE user_id = ?');
    const row = stmt.get(userId) as AccountProfileRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  private mapRow(row: AccountProfileRow): AccountProfile {
    return {
      accountId: row.account_id,
      userId: row.user_id || undefined,
      redId: row.red_id || undefined,
      nickname: row.nickname || undefined,
      avatar: row.avatar || undefined,
      description: row.description || undefined,
      gender: row.gender ?? undefined,
      ipLocation: row.ip_location || undefined,
      followers: row.followers ?? undefined,
      following: row.following ?? undefined,
      likeAndCollect: row.like_and_collect ?? undefined,
      notesCount: row.notes_count || undefined,
      isBanned: row.is_banned ?? undefined,
      banCode: row.ban_code ?? undefined,
      banReason: row.ban_reason || undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    };
  }
}
