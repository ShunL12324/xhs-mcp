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

      // 如果已登录且获取到了完整用户资料，同步到数据库
      if (loginResult.loggedIn && loginResult.fullProfile) {
        const profile = loginResult.fullProfile;
        log.info('Syncing full user profile', {
          accountId: accountObj.id,
          userId: profile.userId,
          nickname: profile.nickname,
          followers: profile.followers,
          isBanned: profile.isBanned,
        });

        // 更新 account_profiles 表（使用完整信息）
        db.profiles.upsert({
          accountId: accountObj.id,
          userId: profile.userId,
          redId: profile.redId,
          nickname: profile.nickname,
          avatar: profile.avatar,
          description: profile.description,
          gender: profile.gender,
          ipLocation: profile.ipLocation,
          followers: profile.followers,
          following: profile.following,
          likeAndCollect: profile.likeAndCollect,
          isBanned: profile.isBanned,
          banCode: profile.banCode,
          banReason: profile.banReason,
        });
        profileSynced = true;

        // 如果账户名是默认名称（如 manual-import），更新为 nickname
        const currentName = accountObj.name;
        const isDefaultName =
          currentName.startsWith('manual') ||
          currentName.startsWith('acc_') ||
          currentName.includes('import');

        if (isDefaultName && profile.nickname) {
          try {
            await pool.updateAccountConfig(accountObj.id, {
              name: profile.nickname,
            });
            accountNameUpdated = true;
            newAccountName = profile.nickname;
            log.info('Updated account name', {
              from: currentName,
              to: profile.nickname,
            });
          } catch (e) {
            // 名称可能已存在，忽略错误
            log.debug('Could not update account name', { error: e });
          }
        }
      } else if (loginResult.loggedIn && loginResult.userInfo) {
        // 如果没有完整资料但有基础用户信息，使用基础信息
        const userInfo = loginResult.userInfo;
        log.info('Syncing basic user profile (full profile unavailable)', {
          accountId: accountObj.id,
          userId: userInfo.userId,
          nickname: userInfo.nickname,
        });

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

        // 如果账户名是默认名称，更新为 nickname
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
            log.debug('Could not update account name', { error: e });
          }
        }
      }

      // 构建返回的用户信息（优先使用完整资料）
      const fullProfile = loginResult.fullProfile;
      const returnUserInfo = fullProfile
        ? {
            userId: fullProfile.userId,
            redId: fullProfile.redId,
            nickname: fullProfile.nickname,
            avatar: fullProfile.avatar,
            description: fullProfile.description,
            gender: fullProfile.gender,
            ipLocation: fullProfile.ipLocation,
            followers: fullProfile.followers,
            following: fullProfile.following,
            likeAndCollect: fullProfile.likeAndCollect,
            isBanned: fullProfile.isBanned,
            banCode: fullProfile.banCode,
            banReason: fullProfile.banReason,
          }
        : loginResult.userInfo
          ? {
              userId: loginResult.userInfo.userId,
              redId: loginResult.userInfo.redId,
              nickname: loginResult.userInfo.nickname,
            }
          : undefined;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                account: accountNameUpdated ? newAccountName : result.account,
                loggedIn: loginResult.loggedIn,
                message: loginResult.message,
                userInfo: returnUserInfo,
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
