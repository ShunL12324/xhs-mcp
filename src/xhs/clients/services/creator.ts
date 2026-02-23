/**
 * @fileoverview Creator center service for BrowserClient.
 * Contains methods for accessing creator-specific features like published notes.
 * @module xhs/clients/services/creator
 */

import { Page, Response } from 'patchright';
import { PublishedNote } from '../../../tools/creator.js';
import { sleep } from '../../utils/index.js';
import { BrowserContextManager, log } from '../context.js';
import { TIMEOUTS, REQUEST_INTERVAL } from '../constants.js';

/**
 * Creator 中心 URL
 */
const CREATOR_URLS = {
  /** 笔记管理页面 */
  NOTE_MANAGER: 'https://creator.xiaohongshu.com/new/note-manager?source=official',
  /** 已发布笔记 API */
  POSTED_NOTES_API: 'https://creator.xiaohongshu.com/api/galaxy/v2/creator/note/user/posted',
} as const;

/**
 * 滚动配置
 */
const SCROLL_CONFIG = {
  /** 每次滚动的距离（像素） */
  DISTANCE: 500,
  /** 滚动后等待时间（毫秒） */
  WAIT_AFTER_SCROLL: 1000,
  /** 等待 API 响应超时（毫秒） */
  API_RESPONSE_TIMEOUT: 10000,
  /** 笔记列表容器选择器 */
  CONTAINER_SELECTOR: '.note-list, .content-container, main',
} as const;

/**
 * Creator service - handles creator center operations
 */
export class CreatorService {
  constructor(private ctx: BrowserContextManager) {}

  /**
   * 获取当前账号已发布的笔记列表
   *
   * 工作流程：
   * 1. 打开 creator.xiaohongshu.com 笔记管理页面
   * 2. 监听 API 请求获取笔记数据
   * 3. 滚动页面触发惰性加载
   * 4. 直到 page=-1（表示没有更多）或达到 limit
   *
   * @param tab - 筛选 tab：0=全部，1=公开，2=私密
   * @param limit - 最大获取数量
   * @param timeout - 超时时间（毫秒）
   * @returns 已发布笔记列表
   */
  async getMyPublishedNotes(
    tab: number = 0,
    limit: number = 100,
    timeout: number = 60000
  ): Promise<PublishedNote[]> {
    await this.ctx.ensureContext();
    const page = await this.ctx.newPage();

    const allNotes: PublishedNote[] = [];
    let lastPage = -2; // 用于检测是否到达最后一页（-1 表示最后一页）
    let requestCount = 0;

    const startTime = Date.now();

    try {
      log.info('Fetching published notes from creator center', { tab, limit, timeout });

      // 设置 API 响应监听器
      const responsePromises: Promise<void>[] = [];

      page.on('response', async (response: Response) => {
        const url = response.url();
        if (url.includes(CREATOR_URLS.POSTED_NOTES_API)) {
          const responsePromise = (async () => {
            try {
              const json = await response.json();
              if (json.success && json.data?.notes) {
                requestCount++;
                lastPage = json.data.page;

                const notes = this.parseNotes(json.data.notes);
                log.debug('Received notes from API', {
                  page: json.data.page,
                  count: notes.length,
                  total: allNotes.length + notes.length,
                });

                // 添加到结果（避免重复）
                for (const note of notes) {
                  if (!allNotes.some(n => n.id === note.id)) {
                    allNotes.push(note);
                  }
                }
              }
            } catch (e) {
              log.warn('Failed to parse API response', { url, error: e });
            }
          })();

          responsePromises.push(responsePromise);
        }
      });

      // 导航到笔记管理页面
      log.debug('Navigating to creator note manager');
      await page.goto(CREATOR_URLS.NOTE_MANAGER, {
        waitUntil: 'domcontentloaded',
        timeout: TIMEOUTS.PAGE_LOAD,
      });

      // 等待页面加载
      await page.waitForLoadState('networkidle').catch(() => {});
      await sleep(2000);

      // 等待首次 API 响应
      await this.waitForApiResponse(page, timeout);

      // 滚动加载更多
      while (
        lastPage !== -1 &&
        allNotes.length < limit &&
        Date.now() - startTime < timeout
      ) {
        // 滚动页面
        await this.scrollDown(page);
        await sleep(SCROLL_CONFIG.WAIT_AFTER_SCROLL);

        // 等待可能的 API 响应
        await Promise.all(responsePromises).catch(() => {});
        responsePromises.length = 0;

        // 短暂等待新请求
        await sleep(500);

        // 检查是否超时
        if (Date.now() - startTime >= timeout) {
          log.warn('Timeout reached while fetching notes', {
            elapsed: Date.now() - startTime,
            notesCount: allNotes.length,
          });
          break;
        }
      }

      // 等待所有响应处理完成
      await Promise.all(responsePromises).catch(() => {});

      log.info('Finished fetching published notes', {
        total: allNotes.length,
        requests: requestCount,
        lastPage,
        elapsed: Date.now() - startTime,
      });

      // 返回限制数量的笔记
      return allNotes.slice(0, limit);

    } finally {
      await page.close();
    }
  }

  /**
   * 等待 API 响应
   */
  private async waitForApiResponse(page: Page, timeout: number): Promise<void> {
    try {
      await page.waitForResponse(
        (response) => response.url().includes(CREATOR_URLS.POSTED_NOTES_API),
        { timeout: Math.min(timeout, SCROLL_CONFIG.API_RESPONSE_TIMEOUT) }
      );
    } catch (e) {
      log.warn('Timeout waiting for initial API response');
    }
  }

  /**
   * 向下滚动页面
   */
  private async scrollDown(page: Page): Promise<void> {
    await page.evaluate((distance) => {
      // 尝试找到可滚动的容器
      const containers = [
        document.querySelector('.note-list'),
        document.querySelector('.content-container'),
        document.querySelector('main'),
        document.documentElement,
      ];

      for (const container of containers) {
        if (container && container.scrollHeight > container.clientHeight) {
          container.scrollBy(0, distance);
          return;
        }
      }

      // 默认滚动整个页面
      window.scrollBy(0, distance);
    }, SCROLL_CONFIG.DISTANCE);
  }

  /**
   * 解析 API 返回的笔记数据
   */
  private parseNotes(notes: any[]): PublishedNote[] {
    return notes.map((note) => ({
      id: note.id || '',
      type: note.type || 'normal',
      title: note.display_title || '',
      time: note.time || '',
      images: (note.images_list || []).map((img: any) => img.url || ''),
      likes: note.likes || 0,
      collectedCount: note.collected_count || 0,
      commentsCount: note.comments_count || 0,
      sharedCount: note.shared_count || 0,
      viewCount: note.view_count || 0,
      sticky: note.sticky || false,
      level: note.level || 0,
      permissionCode: note.permission_code || 0,
      permissionMsg: note.permission_msg || '',
      schedulePostTime: note.schedule_post_time || 0,
      xsecToken: note.xsec_token || '',
    }));
  }
}
