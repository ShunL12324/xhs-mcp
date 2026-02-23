/**
 * @fileoverview Explore Repository - 探索会话和日志管理
 * @module db/repos/explore
 */

import type { Database } from 'better-sqlite3';
import { randomUUID } from 'crypto';
import type { ExploreSessionRow, ExploreLogRow } from '../schema.js';

/**
 * 探索会话配置
 */
export interface ExploreConfig {
  interests?: string[];
  openRate?: number;
  likeRate?: number;
  commentRate?: number;
  duration?: number;
}

/**
 * 探索日志条目
 */
export interface ExploreLogEntry {
  noteId: string;
  noteTitle?: string;
  action: 'seen' | 'opened' | 'liked' | 'commented';
  content?: string;
  aiReason?: string;
}

/**
 * 探索会话统计
 */
export interface ExploreSessionStats {
  notesSeen: number;
  notesOpened: number;
  notesLiked: number;
  notesCommented: number;
}

/**
 * 探索会话结果
 */
export interface ExploreSessionResult {
  sessionId: string;
  accountId: string;
  startedAt: string;
  endedAt: string | null;
  duration: number;
  stats: ExploreSessionStats;
  actions: Array<{
    noteId: string;
    noteTitle: string | null;
    action: string;
    content: string | null;
    aiReason: string | null;
    timestamp: string;
  }>;
}

/**
 * Explore Repository - 管理探索会话和日志
 */
export class ExploreRepository {
  constructor(private db: Database) {}

  /**
   * 创建新的探索会话
   */
  createSession(accountId: string, config?: ExploreConfig): string {
    const sessionId = randomUUID();
    const now = new Date().toISOString();

    this.db
      .prepare(
        `
      INSERT INTO explore_sessions (id, account_id, started_at, config, status)
      VALUES (?, ?, ?, ?, 'running')
    `,
      )
      .run(sessionId, accountId, now, config ? JSON.stringify(config) : null);

    return sessionId;
  }

  /**
   * 更新会话统计
   */
  updateSessionStats(sessionId: string, stats: Partial<ExploreSessionStats>): void {
    const updates: string[] = [];
    const values: any[] = [];

    if (stats.notesSeen !== undefined) {
      updates.push('notes_seen = ?');
      values.push(stats.notesSeen);
    }
    if (stats.notesOpened !== undefined) {
      updates.push('notes_opened = ?');
      values.push(stats.notesOpened);
    }
    if (stats.notesLiked !== undefined) {
      updates.push('notes_liked = ?');
      values.push(stats.notesLiked);
    }
    if (stats.notesCommented !== undefined) {
      updates.push('notes_commented = ?');
      values.push(stats.notesCommented);
    }

    if (updates.length === 0) return;

    values.push(sessionId);
    this.db
      .prepare(
        `
      UPDATE explore_sessions SET ${updates.join(', ')} WHERE id = ?
    `,
      )
      .run(...values);
  }

  /**
   * 结束会话
   */
  endSession(sessionId: string, status: 'completed' | 'stopped' = 'completed'): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `
      UPDATE explore_sessions SET ended_at = ?, status = ? WHERE id = ?
    `,
      )
      .run(now, status, sessionId);
  }

  /**
   * 记录探索日志
   */
  logAction(sessionId: string, entry: ExploreLogEntry): void {
    this.db
      .prepare(
        `
      INSERT INTO explore_logs (session_id, note_id, note_title, action, content, ai_reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        sessionId,
        entry.noteId,
        entry.noteTitle || null,
        entry.action,
        entry.content || null,
        entry.aiReason || null,
      );
  }

  /**
   * 批量记录已看到的笔记
   */
  logSeenNotes(sessionId: string, notes: Array<{ id: string; title: string }>): void {
    const stmt = this.db.prepare(`
      INSERT INTO explore_logs (session_id, note_id, note_title, action)
      VALUES (?, ?, ?, 'seen')
    `);

    for (const note of notes) {
      stmt.run(sessionId, note.id, note.title);
    }
  }

  /**
   * 记录已探索的笔记（用于去重）
   */
  markNoteExplored(accountId: string, noteId: string, interacted: boolean = false): void {
    this.db
      .prepare(
        `
      INSERT OR IGNORE INTO explored_notes (account_id, note_id, interacted)
      VALUES (?, ?, ?)
    `,
      )
      .run(accountId, noteId, interacted ? 1 : 0);

    if (interacted) {
      this.db
        .prepare(
          `
        UPDATE explored_notes SET interacted = 1 WHERE account_id = ? AND note_id = ?
      `,
        )
        .run(accountId, noteId);
    }
  }

  /**
   * 批量记录已探索的笔记
   */
  markNotesExplored(accountId: string, noteIds: string[]): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO explored_notes (account_id, note_id)
      VALUES (?, ?)
    `);

    for (const noteId of noteIds) {
      stmt.run(accountId, noteId);
    }
  }

  /**
   * 检查笔记是否已探索过
   */
  isNoteExplored(accountId: string, noteId: string): boolean {
    const row = this.db
      .prepare(
        `
      SELECT 1 FROM explored_notes WHERE account_id = ? AND note_id = ?
    `,
      )
      .get(accountId, noteId);
    return !!row;
  }

  /**
   * 过滤出未探索过的笔记
   */
  filterUnexploredNotes(accountId: string, noteIds: string[]): string[] {
    if (noteIds.length === 0) return [];

    const placeholders = noteIds.map(() => '?').join(',');
    const exploredRows = this.db
      .prepare(
        `
      SELECT note_id FROM explored_notes
      WHERE account_id = ? AND note_id IN (${placeholders})
    `,
      )
      .all(accountId, ...noteIds) as { note_id: string }[];

    const exploredSet = new Set(exploredRows.map((r) => r.note_id));
    return noteIds.filter((id) => !exploredSet.has(id));
  }

  /**
   * 获取会话结果
   */
  getSessionResult(sessionId: string): ExploreSessionResult | null {
    const session = this.db
      .prepare(
        `
      SELECT * FROM explore_sessions WHERE id = ?
    `,
      )
      .get(sessionId) as ExploreSessionRow | undefined;

    if (!session) return null;

    const logs = this.db
      .prepare(
        `
      SELECT * FROM explore_logs
      WHERE session_id = ? AND action != 'seen'
      ORDER BY created_at ASC
    `,
      )
      .all(sessionId) as ExploreLogRow[];

    // 计算持续时间
    const startedAt = new Date(session.started_at);
    const endedAt = session.ended_at ? new Date(session.ended_at) : new Date();
    const duration = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

    return {
      sessionId: session.id,
      accountId: session.account_id,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      duration,
      stats: {
        notesSeen: session.notes_seen,
        notesOpened: session.notes_opened,
        notesLiked: session.notes_liked,
        notesCommented: session.notes_commented,
      },
      actions: logs.map((log) => ({
        noteId: log.note_id,
        noteTitle: log.note_title,
        action: log.action,
        content: log.content,
        aiReason: log.ai_reason,
        timestamp: log.created_at,
      })),
    };
  }

  /**
   * 获取账户的最近探索会话
   */
  getRecentSessions(accountId: string, limit: number = 10): ExploreSessionRow[] {
    return this.db
      .prepare(
        `
      SELECT * FROM explore_sessions
      WHERE account_id = ?
      ORDER BY started_at DESC
      LIMIT ?
    `,
      )
      .all(accountId, limit) as ExploreSessionRow[];
  }
}
