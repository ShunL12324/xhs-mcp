import { XhsClient } from '../xhs/index.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { XhsSearchFilters } from '../xhs/types.js';

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
      },
      required: ['userId'],
    },
  },
  {
    name: 'xhs_list_feeds',
    description: 'Get homepage recommended feeds.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

export async function handleContentTools(name: string, args: any, client: XhsClient) {
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
        })
        .parse(args);

      // Build filters object
      const filters: XhsSearchFilters | undefined =
        params.sortBy || params.noteType || params.publishTime || params.searchScope
          ? {
              sortBy: params.sortBy,
              noteType: params.noteType,
              publishTime: params.publishTime,
              searchScope: params.searchScope,
            }
          : undefined;

      const results = await client.search(params.keyword, params.count, params.timeout, filters);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              count: results.length,
              items: results,
            }, null, 2),
          },
        ],
      };
    }

    case 'xhs_get_note': {
      const params = z
        .object({
          noteId: z.string(),
          xsecToken: z.string(),
        })
        .parse(args);

      const note = await client.getNote(params.noteId, params.xsecToken);
      if (!note) {
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

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(note, null, 2),
          },
        ],
      };
    }

    case 'xhs_user_profile': {
      const params = z
        .object({
          userId: z.string(),
          xsecToken: z.string().optional(),
        })
        .parse(args);

      const profile = await client.getUserProfile(params.userId, params.xsecToken);
      if (!profile) {
        return {
          content: [
            {
              type: 'text',
              text: 'User profile not found.',
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(profile, null, 2),
          },
        ],
      };
    }

    case 'xhs_list_feeds': {
      const items = await client.listFeeds();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              count: items.length,
              items: items,
            }, null, 2),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown content tool: ${name}`);
  }
}
