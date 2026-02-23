/**
 * @fileoverview Explore service for BrowserClient.
 * 自动化浏览首页，模拟真人行为。
 * @module xhs/clients/services/explore
 */

import { Page } from 'patchright';
import { BrowserContextManager, log } from '../context.js';
import { sleep } from '../../utils/index.js';
import { config } from '../../../core/config.js';
import { getDatabase, ExploreSessionResult } from '../../../db/index.js';
import {
  selectNoteToOpen,
  generateComment,
  selectLikeTarget,
  NoteBrief,
  AccountInfo,
  CommentBrief,
} from '../../../core/explore-ai.js';
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
  /** 是否启用跨会话去重，默认 true */
  deduplicate?: boolean;
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
 * 评论信息
 */
interface CommentInfo {
  id: string;
  content: string;
  likeCount: string;
  liked: boolean;
}

/**
 * Modal 内笔记详情
 */
interface NoteDetail {
  title: string;
  desc: string;
  comments: CommentInfo[];
}

/**
 * Explore service - 自动化浏览首页
 */
export class ExploreService {
  /** 存储每个 session 的 AbortController，用于中途停止 */
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(private ctx: BrowserContextManager) {}

  /**
   * 停止指定的 explore 会话
   * @param sessionId 会话 ID，如果不指定则停止所有会话
   * @returns 被停止的会话 ID 列表
   */
  stopExplore(sessionId?: string): string[] {
    const stoppedSessions: string[] = [];

    if (sessionId) {
      const controller = this.abortControllers.get(sessionId);
      if (controller) {
        controller.abort();
        this.abortControllers.delete(sessionId);
        stoppedSessions.push(sessionId);
        log.info('Explore session stopped', { sessionId });
      }
    } else {
      // 停止所有会话
      for (const [sid, controller] of this.abortControllers) {
        controller.abort();
        stoppedSessions.push(sid);
        log.info('Explore session stopped', { sessionId: sid });
      }
      this.abortControllers.clear();
    }

    return stoppedSessions;
  }

  /**
   * 获取当前正在运行的 explore 会话 ID 列表
   */
  getActiveSessions(): string[] {
    return Array.from(this.abortControllers.keys());
  }

