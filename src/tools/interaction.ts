import { XhsClient } from '../xhs/index.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

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
      },
      required: ['noteId', 'xsecToken', 'commentId', 'content'],
    },
  },
  {
    name: 'xhs_delete_cookies',
    description: 'Delete saved login cookies/session. Use this to log out or re-authenticate.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

export async function handleInteractionTools(name: string, args: any, client: XhsClient) {
  switch (name) {
    case 'xhs_like_feed': {
      const params = z
        .object({
          noteId: z.string(),
          xsecToken: z.string(),
          unlike: z.boolean().optional().default(false),
        })
        .parse(args);

      const result = await client.likeFeed(params.noteId, params.xsecToken, params.unlike);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    case 'xhs_favorite_feed': {
      const params = z
        .object({
          noteId: z.string(),
          xsecToken: z.string(),
          unfavorite: z.boolean().optional().default(false),
        })
        .parse(args);

      const result = await client.favoriteFeed(params.noteId, params.xsecToken, params.unfavorite);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    case 'xhs_post_comment': {
      const params = z
        .object({
          noteId: z.string(),
          xsecToken: z.string(),
          content: z.string(),
        })
        .parse(args);

      const result = await client.postComment(params.noteId, params.xsecToken, params.content);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    case 'xhs_reply_comment': {
      const params = z
        .object({
          noteId: z.string(),
          xsecToken: z.string(),
          commentId: z.string(),
          content: z.string(),
        })
        .parse(args);

      const result = await client.replyComment(
        params.noteId,
        params.xsecToken,
        params.commentId,
        params.content
      );
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    case 'xhs_delete_cookies': {
      const result = await client.deleteCookies();
      return {
        content: [
          {
            type: 'text',
            text: result.success
              ? 'Cookies deleted successfully. You will need to login again.'
              : `Failed to delete cookies: ${result.error}`,
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown interaction tool: ${name}`);
  }
}
