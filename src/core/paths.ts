/**
 * @fileoverview Path constants and directory utilities for xhs-mcp.
 * @module core/paths
 */

import fs from 'fs-extra';
import { paths, getImageDownloadPath, getVideoDownloadPath } from './config.js';

// Re-export from config
export { paths, getImageDownloadPath, getVideoDownloadPath };

/**
 * Ensure all required directories exist
 */
export async function ensureDirectories(): Promise<void> {
  await fs.ensureDir(paths.dataDir);
  await fs.ensureDir(paths.downloads);
  await fs.ensureDir(paths.images);
  await fs.ensureDir(paths.videos);
  await fs.ensureDir(paths.qrcode);
  await fs.ensureDir(paths.logs);
}
