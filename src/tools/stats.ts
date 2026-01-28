/**
 * @fileoverview MCP tool definitions and handlers for account statistics.
 * Provides tools for querying operation stats and logs.
 * @module tools/stats
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { AccountPool } from '../core/account-pool.js';
import { XhsDatabase } from '../db/index.js';

/**
 * Statistics tool definitions for MCP.
 */
export const statsTools: Tool[] = [
  {
    name: 'xhs_get_account_stats',
    description: 'Get operation statistics for an account including total operations, success rate, and breakdown by action type.',
    inputSchema: {
      type: 'object',
      properties: {
        account: {
          type: 'string',
          description: 'Account name or ID to get stats for',
        },
      },
      required: ['account'],
    },
  },
  {
    name: 'xhs_get_operation_logs',
    description: 'Query operation logs for an account. Returns recent operations with their results.',
    inputSchema: {
      type: 'object',
      properties: {
        account: {
          type: 'string',
          description: 'Account name or ID',
        },
        action: {
          type: 'string',
          description: 'Filter by action type (e.g., "search", "like", "publish_content")',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of logs to return (default: 50, max: 500)',
        },
        offset: {
          type: 'number',
          description: 'Number of logs to skip (for pagination)',
        },
      },
      required: ['account'],
    },
  },
];

/**
 * Handle statistics tool calls.
 *
 * @param name - Tool name
 * @param args - Tool arguments
 * @param pool - Account pool instance
 * @param db - Database instance
 * @returns MCP tool response
 */
export async function handleStatsTools(
  name: string,
  args: any,
  pool: AccountPool,
  db: XhsDatabase
) {
  switch (name) {
    case 'xhs_get_account_stats': {
      const params = z
        .object({
          account: z.string(),
        })
        .parse(args);

      const account = pool.getAccount(params.account);
      if (!account) {
        return {
          content: [{ type: 'text', text: `Account not found: ${params.account}` }],
          isError: true,
        };
      }

      const stats = db.getAccountStats(account.id);
      const profile = db.getAccountProfile(account.id);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                account: {
                  id: account.id,
                  name: account.name,
                  status: account.status,
                },
                profile: profile
                  ? {
                      userId: profile.userId,
                      nickname: profile.nickname,
                    }
                  : null,
                stats: {
                  totalOperations: stats.totalOperations,
                  successfulOperations: stats.successfulOperations,
                  failedOperations: stats.failedOperations,
                  successRate:
                    stats.totalOperations > 0
                      ? `${Math.round((stats.successfulOperations / stats.totalOperations) * 100)}%`
                      : 'N/A',
                  operationsByAction: stats.operationsByAction,
                  lastOperation: stats.lastOperation?.toISOString() || null,
                },
                timestamps: {
                  lastLoginAt: account.lastLoginAt?.toISOString() || null,
                  lastActiveAt: account.lastActiveAt?.toISOString() || null,
                  createdAt: account.createdAt.toISOString(),
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'xhs_get_operation_logs': {
      const params = z
        .object({
          account: z.string(),
          action: z.string().optional(),
          limit: z.number().min(1).max(500).optional().default(50),
          offset: z.number().min(0).optional().default(0),
        })
        .parse(args);

      const account = pool.getAccount(params.account);
      if (!account) {
        return {
          content: [{ type: 'text', text: `Account not found: ${params.account}` }],
          isError: true,
        };
      }

      const logs = db.getOperationLogs(account.id, {
        action: params.action,
        limit: params.limit,
        offset: params.offset,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                account: account.name,
                count: logs.length,
                offset: params.offset,
                logs: logs.map((log) => ({
                  id: log.id,
                  action: log.action,
                  targetId: log.targetId,
                  success: log.success,
                  error: log.error,
                  durationMs: log.durationMs,
                  createdAt: log.createdAt.toISOString(),
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown stats tool: ${name}`);
  }
}
