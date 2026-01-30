/**
 * @fileoverview Notification service for fetching user notifications.
 * @module xhs/clients/services/notification
 */

import { BrowserContextManager } from '../context.js';
import { sleep } from '../../utils/index.js';
import { REQUEST_INTERVAL } from '../constants.js';

/**
 * 通知中的用户信息
 */
export interface NotificationUser {
  userId: string;
  nickname: string;
  avatar: string;
  xsecToken?: string;
}

/**
 * 通知中的笔记信息
 */
export interface NotificationItem {
  id: string;
  type: string;
  content: string;
  image?: string;
  xsecToken: string;
}

/**
 * 通知中的评论信息
 */
export interface NotificationComment {
  id: string;
  content: string;
  targetComment?: {
    id: string;
    content: string;
    user: NotificationUser;
  };
}

/**
 * 单条通知
 */
export interface NotificationMessage {
  id: string;
  type: string;
  title: string;
  time: number;
  user: NotificationUser;
  noteId?: string;
  xsecToken?: string;
  commentId?: string;
  commentContent?: string;
  targetCommentId?: string;
  targetCommentContent?: string;
}

/**
 * 通知统计
 */
export interface NotificationCount {
  unreadCount: number;
  mentions: number;
  likes: number;
  connections: number;
}

/**
 * 获取通知的结果
 */
export interface NotificationsResult {
  success: boolean;
  error?: string;
  count?: NotificationCount;
  mentions?: NotificationMessage[];
  likes?: NotificationMessage[];
  connections?: NotificationMessage[];
}

/**
 * NotificationService - 获取用户通知
 */
export class NotificationService {
  constructor(private ctx: BrowserContextManager) {}

  /**
   * 递归解析 Vue 响应式对象
   */
  private extractData(obj: any, depth = 0, maxDepth = 15): any {
    if (depth > maxDepth) return null;
    if (obj === null || obj === undefined) return obj;

    // 处理 Vue 响应式对象
    if (obj._rawValue !== undefined) return this.extractData(obj._rawValue, depth + 1, maxDepth);
    if (obj._value !== undefined) return this.extractData(obj._value, depth + 1, maxDepth);

    // 处理数组
    if (Array.isArray(obj)) {
      return obj.map(item => this.extractData(item, depth + 1, maxDepth));
    }

    // 处理普通对象
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key of Object.keys(obj)) {
        if (key.startsWith('__v_') || key.startsWith('__ob__')) continue;
        try {
          result[key] = this.extractData(obj[key], depth + 1, maxDepth);
        } catch {
          result[key] = null;
        }
      }
      return result;
    }

    return obj;
  }

  /**
   * 解析单条通知消息
   */
  private parseMessage(raw: any): NotificationMessage {
    const userInfo = raw.userInfo || {};
    const itemInfo = raw.itemInfo || {};
    const commentInfo = raw.commentInfo || {};

    return {
      id: raw.id,
      type: raw.type,
      title: raw.title,
      time: raw.time,
      user: {
        userId: userInfo.userid || userInfo.userId,
        nickname: userInfo.nickname,
        avatar: userInfo.image,
        xsecToken: userInfo.xsecToken,
      },
      noteId: itemInfo.id,
      xsecToken: itemInfo.xsecToken,
      commentId: commentInfo.id,
      commentContent: commentInfo.content,
      targetCommentId: commentInfo.targetComment?.id,
      targetCommentContent: commentInfo.targetComment?.content,
    };
  }

  /**
   * 获取通知列表
   * @param type - 通知类型：mentions, likes, connections, all
   * @param limit - 每种类型的数量限制
   */
  async getNotifications(
    type: 'mentions' | 'likes' | 'connections' | 'all' = 'all',
    limit: number = 20
  ): Promise<NotificationsResult> {
    await this.ctx.ensureContext();
    const page = await this.ctx.newPage();

    try {
      // 访问通知页面
      await page.goto('https://www.xiaohongshu.com/notification', {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForLoadState('networkidle').catch(() => {});
      await sleep(REQUEST_INTERVAL);

      // 从页面提取 __INITIAL_STATE__.notification
      const notificationData = await page.evaluate(() => {
        const state = (window as any).__INITIAL_STATE__?.notification;
        if (!state) return null;

        // 返回原始数据，在 Node 侧解析
        return JSON.parse(JSON.stringify(state, (key, value) => {
          // 跳过 Vue 内部属性
          if (key.startsWith('__v_') || key.startsWith('__ob__')) return undefined;
          // 处理响应式对象
          if (value && typeof value === 'object') {
            if (value._rawValue !== undefined) return value._rawValue;
            if (value._value !== undefined) return value._value;
          }
          return value;
        }));
      });

      if (!notificationData) {
        return {
          success: false,
          error: 'Failed to get notification data. Make sure you are logged in.',
        };
      }

      // 解析通知统计
      const countData = notificationData.notificationCount || {};
      const count: NotificationCount = {
        unreadCount: countData.unreadCount || 0,
        mentions: countData.mentions || 0,
        likes: countData.likes || 0,
        connections: countData.connections || 0,
      };

      const result: NotificationsResult = {
        success: true,
        count,
      };

      // 解析各类通知
      const notificationMap = notificationData.notificationMap || {};

      if (type === 'all' || type === 'mentions') {
        const mentionsData = notificationMap.mentions?.messageList || [];
        result.mentions = mentionsData.slice(0, limit).map((msg: any) => this.parseMessage(msg));
      }

      if (type === 'all' || type === 'likes') {
        const likesData = notificationMap.likes?.messageList || [];
        result.likes = likesData.slice(0, limit).map((msg: any) => this.parseMessage(msg));
      }

      if (type === 'all' || type === 'connections') {
        const connectionsData = notificationMap.connections?.messageList || [];
        result.connections = connectionsData.slice(0, limit).map((msg: any) => this.parseMessage(msg));
      }

      return result;
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
