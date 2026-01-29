/**
 * @fileoverview Browser automation client for Xiaohongshu.
 * Uses Playwright to interact with the Xiaohongshu website with anti-detection measures.
 * @module xhs/clients/browser
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
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
  LoginUserInfo,
  LoginResult,
} from '../types.js';
import { getStealthScript, sleep, generateWebId, humanScroll } from '../utils/index.js';
import { saveAndOpenQrCode } from '../../core/qrcode-utils.js';
import { createLogger } from '../../core/logger.js';
import { config } from '../../core/config.js';

// Create logger for browser module
const log = createLogger('browser');

// Fixed User-Agent matching Playwright's Chromium version (Chrome 143)
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';

/**
 * Options for BrowserClient initialization
 */
export interface BrowserClientOptions {
  /** Account ID for this client instance */
  accountId?: string;
  /** Playwright storage state (cookies, localStorage) as JSON object */
  state?: any;
  /** Proxy server URL */
  proxy?: string;
  /** Callback to save state when it changes */
  onStateChange?: (state: any) => void | Promise<void>;
}

// Anti-detection browser launch arguments (based on MediaCrawler)
const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-blink-features=AutomationControlled',  // Disable automation control flag
  '--disable-infobars',                              // Disable info bars
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
];

/**
 * 超时时间常量（毫秒）
 * 用于控制各种操作的最大等待时间
 * 部分值可通过环境变量覆盖
 */
const TIMEOUTS = {
  /** 页面加载超时 (XHS_MCP_TIMEOUT_PAGE_LOAD) */
  PAGE_LOAD: config.timeout.pageLoad,
  /** 等待用户扫码登录超时 */
  LOGIN_WAIT: 120000,
  /** 检查登录状态超时 */
  LOGIN_CHECK: 15000,
  /** 等待网络空闲超时 */
  NETWORK_IDLE: 10000,
  /** 等待上传内容区域出现 */
  UPLOAD_CONTENT: 15000,
  /** 视频上传处理超时 (XHS_MCP_TIMEOUT_VIDEO_UPLOAD) */
  VIDEO_UPLOAD: config.timeout.videoUpload,
  /** 图片上传完成超时 */
  IMAGE_UPLOAD: 60000,
} as const;

/**
 * 搜索相关常量
 */
const SEARCH_DEFAULTS = {
  /** 默认搜索结果数量 */
  COUNT: 20,
  /** 最大搜索结果数量 */
  MAX_COUNT: 500,
  /** 默认搜索超时时间（毫秒） */
  TIMEOUT: 60000,
  /** 连续无新数据时的最大重试次数 */
  MAX_NO_DATA_RETRIES: 3,
} as const;

/**
 * 滚动加载配置
 * 模拟人类滚动行为，避免被检测为机器人
 */
const SCROLL_CONFIG = {
  /** 最小滚动距离（像素） */
  MIN_DISTANCE: 400,
  /** 最大滚动距离（像素） */
  MAX_DISTANCE: 800,
  /** 滚动后最小延迟（毫秒） */
  MIN_DELAY: 1000,
  /** 滚动后最大延迟（毫秒） */
  MAX_DELAY: 2000,
  /** 回滚概率（模拟人类偶尔向上滚动） */
  SCROLL_BACK_CHANCE: 0.08,
  /** 鼠标移动概率（增加自然性） */
  MOUSE_MOVE_CHANCE: 0.3,
} as const;

/**
 * UI 操作延迟常量（毫秒）
 * 用于等待 UI 动画和状态更新
 */
const DELAYS = {
  /** 过滤器点击后等待 */
  FILTER_CLICK: 300,
  /** 过滤器面板展开后等待 */
  FILTER_PANEL_OPEN: 500,
  /** 加载更多数据时的额外等待（基础值 + 随机值） */
  SCROLL_EXTRA_BASE: 500,
  /** 加载更多数据时的额外等待随机范围 */
  SCROLL_EXTRA_RANDOM: 500,
} as const;

// Request interval to avoid rate limiting (XHS_MCP_REQUEST_INTERVAL)
const REQUEST_INTERVAL = config.browser.requestInterval;

/**
 * 发布页面 CSS 选择器
 * 用于定位创作者发布页面的各个元素
 */
