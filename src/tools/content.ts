/**
 * @fileoverview MCP tool definitions and handlers for content queries.
 * Provides tools for searching notes, fetching note details, user profiles, and feeds.
 * @module tools/content
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { XhsSearchFilters } from '../xhs/types.js';
import { AccountPool } from '../core/account-pool.js';
import { XhsDatabase } from '../db/index.js';
import { executeWithMultipleAccounts, MultiAccountParams } from '../core/multi-account.js';
import { understandNoteImages } from '../core/gemini.js';
import { config } from '../core/config.js';

/**
 * Content query tool definitions for MCP.
 */
export const contentTools: Tool[] = [
  {
    name: 'xhs_search',
    description: 'Search for notes on Xiaohongshu. Supports scrolling to load more results and filtering. Returns notes with id, xsecToken, title, cover, user info, and likes.',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: 'Search keyword',
        },
        count: {
          type: 'number',
          description: 'Number of results to fetch (default: 20, max: 500). Will scroll to load more if needed.',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 60000). Increase for larger counts.',
        },
        sortBy: {
          type: 'string',
          enum: ['general', 'latest', 'most_liked', 'most_commented', 'most_collected'],
          description: 'Sort order: general (default), latest, most_liked, most_commented, most_collected',
        },
        noteType: {
          type: 'string',
          enum: ['all', 'video', 'image'],
          description: 'Filter by note type: all (default), video, image',
        },
        publishTime: {
          type: 'string',
          enum: ['all', 'day', 'week', 'half_year'],
          description: 'Filter by publish time: all (default), day, week, half_year',
        },
        searchScope: {
          type: 'string',
          enum: ['all', 'viewed', 'not_viewed', 'following'],
          description: 'Filter by search scope: all (default), viewed, not_viewed, following',
        },
        account: {
          type: 'string',
          description: 'Account name or ID to use for search',
        },
      },
      required: ['keyword'],
    },
  },
  {
    name: 'xhs_get_note',
    description: 'Get details of a specific note including content, images, stats, and comments. Use xsecToken from search results for reliable access.',
    inputSchema: {
      type: 'object',
      properties: {
        noteId: {
          type: 'string',
          description: 'Note ID (from search results)',
        },
        xsecToken: {
          type: 'string',
          description: 'Security token from search results (required for reliable access)',
        },
        describeImages: {
          type: 'boolean',
          description: 'If true, use LLM to analyze and describe all images in the note. Note: This consumes significant tokens.',
        },
        account: {
          type: 'string',
          description: 'Account name or ID to use',
        },
      },
      required: ['noteId', 'xsecToken'],
    },
  },
  {
    name: 'xhs_user_profile',
    description: 'Get user profile information including basic info, stats (followers, fans), and their published notes.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'User ID (from note author info)',
        },
        xsecToken: {
          type: 'string',
          description: 'Security token (optional)',
        },
        account: {
          type: 'string',
          description: 'Account name or ID to use',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'xhs_list_feeds',
    description: 'Get homepage recommended feeds.',
    inputSchema: {
      type: 'object',
      properties: {
        account: {
          type: 'string',
          description: 'Account name or ID to use',
        },
      },
    },
  },
];

/**
 * Handle content query tool calls.
 *
 * @param name - Tool name
 * @param args - Tool arguments
 * @param pool - Account pool instance
 * @param db - Database instance
 * @returns MCP tool response
 */
