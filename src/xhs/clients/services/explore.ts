/**
 * @fileoverview Explore service for BrowserClient.
 * 自动化浏览首页，模拟真人行为。
 * @module xhs/clients/services/explore
 */

import { Page } from 'playwright';
import { BrowserContextManager, log } from '../context.js';
import { sleep } from '../../utils/index.js';
import { config } from '../../../core/config.js';
import { getDatabase, ExploreSessionResult } from '../../../db/index.js';
import { selectNoteToOpen, generateComment, NoteBrief } from '../../../core/explore-ai.js';
import { EXPLORE_SELECTORS } from '../constants.js';

/**
 * Explore 参数
 */
export interface ExploreParams {
  /** 运行时长（秒），默认 60 */
  duration?: number;
  /** 感兴趣的关键词 */
  interests?: string[];
  /** 打开笔记概率，默认 0.5 */
  openRate?: number;
  /** 打开后点赞概率，默认 0.5 */
  likeRate?: number;
  /** 打开后评论概率，默认 0.1 */
  commentRate?: number;
}

/**
 * Feed 数据结构（从 __INITIAL_STATE__ 读取）
 */
interface FeedItem {
  id: string;
  xsecToken: string;
  noteCard: {
    displayTitle?: string;
    title?: string;
    type: string;
    interactInfo?: {
      likedCount?: string;
    };
    user?: {
      nickname: string;
      userId: string;
    };
  };
}

/**
 * Modal 内笔记详情
 */
interface NoteDetail {
  title: string;
  desc: string;
}

/**
 * Explore service - 自动化浏览首页
 */
export class ExploreService {
  constructor(private ctx: BrowserContextManager) {}