const PUBLISH_SELECTORS = {
  /** 文件上传输入框 */
  uploadInput: '.upload-input',
  /** 标题输入框 */
  titleInput: 'div.d-input input',
  /** 富文本内容编辑器 */
  contentEditor: 'div.ql-editor',
  /** 内容输入框（备选选择器） */
  contentTextbox: '[role="textbox"]',
  /** 发布按钮 */
  publishBtn: 'button.publishBtn',
  /** 话题标签容器 */
  topicContainer: '#creator-editor-topic-container .item',
  /** 定时发布单选按钮 */
  scheduleRadio: '[class*="radio"]:has-text("定时发布")',
  /** 上传图文标签页 */
  uploadImageTab: '.creator-tab:has-text("上传图文")',
  /** 上传视频标签页 */
  uploadVideoTab: '.creator-tab:has-text("上传视频")',
};

/**
 * 互动按钮 CSS 选择器
 * 用于定位笔记详情页的点赞、收藏等按钮
 */
const INTERACTION_SELECTORS = {
  /** 点赞按钮 */
  likeButton: '.interact-container .left .like-wrapper, .engage-bar .like-wrapper',
  /** 已点赞状态 */
  likeActive: '.like-active, .liked',
  /** 收藏按钮 */
  collectButton: '.interact-container .left .collect-wrapper, .engage-bar .collect-wrapper',
  /** 已收藏状态 */
  collectActive: '.collect-active, .collected',
};

/**
 * 评论区 CSS 选择器
 * 用于定位评论输入和提交相关元素
 */
const COMMENT_SELECTORS = {
  /** 评论输入框触发器（点击后显示输入框） */
  commentInputTrigger: 'div.input-box div.content-edit span, .comment-input',
  /** 评论输入框 */
  commentInput: 'div.input-box div.content-edit p.content-input, .comment-input textarea',
  /** 提交评论按钮 */
  submitButton: 'div.bottom button.submit, .comment-submit',
  /** 回复按钮 */
  replyButton: '.right .interactions .reply, .reply-btn',
};

/**
 * 搜索过滤器中文映射
 * 将 API 参数值映射到小红书 UI 上的中文标签
 */
const SEARCH_FILTER_MAP = {
  /** 排序方式 */
  sortBy: {
    general: '综合',
    latest: '最新',
    most_liked: '最多点赞',
    most_commented: '最多评论',
    most_collected: '最多收藏',
  },
  /** 笔记类型 */
  noteType: {
    all: '不限',
    video: '视频',
    image: '图文',
  },
  /** 发布时间 */
  publishTime: {
    all: '不限',
    day: '一天内',
    week: '一周内',
    half_year: '半年内',
  },
  /** 搜索范围 */
  searchScope: {
    all: '不限',
    viewed: '已看过',
    not_viewed: '未看过',
    following: '已关注',
  },
};

// QR code selector for login (matching Go project: .login-container .qrcode-img)
const QR_CODE_SELECTOR = '.login-container .qrcode-img, #app > div:nth-child(1) > div > div.login-container > div.left > div.code-area > div.qrcode.force-light > img';

// Login status selector (matching Go project: .main-container .user .link-wrapper .channel)
const LOGIN_STATUS_SELECTOR = '.main-container .user .link-wrapper .channel';

// URLs (matching Go project)
const URLS = {
  EXPLORE: 'https://www.xiaohongshu.com/explore',
  PUBLISH: 'https://creator.xiaohongshu.com/publish/publish?source=official',
} as const;

/**
 * Low-level browser automation client for Xiaohongshu.
 *
 * Uses Playwright to control a Chromium browser with anti-detection measures.
 * Handles all direct interactions with the Xiaohongshu website including:
 * - Login via QR code
 * - Searching notes
 * - Fetching note details
 * - Publishing content
 * - Interacting with notes (like, favorite, comment)
 *
 * @example
 * ```typescript
 * const client = new BrowserClient({ state: savedState });
 * await client.init();
 * const results = await client.search('keyword');
 * await client.close();
 * ```
 */
export class BrowserClient {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private options: BrowserClientOptions;

  constructor(options: BrowserClientOptions = {}) {
    this.options = options;
  }

