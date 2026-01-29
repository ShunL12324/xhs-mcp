/**
 * @fileoverview MCP tool definitions and handlers for downloading media.
 * Provides tools for downloading images and videos from notes.
 * @module tools/download
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import fs from 'fs-extra';
import path from 'path';
import https from 'https';
import http from 'http';
import { AccountPool } from '../core/account-pool.js';
import { XhsDatabase } from '../db/index.js';
import { getImageDownloadPath, getVideoDownloadPath } from '../core/paths.js';
import { executeWithMultipleAccounts, MultiAccountParams } from '../core/multi-account.js';

/**
 * Download tool definitions for MCP.
 */
export const downloadTools: Tool[] = [
  {
    name: 'xhs_download_images',
    description: 'Download all images from a note to local storage.',
    inputSchema: {
      type: 'object',
      properties: {
        noteId: {
          type: 'string',
          description: 'Note ID to download images from',
        },
        xsecToken: {
          type: 'string',
          description: 'Security token from search results',
        },
        account: {
          type: 'string',
          description: 'Account name or ID to use for fetching note details',
        },
      },
      required: ['noteId', 'xsecToken'],
    },
  },
  {
    name: 'xhs_download_video',
    description: 'Download video from a note to local storage.',
    inputSchema: {
      type: 'object',
      properties: {
        noteId: {
          type: 'string',
          description: 'Note ID to download video from',
        },
        xsecToken: {
          type: 'string',
          description: 'Security token from search results',
        },
        account: {
          type: 'string',
          description: 'Account name or ID to use for fetching note details',
        },
      },
      required: ['noteId', 'xsecToken'],
    },
  },
];

/**
 * Download a file from a URL to a local path.
 * Follows redirects and handles both HTTP and HTTPS.
 *
 * @param url - Source URL
 * @param destPath - Destination file path
 * @returns Object containing file size
 */
async function downloadFile(url: string, destPath: string): Promise<{ size: number }> {
  await fs.ensureDir(path.dirname(destPath));

  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const file = fs.createWriteStream(destPath);
      let size = 0;

      response.on('data', (chunk) => {
        size += chunk.length;
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve({ size });
      });

      file.on('error', (err) => {
        fs.unlink(destPath).catch(() => {});
        reject(err);
      });
    });

    request.on('error', (err) => {
      reject(err);
    });

    request.setTimeout(60000, () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

/**
 * Handle download tool calls.
 *
 * @param name - Tool name
 * @param args - Tool arguments
 * @param pool - Account pool instance
 * @param db - Database instance
 * @returns MCP tool response
 */
export async function handleDownloadTools(
  name: string,
  args: any,
  pool: AccountPool,
  db: XhsDatabase
) {
  switch (name) {
    case 'xhs_download_images': {
      const params = z
        .object({
          noteId: z.string(),
          xsecToken: z.string(),
          account: z.string().optional(),
        })
        .parse(args);

      const multiParams: MultiAccountParams = { account: params.account };

      // First get the note details
      const results = await executeWithMultipleAccounts(
        pool,
        db,
        multiParams,
        'get_note_for_download',
        async (ctx) => {
          return await ctx.client.getNote(params.noteId, params.xsecToken);
        }
      );

      const r = results[0];
      if (!r.success || !r.result) {
        return {
          content: [{ type: 'text', text: `Failed to get note: ${r.error || 'Note not found'}` }],
          isError: true,
        };
      }

      const note = r.result;
      if (!note.imageList || note.imageList.length === 0) {
        return {
          content: [{ type: 'text', text: 'No images found in this note' }],
          isError: true,
        };
      }

      // Download images
      const downloadDir = getImageDownloadPath(params.noteId);
      await fs.ensureDir(downloadDir);

      const downloaded: { filename: string; size: number; url: string }[] = [];
      const errors: { index: number; error: string }[] = [];

      for (let i = 0; i < note.imageList.length; i++) {
        const img = note.imageList[i];
        if (!img.url) continue;

        const ext = img.url.includes('.png') ? '.png' : '.jpg';
        const filename = `${i + 1}${ext}`;
        const destPath = path.join(downloadDir, filename);

        try {
          const result = await downloadFile(img.url, destPath);

          // Record in database
          db.downloads.record({
            noteId: params.noteId,
            fileType: 'image',
            filePath: destPath,
            originalUrl: img.url,
            fileSize: result.size,
          });

          downloaded.push({
            filename,
            size: result.size,
            url: img.url,
          });
        } catch (error) {
          errors.push({
            index: i + 1,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: downloaded.length > 0,
                noteId: params.noteId,
                downloadDir,
                downloaded: downloaded.length,
                total: note.imageList.length,
                files: downloaded,
                errors: errors.length > 0 ? errors : undefined,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'xhs_download_video': {
      const params = z
        .object({
          noteId: z.string(),
          xsecToken: z.string(),
          account: z.string().optional(),
        })
        .parse(args);

      const multiParams: MultiAccountParams = { account: params.account };

      // Get the note details
      const results = await executeWithMultipleAccounts(
        pool,
        db,
        multiParams,
        'get_note_for_download',
        async (ctx) => {
          return await ctx.client.getNote(params.noteId, params.xsecToken);
        }
      );

      const r = results[0];
      if (!r.success || !r.result) {
        return {
          content: [{ type: 'text', text: `Failed to get note: ${r.error || 'Note not found'}` }],
          isError: true,
        };
      }

      const note = r.result;
      if (!note.video || !note.video.url) {
        return {
          content: [{ type: 'text', text: 'No video found in this note' }],
          isError: true,
        };
      }

      // Download video
      const downloadDir = getVideoDownloadPath(params.noteId);
      await fs.ensureDir(downloadDir);

      const filename = `video.mp4`;
      const destPath = path.join(downloadDir, filename);

      try {
        const result = await downloadFile(note.video.url, destPath);

        // Record in database
        db.downloads.record({
          noteId: params.noteId,
          fileType: 'video',
          filePath: destPath,
          originalUrl: note.video.url,
          fileSize: result.size,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  noteId: params.noteId,
                  filePath: destPath,
                  size: result.size,
                  duration: note.video.duration,
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
                  noteId: params.noteId,
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

    default:
      throw new Error(`Unknown download tool: ${name}`);
  }
}
