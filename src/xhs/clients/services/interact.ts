/**
 * @fileoverview Interaction service for BrowserClient.
 * Contains methods for liking, favoriting, and commenting.
 * @module xhs/clients/services/interact
 */

import { InteractionResult, CommentResult } from '../../types.js';
import { sleep } from '../../utils/index.js';
import { BrowserContextManager } from '../context.js';
import {
  REQUEST_INTERVAL,
  INTERACTION_SELECTORS,
  COMMENT_SELECTORS,
} from '../constants.js';

/**
 * Interact service - handles note interactions (like, favorite, comment)
 */
export class InteractService {
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

      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});
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

      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});
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

      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});
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

      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});
      await sleep(REQUEST_INTERVAL);

      // 找到目标评论并点击回复按钮
      // 评论 ID 通常在 data-id 属性中
      const replyBtn = await page.$(`[data-id="${commentId}"] ${COMMENT_SELECTORS.replyButton}, .comment-item[data-id="${commentId}"] .reply-btn`);
      if (replyBtn) {
        await replyBtn.click();
        await sleep(500);
      } else {
        // 尝试其他方式找到评论
        const commentElements = await page.$$('.comment-item, .comment-wrapper');
        for (const el of commentElements) {
          const id = await el.getAttribute('data-id');
          if (id === commentId) {
            const reply = await el.$(COMMENT_SELECTORS.replyButton);
            if (reply) {
              await reply.click();
              await sleep(500);
              break;
            }
          }
        }
      }

      // 输入回复内容
      const commentInput = await page.$(COMMENT_SELECTORS.commentInput);
      if (!commentInput) {
        return { success: false, error: 'Reply input not found' };
      }

      await commentInput.click();
      await page.keyboard.type(content);
      await sleep(300);

      // 提交回复
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
}
