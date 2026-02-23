/**
 * @fileoverview Search service for BrowserClient.
 * Contains search functionality and filter handling.
 * @module xhs/clients/services/search
 */

import { Page } from 'patchright';
import { XhsSearchItem, XhsSearchFilters } from '../../types.js';
import { sleep, humanScroll } from '../../utils/index.js';
import { BrowserContextManager, log } from '../context.js';
import {
  TIMEOUTS,
  SEARCH_DEFAULTS,
  SCROLL_CONFIG,
  DELAYS,
  REQUEST_INTERVAL,
  SEARCH_FILTER_MAP,
} from '../constants.js';

/**
 * Search service - handles note search functionality
 */
export class SearchService {
  constructor(private ctx: BrowserContextManager) {}

  /**
   * 搜索小红书笔记
   *
   * 搜索流程：
   * 1. 导航到搜索结果页面
   * 2. 等待 __INITIAL_STATE__ 数据加载
   * 3. 应用过滤器（如有）
   * 4. 滚动加载更多结果直到达到目标数量或超时
   * 5. 去重并返回结果
   *
   * @param keyword - 搜索关键词
   * @param count - 期望获取的结果数量（默认: 20，最大: 500）
   * @param timeout - 超时时间（毫秒，默认: 60000）
   * @param filters - 可选的搜索过滤条件
   * @returns 搜索结果数组
   */
  async search(
    keyword: string,
    count: number = SEARCH_DEFAULTS.COUNT,
    timeout: number = SEARCH_DEFAULTS.TIMEOUT,
    filters?: XhsSearchFilters
  ): Promise<XhsSearchItem[]> {
    await this.ctx.ensureContext();
    const page = await this.ctx.newPage();

    // 限制最大数量，防止请求过多数据
    const targetCount = Math.min(count, SEARCH_DEFAULTS.MAX_COUNT);
    const startTime = Date.now();

    try {
      const url = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}&source=web_explore_feed`;

      await page.goto(url, { waitUntil: 'domcontentloaded' });

      // 等待页面稳定
      await page.waitForLoadState('networkidle').catch(() => {});

      // 等待 __INITIAL_STATE__ 存在
      await page.waitForFunction(() => (window as any).__INITIAL_STATE__ !== undefined, {
        timeout: TIMEOUTS.PAGE_LOAD
      });

      await sleep(REQUEST_INTERVAL);

      // 应用搜索过滤器
      if (filters) {
        await this.applySearchFilters(page, filters);
        await sleep(REQUEST_INTERVAL);
      }

      // 用于去重的 Map（id -> item）
      const uniqueItems = new Map<string, any>();

      // 获取当前数据的辅助函数
      const getCurrentFeeds = async (): Promise<any[]> => {
        const result = await page.evaluate(() => {
          const state = (window as any).__INITIAL_STATE__;
          if (state?.search?.feeds) {
            const feeds = state.search.feeds;
            const feedsData = feeds.value !== undefined ? feeds.value : feeds._value;
            if (feedsData) {
              return JSON.stringify(feedsData);
            }
          }
          return '';
        }, null, false);
        return result ? JSON.parse(result) : [];
      };

      // 获取首屏数据
      let feeds = await getCurrentFeeds();
      for (const item of feeds) {
        if (item.id && !uniqueItems.has(item.id)) {
          uniqueItems.set(item.id, item);
        }
      }

      log.debug('Initial search load', { count: uniqueItems.size });

      // 滚动加载更多数据，直到达到目标数量
      let noNewDataCount = 0;

      while (uniqueItems.size < targetCount) {
        // 检查超时
        if (Date.now() - startTime > timeout) {
          log.debug('Search timeout reached', { count: uniqueItems.size });
          break;
        }

        const previousCount = uniqueItems.size;

        // 使用人类式滚动（带缓动、随机延迟、偶尔回滚）
        await humanScroll(page, {
          minDistance: SCROLL_CONFIG.MIN_DISTANCE,
          maxDistance: SCROLL_CONFIG.MAX_DISTANCE,
          minDelay: SCROLL_CONFIG.MIN_DELAY,
          maxDelay: SCROLL_CONFIG.MAX_DELAY,
          scrollBackChance: SCROLL_CONFIG.SCROLL_BACK_CHANCE,
          mouseMoveChance: SCROLL_CONFIG.MOUSE_MOVE_CHANCE,
        });

        // 获取新数据
        feeds = await getCurrentFeeds();

        for (const item of feeds) {
          if (item.id && !uniqueItems.has(item.id)) {
            uniqueItems.set(item.id, item);
          }
        }

        const added = uniqueItems.size - previousCount;
        log.debug('After scroll', { total: uniqueItems.size, added });

        // 如果连续多次没有新数据，可能已经到底了
        if (added === 0) {
          noNewDataCount++;
          if (noNewDataCount >= SEARCH_DEFAULTS.MAX_NO_DATA_RETRIES) {
            log.debug('No more data available', { count: uniqueItems.size });
            break;
          }
          // 额外等待一下再试
          await sleep(DELAYS.SCROLL_EXTRA_BASE + Math.random() * DELAYS.SCROLL_EXTRA_RANDOM);
        } else {
          noNewDataCount = 0;
        }
      }

      // 转换为结果数组
      const items = Array.from(uniqueItems.values());

      return items.slice(0, targetCount).map((item: any) => ({
        id: item.id,
        xsecToken: item.xsec_token || item.xsecToken || '',
        title: item.noteCard?.displayTitle || item.noteCard?.title || item.note_card?.display_title || '',
        cover: item.noteCard?.cover?.urlDefault || item.note_card?.cover?.url_default || '',
        type: item.noteCard?.type || item.note_card?.type || 'normal',
        user: {
          nickname: item.noteCard?.user?.nickname || item.note_card?.user?.nickname || '',
          avatar: item.noteCard?.user?.avatar || item.note_card?.user?.avatar || '',
          userid: item.noteCard?.user?.userId || item.note_card?.user?.user_id || ''
        },
        likes: item.noteCard?.interactInfo?.likedCount || item.note_card?.interact_info?.liked_count || '0'
      }));

    } finally {
      await page.close();
    }
  }

  /**
   * 应用搜索过滤器
   *
   * 通过点击页面上的过滤选项来设置搜索条件。
   * 包括排序方式、笔记类型、发布时间和搜索范围。
   *
   * @param page - Playwright 页面实例
   * @param filters - 要应用的过滤条件
   */
  private async applySearchFilters(page: Page, filters: XhsSearchFilters): Promise<void> {
    // 点击筛选按钮展开过滤器面板
    const filterBtn = await page.$('.filter-btn, .search-filter-btn, [class*="filter"]');
    if (filterBtn) {
      await filterBtn.click();
      await sleep(DELAYS.FILTER_PANEL_OPEN);
    }

    // 应用排序方式
    if (filters.sortBy && filters.sortBy !== 'general') {
      const sortText = SEARCH_FILTER_MAP.sortBy[filters.sortBy];
      const sortOption = await page.$(`text="${sortText}"`);
      if (sortOption) {
        await sortOption.click();
        await sleep(DELAYS.FILTER_CLICK);
      }
    }

    // 应用笔记类型
    if (filters.noteType && filters.noteType !== 'all') {
      const typeText = SEARCH_FILTER_MAP.noteType[filters.noteType];
      const typeOption = await page.$(`text="${typeText}"`);
      if (typeOption) {
        await typeOption.click();
        await sleep(DELAYS.FILTER_CLICK);
      }
    }

    // 应用发布时间
    if (filters.publishTime && filters.publishTime !== 'all') {
      const timeText = SEARCH_FILTER_MAP.publishTime[filters.publishTime];
      const timeOption = await page.$(`text="${timeText}"`);
      if (timeOption) {
        await timeOption.click();
        await sleep(DELAYS.FILTER_CLICK);
      }
    }

    // 应用搜索范围
    if (filters.searchScope && filters.searchScope !== 'all') {
      const scopeText = SEARCH_FILTER_MAP.searchScope[filters.searchScope];
      const scopeOption = await page.$(`text="${scopeText}"`);
      if (scopeOption) {
        await scopeOption.click();
        await sleep(DELAYS.FILTER_CLICK);
      }
    }
  }
}