  /**
   * 自动浏览首页
   * 模拟真人行为，根据概率打开笔记、点赞、评论
   */
  async explore(accountId: string, accountName: string, params: ExploreParams = {}): Promise<ExploreSessionResult> {
    const {
      duration = 60,
      interests = [],
      openRate = 0.5,
      likeRate = 0.5,
      commentRate = 0.1,
      deduplicate = true,
    } = params;

    // 账号信息，用于读取 prompt
    const accountInfo: AccountInfo = { id: accountId, name: accountName };

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

    // 创建 AbortController 用于中途停止
    const abortController = new AbortController();
    this.abortControllers.set(sessionId, abortController);

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
      // 连续未打开计数（用于兜底逻辑）
      let skippedRounds = 0;

      while (Date.now() < endTime) {
        // 检查是否被中途停止
        if (abortController.signal.aborted) {
          log.info('Explore session aborted by user', { sessionId });
          break;
        }

        // === 随机行为模式 ===
        const behaviorRoll = Math.random();

        // 10% 概率：快速滑过模式（连续滑动，不停顿看）
        if (behaviorRoll < 0.1) {
          log.debug('Behavior: quick scroll mode');
          const quickScrolls = 3 + Math.floor(Math.random() * 3); // 3-5 次
          for (let i = 0; i < quickScrolls; i++) {
            await this.humanScroll(page);
            await sleep(200 + Math.random() * 300);
          }
          continue;
        }

        // 5% 概率：倒回去看（往上滚一点）
        if (behaviorRoll < 0.15) {
          log.debug('Behavior: scroll back');
          await page.mouse.wheel(0, -(200 + Math.random() * 200));
          await sleep(1000 + Math.random() * 1000);
        }

        // 正常滑动 1-3 次
        const scrollCount = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < scrollCount; i++) {
          await this.humanScroll(page);
          await sleep(400 + Math.random() * 400);
        }

        // 停顿阅读：正常 3-8 秒，10% 概率长时间停留 10-20 秒
        const isLongPause = Math.random() < 0.1;
        const readingDelay = isLongPause ? 10000 + Math.random() * 10000 : 3000 + Math.random() * 5000;
        if (isLongPause) {
          log.debug('Behavior: long pause');
        }
        await sleep(readingDelay);

        // 获取当前 feeds，过滤已看过的（用于统计）
        const feeds = await this.getFeeds(page);
        const newFeeds = feeds.filter((f) => {
          if (seenInSession.has(f.id)) return false;
          if (f.noteCard.type === 'video') return false; // 跳过视频
          return true;
        });

        // 标记为已看
        for (const feed of newFeeds) {
          seenInSession.add(feed.id);
        }

        // 记录到数据库（仅用于日志，不标记为 explored）
        // explored 标记只在真正互动（点赞/评论）后才设置，用于跨会话去重
        if (newFeeds.length > 0) {
          notesSeen += newFeeds.length;
          db.explore.logSeenNotes(
            sessionId,
            newFeeds.map((f) => ({
              id: f.id,
              title: f.noteCard.displayTitle || f.noteCard.title || '',
            })),
          );
        }

        log.debug('Feeds after scroll', { total: feeds.length, new: newFeeds.length });

        // === 决定是否打开笔记 ===
        // 连续跳过多轮后概率递增（兜底逻辑）
        const adjustedOpenRate = Math.min(openRate + skippedRounds * 0.1, 0.9);

        if (Math.random() < adjustedOpenRate) {
          // 获取当前 DOM 中可见的笔记 ID
          const visibleIds = await this.getVisibleNoteIds(page);
          log.debug('Visible notes in DOM', { count: visibleIds.size });

          // 从可见笔记中筛选：排除会话内已打开、视频
          let candidateFeeds = feeds.filter(
            (f) => visibleIds.has(f.id) && !openedInSession.has(f.id) && f.noteCard.type !== 'video',
          );

          // 跨会话去重：排除之前互动过的笔记
          if (deduplicate && candidateFeeds.length > 0) {
            const candidateIds = candidateFeeds.map((f) => f.id);
            const unexploredIds = db.explore.filterUnexploredNotes(accountId, candidateIds);
            const unexploredSet = new Set(unexploredIds);
            const beforeCount = candidateFeeds.length;
            candidateFeeds = candidateFeeds.filter((f) => unexploredSet.has(f.id));
            if (beforeCount !== candidateFeeds.length) {
              log.debug('Cross-session dedup', { before: beforeCount, after: candidateFeeds.length });
            }
          }

          log.debug('Candidate feeds for opening', { count: candidateFeeds.length });

          if (candidateFeeds.length === 0) {
            log.debug('No candidate feeds to open');
            skippedRounds++;
            continue;
          }

          // 调用 AI 选择一篇
          const noteBriefs: NoteBrief[] = candidateFeeds.slice(0, 10).map((f) => ({
            id: f.id,
            title: f.noteCard.displayTitle || f.noteCard.title || '',
            likes: f.noteCard.interactInfo?.likedCount || '0',
            type: f.noteCard.type,
          }));

          const selection = await selectNoteToOpen(accountInfo, noteBriefs, interests);

          if (selection.noteId) {
            skippedRounds = 0; // 重置跳过计数
            const selectedFeed = candidateFeeds.find((f) => f.id === selection.noteId);
            if (selectedFeed) {
              log.info('AI selected note', { noteId: selection.noteId, reason: selection.reason });

              // 标记为已打开
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
                // 15% 概率快速关掉（假装不感兴趣）
                if (Math.random() < 0.15) {
                  log.debug('Behavior: quick close (not interested)');
                  await sleep(800 + Math.random() * 700);
                  await this.closeModal(page);
                  await sleep(500 + Math.random() * 500);
                  continue;
                }

                // 正常阅读：3-8 秒，10% 概率长时间 10-20 秒
                const isDeepRead = Math.random() < 0.1;
                const modalReadDelay = isDeepRead ? 10000 + Math.random() * 10000 : 3000 + Math.random() * 5000;
                if (isDeepRead) {
                  log.debug('Behavior: deep reading');
                }
                await sleep(modalReadDelay);

                // 获取笔记详情（包含评论）
                const noteDetail = await this.getNoteDetailFromModal(page, selectedFeed.id);

                // 按概率决定是否点赞（使用 AI 选择点赞帖子还是评论）
                if (Math.random() < likeRate && noteDetail) {
                  const likeTarget = await selectLikeTarget(
                    accountInfo,
                    noteDetail.title,
                    noteDetail.desc,
                    noteDetail.comments,
                  );

                  if (likeTarget.target === 'post') {
                    // 点赞帖子
                    const liked = await this.likeInModal(page);
                    if (liked) {
                      db.explore.logAction(sessionId, {
                        noteId: selectedFeed.id,
                        noteTitle: selectedFeed.noteCard.displayTitle,
                        action: 'liked',
                        aiReason: likeTarget.reason,
                      });
                      notesLiked++;
                      db.explore.markNoteExplored(accountId, selectedFeed.id, true);
                      log.info('Liked note', { noteId: selectedFeed.id, reason: likeTarget.reason });
                    }
                  } else if (likeTarget.target.startsWith('comment:')) {
                    // 点赞评论
                    const commentId = likeTarget.target.replace('comment:', '');
                    const liked = await this.likeCommentInModal(page, commentId);
                    if (liked) {
                      db.explore.logAction(sessionId, {
                        noteId: selectedFeed.id,
                        noteTitle: selectedFeed.noteCard.displayTitle,
                        action: 'liked',
                        content: `评论: ${commentId}`,
                        aiReason: likeTarget.reason,
                      });
                      notesLiked++;
                      db.explore.markNoteExplored(accountId, selectedFeed.id, true);
                      log.info('Liked comment', { noteId: selectedFeed.id, commentId, reason: likeTarget.reason });
                    }
                  } else {
                    log.debug('AI chose not to like', { reason: likeTarget.reason });
                  }
                }

                // 按概率评论
                if (Math.random() < commentRate && noteDetail) {
                  const commentResult = await generateComment(accountInfo, noteDetail.title, noteDetail.desc);
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

                // 关闭 modal，随机停顿
                await this.closeModal(page);
                await sleep(800 + Math.random() * 1500);
              }
            }
          } else {
            log.debug('AI chose not to open any note', { reason: selection.reason });
            skippedRounds++;
          }
        } else {
          skippedRounds++;
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
      const endStatus = abortController.signal.aborted ? 'stopped' : 'completed';
      db.explore.endSession(sessionId, endStatus);
      log.info('Explore session ended', { status: endStatus, notesSeen, notesOpened, notesLiked, notesCommented });
    } catch (error) {
      log.error('Explore error', { error });
      db.explore.endSession(sessionId, 'stopped');
    } finally {
      // 清理 AbortController
      this.abortControllers.delete(sessionId);

      // keepOpen 模式下保持浏览器打开
      if (!config.browser.keepOpen) {
        await page.close();
      } else {
        log.info('Keep open mode: browser stays open');
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
      const feedsJson = await page.evaluate(
        () => {
          const state = (window as any).__INITIAL_STATE__;
          if (state?.feed?.feeds) {
            const feeds = state.feed.feeds;
            const feedsData = feeds.value !== undefined ? feeds.value : feeds._value || feeds;
            if (Array.isArray(feedsData)) {
              return JSON.stringify(feedsData);
            }
          }
          return '[]';
        },
        null,
        false,
      );
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
      const ids = await page.$$eval(EXPLORE_SELECTORS.noteCover, (els) =>
        els
          .map((el) => {
            const href = el.getAttribute('href') || '';
            // 从 href 中提取 noteId，格式如 /explore/xxx?xsec_token=...
            const match = href.match(/\/explore\/([a-f0-9]+)/);
            return match ? match[1] : '';
          })
          .filter(Boolean),
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
   * 从 modal 获取笔记详情（包含评论）
   */
  private async getNoteDetailFromModal(page: Page, noteId: string): Promise<NoteDetail | null> {
    try {
      const detailJson = await page.evaluate(
        (id) => {
          const state = (window as any).__INITIAL_STATE__;
          const noteMap = state?.note?.noteDetailMap;
          if (noteMap) {
            const mapData = noteMap.value !== undefined ? noteMap.value : noteMap._value || noteMap;
            // 找到正确的 key（跳过 undefined）
            const actualId = Object.keys(mapData).find((k) => k !== 'undefined' && k === id) || id;
            const detail = mapData[actualId];
            if (detail) {
              const note = detail.note || detail;
              // 提取评论列表（前 10 条）
              const commentList = detail.comments?.list || [];
              const comments = commentList.slice(0, 10).map((c: any) => ({
                id: c.id || '',
                content: c.content || '',
                likeCount: c.likeCount || '0',
                liked: !!c.liked,
              }));
              return JSON.stringify({
                title: note.title || '',
                desc: note.desc || '',
                comments,
              });
            }
          }
          return null;
        },
        noteId,
        false,
      );

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

      // 检查是否已点赞（通过 SVG use 的 xlink:href 判断，#like=未点赞，#liked=已点赞）
      const isLiked = await likeBtn.evaluate((el: Element) => {
        const useEl = el.querySelector('use');
        if (!useEl) return false;
        const href = useEl.getAttribute('xlink:href');
        return href === '#liked';
      });
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
   * 在 modal 内点赞评论
   * @param commentId 评论 ID
   */
  private async likeCommentInModal(page: Page, commentId: string): Promise<boolean> {
    try {
      // 找到评论元素
      const commentSelector = `#comment-${commentId}`;
      const commentEl = await page.$(commentSelector);
      if (!commentEl) {
        log.warn('Comment not found', { commentId });
        return false;
      }

      // 找到评论的点赞按钮
      const likeBtn = await commentEl.$('.like-wrapper');
      if (!likeBtn) {
        log.warn('Comment like button not found', { commentId });
        return false;
      }

      // 检查是否已点赞
      const isLiked = await likeBtn.evaluate((el: Element) => {
        const useEl = el.querySelector('use');
        if (!useEl) return false;
        const href = useEl.getAttribute('xlink:href');
        return href === '#liked';
      });
      if (isLiked) {
        log.debug('Comment already liked', { commentId });
        return false;
      }

      // 点赞
      await likeBtn.click();
      await sleep(500);
      log.debug('Liked comment', { commentId });
      return true;
    } catch (error) {
      log.warn('Failed to like comment', { commentId, error });
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
