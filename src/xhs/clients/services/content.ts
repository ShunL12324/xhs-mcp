/**
 * @fileoverview Content retrieval service for BrowserClient.
 * Contains methods for fetching notes, user profiles, and feeds.
 * @module xhs/clients/services/content
 */

import { XhsNote, XhsSearchItem, XhsUserInfo } from '../../types.js';
import { sleep, navigateWithRetry } from '../../utils/index.js';
import { BrowserContextManager, log } from '../context.js';
import { TIMEOUTS, REQUEST_INTERVAL } from '../constants.js';

/**
 * Content service - handles note and user profile retrieval
 */
export class ContentService {
  constructor(private ctx: BrowserContextManager) {}

  /**
   * Get note details including content, images, stats, and comments.
   * Uses the page's __INITIAL_STATE__ to extract data.
   *
   * @param noteId - Note ID to fetch
   * @param xsecToken - Security token from search results (required for reliable access)
   * @returns Note details or null if not found
   */
  async getNote(noteId: string, xsecToken?: string): Promise<XhsNote | null> {
    await this.ctx.ensureContext();
    const page = await this.ctx.newPage();

    try {
      // 构建 URL
      let url = `https://www.xiaohongshu.com/explore/${noteId}`;
      if (xsecToken) {
        url += `?xsec_token=${encodeURIComponent(xsecToken)}&xsec_source=pc_feed`;
      }

      // 带重试的页面导航
      const accessError = await navigateWithRetry(page, url);
      if (accessError) {
        log.warn('Note page not accessible', { noteId, error: accessError });
        return null;
      }

      // 等待 __INITIAL_STATE__ 存在
      await page.waitForFunction(() => (window as any).__INITIAL_STATE__ !== undefined, {
        timeout: TIMEOUTS.PAGE_LOAD,
      });

      await sleep(REQUEST_INTERVAL);

      // 获取笔记详情和评论（参照 xiaohongshu-mcp）
      const result = await page.evaluate(
        (_nid: string) => {
          const state = (window as any).__INITIAL_STATE__;
          if (state?.note?.noteDetailMap) {
            const noteDetailMap = state.note.noteDetailMap;
            return JSON.stringify(noteDetailMap);
          }
          return '';
        },
        noteId,
        false,
      );

      if (!result) {
        log.warn('Note detail not found in __INITIAL_STATE__', { noteId });
        return null;
      }

      const noteDetailMap = JSON.parse(result);

      // 尝试获取指定 ID 的笔记，或第一个
      let noteDetail = noteDetailMap[noteId];
      if (!noteDetail) {
        const firstKey = Object.keys(noteDetailMap)[0];
        if (firstKey) {
          noteDetail = noteDetailMap[firstKey];
        }
      }

      if (!noteDetail?.note) {
        return null;
      }

      const note = noteDetail.note;
      const comments = noteDetail.comments;

      // 构建返回结果
      return {
        id: note.noteId || note.id || noteId,
        title: note.title || '',
        desc: note.desc || '',
        type: note.type || 'normal',
        time: note.time || note.createTime,
        ipLocation: note.ipLocation,
        user: {
          nickname: note.user?.nickname || '',
          avatar: note.user?.avatar || '',
          userid: note.user?.userId || note.user?.user_id || '',
        },
        imageList: (note.imageList || note.image_list || []).map((img: any) => ({
          url: img.urlDefault || img.url_default || img.url || '',
          width: img.width,
          height: img.height,
        })),
        video: note.video
          ? {
              url: note.video.media?.stream?.h264?.[0]?.masterUrl || note.video.url || '',
              duration: note.video.duration || 0,
            }
          : undefined,
        tags: note.tagList?.map((t: any) => t.name) || [],
        stats: {
          likedCount: note.interactInfo?.likedCount || note.interact_info?.liked_count || '0',
          collectedCount: note.interactInfo?.collectedCount || note.interact_info?.collected_count || '0',
          commentCount: note.interactInfo?.commentCount || note.interact_info?.comment_count || '0',
          shareCount: note.interactInfo?.shareCount || note.interact_info?.share_count || '0',
        },
        comments: comments
          ? {
              list: (comments.list || []).map((c: any) => ({
                id: c.id,
                content: c.content,
                likeCount: c.likeCount || c.like_count || '0',
                createTime: c.createTime || c.create_time,
                ipLocation: c.ipLocation || c.ip_location,
                user: {
                  nickname: c.userInfo?.nickname || c.user_info?.nickname || '',
                  avatar: c.userInfo?.image || c.user_info?.image || '',
                  userid: c.userInfo?.userId || c.user_info?.user_id || '',
                },
                subCommentCount: c.subCommentCount || c.sub_comment_count || '0',
                subComments: c.subComments || c.sub_comments || [],
              })),
              cursor: comments.cursor || '',
              hasMore: comments.hasMore || comments.has_more || false,
            }
          : undefined,
      };
    } finally {
      await page.close();
    }
  }