  /**
   * 自动浏览首页
   * 模拟真人行为，根据概率打开笔记、点赞、评论
   */
  async explore(accountId: string, params: ExploreParams = {}): Promise<ExploreSessionResult> {
    const {
      duration = 60,
      interests = [],
      openRate = 0.5,
      likeRate = 0.5,
      commentRate = 0.1,
    } = params;

    await this.ctx.ensureContext();
    const page = await this.ctx.newPage();
    const db = getDatabase();

    // 创建会话
    const sessionId = db.explore.createSession(accountId, {
      duration,
      interests,
      openRate,
      likeRate,
      commentRate,
    });

    log.info('Starting explore session', { sessionId, duration, interests });

    // 统计
    let notesSeen = 0;
    let notesOpened = 0;
    let notesLiked = 0;
    let notesCommented = 0;

    // 已看过的笔记 ID（会话内去重，用于统计）
    const seenInSession = new Set<string>();
    // 已打开过的笔记 ID（会话内去重，用于选择）
    const openedInSession = new Set<string>();

    const startTime = Date.now();
    const endTime = startTime + duration * 1000;

    try {
      // 导航到 explore 页面
      log.info('Navigating to explore page');
      await page.goto('https://www.xiaohongshu.com/explore', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await sleep(2000);

      // 等待 __INITIAL_STATE__ 加载
      await page.waitForFunction(() => (window as any).__INITIAL_STATE__?.feed?.feeds, {
        timeout: 10000,
      });

      // 主循环
      while (Date.now() < endTime) {
        // 1. 滑动 1-2 次
        const scrollCount = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < scrollCount; i++) {
          await this.humanScroll(page);
          // 每次滚动后短暂停顿
          await sleep(500 + Math.random() * 500);
        }

        // 2. 停顿阅读 4-8 秒
        const readingDelay = 4000 + Math.random() * 4000;
        await sleep(readingDelay);

        // 3. 获取当前 feeds，过滤已看过的（用于统计）
        const feeds = await this.getFeeds(page);
        const newFeeds = feeds.filter(f => {
          if (seenInSession.has(f.id)) return false;
          if (f.noteCard.type === 'video') return false; // 跳过视频
          return true;
        });

        // 标记为已看
        for (const feed of newFeeds) {
          seenInSession.add(feed.id);
        }

        // 记录到数据库
        if (newFeeds.length > 0) {
          notesSeen += newFeeds.length;
          db.explore.logSeenNotes(sessionId, newFeeds.map(f => ({
            id: f.id,
            title: f.noteCard.displayTitle || f.noteCard.title || '',
          })));
          db.explore.markNotesExplored(accountId, newFeeds.map(f => f.id));
        }

        log.debug('Feeds after scroll', { total: feeds.length, new: newFeeds.length });

        // 4. 按概率决定是否打开笔记
        if (Math.random() < openRate) {
          // 获取当前 DOM 中可见的笔记 ID（虚拟滚动，只有可见的才有 DOM）
          const visibleIds = await this.getVisibleNoteIds(page);
          log.debug('Visible notes in DOM', { count: visibleIds.size });

          // 从所有可见笔记中选择（排除已打开过的和视频）
          const visibleFeeds = feeds.filter(f =>
            visibleIds.has(f.id) &&
            !openedInSession.has(f.id) &&
            f.noteCard.type !== 'video'
          );
          log.debug('Visible unopened feeds', { count: visibleFeeds.length });

          if (visibleFeeds.length === 0) {
            log.debug('No visible unopened feeds to open');
            continue;
          }

          // 调用 AI 选择一篇
          const noteBriefs: NoteBrief[] = visibleFeeds.slice(0, 10).map(f => ({
            id: f.id,
            title: f.noteCard.displayTitle || f.noteCard.title || '',
            likes: f.noteCard.interactInfo?.likedCount || '0',
            type: f.noteCard.type,
          }));

          const selection = await selectNoteToOpen(noteBriefs, interests);

          if (selection.noteId) {
            const selectedFeed = visibleFeeds.find(f => f.id === selection.noteId);
            if (selectedFeed) {
              log.info('AI selected note', { noteId: selection.noteId, reason: selection.reason });

              // 标记为已打开（避免重复打开）
              openedInSession.add(selectedFeed.id);

              // 记录 opened
              db.explore.logAction(sessionId, {
                noteId: selectedFeed.id,
                noteTitle: selectedFeed.noteCard.displayTitle || selectedFeed.noteCard.title,
                action: 'opened',
                aiReason: selection.reason,
              });
              notesOpened++;

              // 打开 modal
              const opened = await this.openNoteModal(page, selectedFeed.id);

              if (opened) {
                // 停顿阅读 3-8 秒
                const modalReadDelay = 3000 + Math.random() * 5000;
                await sleep(modalReadDelay);

                // 获取笔记详情
                const noteDetail = await this.getNoteDetailFromModal(page, selectedFeed.id);

                // 按概率点赞
                if (Math.random() < likeRate) {
                  const liked = await this.likeInModal(page);
                  if (liked) {
                    db.explore.logAction(sessionId, {
                      noteId: selectedFeed.id,
                      noteTitle: selectedFeed.noteCard.displayTitle,
                      action: 'liked',
                    });
                    notesLiked++;
                    db.explore.markNoteExplored(accountId, selectedFeed.id, true);
                    log.info('Liked note', { noteId: selectedFeed.id });
                  }
                }

                // 按概率评论
                if (Math.random() < commentRate && noteDetail) {
                  const commentResult = await generateComment(noteDetail.title, noteDetail.desc);
                  const commented = await this.commentInModal(page, commentResult.comment);
                  if (commented) {
                    db.explore.logAction(sessionId, {
                      noteId: selectedFeed.id,
                      noteTitle: selectedFeed.noteCard.displayTitle,
                      action: 'commented',
                      content: commentResult.comment,
                    });
                    notesCommented++;
                    db.explore.markNoteExplored(accountId, selectedFeed.id, true);
                    log.info('Commented on note', { noteId: selectedFeed.id, comment: commentResult.comment });
                  }
                }

                // 关闭 modal
                await this.closeModal(page);
                await sleep(1000 + Math.random() * 2000);
              }
            }
          } else {
            log.debug('AI chose not to open any note', { reason: selection.reason });
          }
        }

        // 更新统计
        db.explore.updateSessionStats(sessionId, {
          notesSeen,
          notesOpened,
          notesLiked,
          notesCommented,
        });
      }

      // 结束会话
      db.explore.endSession(sessionId, 'completed');
      log.info('Explore session completed', { notesSeen, notesOpened, notesLiked, notesCommented });

    } catch (error) {
      log.error('Explore error', { error });
      db.explore.endSession(sessionId, 'stopped');
    } finally {
      // DEBUG 模式下保持浏览器打开
      if (!config.browser.keepOpen) {
        await page.close();
      } else {
        log.info('DEBUG mode: keeping browser open');
      }
    }

    // 返回会话结果
    return db.explore.getSessionResult(sessionId)!;
  }

