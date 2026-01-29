/**
 * @fileoverview MCP tool definitions and handlers for note drafts.
 * Provides tools for creating, managing, and publishing AI-generated note drafts.
 * @module tools/draft
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { AccountPool } from '../core/account-pool.js';
import { XhsDatabase } from '../db/index.js';
import { generateImage } from '../core/gemini.js';
import { paths } from '../core/config.js';
import { executeWithMultipleAccounts, MultiAccountParams } from '../core/multi-account.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('draft');

/**
 * Draft tool definitions for MCP.
 */
export const draftTools: Tool[] = [
  {
    name: 'xhs_generate_image',
    description: 'Generate a single image using AI. Returns the local file path. Use this before xhs_create_draft to prepare images.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Image generation prompt describing the desired image',
        },
        aspectRatio: {
          type: 'string',
          enum: ['3:4', '1:1', '4:3'],
          description: 'Image aspect ratio. 3:4 (portrait, default), 1:1 (square), 4:3 (landscape)',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'xhs_create_draft',
    description: 'Create a note draft with title, content, tags, and image paths. Use xhs_generate_image first to create images.',
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
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags/topics for the note',
        },
        images: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of local image file paths (from xhs_generate_image)',
        },
      },
      required: ['title', 'content', 'images'],
    },
  },
  {
    name: 'xhs_list_drafts',
    description: 'List all note drafts.',
    inputSchema: {
      type: 'object',
      properties: {
        includePublished: {
          type: 'boolean',
          description: 'Include published drafts (default: false)',
        },
      },
    },
  },
  {
    name: 'xhs_get_draft',
    description: 'Get details of a specific draft.',
    inputSchema: {
      type: 'object',
      properties: {
        draftId: {
          type: 'string',
          description: 'Draft ID',
        },
      },
      required: ['draftId'],
    },
  },
  {
    name: 'xhs_update_draft',
    description: 'Update a draft. Can modify title, content, tags, or images.',
    inputSchema: {
      type: 'object',
      properties: {
        draftId: {
          type: 'string',
          description: 'Draft ID',
        },
        title: {
          type: 'string',
          description: 'New title',
        },
        content: {
          type: 'string',
          description: 'New content',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'New tags',
        },
        images: {
          type: 'array',
          items: { type: 'string' },
          description: 'New image paths (replaces existing)',
        },
      },
      required: ['draftId'],
    },
  },
  {
    name: 'xhs_delete_draft',
    description: 'Delete a draft and its associated images.',
    inputSchema: {
      type: 'object',
      properties: {
        draftId: {
          type: 'string',
          description: 'Draft ID',
        },
      },
      required: ['draftId'],
    },
  },
  {
    name: 'xhs_publish_draft',
    description: 'Publish a draft to Xiaohongshu. Supports publishing to multiple accounts with identical content.',
    inputSchema: {
      type: 'object',
      properties: {
        draftId: {
          type: 'string',
          description: 'Draft ID to publish',
        },
        account: {
          type: 'string',
          description: 'Account name or ID to publish to',
        },
        accounts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Multiple accounts to publish to (array of names/IDs, or "all")',
        },
        scheduleTime: {
          type: 'string',
          description: 'Optional scheduled publish time (ISO 8601 format)',
        },
      },
      required: ['draftId'],
    },
  },
];

/**
 * Draft domain model
 */