export async function handleContentTools(
  name: string,
  args: any,
  pool: AccountPool,
  db: XhsDatabase
) {
  switch (name) {
    case 'xhs_search': {
      const params = z
        .object({
          keyword: z.string(),
          count: z.number().optional().default(20),
          timeout: z.number().optional().default(60000),
          sortBy: z.enum(['general', 'latest', 'most_liked', 'most_commented', 'most_collected']).optional(),
          noteType: z.enum(['all', 'video', 'image']).optional(),
          publishTime: z.enum(['all', 'day', 'week', 'half_year']).optional(),
          searchScope: z.enum(['all', 'viewed', 'not_viewed', 'following']).optional(),
          account: z.string().optional(),
        })
        .parse(args);

      const filters: XhsSearchFilters | undefined =
        params.sortBy || params.noteType || params.publishTime || params.searchScope
          ? {
              sortBy: params.sortBy,
              noteType: params.noteType,
              publishTime: params.publishTime,
              searchScope: params.searchScope,
            }
          : undefined;

      const multiParams: MultiAccountParams = { account: params.account };

      const results = await executeWithMultipleAccounts(
        pool,
        db,
        multiParams,
        'search',
        async (ctx) => {
          return await ctx.client.search(params.keyword, params.count, params.timeout, filters);
        },
        { logParams: { keyword: params.keyword, count: params.count } }
      );

      // For single account, return simple format
      if (results.length === 1) {
        const r = results[0];
        if (!r.success) {
          return {
            content: [{ type: 'text', text: `Search failed: ${r.error}` }],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ count: r.result!.length, items: r.result }, null, 2),
            },
          ],
        };
      }

      // Multi-account format
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              results.map((r) => ({
                account: r.account,
                success: r.success,
                count: r.success ? r.result!.length : 0,
                items: r.success ? r.result : undefined,
                error: r.error,
              })),
              null,
              2
            ),
          },
        ],
      };
    }

    case 'xhs_get_note': {
      const params = z
        .object({
          noteId: z.string(),
          xsecToken: z.string(),
          describeImages: z.boolean().optional().default(false),
          account: z.string().optional(),
        })
        .parse(args);

      const multiParams: MultiAccountParams = { account: params.account };

      const results = await executeWithMultipleAccounts(
        pool,
        db,
        multiParams,
        'get_note',
        async (ctx) => {
          return await ctx.client.getNote(params.noteId, params.xsecToken);
        },
        { logParams: { noteId: params.noteId } }
      );

      const r = results[0];
      if (!r.success) {
        return {
          content: [{ type: 'text', text: `Failed to get note: ${r.error}` }],
          isError: true,
        };
      }

      if (!r.result) {
        return {
          content: [
            {
              type: 'text',
              text: 'Note not found. Make sure to provide the correct xsecToken from search results.',
            },
          ],
          isError: true,
        };
      }

      // 如果需要图片理解
      if (params.describeImages) {
        if (!config.gemini.apiKey) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    ...r.result,
                    imageUnderstanding: {
                      error: 'GEMINI_API_KEY is not configured. Set it to enable image understanding.',
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        try {
          const imageUrls = r.result.imageList?.map((img: any) => img.url) || [];
          const understanding = await understandNoteImages(
            r.result.title || '',
            r.result.desc || '',
            imageUrls
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    ...r.result,
                    imageUnderstanding: understanding,
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
                    ...r.result,
                    imageUnderstanding: {
                      error: `Image understanding failed: ${error instanceof Error ? error.message : String(error)}`,
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(r.result, null, 2) }],
      };
    }

    case 'xhs_user_profile': {
      const params = z
        .object({
          userId: z.string(),
          xsecToken: z.string().optional(),
          account: z.string().optional(),
        })
        .parse(args);

      const multiParams: MultiAccountParams = { account: params.account };

      const results = await executeWithMultipleAccounts(
        pool,
        db,
        multiParams,
        'user_profile',
        async (ctx) => {
          return await ctx.client.getUserProfile(params.userId, params.xsecToken);
        },
        { logParams: { userId: params.userId } }
      );

      const r = results[0];
      if (!r.success) {
        return {
          content: [{ type: 'text', text: `Failed to get user profile: ${r.error}` }],
          isError: true,
        };
      }

      if (!r.result) {
        return {
          content: [{ type: 'text', text: 'User profile not found.' }],
          isError: true,
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(r.result, null, 2) }],
      };
    }

    case 'xhs_list_feeds': {
      const params = z
        .object({
          account: z.string().optional(),
        })
        .parse(args);

      const multiParams: MultiAccountParams = { account: params.account };

      const results = await executeWithMultipleAccounts(
        pool,
        db,
        multiParams,
        'list_feeds',
        async (ctx) => {
          return await ctx.client.listFeeds();
        }
      );

      const r = results[0];
      if (!r.success) {
        return {
          content: [{ type: 'text', text: `Failed to get feeds: ${r.error}` }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ count: r.result!.length, items: r.result }, null, 2),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown content tool: ${name}`);
  }
}
