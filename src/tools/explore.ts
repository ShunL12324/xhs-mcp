/**
 * @fileoverview MCP tool definitions and handlers for explore operations.
 * Provides automated browsing of the explore page with human-like behavior.
 * @module tools/explore
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { AccountPool } from '../core/account-pool.js';
import { XhsDatabase } from '../db/index.js';
import { resolveAccount, executeWithAccount } from '../core/multi-account.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('tools:explore');

/**
 * Explore tool definitions for MCP.
 */
export const exploreTools: Tool[] = [
  {
    name: 'xhs_explore',
    description: `Automatically browse the Xiaohongshu explore page with human-like behavior.
Uses AI to select interesting notes, then likes and comments based on probability.

Features:
- Scrolls like a human (2-3 wheel scrolls, then pause to read)
- AI selects which notes to open based on interests
- Probability-based liking and commenting
- All actions logged to database with session ID
- Deduplication: won't see the same note twice

Returns a session report with all actions taken.`,
    inputSchema: {
      type: 'object',
      properties: {
        account: {
          type: 'string',
          description:
            'Account name or ID to use. If not specified and only one account exists, uses that.',
        },
        duration: {
          type: 'number',
          description: 'Run duration in seconds. Default: 60',
          default: 60,
        },
        interests: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Interest keywords to guide AI note selection (e.g., ["美食", "咖啡", "探店"])',
        },
        openRate: {
          type: 'number',
          description:
            'Probability of opening a note after scrolling (0-1). Default: 0.5',
          default: 0.5,
        },
        likeRate: {
          type: 'number',
          description:
            'Probability of liking after opening a note (0-1). Default: 0.5',
          default: 0.5,
        },
        commentRate: {
          type: 'number',
          description:
            'Probability of commenting after opening a note (0-1). Default: 0.1',
          default: 0.1,
        },
      },
    },
  },
];

/**
 * Handle explore tool calls.
 *
 * @param name - Tool name
 * @param args - Tool arguments
 * @param pool - Account pool instance
 * @param db - Database instance
 * @returns MCP tool response
 */
export async function handleExploreTools(
  name: string,
  args: any,
  pool: AccountPool,
  db: XhsDatabase
) {
  switch (name) {
    case 'xhs_explore': {
      const params = z
        .object({
          account: z.string().optional(),
          duration: z.number().min(10).max(600).default(60),
          interests: z.array(z.string()).optional(),
          openRate: z.number().min(0).max(1).default(0.5),
          likeRate: z.number().min(0).max(1).default(0.5),
          commentRate: z.number().min(0).max(1).default(0.1),
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

      log.info('Starting explore', {
        account: resolved.account,
        duration: params.duration,
        interests: params.interests,
      });

      const result = await executeWithAccount(
        pool,
        db,
        resolved.account,
        'explore',
        async (ctx) => {
          return await ctx.client.explore({
            duration: params.duration,
            interests: params.interests,
            openRate: params.openRate,
            likeRate: params.likeRate,
            commentRate: params.commentRate,
          });
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

      const session = result.result!;

      const response = {
        account: result.account,
        success: true,
        sessionId: session.sessionId,
        duration: session.duration,
        stats: session.stats,
        actions: session.actions,
      };

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
      throw new Error(`Unknown explore tool: ${name}`);
  }
}
