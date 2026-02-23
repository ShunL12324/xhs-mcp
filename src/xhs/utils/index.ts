/**
 * @fileoverview Utility functions for browser automation.
 * Includes human-like scrolling and helper functions.
 * @module xhs/utils
 */

import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import type { Page } from 'patchright';
import { paths } from '../../core/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sleep for a specified duration.
 * @param ms - Duration in milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a webId cookie value to bypass slider verification.
 * Format: 32 hex characters (e.g., "1234567890abcdef1234567890abcdef")
 * @returns Random webId string
 */
export function generateWebId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate a random number within a range.
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (exclusive)
 */
function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Easing function - easeInOutQuad.
 * Starts slow, speeds up in the middle, slows down at the end.
 * Simulates realistic scrolling behavior.
 * @param t - Progress value from 0 to 1
 * @returns Eased progress value
 */
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Options for human-like scrolling behavior.
 */
export interface HumanScrollOptions {
  /** Minimum scroll distance in pixels (default: 300) */
  minDistance?: number;
  /** Maximum scroll distance in pixels (default: 700) */
  maxDistance?: number;
  /** Minimum delay between scrolls in ms (default: 800) */
  minDelay?: number;
  /** Maximum delay between scrolls in ms (default: 2500) */
  maxDelay?: number;
  /** Probability of scrolling back up (default: 0.1) */
  scrollBackChance?: number;
  /** Probability of mouse movement (default: 0.4) */
  mouseMoveChance?: number;
}

/**
 * Simulate human-like scrolling behavior.
 *
 * Features:
 * - Uses mouse.wheel() for realistic scrolling
 * - Splits scroll into multiple steps with easing
 * - Random distances and delays
 * - Occasional mouse movement and scroll-back
 *
 * @param page - Playwright page instance
 * @param options - Scrolling behavior options
 */
export async function humanScroll(page: Page, options: HumanScrollOptions = {}): Promise<void> {
  const {
    minDistance = 300,
    maxDistance = 700,
    minDelay = 800,
    maxDelay = 2500,
    scrollBackChance = 0.1,
    mouseMoveChance = 0.4,
  } = options;

  // Random total scroll distance
  const totalDistance = randomBetween(minDistance, maxDistance);

  // Split into 5-12 small steps (simulates smooth scrolling)
  const steps = Math.floor(randomBetween(5, 12));

  let scrolled = 0;

  for (let i = 0; i < steps; i++) {
    // Use easing function to calculate speed factor at current progress
    const progress = (i + 1) / steps;
    const prevProgress = i / steps;
    const easedProgress = easeInOutQuad(progress);
    const prevEasedProgress = easeInOutQuad(prevProgress);

    // Calculate distance for this step
    const stepRatio = easedProgress - prevEasedProgress;
    const stepDistance = totalDistance * stepRatio * (0.8 + Math.random() * 0.4);

    // Execute scroll
    await page.mouse.wheel(0, stepDistance);
    scrolled += stepDistance;

    // Add small horizontal jitter (more realistic)
    if (Math.random() < 0.3) {
      const jitter = (Math.random() - 0.5) * 10;
      await page.mouse.wheel(jitter, 0);
    }

    // Short pause between steps (20-80ms)
    await sleep(randomBetween(20, 80));
  }

  // Random mouse movement (simulates eyes following content)
  if (Math.random() < mouseMoveChance) {
    const x = randomBetween(300, 1200);
    const y = randomBetween(200, 600);
    // Move mouse in multiple steps for natural motion
    await page.mouse.move(x, y, { steps: Math.floor(randomBetween(5, 15)) });
  }

  // Main delay (simulates reading content)
  const readingDelay = randomBetween(minDelay, maxDelay);
  await sleep(readingDelay);

  // Occasionally scroll back up (humans review content)
  if (Math.random() < scrollBackChance) {
    const backDistance = randomBetween(30, 120);
    const backSteps = Math.floor(randomBetween(2, 5));

    for (let i = 0; i < backSteps; i++) {
      await page.mouse.wheel(0, -backDistance / backSteps);
      await sleep(randomBetween(20, 50));
    }

    // Short pause after scrolling back
    await sleep(randomBetween(200, 500));
  }
}

