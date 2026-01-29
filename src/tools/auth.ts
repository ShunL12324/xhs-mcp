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
import { createLogger } from '../core/logger.js';

const log = createLogger('tools:auth');

/**
 * Authentication tool definitions for MCP.
 */
export const authTools: Tool[] = [
  {
    name: 'xhs_check_auth_status',
    description:
      'Check if an account is currently logged in to Xiaohongshu. If logged in, syncs user profile (nickname, userId, etc.) to database.',
    inputSchema: {
      type: 'object',
      properties: {
        account: {
          type: 'string',
          description:
            'Account name or ID to check. If not specified and only one account exists, uses that.',
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
    case 'xhs_check_auth_status': {
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

      // 获取完整的账户对象，用于后续更新操作
      const accountObj = pool.getAccount(resolved.account);
      if (!accountObj) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  loggedIn: false,
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

      const loginResult = result.result!;
      let profileSynced = false;
      let accountNameUpdated = false;
      let newAccountName: string | undefined;

      // 如果已登录且获取到了用户信息，同步到数据库
      if (loginResult.loggedIn && loginResult.userInfo) {
        const userInfo = loginResult.userInfo;
        log.info('Syncing user profile', {
          accountId: accountObj.id,
          userId: userInfo.userId,
          nickname: userInfo.nickname,
        });

        // 更新 account_profiles 表
        db.profiles.upsert({
          accountId: accountObj.id,
          userId: userInfo.userId,
          redId: userInfo.redId,
          nickname: userInfo.nickname,
          avatar: userInfo.avatar,
          description: userInfo.desc,
          gender: userInfo.gender,
        });
        profileSynced = true;

        // 如果账户名是默认名称（如 manual-import），更新为 nickname
        const currentName = accountObj.name;
        const isDefaultName =
          currentName.startsWith('manual') ||
          currentName.startsWith('acc_') ||
          currentName.includes('import');

        if (isDefaultName && userInfo.nickname) {
          try {
            await pool.updateAccountConfig(accountObj.id, {
              name: userInfo.nickname,
            });
            accountNameUpdated = true;
            newAccountName = userInfo.nickname;
            log.info('Updated account name', {
              from: currentName,
              to: userInfo.nickname,
            });
          } catch (e) {
            // 名称可能已存在，忽略错误
            log.debug('Could not update account name', { error: e });
          }
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                account: accountNameUpdated ? newAccountName : result.account,
                loggedIn: loginResult.loggedIn,
                message: loginResult.message,
                userInfo: loginResult.userInfo
                  ? {
                      userId: loginResult.userInfo.userId,
                      redId: loginResult.userInfo.redId,
                      nickname: loginResult.userInfo.nickname,
                    }
                  : undefined,
                profileSynced,
                accountNameUpdated,
                hint: loginResult.loggedIn
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
