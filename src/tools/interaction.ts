/**
 * @fileoverview MCP tool definitions and handlers for note interactions.
 * Provides tools for liking, favoriting, commenting, and managing cookies.
 * @module tools/interaction
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { AccountPool } from '../core/account-pool.js';
import { XhsDatabase } from '../db/index.js';
import { executeWithMultipleAccounts, MultiAccountParams, resolveAccount } from '../core/multi-account.js';

/**
 * Interaction tool definitions for MCP.
 */
export const interactionTools: Tool[] = [
  {
    name: 'xhs_like_feed',
    description: 'Like or unlike a note on Xiaohongshu. Requires login.',
    inputSchema: {
      type: 'object',
      properties: {
        noteId: {
          type: 'string',
          description: 'Note ID to like/unlike',
        },
        xsecToken: {
          type: 'string',
          description: 'Security token from search results',
        },
        unlike: {
          type: 'boolean',
          description: 'If true, unlike the note. Default is false (like).',
        },
        account: {
          type: 'string',
          description: 'Account name or ID to use',
        },
        accounts: {
          oneOf: [
            { type: 'array', items: { type: 'string' } },
            { type: 'string', enum: ['all'] },
          ],
          description: 'Multiple accounts (array of names/IDs, or "all")',
        },
      },
      required: ['noteId', 'xsecToken'],
    },
  },
  {
    name: 'xhs_favorite_feed',
    description: 'Favorite (collect) or unfavorite a note on Xiaohongshu. Requires login.',
    inputSchema: {
      type: 'object',
      properties: {
        noteId: {
          type: 'string',
          description: 'Note ID to favorite/unfavorite',
        },
        xsecToken: {
          type: 'string',
          description: 'Security token from search results',
        },
        unfavorite: {
          type: 'boolean',
          description: 'If true, unfavorite the note. Default is false (favorite).',
        },
        account: {
          type: 'string',
          description: 'Account name or ID to use',
        },
        accounts: {
          oneOf: [
            { type: 'array', items: { type: 'string' } },
            { type: 'string', enum: ['all'] },
          ],
          description: 'Multiple accounts (array of names/IDs, or "all")',
        },
      },
      required: ['noteId', 'xsecToken'],
    },
  },
  {
    name: 'xhs_post_comment',
    description: 'Post a comment on a note. Requires login.',
    inputSchema: {
      type: 'object',
      properties: {
        noteId: {
          type: 'string',
          description: 'Note ID to comment on',
        },
        xsecToken: {
          type: 'string',
          description: 'Security token from search results',
        },
        content: {
          type: 'string',
          description: 'Comment content',
        },
        account: {
          type: 'string',
          description: 'Account name or ID to use',
        },
        accounts: {
          oneOf: [
            { type: 'array', items: { type: 'string' } },
            { type: 'string', enum: ['all'] },
          ],
          description: 'Multiple accounts (array of names/IDs, or "all")',
        },
      },
      required: ['noteId', 'xsecToken', 'content'],
    },
  },
  {
    name: 'xhs_reply_comment',
    description: 'Reply to a comment on a note. Requires login.',
    inputSchema: {
      type: 'object',
      properties: {
        noteId: {
          type: 'string',
          description: 'Note ID containing the comment',
        },
        xsecToken: {
          type: 'string',
          description: 'Security token from search results',
        },
        commentId: {
          type: 'string',
          description: 'Comment ID to reply to',
        },
        content: {
          type: 'string',
          description: 'Reply content',
        },
        account: {
          type: 'string',
          description: 'Account name or ID to use',
        },
      },
      required: ['noteId', 'xsecToken', 'commentId', 'content'],
    },
  },
  {
    name: 'xhs_delete_cookies',
    description: 'Delete saved login cookies/session for an account. Use this to log out or re-authenticate.',
    inputSchema: {
      type: 'object',
      properties: {
        account: {
          type: 'string',
          description: 'Account name or ID to delete cookies for',
        },
      },
    },
  },
];

/**
 * Handle interaction tool calls.
 *
 * @param name - Tool name
 * @param args - Tool arguments
 * @param pool - Account pool instance
 * @param db - Database instance
 * @returns MCP tool response
 */
