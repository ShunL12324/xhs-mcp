/**
 * @fileoverview Interactions repository for database operations.
 * @module db/repos/interactions
 */

import Database from 'better-sqlite3';

/**
 * Interactions repository - manages interaction records
 */
export class InteractionRepository {
  constructor(private db: Database.Database) {}

  /**
   * Record an interaction
   */
  record(params: {
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
}