  /**
   * Get the current account ID
   */
  get accountId(): string | undefined {
    return this.options.accountId;
  }

  async init(headless = true) {
    const launchOptions: any = {
      headless,
      args: BROWSER_ARGS,
    };

    if (this.options.proxy) {
      launchOptions.proxy = { server: this.options.proxy };
    }

    this.browser = await chromium.launch(launchOptions);

    const stealthScript = await getStealthScript();

    const contextOptions: any = {
      userAgent: USER_AGENT,
      viewport: { width: 1920, height: 1080 },
    };

    if (this.options.state) {
      contextOptions.storageState = this.options.state;
    }

    this.context = await this.browser.newContext(contextOptions);

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
  }

  /**
   * Extract current user info from page's __INITIAL_STATE__.user.userInfo
   */
  private async extractUserInfo(page: Page): Promise<LoginUserInfo | null> {
    try {
      const result = await page.evaluate(() => {
        const state = (window as any).__INITIAL_STATE__;
        if (!state?.user?.userInfo) return null;

        const userInfo = state.user.userInfo;
        // Handle Vue reactive objects
        const data = userInfo._value || userInfo._rawValue || userInfo;

        if (!data || !data.userId) return null;

        return {
          userId: data.userId,
          redId: data.redId || '',
          nickname: data.nickname || '',
          desc: data.desc || '',
          gender: data.gender || 0,
          avatar: data.images || '',
          avatarLarge: data.imageb || '',
        };
      });

      if (result) {
        log.info('Extracted user info', { userId: result.userId, nickname: result.nickname });
      }
      return result;
    } catch (e) {
      log.error('Failed to extract user info', { error: e });
      return null;
    }
  }

