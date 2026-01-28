import { chromium, Browser, BrowserContext, Page } from 'playwright';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  XhsNote,
  XhsSearchItem,
  XhsUserInfo,
  XhsSearchFilters,
  PublishContentParams,
  PublishVideoParams,
  PublishResult,
  InteractionResult,
  CommentResult,
} from '../types.js';
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

// 发布页面选择器（参考 xpzouying/xiaohongshu-mcp）
const PUBLISH_SELECTORS = {
  uploadInput: '.upload-input',
  titleInput: 'div.d-input input',
  contentEditor: 'div.ql-editor',
  contentTextbox: '[role="textbox"]',
  publishBtn: 'button.publishBtn',
  topicContainer: '#creator-editor-topic-container .item',
  scheduleRadio: '[class*="radio"]:has-text("定时发布")',
  uploadImageTab: '.creator-tab:has-text("上传图文")',
  uploadVideoTab: '.creator-tab:has-text("上传视频")',
};

// 互动选择器
const INTERACTION_SELECTORS = {
  likeButton: '.interact-container .left .like-wrapper, .engage-bar .like-wrapper',
  likeActive: '.like-active, .liked',
  collectButton: '.interact-container .left .collect-wrapper, .engage-bar .collect-wrapper',
  collectActive: '.collect-active, .collected',
};

// 评论选择器
const COMMENT_SELECTORS = {
  commentInputTrigger: 'div.input-box div.content-edit span, .comment-input',
  commentInput: 'div.input-box div.content-edit p.content-input, .comment-input textarea',
  submitButton: 'div.bottom button.submit, .comment-submit',
  replyButton: '.right .interactions .reply, .reply-btn',
};

