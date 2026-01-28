import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import type { Page } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function getStealthScript(): Promise<string> {
  const stealthPath = path.join(__dirname, 'stealth.js');
  if (await fs.pathExists(stealthPath)) {
    return await fs.readFile(stealthPath, 'utf-8');
  }
  return '';
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 生成 webId，用于绕过滑块验证
 * 格式类似: 1234567890abcdef1234567890abcdef
 */
export function generateWebId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * 生成随机数（指定范围）
 */
function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * 缓动函数 - easeInOutQuad
 * 开始慢，中间快，结束慢（模拟真实滚动）
 */
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export interface HumanScrollOptions {
  minDistance?: number;      // 最小滚动距离 (默认 300)
  maxDistance?: number;      // 最大滚动距离 (默认 700)
  minDelay?: number;         // 最小延迟 ms (默认 800)
  maxDelay?: number;         // 最大延迟 ms (默认 2500)
  scrollBackChance?: number; // 回滚概率 (默认 0.1)
  mouseMoveChance?: number;  // 鼠标移动概率 (默认 0.4)
}

/**
 * 模拟人类滚动行为
 * - 使用 mouse.wheel() 滚动
 * - 分多步完成，带缓动效果
 * - 随机距离和延迟
 * - 偶尔鼠标移动和回滚
 */
export async function humanScroll(
  page: Page,
  options: HumanScrollOptions = {}
): Promise<void> {
  const {
    minDistance = 300,
    maxDistance = 700,
    minDelay = 800,
    maxDelay = 2500,
    scrollBackChance = 0.1,
    mouseMoveChance = 0.4
  } = options;

  // 随机总滚动距离
  const totalDistance = randomBetween(minDistance, maxDistance);

  // 分 5-12 个小步骤完成（模拟平滑滚动）
  const steps = Math.floor(randomBetween(5, 12));

  let scrolled = 0;

  for (let i = 0; i < steps; i++) {
    // 使用缓动函数计算当前进度对应的速度因子
    const progress = (i + 1) / steps;
    const prevProgress = i / steps;
    const easedProgress = easeInOutQuad(progress);
    const prevEasedProgress = easeInOutQuad(prevProgress);

    // 计算这一步的距离
    const stepRatio = easedProgress - prevEasedProgress;
    const stepDistance = totalDistance * stepRatio * (0.8 + Math.random() * 0.4);

    // 执行滚动
    await page.mouse.wheel(0, stepDistance);
    scrolled += stepDistance;

    // 添加微小的水平抖动（更真实）
    if (Math.random() < 0.3) {
      const jitter = (Math.random() - 0.5) * 10;
      await page.mouse.wheel(jitter, 0);
    }

    // 步骤间的短暂停顿（20-80ms）
    await sleep(randomBetween(20, 80));
  }

  // 随机鼠标移动（模拟眼睛跟随内容）
  if (Math.random() < mouseMoveChance) {
    const x = randomBetween(300, 1200);
    const y = randomBetween(200, 600);
    // 分多步移动鼠标，更自然
    await page.mouse.move(x, y, { steps: Math.floor(randomBetween(5, 15)) });
  }

  // 主要延迟（模拟阅读内容）
  const readingDelay = randomBetween(minDelay, maxDelay);
  await sleep(readingDelay);

  // 偶尔向上回滚一点（人类会回看内容）
  if (Math.random() < scrollBackChance) {
    const backDistance = randomBetween(30, 120);
    const backSteps = Math.floor(randomBetween(2, 5));

    for (let i = 0; i < backSteps; i++) {
      await page.mouse.wheel(0, -backDistance / backSteps);
      await sleep(randomBetween(20, 50));
    }

    // 回滚后短暂停顿
    await sleep(randomBetween(200, 500));
  }
}

/**
 * 滚动到页面底部（人类方式）
 * 多次调用 humanScroll 直到接近底部
 */
export async function humanScrollToBottom(
  page: Page,
  options: HumanScrollOptions & { maxScrolls?: number } = {}
): Promise<boolean> {
  const { maxScrolls = 50, ...scrollOptions } = options;

  let previousHeight = 0;
  let sameHeightCount = 0;

  for (let i = 0; i < maxScrolls; i++) {
    // 获取当前滚动位置和页面高度
    const { scrollTop, scrollHeight, clientHeight } = await page.evaluate(() => ({
      scrollTop: window.scrollY,
      scrollHeight: document.body.scrollHeight,
      clientHeight: window.innerHeight
    }));

    // 检查是否已到底部
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      // 可能到底了，但也可能在加载更多
      if (scrollHeight === previousHeight) {
        sameHeightCount++;
        if (sameHeightCount >= 3) {
          // 连续3次高度不变，确认到底
          return true;
        }
      } else {
        sameHeightCount = 0;
      }
    }

    previousHeight = scrollHeight;

    // 执行人类式滚动
    await humanScroll(page, scrollOptions);
  }

  return false;
}