  /**
   * Login via QR code (following xiaohongshu-mcp Go project logic)
   * 1. Navigate to explore page
   * 2. Check if already logged in
   * 3. Get QR code image
   * 4. Wait for login completion
   * 5. Extract user info from __INITIAL_STATE__
   */
  async login(): Promise<LoginResult> {
    log.info('Starting login process...');

    if (this.browser) {
      log.debug('Closing existing browser instance');
      await this.browser.close();
    }

    const launchOptions: any = {
      headless: config.browser.headless,  // 可通过 XHS_MCP_HEADLESS 控制
      args: BROWSER_ARGS,
    };

    if (this.options.proxy) {
      launchOptions.proxy = { server: this.options.proxy };
      log.debug('Using proxy', { proxy: this.options.proxy });
    }

    log.debug('Launching browser...');
    this.browser = await chromium.launch(launchOptions);

    const stealthScript = await getStealthScript();

    this.context = await this.browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1920, height: 1080 }
    });

    if (stealthScript) {
      await this.context.addInitScript(stealthScript);
      log.debug('Stealth script applied');
    }

    // Add webId cookie to bypass slider verification
    await this.context.addCookies([
      {
        name: 'webId',
        value: generateWebId(),
        domain: '.xiaohongshu.com',
        path: '/',
      }
    ]);

    const page = await this.context.newPage();

    // Navigate to explore page (matching Go project)
    log.info('Navigating to explore page', { url: URLS.EXPLORE });
    await page.goto(URLS.EXPLORE);
    await page.waitForLoadState('load');
    await sleep(2000);

    // Check if already logged in (matching Go project selector)
    log.debug('Checking if already logged in...');
    const isLoggedIn = await page.$(LOGIN_STATUS_SELECTOR);
    if (isLoggedIn) {
      log.info('Already logged in, extracting user info...');

      // Wait for __INITIAL_STATE__ to be available
      await page.waitForFunction(() => (window as any).__INITIAL_STATE__ !== undefined, {
        timeout: 10000
      }).catch(() => {});

      const userInfo = await this.extractUserInfo(page);
      const state = await this.context.storageState();

      if (this.options.onStateChange) {
        await this.options.onStateChange(state);
      }
      this.options.state = state;
      return {
        qrCodePath: '',
        waitForLogin: async () => ({ state, userInfo }),
      };
    }

    // Wait for QR code to appear
    log.info('Waiting for QR code...');
    let qrImg;
    try {
      qrImg = await page.waitForSelector(QR_CODE_SELECTOR, { timeout: 30000 });
    } catch (e) {
      log.error('QR code not found', { error: e });
      throw new Error('QR code element not found. Page may have changed.');
    }

    await sleep(1000);  // Wait for QR code to fully render

    // Get the base64 data from src attribute
    const src = await qrImg.getAttribute('src');
    log.debug('QR code src attribute', { srcLength: src?.length, srcPrefix: src?.substring(0, 50) });

    if (!src) {
      log.error('QR code src is empty');
      throw new Error('QR code image src is empty');
    }

    if (!src.startsWith('data:image')) {
      log.error('QR code is not base64 encoded', { src: src.substring(0, 100) });
      throw new Error('QR code image not base64 encoded');
    }

    const base64Data = src.split(',')[1];
    const qrCodeBuffer = Buffer.from(base64Data, 'base64');
    log.info('QR code captured successfully');

    // Save QR code to file and open with system default viewer
    const qrCodePath = await saveAndOpenQrCode(qrCodeBuffer, `login-${Date.now()}.png`);
    log.info('QR code saved and opened', { path: qrCodePath });

    // Return the path and a function to wait for login completion
    const context = this.context;
    const options = this.options;
    const extractUserInfo = this.extractUserInfo.bind(this);

    return {
      qrCodePath,
      waitForLogin: async (): Promise<{ state: any; userInfo: LoginUserInfo | null }> => {
        try {
          log.info('Waiting for user to scan QR code...');

          // Wait for login status element (matching Go project)
          await page.waitForSelector(LOGIN_STATUS_SELECTOR, { timeout: TIMEOUTS.LOGIN_WAIT });

          log.info('Login detected!');
          await sleep(2000);

          // Wait for __INITIAL_STATE__ to be fully populated
          await page.waitForFunction(() => (window as any).__INITIAL_STATE__?.user?.userInfo !== undefined, {
            timeout: 10000
          }).catch(() => {});

          // Extract user info
          const userInfo = await extractUserInfo(page);

          // Get cookies for debugging
          const cookies = await context.cookies();
          log.debug('Cookies after login', {
            count: cookies.length,
            domains: [...new Set(cookies.map(c => c.domain))],
          });

          // Get state and notify via callback
          const state = await context.storageState();
          log.debug('Storage state captured', {
            cookieCount: state.cookies?.length,
            originCount: state.origins?.length,
          });

          if (options.onStateChange) {
            await options.onStateChange(state);
          }

          // Update internal state
          options.state = state;

          log.info('Login successful', { userInfo: userInfo ? { userId: userInfo.userId, nickname: userInfo.nickname } : null });
          return { state, userInfo };
        } catch (e) {
          log.error('Login timeout or failed', { error: e });
          throw e;
        }
      }
    };
  }

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
    if (!this.context) await this.init();
    const page = await this.context!.newPage();

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
   * Get note details including content, images, stats, and comments.
   * Uses the page's __INITIAL_STATE__ to extract data.
   *
   * @param noteId - Note ID to fetch
   * @param xsecToken - Security token from search results (required for reliable access)
   * @returns Note details or null if not found
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
   * Get user profile information and their published notes.
   *
   * @param userId - User ID to fetch
   * @param xsecToken - Optional security token
   * @returns User profile or null if not found
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
        timeout: TIMEOUTS.PAGE_LOAD
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
   * Get homepage recommended feeds.
   *
   * @returns Array of recommended notes
   */
  async listFeeds(): Promise<XhsSearchItem[]> {
    if (!this.context) await this.init();
    const page = await this.context!.newPage();

    try {
      await page.goto('https://www.xiaohongshu.com/explore', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});

      await page.waitForFunction(() => (window as any).__INITIAL_STATE__ !== undefined, {
        timeout: TIMEOUTS.PAGE_LOAD
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
   * Check login status by detecting the presence of the login button.
   * If #login-btn exists, user is NOT logged in.
   *
   * @returns Login status and message
   */
  async checkLoginStatus(): Promise<{ loggedIn: boolean; message: string }> {
    log.info('Checking login status...');

    // Check via browser - this is more reliable than checking cookies
    if (!this.context) {
      await this.init(false);  // Use visible mode for debugging
    }

    const page = await this.context!.newPage();

    try {
      await page.goto(URLS.EXPLORE, {
        timeout: TIMEOUTS.LOGIN_CHECK,
        waitUntil: 'domcontentloaded'
      });

      await sleep(2000);

      // Check for login status element (matching Go project selector)
      const isLoggedIn = await page.$(LOGIN_STATUS_SELECTOR);

      if (isLoggedIn) {
        log.info('User is logged in');
        return { loggedIn: true, message: 'Logged in (user element found)' };
      }

      // Also check if #login-btn exists - if it does, user is NOT logged in
      const loginBtn = await page.$('#login-btn');

      if (loginBtn) {
        log.info('User is not logged in (login button visible)');
        return { loggedIn: false, message: 'Not logged in (login button visible)' };
      }

      log.info('User is logged in (login button not found)');
      return { loggedIn: true, message: 'Logged in (login button not found)' };

    } catch (e) {
      log.error('checkLoginStatus error', { error: e });
      return { loggedIn: false, message: 'Check failed - please try xhs_add_account' };
    }
    // Note: Browser stays open for debugging - do not close page here
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

  /**
   * Publish an image/text note.
   * Opens a visible browser window for the publishing process.
   *
   * @param params - Publishing parameters
   * @returns Publish result with success status
   */
  async publishContent(params: PublishContentParams): Promise<PublishResult> {
    log.info('Starting publishContent', { title: params.title, imageCount: params.images.length });

    if (!this.options.state) {
      log.error('Not logged in');
      return { success: false, error: 'Not logged in. Please use xhs_add_account first.' };
    }

    if (this.browser) {
      log.debug('Closing existing browser instance');
      await this.browser.close();
    }

    const launchOptions: any = {
      headless: config.browser.headless,  // 发布操作建议使用可见模式 (XHS_MCP_HEADLESS=false)
      args: BROWSER_ARGS,
    };

    if (this.options.proxy) {
      launchOptions.proxy = { server: this.options.proxy };
    }

    log.debug('Launching browser for publishing...');
    this.browser = await chromium.launch(launchOptions);

    const stealthScript = await getStealthScript();

    this.context = await this.browser.newContext({
      userAgent: USER_AGENT,
      storageState: this.options.state,
      viewport: { width: 1920, height: 1080 },
    });

    if (stealthScript) {
      await this.context.addInitScript(stealthScript);
    }

    const page = await this.context.newPage();

    try {
      // Navigate to creator publish page (matching Go project URL)
      log.info('Navigating to creator publish page', { url: URLS.PUBLISH });
      await page.goto(URLS.PUBLISH, {
        waitUntil: 'load',
        timeout: TIMEOUTS.PAGE_LOAD,
      });

      // Wait for page to stabilize (matching Go project: WaitLoad + 2 seconds)
      log.debug('Waiting for page to stabilize...');
      await sleep(2000);

      // 等待网络空闲，超时则继续
      try {
        await page.waitForLoadState('networkidle', { timeout: TIMEOUTS.NETWORK_IDLE });
      } catch {
        log.warn('Network idle timeout, continuing...');
      }
      await sleep(1000);

      // 检查是否被重定向到登录页面
      const currentUrl = page.url();
      log.debug('Current URL after navigation', { url: currentUrl });

      if (currentUrl.includes('login') || currentUrl.includes('passport')) {
        log.error('Redirected to login page - session invalid');
        return { success: false, error: 'Session expired. Please re-login with xhs_add_account.' };
      }

      // 等待上传内容区域出现
      log.debug('Waiting for upload content area...');
      try {
        await page.waitForSelector('div.upload-content', { timeout: TIMEOUTS.UPLOAD_CONTENT });
        log.debug('Upload content area found');
      } catch (e) {
        log.error('Upload content area not found', { error: e });
        const pageTitle = await page.title();
        log.error('Page info', { title: pageTitle, url: page.url() });
        return { success: false, error: `Publish page not loaded correctly. Title: ${pageTitle}` };
      }

      // Click image upload tab (matching Go project: mustClickPublishTab)
      log.debug('Clicking upload image tab...');
      await this.clickPublishTab(page, '上传图文');
      await sleep(1000);

      // Upload images
      log.debug('Looking for upload input...');
      const uploadInput = await page.$(PUBLISH_SELECTORS.uploadInput);
      if (!uploadInput) {
        log.error('Upload input not found');
        return { success: false, error: 'Upload input not found' };
      }

      // Validate image paths
      const validPaths: string[] = [];
      for (const imgPath of params.images) {
        try {
          const fs = await import('fs');
          if (fs.existsSync(imgPath)) {
            validPaths.push(imgPath);
            log.debug('Valid image path', { path: imgPath });
          } else {
            log.warn('Image file not found', { path: imgPath });
          }
        } catch {
          validPaths.push(imgPath);  // Let Playwright handle the error
        }
      }

      if (validPaths.length === 0) {
        log.error('No valid image paths');
        return { success: false, error: 'No valid image files found' };
      }

      // Set files
      log.info('Uploading images', { count: validPaths.length });
      await uploadInput.setInputFiles(validPaths);

      // Wait for upload complete (matching Go project: waitForUploadComplete)
      log.debug('Waiting for upload complete...');
      await this.waitForUploadComplete(page, validPaths.length);
      await sleep(2000);

      // Fill title
      log.debug('Filling title...');
      const titleInput = await page.$(PUBLISH_SELECTORS.titleInput);
      if (titleInput) {
        await titleInput.fill(params.title);
        log.info('Title set', { title: params.title });
      } else {
        log.warn('Title input not found');
      }

      // Fill content
      log.debug('Filling content...');
      const contentEditor = await page.$(PUBLISH_SELECTORS.contentEditor);
      if (contentEditor) {
        await contentEditor.click();
        await page.keyboard.type(params.content);
        log.info('Content set');
      } else {
        const contentTextbox = await page.$(PUBLISH_SELECTORS.contentTextbox);
        if (contentTextbox) {
          await contentTextbox.click();
          await page.keyboard.type(params.content);
          log.info('Content set (via textbox)');
        } else {
          log.warn('Content editor not found');
        }
      }

      await sleep(1000);

      // Add tags
      if (params.tags && params.tags.length > 0) {
        log.debug('Adding tags', { tags: params.tags });
        for (const tag of params.tags) {
          await page.keyboard.type(`#${tag}`);
          await sleep(500);

          // Wait for and click tag suggestion
          const suggestion = await page.$(`${PUBLISH_SELECTORS.topicContainer}:has-text("${tag}")`);
          if (suggestion) {
            await suggestion.click();
            await sleep(300);
          } else {
            // Press space to confirm tag
            await page.keyboard.press('Space');
          }
          await sleep(300);
        }
        log.info('Tags added');
      }

      // Handle scheduled publish
      if (params.scheduleTime) {
        log.debug('Setting schedule time', { time: params.scheduleTime });
        const scheduleRadio = await page.$(PUBLISH_SELECTORS.scheduleRadio);
        if (scheduleRadio) {
          await scheduleRadio.click();
          await sleep(500);
          log.warn('Schedule time selection not fully implemented', { time: params.scheduleTime });
        }
      }

      // Click publish button
      log.info('Clicking publish button...');
      const publishBtn = await page.$(PUBLISH_SELECTORS.publishBtn);
      if (!publishBtn) {
        log.error('Publish button not found');
        return { success: false, error: 'Publish button not found' };
      }

      await publishBtn.click();
      log.info('Publish button clicked');

      // Wait for publish to complete
      await sleep(3000);

      // Check if publish succeeded
      const resultUrl = page.url();
      log.debug('Result URL', { url: resultUrl });

      if (resultUrl.includes('success') || resultUrl.includes('publish')) {
        // Try to extract note ID from URL
        const noteIdMatch = resultUrl.match(/note\/([a-zA-Z0-9]+)/);
        log.info('Publish successful', { noteId: noteIdMatch?.[1] });
        return {
          success: true,
          noteId: noteIdMatch?.[1],
        };
      }

      log.info('Publish completed');
      return { success: true };
    } catch (error) {
      log.error('Publish failed', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      // Keep browser open briefly for user to see result
      await sleep(2000);
      await page.close();
      log.debug('Browser page closed');
    }
  }

  /**
   * Click publish tab (matching Go project: mustClickPublishTab)
   */
  private async clickPublishTab(page: Page, tabName: string): Promise<void> {
    const deadline = Date.now() + 15000;

    while (Date.now() < deadline) {
      const tabs = await page.$$('div.creator-tab');

      for (const tab of tabs) {
        const text = await tab.textContent();
        if (text?.trim() === tabName) {
          // Check if tab is blocked by overlay
          const isBlocked = await tab.evaluate((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return true;
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            const target = document.elementFromPoint(x, y);
            return !(target === el || el.contains(target));
          });

          if (isBlocked) {
            log.debug('Tab is blocked, trying to remove overlay...');
            // Try to click empty area to dismiss popover
            await page.mouse.click(400, 50);
            await sleep(200);
            continue;
          }

          await tab.click();
          log.debug('Clicked publish tab', { tabName });
          return;
        }
      }

      await sleep(200);
    }

    log.warn('Publish tab not found', { tabName });
  }

  /**
   * 等待图片上传完成
   *
   * 通过检测上传预览区域的图片数量来判断上传是否完成。
   *
   * @param page - Playwright 页面实例
   * @param expectedCount - 期望上传的图片数量
   */
  private async waitForUploadComplete(page: Page, expectedCount: number): Promise<void> {
    const checkInterval = 500;
    const startTime = Date.now();

    log.debug('Waiting for upload complete', { expectedCount });

    while (Date.now() - startTime < TIMEOUTS.IMAGE_UPLOAD) {
      // 检查已上传的图片数量
      const uploadedImages = await page.$$('.img-preview-area .pr');
      const currentCount = uploadedImages.length;

      log.debug('Upload progress', { current: currentCount, expected: expectedCount });

      if (currentCount >= expectedCount) {
        log.info('All images uploaded', { count: currentCount });
        return;
      }

      await sleep(checkInterval);
    }

    log.warn('Upload timeout, continuing anyway');
  }

  /**
   * Publish a video note.
   * Opens a visible browser window for the publishing process.
   *
   * @param params - Publishing parameters
   * @returns Publish result with success status
   */
  async publishVideo(params: PublishVideoParams): Promise<PublishResult> {
    if (!this.options.state) {
      return { success: false, error: 'Not logged in. Please use xhs_login first.' };
    }

    if (this.browser) {
      await this.browser.close();
    }

    const launchOptions: any = {
      headless: config.browser.headless,  // 可通过 XHS_MCP_HEADLESS 控制
      args: BROWSER_ARGS,
    };

    if (this.options.proxy) {
      launchOptions.proxy = { server: this.options.proxy };
    }

    this.browser = await chromium.launch(launchOptions);

    const stealthScript = await getStealthScript();

    this.context = await this.browser.newContext({
      userAgent: USER_AGENT,
      storageState: this.options.state,
      viewport: { width: 1920, height: 1080 },
    });

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
      log.info('Uploading video', { path: params.videoPath });

      // 等待视频上传和处理（视频处理需要较长时间）
      await page.waitForSelector('.upload-success, .video-preview, .cover-container', {
        timeout: TIMEOUTS.VIDEO_UPLOAD,
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
      log.error('Video publish failed', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      await sleep(2000);
      await page.close();
    }
  }

  /**
   * Like or unlike a note.
   *
   * @param noteId - Target note ID
   * @param xsecToken - Security token from search results
   * @param unlike - If true, unlike the note; otherwise like it
   * @returns Interaction result
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
   * Favorite (collect) or unfavorite a note.
   *
   * @param noteId - Target note ID
   * @param xsecToken - Security token from search results
   * @param unfavorite - If true, unfavorite the note; otherwise favorite it
   * @returns Interaction result
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
   * Post a comment on a note.
   *
   * @param noteId - Target note ID
   * @param xsecToken - Security token from search results
   * @param content - Comment content
   * @returns Comment result
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
   * Delete login cookies and clear session state.
   * Used to log out or force re-authentication.
   *
   * @returns Success status
   */
  async deleteCookies(): Promise<{ success: boolean; error?: string }> {
    try {
      // Clear internal state
      this.options.state = undefined;

      // Close browser instance
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