// 搜索过滤器映射
const SEARCH_FILTER_MAP = {
  sortBy: {
    general: '综合',
    latest: '最新',
    most_liked: '最多点赞',
    most_commented: '最多评论',
    most_collected: '最多收藏',
  },
  noteType: {
    all: '不限',
    video: '视频',
    image: '图文',
  },
  publishTime: {
    all: '不限',
    day: '一天内',
    week: '一周内',
    half_year: '半年内',
  },
  searchScope: {
    all: '不限',
    viewed: '已看过',
    not_viewed: '未看过',
    following: '已关注',
  },
};

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
   * 搜索笔记 - 支持滚动加载更多和过滤器
   * @param keyword 搜索关键词
   * @param count 需要获取的数量，默认20（首屏），最大500
   * @param timeout 超时时间（毫秒），默认60000
   * @param filters 搜索过滤器选项
   */
  async search(
    keyword: string,
    count: number = 20,
    timeout: number = 60000,
    filters?: XhsSearchFilters
  ): Promise<XhsSearchItem[]> {
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

  /**
   * 应用搜索过滤器
   */
  private async applySearchFilters(page: Page, filters: XhsSearchFilters): Promise<void> {
    // 点击筛选按钮展开过滤器面板
    const filterBtn = await page.$('.filter-btn, .search-filter-btn, [class*="filter"]');
    if (filterBtn) {
      await filterBtn.click();
      await sleep(500);
    }

    // 应用排序方式
    if (filters.sortBy && filters.sortBy !== 'general') {
      const sortText = SEARCH_FILTER_MAP.sortBy[filters.sortBy];
      const sortOption = await page.$(`text="${sortText}"`);
      if (sortOption) {
        await sortOption.click();
        await sleep(300);
      }
    }

    // 应用笔记类型
    if (filters.noteType && filters.noteType !== 'all') {
      const typeText = SEARCH_FILTER_MAP.noteType[filters.noteType];
      const typeOption = await page.$(`text="${typeText}"`);
      if (typeOption) {
        await typeOption.click();
        await sleep(300);
      }
    }

    // 应用发布时间
    if (filters.publishTime && filters.publishTime !== 'all') {
      const timeText = SEARCH_FILTER_MAP.publishTime[filters.publishTime];
      const timeOption = await page.$(`text="${timeText}"`);
      if (timeOption) {
        await timeOption.click();
        await sleep(300);
      }
    }

    // 应用搜索范围
    if (filters.searchScope && filters.searchScope !== 'all') {
      const scopeText = SEARCH_FILTER_MAP.searchScope[filters.searchScope];
      const scopeOption = await page.$(`text="${scopeText}"`);
      if (scopeOption) {
        await scopeOption.click();
        await sleep(300);
      }
    }
  }

  /**
   * 发布图文笔记
   */
  async publishContent(params: PublishContentParams): Promise<PublishResult> {
    // 需要使用可见浏览器进行发布
    if (this.browser) {
      await this.browser.close();
    }

    this.browser = await chromium.launch({
      headless: false,
      args: BROWSER_ARGS,
    });

    const stealthScript = await getStealthScript();

    // 尝试加载已保存的会话
    if (await fs.pathExists(STATE_FILE)) {
      this.context = await this.browser.newContext({
        userAgent: USER_AGENT,
        storageState: STATE_FILE,
        viewport: { width: 1920, height: 1080 },
      });
    } else {
      return { success: false, error: 'Not logged in. Please use xhs_login first.' };
    }

    if (stealthScript) {
      await this.context.addInitScript(stealthScript);
    }

    const page = await this.context.newPage();

    try {
      // 导航到创作者中心发布页面
      await page.goto('https://creator.xiaohongshu.com/publish/publish', {
        waitUntil: 'domcontentloaded',
      });

      await page.waitForLoadState('networkidle').catch(() => {});
      await sleep(2000);

      // 点击"上传图文"标签
      const imageTab = await page.$(PUBLISH_SELECTORS.uploadImageTab);
      if (imageTab) {
        await imageTab.click();
        await sleep(1000);
      }

      // 上传图片
      const uploadInput = await page.$(PUBLISH_SELECTORS.uploadInput);
      if (!uploadInput) {
        return { success: false, error: 'Upload input not found' };
      }

      // 设置文件
      await uploadInput.setInputFiles(params.images);
      console.error(`[publish] Uploading ${params.images.length} images...`);

      // 等待图片上传完成（等待预览出现）
      await page.waitForSelector('.upload-item, .image-item, .cover-container', {
        timeout: 60000,
      });
      await sleep(2000);

      // 填写标题
      const titleInput = await page.$(PUBLISH_SELECTORS.titleInput);
      if (titleInput) {
        await titleInput.fill(params.title);
        console.error(`[publish] Title set: ${params.title}`);
      }

      // 填写内容
      const contentEditor = await page.$(PUBLISH_SELECTORS.contentEditor);
      if (contentEditor) {
        await contentEditor.click();
        await page.keyboard.type(params.content);
        console.error(`[publish] Content set`);
      } else {
        const contentTextbox = await page.$(PUBLISH_SELECTORS.contentTextbox);
        if (contentTextbox) {
          await contentTextbox.click();
          await page.keyboard.type(params.content);
        }
      }

      await sleep(1000);

      // 添加标签
      if (params.tags && params.tags.length > 0) {
        for (const tag of params.tags) {
          await page.keyboard.type(`#${tag}`);
          await sleep(500);

          // 等待并点击标签建议
          const suggestion = await page.$(`${PUBLISH_SELECTORS.topicContainer}:has-text("${tag}")`);
          if (suggestion) {
            await suggestion.click();
            await sleep(300);
          } else {
            // 按空格确认标签
            await page.keyboard.press('Space');
          }
          await sleep(300);
        }
      }

      // 处理定时发布
      if (params.scheduleTime) {
        const scheduleRadio = await page.$(PUBLISH_SELECTORS.scheduleRadio);
        if (scheduleRadio) {
          await scheduleRadio.click();
          await sleep(500);
          // TODO: 实现时间选择器操作
          console.error(`[publish] Schedule time: ${params.scheduleTime} (not implemented)`);
        }
      }

      // 点击发布按钮
      const publishBtn = await page.$(PUBLISH_SELECTORS.publishBtn);
      if (!publishBtn) {
        return { success: false, error: 'Publish button not found' };
      }

      await publishBtn.click();
      console.error('[publish] Publish button clicked');

      // 等待发布完成（检测 URL 变化或成功提示）
      await sleep(3000);

      // 检查是否发布成功
      const currentUrl = page.url();
      if (currentUrl.includes('success') || currentUrl.includes('publish')) {
        // 尝试从 URL 或页面提取笔记 ID
        const noteIdMatch = currentUrl.match(/note\/([a-zA-Z0-9]+)/);
        return {
          success: true,
          noteId: noteIdMatch?.[1],
        };
      }

      return { success: true };
    } catch (error) {
      console.error('[publish] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      // 保持浏览器打开一段时间以便用户查看结果
      await sleep(2000);
    }
  }

  /**
   * 发布视频笔记
   */
  async publishVideo(params: PublishVideoParams): Promise<PublishResult> {
    // 需要使用可见浏览器进行发布
    if (this.browser) {
      await this.browser.close();
    }

    this.browser = await chromium.launch({
      headless: false,
      args: BROWSER_ARGS,
    });

    const stealthScript = await getStealthScript();

    if (await fs.pathExists(STATE_FILE)) {
      this.context = await this.browser.newContext({
        userAgent: USER_AGENT,
        storageState: STATE_FILE,
        viewport: { width: 1920, height: 1080 },
      });
    } else {
      return { success: false, error: 'Not logged in. Please use xhs_login first.' };
    }

    if (stealthScript) {
      await this.context.addInitScript(stealthScript);
    }

    const page = await this.context.newPage();

    try {
      await page.goto('https://creator.xiaohongshu.com/publish/publish', {
        waitUntil: 'domcontentloaded',
      });

      await page.waitForLoadState('networkidle').catch(() => {});
      await sleep(2000);

      // 点击"上传视频"标签
      const videoTab = await page.$(PUBLISH_SELECTORS.uploadVideoTab);
      if (videoTab) {
        await videoTab.click();
        await sleep(1000);
      }

      // 上传视频
      const uploadInput = await page.$(PUBLISH_SELECTORS.uploadInput);
      if (!uploadInput) {
        return { success: false, error: 'Upload input not found' };
      }

      await uploadInput.setInputFiles(params.videoPath);
      console.error(`[publish] Uploading video: ${params.videoPath}`);

      // 等待视频上传和处理（可能需要较长时间）
      await page.waitForSelector('.upload-success, .video-preview, .cover-container', {
        timeout: 300000, // 5 分钟超时
      });
      await sleep(2000);

      // 如果提供了封面图，上传封面
      if (params.coverPath) {
        const coverInput = await page.$('.cover-upload input, [class*="cover"] input[type="file"]');
        if (coverInput) {
          await coverInput.setInputFiles(params.coverPath);
          await sleep(2000);
        }
      }

      // 填写标题
      const titleInput = await page.$(PUBLISH_SELECTORS.titleInput);
      if (titleInput) {
        await titleInput.fill(params.title);
      }

      // 填写内容
      const contentEditor = await page.$(PUBLISH_SELECTORS.contentEditor);
      if (contentEditor) {
        await contentEditor.click();
        await page.keyboard.type(params.content);
      }

      await sleep(1000);

      // 添加标签
      if (params.tags && params.tags.length > 0) {
        for (const tag of params.tags) {
          await page.keyboard.type(`#${tag}`);
          await sleep(500);
          const suggestion = await page.$(`${PUBLISH_SELECTORS.topicContainer}:has-text("${tag}")`);
          if (suggestion) {
            await suggestion.click();
          } else {
            await page.keyboard.press('Space');
          }
          await sleep(300);
        }
      }

      // 点击发布
      const publishBtn = await page.$(PUBLISH_SELECTORS.publishBtn);
      if (!publishBtn) {
        return { success: false, error: 'Publish button not found' };
      }

      await publishBtn.click();
      await sleep(3000);

      return { success: true };
    } catch (error) {
      console.error('[publish] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      await sleep(2000);
    }
  }

  /**
   * 点赞/取消点赞笔记
   */
  async likeFeed(noteId: string, xsecToken: string, unlike: boolean = false): Promise<InteractionResult> {
    if (!this.context) await this.init();
    const page = await this.context!.newPage();

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
   * 收藏/取消收藏笔记
   */
  async favoriteFeed(noteId: string, xsecToken: string, unfavorite: boolean = false): Promise<InteractionResult> {
    if (!this.context) await this.init();
    const page = await this.context!.newPage();

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
   * 发表评论
   */
  async postComment(noteId: string, xsecToken: string, content: string): Promise<CommentResult> {
    if (!this.context) await this.init();
    const page = await this.context!.newPage();

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
   * 回复评论
   */
  async replyComment(
    noteId: string,
    xsecToken: string,
    commentId: string,
    content: string
  ): Promise<CommentResult> {
    if (!this.context) await this.init();
    const page = await this.context!.newPage();

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

  /**
   * 删除登录 cookies
   */
  async deleteCookies(): Promise<{ success: boolean; error?: string }> {
    try {
      if (await fs.pathExists(STATE_FILE)) {
        await fs.remove(STATE_FILE);
      }

      // 关闭当前浏览器实例
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.context = null;
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}