export async function handleInteractionTools(
  name: string,
  args: any,
  pool: AccountPool,
  db: XhsDatabase
) {
  switch (name) {
    case 'xhs_like_feed': {
      const params = z
        .object({
          noteId: z.string(),
          xsecToken: z.string(),
          unlike: z.boolean().optional().default(false),
          account: z.string().optional(),
          accounts: z.union([z.array(z.string()), z.literal('all')]).optional(),
        })
        .parse(args);

      const multiParams: MultiAccountParams = {
        account: params.account,
        accounts: params.accounts,
      };

      const results = await executeWithMultipleAccounts(
        pool,
        db,
        multiParams,
        params.unlike ? 'unlike' : 'like',
        async (ctx) => {
          const result = await ctx.client.likeFeed(params.noteId, params.xsecToken, params.unlike);

          // Record interaction
          db.recordInteraction({
            accountId: ctx.accountId,
            targetNoteId: params.noteId,
            action: params.unlike ? 'unlike' : 'like',
            success: result.success,
            error: result.error,
          });

          return result;
        },
        { logParams: { noteId: params.noteId, unlike: params.unlike } }
      );

      if (results.length === 1) {
        return {
          content: [{ type: 'text', text: JSON.stringify(results[0], null, 2) }],
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      };
    }

    case 'xhs_favorite_feed': {
      const params = z
        .object({
          noteId: z.string(),
          xsecToken: z.string(),
          unfavorite: z.boolean().optional().default(false),
          account: z.string().optional(),
          accounts: z.union([z.array(z.string()), z.literal('all')]).optional(),
        })
        .parse(args);

      const multiParams: MultiAccountParams = {
        account: params.account,
        accounts: params.accounts,
      };

      const results = await executeWithMultipleAccounts(
        pool,
        db,
        multiParams,
        params.unfavorite ? 'unfavorite' : 'favorite',
        async (ctx) => {
          const result = await ctx.client.favoriteFeed(params.noteId, params.xsecToken, params.unfavorite);

          db.recordInteraction({
            accountId: ctx.accountId,
            targetNoteId: params.noteId,
            action: params.unfavorite ? 'unfavorite' : 'favorite',
            success: result.success,
            error: result.error,
          });

          return result;
        },
        { logParams: { noteId: params.noteId, unfavorite: params.unfavorite } }
      );

      if (results.length === 1) {
        return {
          content: [{ type: 'text', text: JSON.stringify(results[0], null, 2) }],
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      };
    }

    case 'xhs_post_comment': {
      const params = z
        .object({
          noteId: z.string(),
          xsecToken: z.string(),
          content: z.string(),
          account: z.string().optional(),
          accounts: z.union([z.array(z.string()), z.literal('all')]).optional(),
        })
        .parse(args);

      const multiParams: MultiAccountParams = {
        account: params.account,
        accounts: params.accounts,
      };

      const results = await executeWithMultipleAccounts(
        pool,
        db,
        multiParams,
        'comment',
        async (ctx) => {
          const result = await ctx.client.postComment(params.noteId, params.xsecToken, params.content);

          db.recordInteraction({
            accountId: ctx.accountId,
            targetNoteId: params.noteId,
            action: 'comment',
            commentContent: params.content,
            commentId: result.commentId,
            success: result.success,
            error: result.error,
          });

          return result;
        },
        { logParams: { noteId: params.noteId } }
      );

      if (results.length === 1) {
        return {
          content: [{ type: 'text', text: JSON.stringify(results[0], null, 2) }],
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      };
    }

    case 'xhs_reply_comment': {
      const params = z
        .object({
          noteId: z.string(),
          xsecToken: z.string(),
          commentId: z.string(),
          content: z.string(),
          account: z.string().optional(),
        })
        .parse(args);

      const multiParams: MultiAccountParams = { account: params.account };

      const results = await executeWithMultipleAccounts(
        pool,
        db,
        multiParams,
        'reply',
        async (ctx) => {
          const result = await ctx.client.replyComment(
            params.noteId,
            params.xsecToken,
            params.commentId,
            params.content
          );

          db.recordInteraction({
            accountId: ctx.accountId,
            targetNoteId: params.noteId,
            action: 'reply',
            commentContent: params.content,
            commentId: params.commentId,
            success: result.success,
            error: result.error,
          });

          return result;
        },
        { logParams: { noteId: params.noteId, commentId: params.commentId } }
      );

      return {
        content: [{ type: 'text', text: JSON.stringify(results[0], null, 2) }],
      };
    }

    case 'xhs_delete_cookies': {
      const params = z
        .object({
          account: z.string().optional(),
        })
        .parse(args);

      const resolved = resolveAccount(pool, params);
      if (!resolved.account) {
        return {
          content: [{ type: 'text', text: resolved.error || 'Account not found' }],
          isError: true,
        };
      }

      const account = pool.getAccount(resolved.account);
      if (!account) {
        return {
          content: [{ type: 'text', text: `Account not found: ${resolved.account}` }],
          isError: true,
        };
      }

      // Clear state in database
      db.updateAccountState(account.id, null);

      // Close the client to clear browser state
      const client = await pool.getClient(account.id);
      if (client) {
        await client.deleteCookies();
      }

      return {
        content: [
          {
            type: 'text',
            text: `Cookies deleted for account "${account.name}". You will need to login again.`,
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown interaction tool: ${name}`);
  }
}
