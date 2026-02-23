/**
 * @fileoverview Repository for my published notes (cached from creator center).
 * @module db/repos/my-notes
 */

import type Database from 'better-sqlite3';
import type { MyPublishedNoteRow } from '../schema.js';

/**
 * 我的已发布笔记（从创作者中心缓存）
 */
export interface MyPublishedNote {
  id: string;
  accountId: string;
  type: 'normal' | 'video';
  title: string;
  publishTime: string | null;
  images: string[];
  likes: number;
  collectedCount: number;
  commentsCount: number;
  sharedCount: number;
  viewCount: number;
  sticky: boolean;
  level: number;
  permissionCode: number;
  permissionMsg: string | null;
  schedulePostTime: number;
  xsecToken: string | null;
  fetchedAt: Date;
  updatedAt: Date;
}

/**
 * 查询过滤器
 */
export interface MyNotesFilter {
  /** 笔记类型 */
  type?: 'normal' | 'video';
  /** 笔记等级 (0=正常, 1=流量中, 2=待审核, 3=未通过, 4=仅自己可见) */
  level?: number;
  /** 是否置顶 */
  sticky?: boolean;
  /** 权限码 */
  permissionCode?: number;
  /** 标题包含 */
  titleContains?: string;
  /** 最小点赞数 */
  minLikes?: number;
  /** 最小收藏数 */
  minCollected?: number;
  /** 最小评论数 */
  minComments?: number;
  /** 最小浏览数 */
  minViews?: number;
  /** 发布时间开始 */
  publishTimeStart?: string;
  /** 发布时间结束 */
  publishTimeEnd?: string;
  /** 排序字段 */
  orderBy?: 'publish_time' | 'likes' | 'collected_count' | 'comments_count' | 'view_count' | 'updated_at';
  /** 排序方向 */
  orderDir?: 'asc' | 'desc';
  /** 限制数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
}

/**
 * Repository for my published notes operations.
 */
export class MyNotesRepository {
  constructor(private db: Database.Database) {}

