/**
 * @fileoverview Path constants and directory utilities for xhs-mcp.
 * All data is stored in ~/.xhs-mcp for easy management and cleanup.
 * @module core/paths
 */

import path from 'path';
import os from 'os';
import fs from 'fs-extra';

/** Base directory for all xhs-mcp data (~/.xhs-mcp) */
export const XHS_MCP_DIR = path.join(os.homedir(), '.xhs-mcp');

/** SQLite database file path */
export const DATABASE_PATH = path.join(XHS_MCP_DIR, 'data.db');

/** Base directory for downloaded content */
export const DOWNLOADS_DIR = path.join(XHS_MCP_DIR, 'downloads');

/** Directory for downloaded images */
export const IMAGES_DIR = path.join(DOWNLOADS_DIR, 'images');

/** Directory for downloaded videos */
export const VIDEOS_DIR = path.join(DOWNLOADS_DIR, 'videos');

/** Directory for saved QR code images during login */
export const QRCODE_DIR = path.join(XHS_MCP_DIR, 'qrcode');

/**
 * Ensure all required directories exist
 */
export async function ensureDirectories(): Promise<void> {
  await fs.ensureDir(XHS_MCP_DIR);
  await fs.ensureDir(DOWNLOADS_DIR);
  await fs.ensureDir(IMAGES_DIR);
  await fs.ensureDir(VIDEOS_DIR);
  await fs.ensureDir(QRCODE_DIR);
}

/**
 * Get the download path for a note's images
 */
export function getImageDownloadPath(noteId: string): string {
  return path.join(IMAGES_DIR, noteId);
}

/**
 * Get the download path for a note's video
 */
export function getVideoDownloadPath(noteId: string): string {
  return path.join(VIDEOS_DIR, noteId);
}
