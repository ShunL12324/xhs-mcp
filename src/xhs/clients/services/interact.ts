/**
 * @fileoverview Interaction service for BrowserClient.
 * Contains methods for liking, favoriting, and commenting.
 * @module xhs/clients/services/interact
 */

import { InteractionResult, CommentResult } from '../../types.js';
import { sleep, navigateWithRetry } from '../../utils/index.js';
import { BrowserContextManager } from '../context.js';
import {
  REQUEST_INTERVAL,
  INTERACTION_SELECTORS,
  COMMENT_SELECTORS,
} from '../constants.js';
import { createLogger } from '../../../core/logger.js';

/**
 * Interact service - handles note interactions (like, favorite, comment)
 */
export class InteractService {
  private logger = createLogger('interact');

  constructor(private ctx: BrowserContextManager) {}

  /**
   * Like or unlike a note.
   *
   * @param noteId - Target note ID
   * @param xsecToken - Security token from search results
   * @param unlike - If true, unlike the note; otherwise like it
   * @returns Interaction result
   */
  async likeFeed(noteId: string, xsecToken: string, unlike: boolean = false): Promise<InteractionResult> {
    await this.ctx.ensureContext();
    const page = await this.ctx.newPage();

    try {
      let url = `https://www.xiaohongshu.com/explore/${noteId}`;
      if (xsecToken) {
        url += `?xsec_token=${encodeURIComponent(xsecToken)}&xsec_source=pc_feed`;
      }

      // 带重试的页面导航
      const accessError = await navigateWithRetry(page, url);
      if (accessError) {
        return {
          success: false,
          action: unlike ? 'unlike' : 'like',
          noteId,
          error: accessError,
        };
      }
      await sleep(REQUEST_INTERVAL);

      // 获取当前点赞状态
      const isLiked = await page.evaluate(() => {
        const state = (window as any).__INITIAL_STATE__;
        const noteDetailMap = state?.note?.noteDetailMap;
        if (noteDetailMap) {
          const firstKey = Object.keys(noteDetailMap)[0];
          return noteDetailMap[firstKey]?.note?.interactInfo?.liked || false;
        }
        return false;
      });

      // 根据当前状态和目标操作决定是否需要点击
      const shouldClick = (unlike && isLiked) || (!unlike && !isLiked);

      if (shouldClick) {
        const likeBtn = await page.$(INTERACTION_SELECTORS.likeButton);
        if (likeBtn) {
          await likeBtn.click();
          await sleep(500);
        } else {
          return {
            success: false,
            action: unlike ? 'unlike' : 'like',
            noteId,
            error: 'Like button not found',
          };
        }
      }

      return {
        success: true,
        action: unlike ? 'unlike' : 'like',
        noteId,
      };
    } catch (error) {
      return {
        success: false,
        action: unlike ? 'unlike' : 'like',
        noteId,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      await page.close();
    }
  }

  /**
   * Favorite (collect) or unfavorite a note.
   *
   * @param noteId - Target note ID
   * @param xsecToken - Security token from search results
   * @param unfavorite - If true, unfavorite the note; otherwise favorite it
   * @returns Interaction result
   */
  async favoriteFeed(noteId: string, xsecToken: string, unfavorite: boolean = false): Promise<InteractionResult> {
    await this.ctx.ensureContext();
    const page = await this.ctx.newPage();

    try {
      let url = `https://www.xiaohongshu.com/explore/${noteId}`;
      if (xsecToken) {
        url += `?xsec_token=${encodeURIComponent(xsecToken)}&xsec_source=pc_feed`;
      }

      // 带重试的页面导航
      const accessError = await navigateWithRetry(page, url);
      if (accessError) {
        return {
          success: false,
          action: unfavorite ? 'unfavorite' : 'favorite',
          noteId,
          error: accessError,
        };
      }
      await sleep(REQUEST_INTERVAL);

      // 获取当前收藏状态
      const isCollected = await page.evaluate(() => {
        const state = (window as any).__INITIAL_STATE__;
        const noteDetailMap = state?.note?.noteDetailMap;
        if (noteDetailMap) {
          const firstKey = Object.keys(noteDetailMap)[0];
          return noteDetailMap[firstKey]?.note?.interactInfo?.collected || false;
        }
        return false;
      });

      const shouldClick = (unfavorite && isCollected) || (!unfavorite && !isCollected);

      if (shouldClick) {
        const collectBtn = await page.$(INTERACTION_SELECTORS.collectButton);
        if (collectBtn) {
          await collectBtn.click();
          await sleep(500);
        } else {
          return {
            success: false,
            action: unfavorite ? 'unfavorite' : 'favorite',
            noteId,
            error: 'Collect button not found',
          };
        }
      }

      return {
        success: true,
        action: unfavorite ? 'unfavorite' : 'favorite',
        noteId,
      };
    } catch (error) {
      return {
        success: false,
        action: unfavorite ? 'unfavorite' : 'favorite',
        noteId,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      await page.close();
    }
  }

  /**
   * Post a comment on a note.
   *
   * @param noteId - Target note ID
   * @param xsecToken - Security token from search results
   * @param content - Comment content
   * @returns Comment result
   */
  async postComment(noteId: string, xsecToken: string, content: string): Promise<CommentResult> {
    await this.ctx.ensureContext();
    const page = await this.ctx.newPage();

    try {
      let url = `https://www.xiaohongshu.com/explore/${noteId}`;
      if (xsecToken) {
        url += `?xsec_token=${encodeURIComponent(xsecToken)}&xsec_source=pc_feed`;
      }

      // 带重试的页面导航
      const accessError = await navigateWithRetry(page, url);
      if (accessError) {
        return { success: false, error: accessError };
      }
      await sleep(REQUEST_INTERVAL);

      // 点击评论输入框触发器
      const inputTrigger = await page.$(COMMENT_SELECTORS.commentInputTrigger);
      if (inputTrigger) {
        await inputTrigger.click();
        await sleep(500);
      }

      // 输入评论内容
      const commentInput = await page.$(COMMENT_SELECTORS.commentInput);
      if (!commentInput) {
        return { success: false, error: 'Comment input not found' };
      }

      await commentInput.click();
      await page.keyboard.type(content);
      await sleep(300);

      // 点击提交按钮
      const submitBtn = await page.$(COMMENT_SELECTORS.submitButton);
      if (!submitBtn) {
        return { success: false, error: 'Submit button not found' };
      }

      await submitBtn.click();
      await sleep(1000);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      await page.close();
    }
  }

  /**
   * Reply to a comment on a note.
   * 参考 reference project 的实现，使用 #comment-${commentId} 选择器
   *
   * @param noteId - Target note ID
   * @param xsecToken - Security token from search results
   * @param commentId - Comment ID to reply to
   * @param content - Reply content
   * @returns Comment result
   */
  async replyComment(
    noteId: string,
    xsecToken: string,
    commentId: string,
    content: string
  ): Promise<CommentResult> {
    await this.ctx.ensureContext();
    const page = await this.ctx.newPage();

    try {
      let url = `https://www.xiaohongshu.com/explore/${noteId}`;
      if (xsecToken) {
        url += `?xsec_token=${encodeURIComponent(xsecToken)}&xsec_source=pc_feed`;
      }

      // 带重试的页面导航
      const accessError = await navigateWithRetry(page, url);
      if (accessError) {
        return { success: false, error: accessError };
      }
      await sleep(1000);  // 与 reference project 一致

      // 等待评论区加载
      await sleep(2000);

      // 查找目标评论元素（使用 #comment-${commentId} 选择器）
      const commentEl = await this.findCommentElement(page, commentId);
      if (!commentEl) {
        return { success: false, error: `Comment not found: ${commentId}` };
      }

      // 滚动到评论位置
      await commentEl.scrollIntoViewIfNeeded();
      await sleep(1000);

      // 查找并点击回复按钮（使用 .right .interactions .reply 选择器）
      const replyBtn = await commentEl.$('.right .interactions .reply');
      if (!replyBtn) {
        return { success: false, error: 'Reply button not found' };
      }

      await replyBtn.click();
      await sleep(1000);

      // 输入回复内容（使用与 reference project 相同的选择器）
      const commentInput = await page.$('div.input-box div.content-edit p.content-input');
      if (!commentInput) {
        return { success: false, error: 'Reply input not found' };
      }

      // 使用 evaluate 直接设置内容（模拟 rod 的 Input 方法）
      await commentInput.evaluate((el: HTMLElement, text: string) => {
        el.textContent = text;
        // 触发 input 事件让 Vue 检测到变化
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, content);
      await sleep(500);

      // 提交回复（使用与 reference project 相同的选择器）
      const submitBtn = await page.$('div.bottom button.submit');
      if (!submitBtn) {
        return { success: false, error: 'Submit button not found' };
      }

      await submitBtn.click();
      await sleep(2000);  // 等待 2 秒与 reference project 一致

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      await page.close();
    }
  }

  /**
   * 查找评论元素，支持滚动加载
   * 参考 reference project 的 findCommentElement 实现
   * 关键：先在当前视图查找，再滚动加载
   */
  private async findCommentElement(page: any, commentId: string): Promise<any> {
    const maxAttempts = 50;
    const scrollInterval = 800;
    const selector = `#comment-${commentId}`;

    this.logger.debug('查找评论元素', { commentId, selector });

    // 先在当前页面尝试查找（对于顶部的评论很重要）
    let el = await page.$(selector);
    if (el) {
      this.logger.debug('在当前页面找到评论');
      return el;
    }

    // 滚动到评论区
    await page.evaluate(() => {
      const commentsArea = document.querySelector('.comments-container, .comment-list, .note-comments');
      if (commentsArea) {
        commentsArea.scrollIntoView({ behavior: 'smooth' });
      }
    });
    await sleep(1000);

    // 滚动后再次尝试查找
    el = await page.$(selector);
    if (el) {
      this.logger.debug('滚动到评论区后找到评论');
      return el;
    }

    // 调试：列出当前页面上的评论ID
    const commentIds = await page.$$eval(
      '[id^="comment-"]',
      (els: Element[]) => els.map((e) => e.id)
    ).catch(() => [] as string[]);
    this.logger.debug('当前页面评论ID列表', { count: commentIds.length, ids: commentIds.slice(0, 10) });

    let lastCommentCount = 0;
    let stagnantChecks = 0;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // 检查是否到达底部
      const hasEndContainer = await page.$('.end-container, .comments-end, .no-more-comments');
      if (hasEndContainer && attempt > 5) {
        this.logger.debug('到达评论底部', { attempt });
        break;
      }

      // 获取当前评论数量
      const currentCount = await page.$$eval(
        '.comment-item, .parent-comment',
        (els: Element[]) => els.length
      ).catch(() => 0);

      if (currentCount !== lastCommentCount) {
        lastCommentCount = currentCount;
        stagnantChecks = 0;
      } else {
        stagnantChecks++;
      }

      // 停滞检测
      if (stagnantChecks >= 10) {
        this.logger.debug('评论数停滞', { attempt, stagnantChecks });
        break;
      }

      // 滚动加载更多评论
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight * 0.8);
      });
      await sleep(scrollInterval);

      // 滚动后立即查找（边滚动边查找）
      el = await page.$(selector);
      if (el) {
        this.logger.debug('滚动查找后找到评论', { attempt });
        return el;
      }
    }