  /**
   * Get user profile information and their published notes.
   *
   * @param userId - User ID to fetch
   * @param xsecToken - Optional security token
   * @returns User profile or null if not found
   */
  async getUserProfile(userId: string, xsecToken?: string): Promise<XhsUserInfo | null> {
    await this.ctx.ensureContext();
    const page = await this.ctx.newPage();

    try {
      let url = `https://www.xiaohongshu.com/user/profile/${userId}`;
      if (xsecToken) {
        url += `?xsec_token=${encodeURIComponent(xsecToken)}`;
      }

      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});

      await page.waitForFunction(() => (window as any).__INITIAL_STATE__ !== undefined, {
        timeout: TIMEOUTS.PAGE_LOAD,
      });

      await sleep(REQUEST_INTERVAL);

      // 直接在浏览器中提取需要的数据，避免循环引用
      const result = await page.evaluate(
        (uid: string) => {
          const state = (window as any).__INITIAL_STATE__;
          if (!state?.user?.userPageData) {
            return null;
          }

          const userPageData = state.user.userPageData;
          const notesData = state.user.notes;

          // 处理 Vue 响应式对象，可能在 _rawValue 或直接在对象上
          const basicInfo = userPageData._rawValue?.basicInfo || userPageData.basicInfo;
          const interactions = userPageData._rawValue?.interactions || userPageData.interactions || [];

          // 解析 interactions
          const statsMap: Record<string, string> = {};
          for (const item of interactions) {
            if (item && item.type) {
              statsMap[item.type] = item.count || '0';
            }
          }

          // 处理 notes，可能也是响应式对象
          const notes = notesData?._rawValue || notesData || [];
          const notesList = Array.isArray(notes) ? notes : [];

          return JSON.stringify({
            basic: {
              nickname: basicInfo?.nickname || '',
              avatar: basicInfo?.images || basicInfo?.image || '',
              desc: basicInfo?.desc || '',
              gender: basicInfo?.gender || 0,
              ipLocation: basicInfo?.ipLocation,
              redId: basicInfo?.redId,
            },
            stats: {
              follows: statsMap['follows'] || '0',
              fans: statsMap['fans'] || '0',
              interaction: statsMap['interaction'] || '0',
            },
            notes: notesList.map((n: any) => ({
              id: n.noteId || n.id || '',
              xsecToken: n.xsecToken || n.xsec_token || '',
              title: n.displayTitle || n.title || '',
              cover: n.cover?.urlDefault || n.cover?.url || '',
              type: n.type || 'normal',
              user: {
                nickname: basicInfo?.nickname || '',
                avatar: basicInfo?.images || '',
                userid: uid,
              },
              likes: n.interactInfo?.likedCount || n.interact_info?.liked_count || '0',
            })),
          });
        },
        userId,
        false,
      );

      if (!result) {
        return null;
      }

      return JSON.parse(result);
    } finally {
      await page.close();
    }
  }

  /**
   * Get homepage recommended feeds.
   *
   * @returns Array of recommended notes
   */
  async listFeeds(): Promise<XhsSearchItem[]> {
    await this.ctx.ensureContext();
    const page = await this.ctx.newPage();

    try {
      await page.goto('https://www.xiaohongshu.com/explore', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});

      await page.waitForFunction(() => (window as any).__INITIAL_STATE__ !== undefined, {
        timeout: TIMEOUTS.PAGE_LOAD,
      });

      await sleep(REQUEST_INTERVAL);

      const result = await page.evaluate(
        () => {
          const state = (window as any).__INITIAL_STATE__;
          if (state?.feed?.feeds) {
            const feeds = state.feed.feeds;
            const feedsData = feeds.value !== undefined ? feeds.value : feeds._value;
            if (feedsData) {
              return JSON.stringify(feedsData);
            }
          }
          return '';
        },
        null,
        false,
      );

      if (!result) {
        return [];
      }

      const feeds = JSON.parse(result);

      return feeds.map((item: any) => ({
        id: item.id,
        xsecToken: item.xsec_token || item.xsecToken || '',
        title: item.noteCard?.displayTitle || '',
        cover: item.noteCard?.cover?.urlDefault || '',
        type: item.noteCard?.type || 'normal',
        user: {
          nickname: item.noteCard?.user?.nickname || '',
          avatar: item.noteCard?.user?.avatar || '',
          userid: item.noteCard?.user?.userId || '',
        },
        likes: item.noteCard?.interactInfo?.likedCount || '0',
      }));
    } finally {
      await page.close();
    }
  }
}
