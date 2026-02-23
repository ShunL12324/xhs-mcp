/**
 * @fileoverview Published notes repository for database operations.
 * @module db/repos/published
 */

import Database from 'better-sqlite3';

/**
 * Published notes repository - manages published note records
 */
export class PublishedRepository {
  constructor(private db: Database.Database) {}

  /**
   * Record a published note
   */
  record(params: {
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
      params.publishedAt?.toISOString() || new Date().toISOString(),
    );
    return info.lastInsertRowid as number;
  }
}
