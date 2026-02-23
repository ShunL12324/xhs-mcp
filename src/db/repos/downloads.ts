/**
 * @fileoverview Downloads repository for database operations.
 * @module db/repos/downloads
 */

import Database from 'better-sqlite3';
import { DownloadRow } from '../schema.js';

/**
 * Downloads repository - manages download records
 */
export class DownloadRepository {
  constructor(private db: Database.Database) {}

  /**
   * Record a download
   */
  record(params: {
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
      params.fileSize || null,
    );
    return info.lastInsertRowid as number;
  }

  /**
   * Get downloads for a note
   */
  findByNoteId(noteId: string): DownloadRow[] {
    const stmt = this.db.prepare('SELECT * FROM downloads WHERE note_id = ? ORDER BY created_at DESC');
    return stmt.all(noteId) as DownloadRow[];
  }
}