    // 最后再尝试一次查找
    el = await page.$(selector);
    if (!el) {
      this.logger.warn('未找到评论', { commentId, selector });
    }
    return el;
  }

  /**
   * Like or unlike a comment.
   *
   * @param noteId - Target note ID
   * @param xsecToken - Security token from search results
   * @param commentId - Comment ID to like
   * @param unlike - If true, unlike the comment; otherwise like it
   * @returns Interaction result
   */
  async likeComment(
    noteId: string,
    xsecToken: string,
    commentId: string,
    unlike: boolean = false
  ): Promise<InteractionResult> {
    this.logger.info('开始点赞评论', { noteId, commentId, unlike });
    await this.ctx.ensureContext();
    const page = await this.ctx.newPage();

    try {
      let url = `https://www.xiaohongshu.com/explore/${noteId}`;
      if (xsecToken) {
        url += `?xsec_token=${encodeURIComponent(xsecToken)}&xsec_source=pc_feed`;
      }
      this.logger.debug('导航到帖子页面', { url });

      // 带重试的页面导航
      const accessError = await navigateWithRetry(page, url);
      if (accessError) {
        this.logger.error('页面访问失败', { error: accessError });
        return {
          success: false,
          action: unlike ? 'unlike' : 'like',
          noteId,
          error: accessError,
        };
      }
      await sleep(1000);  // 与 reference project 一致

      // 等待评论区加载
      await sleep(2000);

      // 查找目标评论元素
      const commentEl = await this.findCommentElement(page, commentId);
      if (!commentEl) {
        return {
          success: false,
          action: unlike ? 'unlike' : 'like',
          noteId,
          error: `Comment not found: ${commentId}`,
        };
      }

      // 滚动到评论位置
      await commentEl.scrollIntoViewIfNeeded();
      await sleep(500);

      // 查找点赞按钮
      const likeBtn = await commentEl.$('.like .like-wrapper');
      if (!likeBtn) {
        return {
          success: false,
          action: unlike ? 'unlike' : 'like',
          noteId,
          error: 'Like button not found',
        };
      }

      // 通过 xlink:href 检测当前点赞状态（#like=未点赞，#liked=已点赞）
      const isLiked = await likeBtn.evaluate((el: Element) => {
        const useEl = el.querySelector('use');
        if (!useEl) return false;
        const href = useEl.getAttribute('xlink:href');
        return href === '#liked';
      });

      // 根据当前状态和目标操作决定是否需要点击
      const shouldClick = (unlike && isLiked) || (!unlike && !isLiked);

      if (shouldClick) {
        // 使用 dispatchEvent 触发真实点击事件（Vue 组件需要这种方式）
        await likeBtn.evaluate((el: Element) => {
          const event = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
          el.dispatchEvent(event);
        });
        await sleep(500);
      }

      return {
        success: true,
        action: unlike ? 'unlike' : 'like',
        noteId,
      };
    } catch (error) {
      return {
        success: false,
        action: unlike ? 'unlike' : 'like',
        noteId,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      await page.close();
    }
  }
}