/**
 * Scroll to the bottom of a page using human-like behavior.
 * Calls humanScroll repeatedly until reaching the bottom.
 *
 * @param page - Playwright page instance
 * @param options - Scrolling options plus maxScrolls limit
 * @returns True if bottom was reached, false if max scrolls exceeded
 */
export async function humanScrollToBottom(
  page: Page,
  options: HumanScrollOptions & { maxScrolls?: number } = {},
): Promise<boolean> {
  const { maxScrolls = 50, ...scrollOptions } = options;

  let previousHeight = 0;
  let sameHeightCount = 0;

  for (let i = 0; i < maxScrolls; i++) {
    // Get current scroll position and page height
    const { scrollTop, scrollHeight, clientHeight } = await page.evaluate(() => ({
      scrollTop: window.scrollY,
      scrollHeight: document.body.scrollHeight,
      clientHeight: window.innerHeight,
    }));

    // Check if we've reached the bottom
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      // May have reached bottom, but could be loading more
      if (scrollHeight === previousHeight) {
        sameHeightCount++;
        if (sameHeightCount >= 3) {
          // Height unchanged 3 times in a row - confirmed at bottom
          return true;
        }
      } else {
        sameHeightCount = 0;
      }
    }

    previousHeight = scrollHeight;

    // Perform human-like scroll
    await humanScroll(page, scrollOptions);
  }

  return false;
}

/**
 * 页面不可访问的错误关键词
 */
const PAGE_INACCESSIBLE_KEYWORDS = [
  '当前笔记暂时无法浏览',
  '该内容因违规已被删除',
  '该笔记已被删除',
  '内容不存在',
  '笔记不存在',
  '已失效',
  '私密笔记',
  '仅作者可见',
  '因用户设置，你无法查看',
  '因违规无法查看',
  '你访问的页面不见了',
];

/**
 * 错误容器的选择器
 */
const ERROR_CONTAINER_SELECTORS = '.access-wrapper, .error-wrapper, .not-found-wrapper, .blocked-wrapper';

/**
 * 检查页面是否可访问
 * 参考 reference project 的 checkPageAccessible 实现
 *
 * @param page - Playwright page instance
 * @returns null if accessible, error message if not
 */
export async function checkPageAccessible(page: Page): Promise<string | null> {
  await sleep(500);

  // 方法1：检查 URL 是否包含 /404，并解析 error_msg
  const url = page.url();
  if (url.includes('/404')) {
    // 尝试从 URL 解析 error_msg 参数
    try {
      const urlObj = new URL(url);
      const errorMsg = urlObj.searchParams.get('error_msg');
      const errorCode = urlObj.searchParams.get('error_code');
      if (errorMsg) {
        const decodedMsg = decodeURIComponent(errorMsg);
        return `笔记不可访问: ${decodedMsg}${errorCode ? ` (错误码: ${errorCode})` : ''}`;
      }
    } catch {
      // URL 解析失败，使用通用错误消息
    }
    return '页面已跳转到404，笔记不可访问';
  }

  // 方法2：检查页面标题
  const title = await page.title();
  if (title.includes('你访问的页面不见了')) {
    return '笔记不可访问：页面不存在';
  }

  // 方法3：查找错误容器
  const wrapperEl = await page.$(ERROR_CONTAINER_SELECTORS);
  if (!wrapperEl) {
    // 未找到错误容器，页面可访问
    return null;
  }

  // 获取文本内容
  const text = await wrapperEl.textContent();
  if (!text) {
    return null;
  }

  // 检查关键词
  for (const keyword of PAGE_INACCESSIBLE_KEYWORDS) {
    if (text.includes(keyword)) {
      return `笔记不可访问: ${keyword}`;
    }
  }

  // 如果有错误容器但不匹配关键词，返回未知错误
  const trimmedText = text.trim();
  if (trimmedText) {
    return `笔记不可访问: ${trimmedText.substring(0, 100)}`;
  }

  return null;
}

