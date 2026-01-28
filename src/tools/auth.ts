/**
 * @fileoverview MCP tool definitions and handlers for authentication.
 * Provides tools for checking login status.
 * @module tools/auth
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { AccountPool } from '../core/account-pool.js';
import { XhsDatabase } from '../db/index.js';
import { resolveAccount, executeWithAccount } from '../core/multi-account.js';

/**
 * Authentication tool definitions for MCP.
 */
export const authTools: Tool[] = [
  {
    name: 'xhs_check_login',
    description: 'Check if an account is currently logged in to Xiaohongshu. Returns login status.',
    inputSchema: {
      type: 'object',
      properties: {
        account: {
          type: 'string',
          description: 'Account name or ID to check. If not specified and only one account exists, uses that.',
        },
      },
    },
  },
];

/**
 * Handle authentication tool calls.
 *
 * @param name - Tool name
 * @param args - Tool arguments
 * @param pool - Account pool instance
 * @param db - Database instance
 * @returns MCP tool response
 */
export async function handleAuthTools(
  name: string,
  args: any,
  pool: AccountPool,
  db: XhsDatabase
) {
  switch (name) {
    case 'xhs_check_login': {
      const params = z
        .object({
          account: z.string().optional(),
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
                  loggedIn: false,
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
        'check_login',
        async (ctx) => {
          return await ctx.client.checkLoginStatus();
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
                  loggedIn: false,
                  error: result.error,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                account: result.account,
                loggedIn: result.result!.loggedIn,
                message: result.result!.message,
                hint: result.result!.loggedIn
                  ? 'You can now use other xhs tools.'
                  : 'Please use xhs_add_account to login.',
              },
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown auth tool: ${name}`);
  }
}
