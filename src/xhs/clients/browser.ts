import { chromium, Browser, BrowserContext, Page } from 'playwright';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { XhsNote, XhsSearchItem, XhsUserInfo, XhsComment, XhsCommentList } from '../types.js';
import { getStealthScript, sleep, generateWebId, humanScroll } from '../utils/index.js';

// 固定 User-Agent，与 Playwright Chromium 版本匹配 (Chrome 143)
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';
// 固定存储在项目目录，避免工作目录不确定的问题
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE = path.join(__dirname, '../../..', 'xhs-state.json');

// 反检测浏览器启动参数（参考 MediaCrawler）
const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-blink-features=AutomationControlled',  // 禁用自动化控制标记
  '--disable-infobars',                              // 禁用信息栏
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
];

// 超时常量（毫秒）
const TIMEOUTS = {
  PAGE_LOAD: 30000,       // 页面加载超时
  LOGIN_WAIT: 120000,     // 登录等待超时
  LOGIN_CHECK: 15000,     // 登录状态检查超时
  NETWORK_IDLE: 30000,    // 网络空闲超时
} as const;

// 请求间隔（毫秒）
const REQUEST_INTERVAL = 2000;

export class BrowserClient {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  async init(headless = true) {
    this.browser = await chromium.launch({
      headless,
      args: BROWSER_ARGS
    });

    const stealthScript = await getStealthScript();

    if (await fs.pathExists(STATE_FILE)) {
      this.context = await this.browser.newContext({
        userAgent: USER_AGENT,
        storageState: STATE_FILE,
        viewport: { width: 1920, height: 1080 }
      });
    } else {
      this.context = await this.browser.newContext({
        userAgent: USER_AGENT,
        viewport: { width: 1920, height: 1080 }
      });
    }

    // 注入 stealth 脚本
    if (stealthScript) {
      await this.context.addInitScript(stealthScript);
    }

    // 添加 webId Cookie 绕过滑块验证
    await this.context.addCookies([
      {
        name: 'webId',
        value: generateWebId(),
        domain: '.xiaohongshu.com',
        path: '/',
      }
    ]);
  }

