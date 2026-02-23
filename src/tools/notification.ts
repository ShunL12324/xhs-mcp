/**
 * @fileoverview MCP tool definitions and handlers for notification operations.
 * Provides tools for fetching user notifications (mentions, likes, connections).
 * @module tools/notification
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { AccountPool } from '../core/account-pool.js';
import { XhsDatabase } from '../db/index.js';
import { resolveAccount, executeWithAccount } from '../core/multi-account.js';

/**
 * Notification tool definitions for MCP.
 */
export const notificationTools: Tool[] = [
  {
    name: 'xhs_get_notifications',
    description:
      'Get notifications for the current account. Returns mentions (comments/replies), likes, and connections (follows). Each notification contains enough info to reply or interact.',
    inputSchema: {
      type: 'object',
      properties: {
        account: {
          type: 'string',
          description: 'Account name or ID to use. If not specified and only one account exists, uses that.',
        },
        type: {
          type: 'string',
          enum: ['mentions', 'likes', 'connections', 'all'],
          description: 'Type of notifications to fetch. Default: all',
          default: 'all',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of notifications per type. Default: 20',
          default: 20,
        },
      },
    },
  },
];

/**
 * Handle notification tool calls.
 *
 * @param name - Tool name
 * @param args - Tool arguments
 * @param pool - Account pool instance
 * @param db - Database instance
 * @returns MCP tool response
 */
export async function handleNotificationTools(name: string, args: any, pool: AccountPool, db: XhsDatabase) {
  switch (name) {
    case 'xhs_get_notifications': {
      const params = z
        .object({
          account: z.string().optional(),
          type: z.enum(['mentions', 'likes', 'connections', 'all']).default('all'),
          limit: z.number().min(1).max(100).default(20),
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
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      const result = await executeWithAccount(pool, db, resolved.account, 'get_notifications', async (ctx) => {
        return await ctx.client.getNotifications(params.type, params.limit);
      });

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
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      const notifications = result.result!;

      // 格式化输出
      const response: any = {
        account: result.account,
        success: true,
        unreadCount: notifications.count?.unreadCount || 0,
        counts: {
          mentions: notifications.count?.mentions || 0,
          likes: notifications.count?.likes || 0,
          connections: notifications.count?.connections || 0,
        },
      };

      // 添加各类通知
      if (notifications.mentions) {
        response.mentions = notifications.mentions.map((n: any) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          time: new Date(n.time * 1000).toISOString(),
          user: {
            userId: n.user.userId,
            nickname: n.user.nickname,
            avatar: n.user.avatar,
          },
          // 用于回复的关键字段
          noteId: n.noteId,
          xsecToken: n.xsecToken,
          commentId: n.commentId,
          commentContent: n.commentContent,
          // 如果是回复你的评论，显示原评论
          targetComment: n.targetCommentId
            ? {
                id: n.targetCommentId,
                content: n.targetCommentContent,
              }
            : undefined,
        }));
      }

      if (notifications.likes) {
        response.likes = notifications.likes.map((n: any) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          time: new Date(n.time * 1000).toISOString(),
          user: {
            userId: n.user.userId,
            nickname: n.user.nickname,
            avatar: n.user.avatar,
          },
          noteId: n.noteId,
          xsecToken: n.xsecToken,
        }));
      }

      if (notifications.connections) {
        response.connections = notifications.connections.map((n: any) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          time: new Date(n.time * 1000).toISOString(),
          user: {
            userId: n.user.userId,
            nickname: n.user.nickname,
            avatar: n.user.avatar,
            xsecToken: n.user.xsecToken,
          },
        }));
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
      throw new Error(`Unknown notification tool: ${name}`);
  }
}
