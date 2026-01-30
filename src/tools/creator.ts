/**
 * @fileoverview MCP tool definitions and handlers for creator center operations.
 * Provides tools for accessing creator-specific features like published notes management.
 * @module tools/creator
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { AccountPool } from '../core/account-pool.js';
import { XhsDatabase } from '../db/index.js';
import { resolveAccount, executeWithAccount } from '../core/multi-account.js';
import { createLogger } from '../core/logger.js';
import type { MyNotesFilter } from '../db/index.js';

const log = createLogger('tools:creator');

/**
 * 已发布笔记的数据结构
 */
export interface PublishedNote {
  /** 笔记 ID */
  id: string;
  /** 笔记类型：normal（图文）或 video */
  type: 'normal' | 'video';
  /** 笔记标题 */
  title: string;
  /** 发布时间 */
  time: string;
  /** 图片列表 */
  images: string[];
  /** 点赞数 */
  likes: number;
  /** 收藏数 */
  collectedCount: number;
  /** 评论数 */
  commentsCount: number;
  /** 分享数 */
  sharedCount: number;
  /** 浏览数 */
  viewCount: number;
  /** 是否置顶 */
  sticky: boolean;
  /** 笔记等级 */
  level: number;
  /** 权限状态：0=公开，1=仅自己可见 */
  permissionCode: number;
  /** 权限说明 */
  permissionMsg: string;
  /** 定时发布时间（0 表示立即发布） */
  schedulePostTime: number;
  /** xsec token（用于访问笔记详情） */
  xsecToken: string;
}

/**
 * Creator center tool definitions for MCP.
 */
export const creatorTools: Tool[] = [
  {
    name: 'xhs_get_my_notes',
    description:
      'Get list of published notes from the current account\'s creator center. Fetches from API and caches to database. Returns notes with stats (views, likes, comments, etc.) and permission status.',
    inputSchema: {
      type: 'object',
      properties: {
        account: {
          type: 'string',
          description:
            'Account name or ID to use. If not specified and only one account exists, uses that.',
        },
        tab: {
          type: 'number',
          description: 'Tab filter: 0=all, 1=public, 2=private. Default: 0',
          default: 0,
        },
        limit: {
          type: 'number',
          description: 'Maximum number of notes to fetch. Default: 100, max: 500. Will scroll to load more if needed.',
          default: 100,
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds. Default: 60000. Increase for larger limits.',
          default: 60000,
        },
      },
    },
  },
  {
    name: 'xhs_query_my_notes',
    description:
      'Query cached published notes from database. Supports multiple filter conditions. Use xhs_get_my_notes first to populate the cache.',
    inputSchema: {
      type: 'object',
      properties: {
        account: {
          type: 'string',
          description:
            'Account name or ID to query. If not specified and only one account exists, uses that.',
        },
        type: {
          type: 'string',
          enum: ['normal', 'video'],
          description: 'Filter by note type: normal (image/text) or video.',
        },
        level: {
          type: 'number',
          description: 'Filter by level: 0=正常, 1=流量中, 2=待审核, 3=未通过, 4=仅自己可见.',
        },
        sticky: {
          type: 'boolean',
          description: 'Filter by pinned status.',
        },
        permissionCode: {
          type: 'number',
          description: 'Filter by permission code: 0=public.',
        },
        titleContains: {
          type: 'string',
          description: 'Filter by title containing this text.',
        },
        minLikes: {
          type: 'number',
          description: 'Minimum likes count.',
        },
        minCollected: {
          type: 'number',
          description: 'Minimum collected count.',
        },
        minComments: {
          type: 'number',
          description: 'Minimum comments count.',
        },
        minViews: {
          type: 'number',
          description: 'Minimum views count.',
        },
        publishTimeStart: {
          type: 'string',
          description: 'Filter notes published after this time (inclusive).',
        },
        publishTimeEnd: {
          type: 'string',
          description: 'Filter notes published before this time (inclusive).',
        },
        orderBy: {
          type: 'string',
          enum: ['publish_time', 'likes', 'collected_count', 'comments_count', 'view_count', 'updated_at'],
          description: 'Sort by field. Default: publish_time.',
        },
        orderDir: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort direction. Default: desc.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results. Default: 100.',
        },
        offset: {
          type: 'number',
          description: 'Offset for pagination. Default: 0.',
        },
        includeStats: {
          type: 'boolean',
          description: 'Include summary statistics in response. Default: false.',
        },
      },
    },
  },
];

/**
 * Handle creator center tool calls.
 *
 * @param name - Tool name
 * @param args - Tool arguments
 * @param pool - Account pool instance
 * @param db - Database instance
 * @returns MCP tool response
 */