interface NoteDraft {
  id: string;
  title: string;
  content: string;
  tags: string[];
  images: string[];
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Handle draft tool calls.
 */
export async function handleDraftTools(
  name: string,
  args: any,
  pool: AccountPool,
  db: XhsDatabase
) {
  switch (name) {
    case 'xhs_generate_image': {
      const params = z
        .object({
          prompt: z.string(),
          aspectRatio: z.enum(['3:4', '1:1', '4:3']).optional(),
        })
        .parse(args);

      const result = await generateImage({
        prompt: params.prompt,
        aspectRatio: params.aspectRatio,
      });

      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Image generation failed: ${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, path: result.path }, null, 2),
          },
        ],
      };
    }

    case 'xhs_create_draft': {
      const params = z
        .object({
          title: z.string(),
          content: z.string(),
          tags: z.array(z.string()).optional().default([]),
          images: z.array(z.string()),
        })
        .parse(args);

      // 验证图片路径
      for (const imagePath of params.images) {
        if (!fs.existsSync(imagePath)) {
          return {
            content: [{ type: 'text', text: `Image not found: ${imagePath}` }],
            isError: true,
          };
        }
      }

      const draftId = randomUUID();
      const now = new Date().toISOString();

      // 复制图片到 drafts 目录
      const draftDir = path.join(paths.dataDir, 'drafts', draftId);
      fs.mkdirSync(draftDir, { recursive: true });

      const newImagePaths: string[] = [];
      for (let i = 0; i < params.images.length; i++) {
        const srcPath = params.images[i];
        const ext = path.extname(srcPath) || '.jpg';
        const destPath = path.join(draftDir, `${i}${ext}`);
        fs.copyFileSync(srcPath, destPath);
        newImagePaths.push(destPath);
      }

      // 插入数据库
      db.run(
        `INSERT INTO note_drafts (id, title, content, tags, images, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          draftId,
          params.title,
          params.content,
          JSON.stringify(params.tags),
          JSON.stringify(newImagePaths),
          now,
          now,
        ]
      );

      log.info('Draft created', { draftId, title: params.title });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                draftId,
                title: params.title,
                images: newImagePaths,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'xhs_list_drafts': {
      const params = z
        .object({
          includePublished: z.boolean().optional().default(false),
        })
        .parse(args);

      let sql = 'SELECT * FROM note_drafts';
      if (!params.includePublished) {
        sql += ' WHERE published_at IS NULL';
      }
      sql += ' ORDER BY created_at DESC';

      const rows = db.all(sql);
      const drafts = rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        tags: JSON.parse(row.tags || '[]'),
        images: JSON.parse(row.images || '[]'),
        publishedAt: row.published_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ count: drafts.length, drafts }, null, 2),
          },
        ],
      };
    }

    case 'xhs_get_draft': {
      const params = z
        .object({
          draftId: z.string(),
        })
        .parse(args);

      const row = db.get('SELECT * FROM note_drafts WHERE id = ?', [params.draftId]) as any;

      if (!row) {
        return {
          content: [{ type: 'text', text: `Draft not found: ${params.draftId}` }],
          isError: true,
        };
      }

      const draft = {
        id: row.id,
        title: row.title,
        content: row.content,
        tags: JSON.parse(row.tags || '[]'),
        images: JSON.parse(row.images || '[]'),
        publishedAt: row.published_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(draft, null, 2) }],
      };
    }

    case 'xhs_update_draft': {
      const params = z
        .object({
          draftId: z.string(),
          title: z.string().optional(),
          content: z.string().optional(),
          tags: z.array(z.string()).optional(),
          images: z.array(z.string()).optional(),
        })
        .parse(args);

      // 检查草稿是否存在
      const existing = db.get('SELECT * FROM note_drafts WHERE id = ?', [params.draftId]) as any;
      if (!existing) {
        return {
          content: [{ type: 'text', text: `Draft not found: ${params.draftId}` }],
          isError: true,
        };
      }

      const updates: string[] = [];
      const values: any[] = [];

      if (params.title !== undefined) {
        updates.push('title = ?');
        values.push(params.title);
      }
      if (params.content !== undefined) {
        updates.push('content = ?');
        values.push(params.content);
      }
      if (params.tags !== undefined) {
        updates.push('tags = ?');
        values.push(JSON.stringify(params.tags));
      }
      if (params.images !== undefined) {
        // 验证新图片路径
        for (const imagePath of params.images) {
          if (!fs.existsSync(imagePath)) {
            return {
              content: [{ type: 'text', text: `Image not found: ${imagePath}` }],
              isError: true,
            };
          }
        }

        // 复制新图片到 drafts 目录
        const draftDir = path.join(paths.dataDir, 'drafts', params.draftId);
        fs.mkdirSync(draftDir, { recursive: true });

        const newImagePaths: string[] = [];
        for (let i = 0; i < params.images.length; i++) {
          const srcPath = params.images[i];
          const ext = path.extname(srcPath) || '.jpg';
          const destPath = path.join(draftDir, `${i}${ext}`);
          // 只有当源和目标不同时才复制
          if (srcPath !== destPath) {
            fs.copyFileSync(srcPath, destPath);
          }
          newImagePaths.push(destPath);
        }

        updates.push('images = ?');
        values.push(JSON.stringify(newImagePaths));
      }

      if (updates.length === 0) {
        return {
          content: [{ type: 'text', text: 'No updates provided' }],
          isError: true,
        };
      }

      updates.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(params.draftId);

      db.run(
        `UPDATE note_drafts SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      log.info('Draft updated', { draftId: params.draftId });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, draftId: params.draftId }, null, 2),
          },
        ],
      };
    }

    case 'xhs_delete_draft': {
      const params = z
        .object({
          draftId: z.string(),
        })
        .parse(args);

      // 检查草稿是否存在
      const existing = db.get('SELECT * FROM note_drafts WHERE id = ?', [params.draftId]) as any;
      if (!existing) {
        return {
          content: [{ type: 'text', text: `Draft not found: ${params.draftId}` }],
          isError: true,
        };
      }

      // 删除图片目录
      const draftDir = path.join(paths.dataDir, 'drafts', params.draftId);
      if (fs.existsSync(draftDir)) {
        fs.rmSync(draftDir, { recursive: true });
      }

      // 删除数据库记录
      db.run('DELETE FROM note_drafts WHERE id = ?', [params.draftId]);

      log.info('Draft deleted', { draftId: params.draftId });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, draftId: params.draftId }, null, 2),
          },
        ],
      };
    }

    case 'xhs_publish_draft': {
      const params = z
        .object({
          draftId: z.string(),
          account: z.string().optional(),
          accounts: z.union([z.array(z.string()), z.literal('all')]).optional(),
          scheduleTime: z.string().optional(),
        })
        .parse(args);

      // 获取草稿
      const row = db.get('SELECT * FROM note_drafts WHERE id = ?', [params.draftId]) as any;
      if (!row) {
        return {
          content: [{ type: 'text', text: `Draft not found: ${params.draftId}` }],
          isError: true,
        };
      }

      const draft = {
        title: row.title,
        content: row.content,
        tags: JSON.parse(row.tags || '[]'),
        images: JSON.parse(row.images || '[]'),
      };

      // 验证图片存在
      for (const imagePath of draft.images) {
        if (!fs.existsSync(imagePath)) {
          return {
            content: [{ type: 'text', text: `Draft image not found: ${imagePath}` }],
            isError: true,
          };
        }
      }

      const multiParams: MultiAccountParams = {
        account: params.account,
        accounts: params.accounts,
      };

      const results = await executeWithMultipleAccounts(
        pool,
        db,
        multiParams,
        'publish_draft',
        async (ctx) => {
          return await ctx.client.publishContent({
            title: draft.title,
            content: draft.content,
            images: draft.images,
            tags: draft.tags,
            scheduleTime: params.scheduleTime,
          });
        },
        { logParams: { draftId: params.draftId, title: draft.title } }
      );

      // 更新草稿状态
      const allSuccess = results.every((r) => r.success);
      if (allSuccess) {
        db.run(
          'UPDATE note_drafts SET published_at = ?, updated_at = ? WHERE id = ?',
          [new Date().toISOString(), new Date().toISOString(), params.draftId]
        );
      }

      // 格式化结果
      if (results.length === 1) {
        const r = results[0];
        if (!r.success) {
          return {
            content: [{ type: 'text', text: `Publish failed: ${r.error}` }],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  draftId: params.draftId,
                  account: r.account,
                  result: r.result,
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
                draftId: params.draftId,
                results: results.map((r) => ({
                  account: r.account,
                  success: r.success,
                  result: r.success ? r.result : undefined,
                  error: r.error,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown draft tool: ${name}`);
  }
}
