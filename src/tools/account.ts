/**
 * @fileoverview MCP tool definitions and handlers for account management.
 * Provides tools for listing, adding, removing, and configuring accounts.
 * @module tools/account
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { AccountPool } from '../core/account-pool.js';
import { XhsDatabase } from '../db/index.js';

/**
 * Account management tool definitions for MCP.
 */
export const accountTools: Tool[] = [
  {
    name: 'xhs_list_accounts',
    description: 'List all registered Xiaohongshu accounts with their status and last activity.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'xhs_add_account',
    description: 'Add a new account or re-login an existing account. Runs in headless mode and returns a QR code URL for remote scanning.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Account name. If account exists, triggers re-login. If new, creates the account.',
        },
        proxy: {
          type: 'string',
          description: 'Optional proxy server URL (e.g., "http://proxy:8080")',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'xhs_remove_account',
    description: 'Remove a registered account and delete its session data.',
    inputSchema: {
      type: 'object',
      properties: {
        account: {
          type: 'string',
          description: 'Account name or ID to remove',
        },
      },
      required: ['account'],
    },
  },
  {
    name: 'xhs_set_account_config',
    description: 'Update account configuration such as proxy or status.',
    inputSchema: {
      type: 'object',
      properties: {
        account: {
          type: 'string',
          description: 'Account name or ID to update',
        },
        proxy: {
          type: 'string',
          description: 'New proxy server URL (empty string to remove)',
        },
        status: {
          type: 'string',
          enum: ['active', 'suspended', 'banned'],
          description: 'Account status',
        },
      },
      required: ['account'],
    },
  },
];

/**
 * Handle account management tool calls.
 *
 * @param name - Tool name
 * @param args - Tool arguments
 * @param pool - Account pool instance
 * @param db - Database instance
 * @returns MCP tool response
 */
export async function handleAccountTools(
  name: string,
  args: any,
  pool: AccountPool,
  db: XhsDatabase
) {
  switch (name) {
    case 'xhs_list_accounts': {
      const accounts = pool.listAccounts();

      const accountList = accounts.map((acc) => {
        const profile = db.getAccountProfile(acc.id);
        const stats = db.getAccountStats(acc.id);

        return {
          id: acc.id,
          name: acc.name,
          status: acc.status,
          proxy: acc.proxy || null,
          hasSession: !!acc.state,
          profile: profile
            ? {
                userId: profile.userId,
                nickname: profile.nickname,
                avatar: profile.avatar,
              }
            : null,
          stats: {
            totalOperations: stats.totalOperations,
            successRate: stats.totalOperations > 0
              ? Math.round((stats.successfulOperations / stats.totalOperations) * 100)
              : 0,
          },
          lastLoginAt: acc.lastLoginAt?.toISOString() || null,
          lastActiveAt: acc.lastActiveAt?.toISOString() || null,
          isLocked: pool.isAccountLocked(acc.id),
        };
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                count: accountList.length,
                accounts: accountList,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'xhs_add_account': {
      const params = z
        .object({
          name: z.string().min(1).max(64),
          proxy: z.string().optional(),
        })
        .parse(args);

      try {
        const { account, client, isNew } = await pool.addAccount(params.name, params.proxy);

        // Start headless login process - get QR code URL
        const loginResult = await client.login();

        console.error(`[add_account] QR Code Path: ${loginResult.qrCodePath}`);
        console.error('[add_account] Waiting for QR code scan...');

        // Wait for login to complete
        await loginResult.waitForLogin();

        // Log the operation
        db.logOperation({
          accountId: account.id,
          action: isNew ? 'login' : 're-login',
          success: true,
          result: { method: 'qr_code_headless' },
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  isNew,
                  account: {
                    id: account.id,
                    name: account.name,
                    status: account.status,
                    proxy: account.proxy || null,
                  },
                  qrCodePath: loginResult.qrCodePath,
                  message: isNew
                    ? 'Account added and logged in successfully.'
                    : 'Account re-logged in successfully.',
                  hint: 'The QR code has been saved and opened in your default image viewer. Scan it with Xiaohongshu app.',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }

    case 'xhs_remove_account': {
      const params = z
        .object({
          account: z.string(),
        })
        .parse(args);

      const account = pool.getAccount(params.account);
      if (!account) {
        return {
          content: [
            {
              type: 'text',
              text: `Account not found: ${params.account}`,
            },
          ],
          isError: true,
        };
      }

      const removed = await pool.removeAccount(params.account);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: removed,
                message: removed
                  ? `Account "${account.name}" has been removed.`
                  : 'Failed to remove account.',
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'xhs_set_account_config': {
      const params = z
        .object({
          account: z.string(),
          proxy: z.string().optional(),
          status: z.enum(['active', 'suspended', 'banned']).optional(),
        })
        .parse(args);

      const account = pool.getAccount(params.account);
      if (!account) {
        return {
          content: [
            {
              type: 'text',
              text: `Account not found: ${params.account}`,
            },
          ],
          isError: true,
        };
      }

      const updates: { proxy?: string; status?: 'active' | 'suspended' | 'banned' } = {};
      if (params.proxy !== undefined) {
        updates.proxy = params.proxy;
      }
      if (params.status !== undefined) {
        updates.status = params.status;
      }

      const updated = await pool.updateAccountConfig(params.account, updates);

      // Get updated account
      const updatedAccount = pool.getAccount(params.account);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: updated,
                account: updatedAccount
                  ? {
                      id: updatedAccount.id,
                      name: updatedAccount.name,
                      status: updatedAccount.status,
                      proxy: updatedAccount.proxy || null,
                    }
                  : null,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown account tool: ${name}`);
  }
}