export async function handleCreatorTools(
  name: string,
  args: any,
  pool: AccountPool,
  db: XhsDatabase
) {
  switch (name) {
    case 'xhs_get_my_notes': {
      const params = z
        .object({
          account: z.string().optional(),
          tab: z.number().min(0).max(2).default(0),
          limit: z.number().min(1).max(500).default(100),
          timeout: z.number().min(5000).max(300000).default(60000),
        })
        .parse(args);

      const resolved = resolveAccount(pool, params);
      if (!resolved.account) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: resolved.error,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      const result = await executeWithAccount(
        pool,
        db,
        resolved.account,
        'get_my_notes',
        async (ctx) => {
          return await ctx.client.getMyPublishedNotes(params.tab, params.limit, params.timeout);
        }
      );

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  account: result.account,
                  success: false,
                  error: result.error,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      const notes = result.result! as PublishedNote[];

      // 缓存笔记到数据库（upsert 去重更新）
      const accountInfo = pool.listAccounts().find(
        (a) => a.name === resolved.account || a.id === resolved.account
      );
      if (accountInfo) {
        const cacheResult = db.myNotes.upsertBatch(
          accountInfo.id,
          notes.map((note) => ({
            id: note.id,
            type: note.type,
            title: note.title,
            publishTime: note.time,
            images: note.images,
            likes: note.likes,
            collectedCount: note.collectedCount,
            commentsCount: note.commentsCount,
            sharedCount: note.sharedCount,
            viewCount: note.viewCount,
            sticky: note.sticky,
            level: note.level,
            permissionCode: note.permissionCode,
            permissionMsg: note.permissionMsg,
            schedulePostTime: note.schedulePostTime,
            xsecToken: note.xsecToken,
          }))
        );
        log.info(
          `缓存笔记到数据库: 新增 ${cacheResult.inserted}, 更新 ${cacheResult.updated}`
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                account: result.account,
                success: true,
                count: notes.length,
                cached: accountInfo ? true : false,
                notes: notes.map((note: PublishedNote) => ({
                  id: note.id,
                  type: note.type,
                  title: note.title,
                  time: note.time,
                  cover: note.images[0] || '',
                  stats: {
                    views: note.viewCount,
                    likes: note.likes,
                    comments: note.commentsCount,
                    collects: note.collectedCount,
                    shares: note.sharedCount,
                  },
                  level: note.level,
                  permission: note.permissionCode === 0 ? 'public' : note.permissionMsg,
                  sticky: note.sticky,
                  xsecToken: note.xsecToken,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'xhs_query_my_notes': {
      const params = z
        .object({
          account: z.string().optional(),
          type: z.enum(['normal', 'video']).optional(),
          level: z.number().optional(),
          sticky: z.boolean().optional(),
          permissionCode: z.number().optional(),
          titleContains: z.string().optional(),
          minLikes: z.number().optional(),
          minCollected: z.number().optional(),
          minComments: z.number().optional(),
          minViews: z.number().optional(),
          publishTimeStart: z.string().optional(),
          publishTimeEnd: z.string().optional(),
          orderBy: z
            .enum(['publish_time', 'likes', 'collected_count', 'comments_count', 'view_count', 'updated_at'])
            .optional(),
          orderDir: z.enum(['asc', 'desc']).optional(),
          limit: z.number().min(1).max(500).default(100),
          offset: z.number().min(0).default(0),
          includeStats: z.boolean().default(false),
        })
        .parse(args);

      const resolved = resolveAccount(pool, params);
      if (!resolved.account) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: resolved.error,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      // 获取账户 ID
      const accountInfo = pool.listAccounts().find(
        (a) => a.name === resolved.account || a.id === resolved.account
      );
      if (!accountInfo) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: `Account not found: ${resolved.account}`,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      // 构建过滤器
      const filter: MyNotesFilter = {
        type: params.type,
        level: params.level,
        sticky: params.sticky,
        permissionCode: params.permissionCode,
        titleContains: params.titleContains,
        minLikes: params.minLikes,
        minCollected: params.minCollected,
        minComments: params.minComments,
        minViews: params.minViews,
        publishTimeStart: params.publishTimeStart,
        publishTimeEnd: params.publishTimeEnd,
        orderBy: params.orderBy,
        orderDir: params.orderDir,
        limit: params.limit,
        offset: params.offset,
      };

      // 查询数据库
      const notes = db.myNotes.findByAccountId(accountInfo.id, filter);
      const totalCount = db.myNotes.countByAccountId(accountInfo.id, filter);
      const lastFetchTime = db.myNotes.getLastFetchTime(accountInfo.id);

      // 构建响应
      const response: any = {
        account: resolved.account,
        success: true,
        count: notes.length,
        total: totalCount,
        lastFetchTime: lastFetchTime?.toISOString() || null,
        notes: notes.map((note) => ({
          id: note.id,
          type: note.type,
          title: note.title,
          publishTime: note.publishTime,
          cover: note.images[0] || '',
          stats: {
            views: note.viewCount,
            likes: note.likes,
            comments: note.commentsCount,
            collects: note.collectedCount,
            shares: note.sharedCount,
          },
          level: note.level,
          permission: note.permissionCode === 0 ? 'public' : note.permissionMsg,
          sticky: note.sticky,
          xsecToken: note.xsecToken,
        })),
      };

      // 可选：包含统计信息
      if (params.includeStats) {
        response.stats = db.myNotes.getStats(accountInfo.id);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown creator tool: ${name}`);
  }
}