  /**
   * 将数据库行转换为业务对象
   */
  private toNote(row: MyPublishedNoteRow): MyPublishedNote {
    return {
      id: row.id,
      accountId: row.account_id,
      type: row.type,
      title: row.title,
      publishTime: row.publish_time,
      images: row.images ? JSON.parse(row.images) : [],
      likes: row.likes,
      collectedCount: row.collected_count,
      commentsCount: row.comments_count,
      sharedCount: row.shared_count,
      viewCount: row.view_count,
      sticky: !!row.sticky,
      level: row.level,
      permissionCode: row.permission_code,
      permissionMsg: row.permission_msg,
      schedulePostTime: row.schedule_post_time,
      xsecToken: row.xsec_token,
      fetchedAt: new Date(row.fetched_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * 插入或更新笔记（upsert）
   */
  upsert(
    accountId: string,
    note: {
      id: string;
      type?: 'normal' | 'video';
      title: string;
      publishTime?: string;
      images?: string[];
      likes?: number;
      collectedCount?: number;
      commentsCount?: number;
      sharedCount?: number;
      viewCount?: number;
      sticky?: boolean;
      level?: number;
      permissionCode?: number;
      permissionMsg?: string;
      schedulePostTime?: number;
      xsecToken?: string;
    },
  ): void {
    const sql = `
      INSERT INTO my_published_notes (
        id, account_id, type, title, publish_time, images,
        likes, collected_count, comments_count, shared_count, view_count,
        sticky, level, permission_code, permission_msg, schedule_post_time,
        xsec_token, fetched_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        title = excluded.title,
        publish_time = excluded.publish_time,
        images = excluded.images,
        likes = excluded.likes,
        collected_count = excluded.collected_count,
        comments_count = excluded.comments_count,
        shared_count = excluded.shared_count,
        view_count = excluded.view_count,
        sticky = excluded.sticky,
        level = excluded.level,
        permission_code = excluded.permission_code,
        permission_msg = excluded.permission_msg,
        schedule_post_time = excluded.schedule_post_time,
        xsec_token = excluded.xsec_token,
        fetched_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `;

    this.db
      .prepare(sql)
      .run(
        note.id,
        accountId,
        note.type ?? 'normal',
        note.title,
        note.publishTime ?? null,
        note.images ? JSON.stringify(note.images) : null,
        note.likes ?? 0,
        note.collectedCount ?? 0,
        note.commentsCount ?? 0,
        note.sharedCount ?? 0,
        note.viewCount ?? 0,
        note.sticky ? 1 : 0,
        note.level ?? 0,
        note.permissionCode ?? 0,
        note.permissionMsg ?? null,
        note.schedulePostTime ?? 0,
        note.xsecToken ?? null,
      );
  }

  /**
   * 批量插入或更新笔记
   */
  upsertBatch(
    accountId: string,
    notes: Array<{
      id: string;
      type?: 'normal' | 'video';
      title: string;
      publishTime?: string;
      images?: string[];
      likes?: number;
      collectedCount?: number;
      commentsCount?: number;
      sharedCount?: number;
      viewCount?: number;
      sticky?: boolean;
      level?: number;
      permissionCode?: number;
      permissionMsg?: string;
      schedulePostTime?: number;
      xsecToken?: string;
    }>,
  ): { inserted: number; updated: number } {
    let inserted = 0;
    let updated = 0;

    const transaction = this.db.transaction(() => {
      for (const note of notes) {
        // 检查是否已存在
        const existing = this.db.prepare('SELECT id FROM my_published_notes WHERE id = ?').get(note.id);

        this.upsert(accountId, note);

        if (existing) {
          updated++;
        } else {
          inserted++;
        }
      }
    });

    transaction();
    return { inserted, updated };
  }

  /**
   * 根据账户ID查询笔记，支持多条件过滤
   */
  findByAccountId(accountId: string, filter?: MyNotesFilter): MyPublishedNote[] {
    const conditions: string[] = ['account_id = ?'];
    const params: any[] = [accountId];

    if (filter) {
      if (filter.type !== undefined) {
        conditions.push('type = ?');
        params.push(filter.type);
      }
      if (filter.level !== undefined) {
        conditions.push('level = ?');
        params.push(filter.level);
      }
      if (filter.sticky !== undefined) {
        conditions.push('sticky = ?');
        params.push(filter.sticky ? 1 : 0);
      }
      if (filter.permissionCode !== undefined) {
        conditions.push('permission_code = ?');
        params.push(filter.permissionCode);
      }
      if (filter.titleContains) {
        conditions.push('title LIKE ?');
        params.push(`%${filter.titleContains}%`);
      }
      if (filter.minLikes !== undefined) {
        conditions.push('likes >= ?');
        params.push(filter.minLikes);
      }
      if (filter.minCollected !== undefined) {
        conditions.push('collected_count >= ?');
        params.push(filter.minCollected);
      }
      if (filter.minComments !== undefined) {
        conditions.push('comments_count >= ?');
        params.push(filter.minComments);
      }
      if (filter.minViews !== undefined) {
        conditions.push('view_count >= ?');
        params.push(filter.minViews);
      }
      if (filter.publishTimeStart) {
        conditions.push('publish_time >= ?');
        params.push(filter.publishTimeStart);
      }
      if (filter.publishTimeEnd) {
        conditions.push('publish_time <= ?');
        params.push(filter.publishTimeEnd);
      }
    }

    const orderBy = filter?.orderBy ?? 'publish_time';
    const orderDir = filter?.orderDir ?? 'desc';
    const limit = filter?.limit ?? 100;
    const offset = filter?.offset ?? 0;

    const sql = `
      SELECT * FROM my_published_notes
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy} ${orderDir}
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const rows = this.db.prepare(sql).all(...params) as MyPublishedNoteRow[];
    return rows.map((row) => this.toNote(row));
  }

  /**
   * 根据ID查询单个笔记
   */
  findById(noteId: string): MyPublishedNote | null {
    const row = this.db.prepare('SELECT * FROM my_published_notes WHERE id = ?').get(noteId) as
      | MyPublishedNoteRow
      | undefined;

    return row ? this.toNote(row) : null;
  }

  /**
   * 获取账户的笔记数量
   */
  countByAccountId(accountId: string, filter?: MyNotesFilter): number {
    const conditions: string[] = ['account_id = ?'];
    const params: any[] = [accountId];

    if (filter) {
      if (filter.type !== undefined) {
        conditions.push('type = ?');
        params.push(filter.type);
      }
      if (filter.level !== undefined) {
        conditions.push('level = ?');
        params.push(filter.level);
      }
      if (filter.sticky !== undefined) {
        conditions.push('sticky = ?');
        params.push(filter.sticky ? 1 : 0);
      }
    }

    const sql = `
      SELECT COUNT(*) as count FROM my_published_notes
      WHERE ${conditions.join(' AND ')}
    `;

    const result = this.db.prepare(sql).get(...params) as { count: number };
    return result.count;
  }

  /**
   * 获取最后一次获取时间
   */
  getLastFetchTime(accountId: string): Date | null {
    const row = this.db
      .prepare('SELECT MAX(fetched_at) as last_fetched FROM my_published_notes WHERE account_id = ?')
      .get(accountId) as { last_fetched: string | null } | undefined;

    return row?.last_fetched ? new Date(row.last_fetched) : null;
  }

  /**
   * 删除账户的所有笔记缓存
   */
  deleteByAccountId(accountId: string): number {
    const result = this.db.prepare('DELETE FROM my_published_notes WHERE account_id = ?').run(accountId);
    return result.changes;
  }

  /**
   * 获取统计信息
   */
  getStats(accountId: string): {
    total: number;
    normal: number;
    video: number;
    totalLikes: number;
    totalCollected: number;
    totalComments: number;
    totalViews: number;
    byLevel: Record<number, number>;
  } {
    const total = this.countByAccountId(accountId);
    const normal = this.countByAccountId(accountId, { type: 'normal' });
    const video = this.countByAccountId(accountId, { type: 'video' });

    const statsRow = this.db
      .prepare(
        `
        SELECT
          COALESCE(SUM(likes), 0) as total_likes,
          COALESCE(SUM(collected_count), 0) as total_collected,
          COALESCE(SUM(comments_count), 0) as total_comments,
          COALESCE(SUM(view_count), 0) as total_views
        FROM my_published_notes WHERE account_id = ?
      `,
      )
      .get(accountId) as {
      total_likes: number;
      total_collected: number;
      total_comments: number;
      total_views: number;
    };

    const levelRows = this.db
      .prepare(
        `
        SELECT level, COUNT(*) as count
        FROM my_published_notes
        WHERE account_id = ?
        GROUP BY level
      `,
      )
      .all(accountId) as { level: number; count: number }[];

    const byLevel: Record<number, number> = {};
    for (const row of levelRows) {
      byLevel[row.level] = row.count;
    }

    return {
      total,
      normal,
      video,
      totalLikes: statsRow.total_likes,
      totalCollected: statsRow.total_collected,
      totalComments: statsRow.total_comments,
      totalViews: statsRow.total_views,
      byLevel,
    };
  }
}