  /**
   * 模拟人类滚动
   */
  private async humanScroll(page: Page): Promise<void> {
    const distance = 300 + Math.random() * 400;
    const steps = 5 + Math.floor(Math.random() * 5);

    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(0, distance / steps);
      await sleep(20 + Math.random() * 60);
    }
  }

  /**
   * 从页面获取 feeds
   */
  private async getFeeds(page: Page): Promise<FeedItem[]> {
    try {
      const feedsJson = await page.evaluate(() => {
        const state = (window as any).__INITIAL_STATE__;
        if (state?.feed?.feeds) {
          const feeds = state.feed.feeds;
          const feedsData = feeds.value !== undefined ? feeds.value : feeds._value || feeds;
          if (Array.isArray(feedsData)) {
            return JSON.stringify(feedsData);
          }
        }
        return '[]';
      });
      return JSON.parse(feedsJson);
    } catch (error) {
      log.warn('Failed to get feeds', { error });
      return [];
    }
  }

  /**
   * 获取当前 DOM 中可见的笔记 ID 列表
   * 小红书使用虚拟滚动，只有可见区域的笔记才有 DOM 元素
   */
  private async getVisibleNoteIds(page: Page): Promise<Set<string>> {
    try {
      const ids = await page.$$eval(EXPLORE_SELECTORS.noteCover, els =>
        els.map(el => {
          const href = el.getAttribute('href') || '';
          // 从 href 中提取 noteId，格式如 /explore/xxx?xsec_token=...
          const match = href.match(/\/explore\/([a-f0-9]+)/);
          return match ? match[1] : '';
        }).filter(Boolean)
      );
      return new Set(ids);
    } catch (error) {
      log.warn('Failed to get visible note IDs', { error });
      return new Set();
    }
  }

  /**
   * 打开笔记 modal
   */
  private async openNoteModal(page: Page, noteId: string): Promise<boolean> {
    try {
      // 查找笔记封面（可点击的 a.cover 元素）
      const coverSelector = `${EXPLORE_SELECTORS.noteCover}[href*="${noteId}"]`;
      const cover = await page.$(coverSelector);

      if (!cover) {
        log.warn('Note cover not found', { noteId });
        return false;
      }

      // 先滚动到可见区域
      await cover.scrollIntoViewIfNeeded();
      await sleep(300);

      // 用原生 click（Playwright click 可能被拦截）
      await cover.evaluate((el: HTMLElement) => el.click());
      await sleep(500);

      // 等待 modal 出现
      await page.waitForSelector(EXPLORE_SELECTORS.noteContainer, { timeout: 5000 });
      log.info('Modal opened', { noteId });
      return true;

    } catch (error) {
      log.warn('Failed to open modal', { noteId, error });
      return false;
    }
  }

  /**
   * 从 modal 获取笔记详情
   */
  private async getNoteDetailFromModal(page: Page, noteId: string): Promise<NoteDetail | null> {
    try {
      const detailJson = await page.evaluate((id) => {
        const state = (window as any).__INITIAL_STATE__;
        const noteMap = state?.note?.noteDetailMap;
        if (noteMap) {
          const mapData = noteMap.value !== undefined ? noteMap.value : noteMap._value || noteMap;
          const detail = mapData[id];
          if (detail) {
            const note = detail.note || detail;
            return JSON.stringify({
              title: note.title || '',
              desc: note.desc || '',
            });
          }
        }
        return null;
      }, noteId);

      return detailJson ? JSON.parse(detailJson) : null;
    } catch (error) {
      log.warn('Failed to get note detail', { noteId, error });
      return null;
    }
  }

  /**
   * 在 modal 内点赞
   */
  private async likeInModal(page: Page): Promise<boolean> {
    try {
      const likeBtn = await page.$(EXPLORE_SELECTORS.likeWrapper);
      if (!likeBtn) {
        log.warn('Like button not found in modal');
        return false;
      }

      // 检查是否已点赞
      const isLiked = await likeBtn.evaluate(
        (el, className) => el.classList.contains(className),
        EXPLORE_SELECTORS.likeActiveClass
      );
      if (isLiked) {
        log.debug('Already liked');
        return false;
      }

      // 点赞
      await likeBtn.click();
      await sleep(500);
      return true;

    } catch (error) {
      log.warn('Failed to like in modal', { error });
      return false;
    }
  }

  /**
   * 在 modal 内评论
   */
  private async commentInModal(page: Page, content: string): Promise<boolean> {
    try {
      // 点击评论输入区域
      const inputArea = await page.$(EXPLORE_SELECTORS.commentInputArea);
      if (!inputArea) {
        log.warn('Comment input area not found');
        return false;
      }

      await inputArea.click();
      await sleep(500);

      // 输入评论内容
      const commentInput = await page.$(EXPLORE_SELECTORS.commentInput);
      if (!commentInput) {
        log.warn('Comment input not found');
        return false;
      }

      await commentInput.evaluate((el: HTMLElement, text: string) => {
        el.textContent = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, content);

      await sleep(500);

      // 点击提交按钮
      const submitBtn = await page.$(EXPLORE_SELECTORS.commentSubmit);
      if (!submitBtn) {
        log.warn('Submit button not found');
        return false;
      }

      await submitBtn.click();
      await sleep(2000);
      return true;

    } catch (error) {
      log.warn('Failed to comment in modal', { error });
      return false;
    }
  }

  /**
   * 关闭 modal
   */
  private async closeModal(page: Page): Promise<void> {
    try {
      // 点击关闭按钮
      const closeBtn = await page.$(EXPLORE_SELECTORS.closeButton);
      if (closeBtn) {
        await closeBtn.click();
        await sleep(500);
        return;
      }

      // 备选：按 ESC
      await page.keyboard.press('Escape');
      await sleep(500);

    } catch (error) {
      log.warn('Failed to close modal', { error });
      // 尝试按 ESC
      await page.keyboard.press('Escape').catch(() => {});
    }
  }
}
