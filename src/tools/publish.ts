import { XhsClient } from '../xhs/index.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

export const publishTools: Tool[] = [
  {
    name: 'xhs_publish_content',
    description: 'Publish a new image/text note to Xiaohongshu. Opens a visible browser window for the publishing process. Requires login.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Note title (max 20 characters)',
        },
        content: {
          type: 'string',
          description: 'Note content/description',
        },
        images: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of image file paths (absolute paths)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags/topics for the note',
        },
        scheduleTime: {
          type: 'string',
          description: 'Optional scheduled publish time (ISO 8601 format). If not provided, publishes immediately.',
        },
      },
      required: ['title', 'content', 'images'],
    },
  },
  {
    name: 'xhs_publish_video',
    description: 'Publish a new video note to Xiaohongshu. Opens a visible browser window for the publishing process. Requires login.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Note title (max 20 characters)',
        },
        content: {
          type: 'string',
          description: 'Note content/description',
        },
        videoPath: {
          type: 'string',
          description: 'Path to the video file (absolute path)',
        },
        coverPath: {
          type: 'string',
          description: 'Optional path to cover image (absolute path)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags/topics for the note',
        },
        scheduleTime: {
          type: 'string',
          description: 'Optional scheduled publish time (ISO 8601 format). If not provided, publishes immediately.',
        },
      },
      required: ['title', 'content', 'videoPath'],
    },
  },
];

export async function handlePublishTools(name: string, args: any, client: XhsClient) {
  switch (name) {
    case 'xhs_publish_content': {
      const params = z
        .object({
          title: z.string().max(20),
          content: z.string(),
          images: z.array(z.string()).min(1),
          tags: z.array(z.string()).optional(),
          scheduleTime: z.string().optional(),
        })
        .parse(args);

      const result = await client.publishContent(params);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    case 'xhs_publish_video': {
      const params = z
        .object({
          title: z.string().max(20),
          content: z.string(),
          videoPath: z.string(),
          coverPath: z.string().optional(),
          tags: z.array(z.string()).optional(),
          scheduleTime: z.string().optional(),
        })
        .parse(args);

      const result = await client.publishVideo(params);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown publish tool: ${name}`);
  }
}