  async login() {
    if (this.browser) {
      await this.browser.close();
    }

    // Launch headed browser for login
    this.browser = await chromium.launch({
      headless: false,
      args: BROWSER_ARGS
    });

    const stealthScript = await getStealthScript();

    this.context = await this.browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1920, height: 1080 }
    });

    if (stealthScript) {
      await this.context.addInitScript(stealthScript);
    }

    await this.context.addCookies([
      {
        name: 'webId',
        value: generateWebId(),
        domain: '.xiaohongshu.com',
        path: '/',
      }
    ]);

    const page = await this.context.newPage();
    await page.goto('https://www.xiaohongshu.com/explore');

    console.error('Please scan the QR code to login...');

    try {
      console.error('Waiting for login...');
      await Promise.any([
        page.waitForSelector('.user-side-content', { timeout: TIMEOUTS.LOGIN_WAIT }),
        page.waitForSelector('.avatar-wrapper', { timeout: TIMEOUTS.LOGIN_WAIT }),
        page.waitForSelector('.reds-avatar', { timeout: TIMEOUTS.LOGIN_WAIT }),
      ]);

      console.error('Login detected!');
      await sleep(2000);

      // Save state
      await this.context.storageState({ path: STATE_FILE });
      console.error('Session saved to', STATE_FILE);
    } catch (e) {
      console.error('Login timeout or failed.', e);
      throw e;
    }
  }

  /**
   * 搜索笔记 - 支持滚动加载更多
   * @param keyword 搜索关键词
   * @param count 需要获取的数量，默认20（首屏），最大500
   * @param timeout 超时时间（毫秒），默认60000
   */
  async search(keyword: string, count: number = 20, timeout: number = 60000): Promise<XhsSearchItem[]> {
    if (!this.context) await this.init();
    const page = await this.context!.newPage();

    // 限制最大数量
    const targetCount = Math.min(count, 500);
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
        });
        return result ? JSON.parse(result) : [];
      };

      // 获取首屏数据
      let feeds = await getCurrentFeeds();
      for (const item of feeds) {
        if (item.id && !uniqueItems.has(item.id)) {
          uniqueItems.set(item.id, item);
        }
      }

      console.error(`[search] Initial load: ${uniqueItems.size} items`);

      // 如果需要更多数据，滚动加载
      let noNewDataCount = 0;

      while (uniqueItems.size < targetCount) {
        // 检查超时
        if (Date.now() - startTime > timeout) {
          console.error(`[search] Timeout reached, returning ${uniqueItems.size} items`);
          break;
        }

        const previousCount = uniqueItems.size;

        // 使用人类式滚动（带缓动、随机延迟、偶尔回滚）
        await humanScroll(page, {
          minDistance: 400,
          maxDistance: 800,
          minDelay: 1000,
          maxDelay: 2000,
          scrollBackChance: 0.08,
          mouseMoveChance: 0.3
        });

        // 获取新数据
        feeds = await getCurrentFeeds();

        for (const item of feeds) {
          if (item.id && !uniqueItems.has(item.id)) {
            uniqueItems.set(item.id, item);
          }
        }

        const added = uniqueItems.size - previousCount;
        console.error(`[search] After scroll: ${uniqueItems.size} items (added ${added})`);

        // 如果没有新数据，可能已经到底了
        if (added === 0) {
          noNewDataCount++;
          if (noNewDataCount >= 3) {
            console.error(`[search] No more data available, returning ${uniqueItems.size} items`);
            break;
          }
          // 额外等待一下再试
          await sleep(500 + Math.random() * 500);
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
   * 获取笔记详情（包含评论）- 参照 xiaohongshu-mcp 实现
   */
  async getNote(noteId: string, xsecToken?: string): Promise<XhsNote | null> {
    if (!this.context) await this.init();
    const page = await this.context!.newPage();

    try {
      // 构建 URL
      let url = `https://www.xiaohongshu.com/explore/${noteId}`;
      if (xsecToken) {
        url += `?xsec_token=${encodeURIComponent(xsecToken)}&xsec_source=pc_feed`;
      }

      await page.goto(url, { waitUntil: 'domcontentloaded' });

      // 等待页面稳定
      await page.waitForLoadState('networkidle').catch(() => {});

      // 等待 __INITIAL_STATE__ 存在
      await page.waitForFunction(() => (window as any).__INITIAL_STATE__ !== undefined, {
        timeout: TIMEOUTS.PAGE_LOAD
      });

      await sleep(REQUEST_INTERVAL);

      // 获取笔记详情和评论（参照 xiaohongshu-mcp）
      const result = await page.evaluate((nid) => {
        const state = (window as any).__INITIAL_STATE__;
        if (state?.note?.noteDetailMap) {
          const noteDetailMap = state.note.noteDetailMap;
          return JSON.stringify(noteDetailMap);
        }
        return '';
      }, noteId);

      if (!result) {
        console.error('Note detail not found in __INITIAL_STATE__');
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
          userid: note.user?.userId || note.user?.user_id || ''
        },
        imageList: (note.imageList || note.image_list || []).map((img: any) => ({
          url: img.urlDefault || img.url_default || img.url || '',
          width: img.width,
          height: img.height
        })),
        video: note.video ? {
          url: note.video.media?.stream?.h264?.[0]?.masterUrl || note.video.url || '',
          duration: note.video.duration || 0
        } : undefined,
        tags: note.tagList?.map((t: any) => t.name) || [],
        stats: {
          likedCount: note.interactInfo?.likedCount || note.interact_info?.liked_count || '0',
          collectedCount: note.interactInfo?.collectedCount || note.interact_info?.collected_count || '0',
          commentCount: note.interactInfo?.commentCount || note.interact_info?.comment_count || '0',
          shareCount: note.interactInfo?.shareCount || note.interact_info?.share_count || '0'
        },
        comments: comments ? {
          list: (comments.list || []).map((c: any) => ({
            id: c.id,
            content: c.content,
            likeCount: c.likeCount || c.like_count || '0',
            createTime: c.createTime || c.create_time,
            ipLocation: c.ipLocation || c.ip_location,
            user: {
              nickname: c.userInfo?.nickname || c.user_info?.nickname || '',
              avatar: c.userInfo?.image || c.user_info?.image || '',
              userid: c.userInfo?.userId || c.user_info?.user_id || ''
            },
            subCommentCount: c.subCommentCount || c.sub_comment_count || '0',
            subComments: c.subComments || c.sub_comments || []
          })),
          cursor: comments.cursor || '',
          hasMore: comments.hasMore || comments.has_more || false
        } : undefined
      };

    } finally {
      await page.close();
    }
  }

  /**
   * 获取用户信息和笔记 - 参照 xiaohongshu-mcp 实现
   */
  async getUserProfile(userId: string, xsecToken?: string): Promise<XhsUserInfo | null> {
    if (!this.context) await this.init();
    const page = await this.context!.newPage();

    try {
      let url = `https://www.xiaohongshu.com/user/profile/${userId}`;
      if (xsecToken) {
        url += `?xsec_token=${encodeURIComponent(xsecToken)}`;
      }

      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});

      await page.waitForFunction(() => (window as any).__INITIAL_STATE__ !== undefined, {
        timeout: 30000
      });

      await sleep(REQUEST_INTERVAL);

      // 直接在浏览器中提取需要的数据，避免循环引用
      const result = await page.evaluate((uid) => {
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
            redId: basicInfo?.redId
          },
          stats: {
            follows: statsMap['follows'] || '0',
            fans: statsMap['fans'] || '0',
            interaction: statsMap['interaction'] || '0'
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
              userid: uid
            },
            likes: n.interactInfo?.likedCount || n.interact_info?.liked_count || '0'
          }))
        });
      }, userId);

      if (!result) {
        return null;
      }

      return JSON.parse(result);

    } finally {
      await page.close();
    }
  }

  /**
   * 获取首页推荐 - 参照 xiaohongshu-mcp 实现
   */
  async listFeeds(): Promise<XhsSearchItem[]> {
    if (!this.context) await this.init();
    const page = await this.context!.newPage();

    try {
      await page.goto('https://www.xiaohongshu.com/explore', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});

      await page.waitForFunction(() => (window as any).__INITIAL_STATE__ !== undefined, {
        timeout: 30000
      });

      await sleep(REQUEST_INTERVAL);

      const result = await page.evaluate(() => {
        const state = (window as any).__INITIAL_STATE__;
        if (state?.feed?.feeds) {
          const feeds = state.feed.feeds;
          const feedsData = feeds.value !== undefined ? feeds.value : feeds._value;
          if (feedsData) {
            return JSON.stringify(feedsData);
          }
        }
        return '';
      });

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
          userid: item.noteCard?.user?.userId || ''
        },
        likes: item.noteCard?.interactInfo?.likedCount || '0'
      }));

    } finally {
      await page.close();
    }
  }

  /**
   * 检查登录状态
   */
  async checkLoginStatus(): Promise<{ loggedIn: boolean; message: string }> {
    // 方法1: 检查本地状态文件
    if (await fs.pathExists(STATE_FILE)) {
      try {
        const state = await fs.readJson(STATE_FILE);
        const hasWebSession = state.cookies?.some((c: any) => c.name === 'web_session' && c.value);
        if (hasWebSession) {
          return { loggedIn: true, message: 'Session file exists with web_session cookie' };
        }
      } catch {
        // 继续其他检查
      }
    }

    // 方法2: 启动浏览器检查
    if (!this.context) {
      await this.init();
    }

    const page = await this.context!.newPage();

    try {
      await page.goto('https://www.xiaohongshu.com/explore', {
        timeout: TIMEOUTS.LOGIN_CHECK,
        waitUntil: 'domcontentloaded'
      });

      await sleep(2000);

      // 检查页面上的用户元素
      const userElement = await page.$('.user-side-content, .avatar-wrapper, .reds-avatar');

      if (userElement) {
        return { loggedIn: true, message: 'Logged in (user element found)' };
      }

      return { loggedIn: false, message: 'Not logged in' };

    } catch (e) {
      console.error('checkLoginStatus error:', e);
      return { loggedIn: false, message: 'Check failed - please try xhs_login' };
    } finally {
      await page.close();
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}