/**
 * 带重试机制的页面导航和访问检测
 * 如果页面不可访问，会重试最多 maxRetries 次
 *
 * @param page - Playwright page instance
 * @param url - 要访问的 URL
 * @param maxRetries - 最大重试次数 (默认 3)
 * @param retryDelay - 重试间隔范围 [min, max] 毫秒 (默认 [3000, 5000])
 * @returns null if accessible, error message if all retries failed
 */
export async function navigateWithRetry(
  page: Page,
  url: string,
  maxRetries: number = 3,
  retryDelay: [number, number] = [3000, 5000],
): Promise<string | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    // 等待 DOM 稳定，最多 3 秒（类似 reference project 的 MustWaitDOMStable）
    await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
    await sleep(500);

    const accessError = await checkPageAccessible(page);
    if (!accessError) {
      // 页面可访问
      return null;
    }

    // 如果是最后一次尝试，返回错误
    if (attempt === maxRetries) {
      return `${accessError} (重试 ${maxRetries} 次后仍然失败)`;
    }

    // 等待随机时间后重试
    const delay = retryDelay[0] + Math.random() * (retryDelay[1] - retryDelay[0]);
    await sleep(delay);
  }

  return null;
}

/**
 * 检查路径是否为 HTTP/HTTPS URL
 * @param imagePath - 图片路径或 URL
 * @returns 是否为 HTTP URL
 */
export function isHttpUrl(imagePath: string): boolean {
  const lower = imagePath.toLowerCase();
  return lower.startsWith('http://') || lower.startsWith('https://');
}

/**
 * 从 URL 下载图片到本地临时目录
 * 参考 reference project 的 pkg/downloader/images.go
 *
 * @param imageUrl - 图片 URL
 * @returns 本地文件路径
 * @throws 如果下载失败
 */
export async function downloadImageFromUrl(imageUrl: string): Promise<string> {
  // 确保临时目录存在
  await fs.ensureDir(paths.tempImages);

  // 使用 URL 的 SHA256 哈希作为文件名，确保唯一性
  const hash = crypto.createHash('sha256').update(imageUrl).digest('hex');
  const shortHash = hash.substring(0, 16);
  const timestamp = Date.now();

  // 下载图片
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`下载图片失败: HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  // 检测文件类型（通过魔数判断）
  const extension = detectImageExtension(buffer);
  if (!extension) {
    throw new Error('下载的文件不是有效的图片格式');
  }

  // 生成文件名
  const fileName = `img_${shortHash}_${timestamp}.${extension}`;
  const filePath = path.join(paths.tempImages, fileName);

  // 如果文件已存在（基于哈希），直接返回
  const existingFiles = await fs.readdir(paths.tempImages);
  const existingFile = existingFiles.find((f) => f.includes(shortHash));
  if (existingFile) {
    return path.join(paths.tempImages, existingFile);
  }

  // 保存文件
  await fs.writeFile(filePath, buffer);

  return filePath;
}

/**
 * 通过文件魔数检测图片格式
 * @param buffer - 文件内容
 * @returns 文件扩展名，如果不是图片则返回 null
 */
function detectImageExtension(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'png';
  }

  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return 'gif';
  }

  // WebP: 52 49 46 46 ... 57 45 42 50
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'webp';
  }

  // BMP: 42 4D
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return 'bmp';
  }

  return null;
}

/**
 * 处理图片路径列表，将 HTTP URL 下载到本地
 *
 * @param imagePaths - 图片路径或 URL 列表
 * @returns 本地文件路径列表
 */
export async function resolveImagePaths(imagePaths: string[]): Promise<string[]> {
  const resolvedPaths: string[] = [];

  for (const imgPath of imagePaths) {
    if (isHttpUrl(imgPath)) {
      // 下载 HTTP 图片
      const localPath = await downloadImageFromUrl(imgPath);
      resolvedPaths.push(localPath);
    } else {
      // 本地路径，直接使用
      resolvedPaths.push(imgPath);
    }
  }

  return resolvedPaths;
}
