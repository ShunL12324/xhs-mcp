/**
 * @fileoverview Login session manager for multi-step login flow.
 * Manages browser instances during login, generates QR code URLs, and handles verification.
 * @module core/login-session
 */

import { chromium, Browser, BrowserContext, Page } from 'patchright';
import { LoginUserInfo, FullUserProfile } from '../xhs/types.js';
import { sleep, generateWebId } from '../xhs/utils/index.js';
import { createLogger } from './logger.js';
import { config } from './config.js';
import { BROWSER_ARGS, QR_CODE_SELECTOR, LOGIN_STATUS_SELECTOR, URLS } from '../xhs/clients/constants.js';

const log = createLogger('login-session');

/**
 * QR 码生成服务 API
 * 使用第三方服务将登录 URL 转换为可扫描的 QR 码图片
 */
const QR_CODE_API = 'https://api.qrserver.com/v1/create-qr-code/';

/**
 * QR 码配置
 */
const QR_CODE_CONFIG = {
  /** QR 码图片尺寸（像素） */
  SIZE: 300,
} as const;

/**
 * 会话管理时间常量（毫秒）
 */
const SESSION_TIMEOUTS = {
  /** QR 码有效期（2分钟） */
  QR_CODE: 2 * 60 * 1000,
  /** 短信验证码有效期（1分钟） */
  VERIFICATION: 60 * 1000,
  /** 会话最大生命周期（5分钟） */
  SESSION_MAX: 5 * 60 * 1000,
  /** 过期会话清理间隔（30秒） */
  CLEANUP_INTERVAL: 30_000,
  /** 等待 QR 码出现超时 */
  QR_WAIT: 30000,
} as const;

/**
 * 短信验证弹窗元素选择器
 * 当用户扫码后可能需要短信验证
 */
const VERIFICATION_SELECTORS = {
  /** 验证弹窗头部 */
  modal: '.captcha-modal__header',
  /** 弹窗标题 */
  title: '.captcha-modal-title',
  /** 接收验证码的手机号 */
  phoneNumber: '.receive-number',
  /** 验证码输入框 */
  input: 'input.r-input-inner[placeholder="请输入验证码"]',
  /** 获取验证码按钮 */
  getCodeButton: '.sms-code-get-text',
  /** 提交按钮 */
  submitButton: '.btn.btn-block',
  /** 错误信息 */
  errorMessage: '.error-box span',
  /** 重发提示（不存在时可能触发了限额） */
  resendHint: '.resend-box > span.text-default',
};

/**
 * Login session status
 */
export type LoginSessionStatus =
  | 'waiting_scan'
  | 'scanned'
  | 'verification_required'
  | 'success'
  | 'failed'
  | 'expired';

/**
 * Login session data
 */
export interface LoginSession {
  /** Unique session ID */
  id: string;
  /** Current status */
  status: LoginSessionStatus;

  // QR code
  /** URL to QR code image (via api.qrserver.com) */
  qrCodeUrl: string;
  /** Original QR code content (xiaohongshu login URL) */
  qrCodeContent: string;

  // Browser instances
  browser: Browser;
  context: BrowserContext;
  page: Page;

  // Configuration
  proxy?: string;
  /** Account name if provided */
  accountName?: string;

  // Timing
  createdAt: Date;
  qrExpiresAt: Date;
  verificationExpiresAt?: Date;

  // Results
  userInfo?: LoginUserInfo;
  fullProfile?: FullUserProfile;
  state?: any;
  verificationPhone?: string;
  error?: string;
  /** SMS rate limit triggered */
  rateLimited?: boolean;
}

/**
 * Manages login sessions with browser instances.
 * Sessions are stored in memory and cleaned up after timeout.
 */
export class LoginSessionManager {
  private sessions = new Map<string, LoginSession>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // 定期清理过期会话
    this.cleanupInterval = setInterval(() => this.cleanup(), SESSION_TIMEOUTS.CLEANUP_INTERVAL);
  }

  /**
   * 生成唯一的会话 ID
   */
  private generateSessionId(): string {
    const random = Math.random().toString(36).substring(2, 10);
    return `sess_${random}`;
  }

  /**
   * 使用 api.qrserver.com 生成 QR 码图片 URL
   */
  private generateQrCodeUrl(content: string, size: number = QR_CODE_CONFIG.SIZE): string {
    const encoded = encodeURIComponent(content);
    return `${QR_CODE_API}?size=${size}x${size}&data=${encoded}`;
  }

  /**
   * Create a new login session
   */
  async createSession(accountName?: string, proxy?: string): Promise<LoginSession> {
    const id = this.generateSessionId();
    log.info('Creating login session', { id, accountName, hasProxy: !!proxy });

    // Launch browser
    const launchOptions: any = {
      headless: config.browser.headless, // 可通过 XHS_MCP_HEADLESS 控制
      channel: 'chrome',
      args: BROWSER_ARGS,
    };

    if (proxy) {
      launchOptions.proxy = { server: proxy };
    }

    const browser = await chromium.launch(launchOptions);

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });

    // Add webId cookie
    await context.addCookies([
      {
        name: 'webId',
        value: generateWebId(),
        domain: '.xiaohongshu.com',
        path: '/',
      },
    ]);

    const page = await context.newPage();

    // Track rate limit from SMS API response (attached to page for later access)
    (page as any)._smsRateLimited = false;
    page.on('response', async (response) => {
      if (response.url().includes('/api/redcaptcha/v2/vc/send') && response.request().method() === 'POST') {
        try {
          const json = await response.json();
          // code 40012 = "已超过今天发送短信条数限制"
          if (json.code === 40012 || json.msg?.includes('限制')) {
            (page as any)._smsRateLimited = true;
            (page as any)._smsRateLimitMsg = json.msg;
            log.warn('SMS rate limit triggered', { code: json.code, msg: json.msg });
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
    });

    // Navigate to explore page
    log.debug('Navigating to explore page');
    await page.goto(URLS.EXPLORE);
    await page.waitForLoadState('load');
    await sleep(2000);

    // Check if already logged in (from saved state)
    const isLoggedIn = await page.$(LOGIN_STATUS_SELECTOR);
    if (isLoggedIn) {
      log.info('Already logged in from saved state');
      // This shouldn't happen for new sessions, but handle it
      await browser.close();
      throw new Error('Already logged in. Use a different account name or remove existing account first.');
    }

    // 等待 QR 码出现
    log.debug('Waiting for QR code to appear');
    try {
      await page.waitForSelector(QR_CODE_SELECTOR, { timeout: SESSION_TIMEOUTS.QR_WAIT });
    } catch (e) {
      await browser.close();
      throw new Error('QR code not found. Login page may have changed.');
    }

    await sleep(1000);

    // 从页面状态提取 QR 码数据
    const loginData = await page.evaluate(
      () => {
        const state = (window as any).__INITIAL_STATE__;
        if (state?.login?.qrcodeInfo) {
          return state.login.qrcodeInfo;
        }
        return null;
      },
      null,
      false,
    );

    if (!loginData?.qrcode) {
      await browser.close();
      throw new Error('Failed to extract QR code data from page state.');
    }

    const qrCodeContent = `xhsdiscover://qrcode/login?qr_code=${loginData.qrcode}`;
    const qrCodeUrl = this.generateQrCodeUrl(qrCodeContent);
    log.info('Generated QR code URL from page state');

    const now = new Date();
    const session: LoginSession = {
      id,
      status: 'waiting_scan',
      qrCodeUrl,
      qrCodeContent,
      browser,
      context,
      page,
      proxy,
      accountName,
      createdAt: now,
      qrExpiresAt: new Date(now.getTime() + SESSION_TIMEOUTS.QR_CODE),
    };

    this.sessions.set(id, session);
    log.info('Login session created', { id, qrCodeUrl });

    return session;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): LoginSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Check login status and update session
   */
  async checkStatus(sessionId: string): Promise<LoginSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found or expired. Call xhs_add_account to start a new session.');
    }

    // Check if session is already terminal
    if (session.status === 'success' || session.status === 'failed') {
      return session;
    }

    // Check if QR code expired
    const now = new Date();
    if (session.status === 'waiting_scan' && now > session.qrExpiresAt) {
      session.status = 'expired';
      session.error = 'QR code expired. Please start a new login session.';
      log.info('Session expired', { sessionId });
      return session;
    }

    // Check verification timeout
    if (
      session.status === 'verification_required' &&
      session.verificationExpiresAt &&
      now > session.verificationExpiresAt
    ) {
      session.status = 'failed';
      session.error = 'Verification code expired (1 minute limit). Please start a new login session.';
      log.info('Verification expired', { sessionId });
      return session;
    }

    // Check page status
    const pageStatus = await this.detectPageStatus(session);
    log.debug('Detected page status', { sessionId, pageStatus });

    if (pageStatus === 'logged_in') {
      session.status = 'success';
      session.userInfo = (await this.extractUserInfo(session.page)) || undefined;
      session.state = await session.context.storageState();

      // 获取完整用户资料（粉丝数、关注数等）
      if (session.userInfo?.userId) {
        session.fullProfile = (await this.extractFullUserProfile(session.page, session.userInfo.userId)) || undefined;
      }

      log.info('Login successful', { sessionId, userId: session.userInfo?.userId });
    } else if (pageStatus === 'verification_required') {
      if (session.status !== 'verification_required') {
        session.status = 'verification_required';
        session.verificationPhone = await this.extractVerificationPhone(session.page);
        session.verificationExpiresAt = new Date(now.getTime() + SESSION_TIMEOUTS.VERIFICATION);
        log.info('Verification required', { sessionId, phone: session.verificationPhone });
      }
      // Check for SMS rate limit
      if ((session.page as any)._smsRateLimited) {
        session.rateLimited = true;
        session.error = (session.page as any)._smsRateLimitMsg || 'SMS rate limit reached for today.';
        log.warn('SMS rate limit detected', { sessionId });
      }
    } else if (pageStatus === 'scanned') {
      session.status = 'scanned';
    }

    return session;
  }

  /**
   * Detect the current page status
   */
  private async detectPageStatus(
    session: LoginSession,
  ): Promise<'waiting_scan' | 'scanned' | 'verification_required' | 'logged_in' | 'failed'> {
    const { page } = session;

    try {
      // Check if logged in
      const loggedIn = await page.$(LOGIN_STATUS_SELECTOR);
      if (loggedIn) {
        return 'logged_in';
      }

      // Check for verification modal (captcha modal with SMS verification)
      const verificationModal = await page.$(VERIFICATION_SELECTORS.modal);
      if (verificationModal) {
        return 'verification_required';
      }

      // Check if QR code is still visible
      const qrCode = await page.$(QR_CODE_SELECTOR);
      if (qrCode) {
        return 'waiting_scan';
      }

      return 'waiting_scan';
    } catch (e) {
      log.error('Failed to detect page status', { error: e });
      return 'waiting_scan';
    }
  }

  /**
   * Extract user info from page
   */
  private async extractUserInfo(page: Page): Promise<LoginUserInfo | null> {
    try {
      // Wait for state to be available
      await page
        .waitForFunction(() => (window as any).__INITIAL_STATE__?.user?.userInfo !== undefined, { timeout: 10000 })
        .catch(() => {});

      const result = await page.evaluate(
        () => {
          const state = (window as any).__INITIAL_STATE__;
          if (!state?.user?.userInfo) return null;

          const userInfo = state.user.userInfo;
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
        },
        null,
        false,
      );

      return result;
    } catch (e) {
      log.error('Failed to extract user info', { error: e });
      return null;
    }
  }

  /**
   * Extract phone number for verification display
   */
  private async extractVerificationPhone(page: Page): Promise<string> {
    try {
      const phoneText = await page.$eval(VERIFICATION_SELECTORS.phoneNumber, (el) => el.textContent);
      // Extract phone number from text like "验证码已发送至   +86 189******35"
      const match = phoneText?.match(/\+?\d+[\s\d*]+\d+/);
      return match ? match[0].trim() : phoneText?.trim() || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  /**
   * 访问用户主页获取完整用户资料（粉丝数、关注数、获赞与收藏、封禁状态等）
   */
  private async extractFullUserProfile(page: Page, userId: string): Promise<FullUserProfile | null> {
    try {
      log.info('Fetching full user profile', { userId });

      // 访问用户主页
      const url = `https://www.xiaohongshu.com/user/profile/${userId}`;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});

      // 等待 __INITIAL_STATE__ 加载
      await page.waitForFunction(() => (window as any).__INITIAL_STATE__ !== undefined, {
        timeout: 30000,
      });

      // 等待用户数据加载
      await page
        .waitForFunction(
          () => {
            const state = (window as any).__INITIAL_STATE__;
            const userPageData = state?.user?.userPageData;
            const basicInfo = userPageData?._rawValue?.basicInfo || userPageData?.basicInfo;
            return basicInfo?.nickname;
          },
          { timeout: 10000 },
        )
        .catch(() => {});

      // 提取完整用户信息
      const result = await page.evaluate(
        (uid: string) => {
          const state = (window as any).__INITIAL_STATE__;
          if (!state?.user) return null;

          const user = state.user;
          const userPageData = user.userPageData;
          const bannedInfo = user.bannedInfo;

          // 处理 Vue 响应式对象
          const extract = (obj: any) => {
            if (!obj) return null;
            if (obj._rawValue !== undefined) return obj._rawValue;
            if (obj._value !== undefined) return obj._value;
            return obj;
          };

          const pageData = extract(userPageData);
          const banned = extract(bannedInfo);

          if (!pageData?.basicInfo) return null;

          const basicInfo = pageData.basicInfo;
          const interactions = pageData.interactions || [];

          // 解析 interactions 数组
          const statsMap: Record<string, string> = {};
          for (const item of interactions) {
            if (item?.type) {
              statsMap[item.type] = item.count || '0';
            }
          }

          return {
            // 基础信息
            userId: uid,
            redId: basicInfo.redId || '',
            nickname: basicInfo.nickname || '',
            avatar: basicInfo.images || basicInfo.image || '',
            description: basicInfo.desc || '',
            gender: basicInfo.gender || 0,
            ipLocation: basicInfo.ipLocation || '',

            // 统计数据
            followers: parseInt(statsMap['fans'] || '0', 10),
            following: parseInt(statsMap['follows'] || '0', 10),
            likeAndCollect: parseInt(statsMap['interaction'] || '0', 10),

            // 封禁状态
            isBanned: banned?.serverBanned || false,
            banCode: banned?.code || 0,
            banReason: banned?.reason || '',
          };
        },
        userId,
        false,
      );

      if (result) {
        log.info('Extracted full user profile', {
          userId: result.userId,
          nickname: result.nickname,
          followers: result.followers,
          isBanned: result.isBanned,
        });
      }

      return result;
    } catch (e) {
      log.error('Failed to extract full user profile', { userId, error: e });
      return null;
    }
  }

  /**
   * Submit verification code
   */
  async submitVerification(sessionId: string, code: string): Promise<LoginSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found or expired.');
    }

    if (session.status !== 'verification_required') {
      throw new Error(
        `Cannot submit verification in status: ${session.status}. ${
          session.status === 'waiting_scan'
            ? 'QR code not scanned yet.'
            : session.status === 'success'
              ? 'Already logged in.'
              : 'Please start a new login session.'
        }`,
      );
    }

    // Check verification timeout
    if (session.verificationExpiresAt && new Date() > session.verificationExpiresAt) {
      session.status = 'failed';
      session.error = 'Verification code expired (1 minute limit).';
      return session;
    }

    log.info('Submitting verification code', { sessionId, codeLength: code.length });

    try {
      const { page } = session;

      // Find and fill verification input
      const input = await page.$(VERIFICATION_SELECTORS.input);
      if (!input) {
        throw new Error('Verification input not found');
      }

      await input.fill(code);
      await sleep(500);

      // Wait for submit button to be enabled (it has btn-disabled class initially)
      await page
        .waitForSelector(`${VERIFICATION_SELECTORS.submitButton}:not(.btn-disabled)`, { timeout: 3000 })
        .catch(() => {});

      // Click submit button
      const submitBtn = await page.$(VERIFICATION_SELECTORS.submitButton);
      if (submitBtn) {
        await submitBtn.click();
      }

      // Wait for result
      await sleep(2000);

      // Check for error message first
      const errorMsg = await page.$(VERIFICATION_SELECTORS.errorMessage);
      if (errorMsg) {
        const errorText = await errorMsg.textContent();
        if (errorText?.includes('失效') || errorText?.includes('过期')) {
          session.error = 'Verification code expired. Please request a new code.';
        } else if (errorText?.includes('错误')) {
          session.error = 'Verification code incorrect. Please try again.';
        } else {
          session.error = `Verification failed: ${errorText}`;
        }
        log.warn('Verification failed', { sessionId, errorText });
        return session;
      }

      // Check status
      const pageStatus = await this.detectPageStatus(session);

      if (pageStatus === 'logged_in') {
        session.status = 'success';
        session.userInfo = (await this.extractUserInfo(page)) || undefined;
        session.state = await session.context.storageState();

        // 获取完整用户资料
        if (session.userInfo?.userId) {
          session.fullProfile = (await this.extractFullUserProfile(page, session.userInfo.userId)) || undefined;
        }

        log.info('Verification successful', { sessionId });
      } else if (pageStatus === 'verification_required') {
        // Still on verification page - code was probably wrong
        session.error = 'Verification code incorrect. Please try again.';
        log.warn('Verification code incorrect', { sessionId });
      } else {
        // Modal disappeared but not logged in yet - might be processing
        // Check again after a short delay
        await sleep(2000);
        const finalStatus = await this.detectPageStatus(session);
        if (finalStatus === 'logged_in') {
          session.status = 'success';
          session.userInfo = (await this.extractUserInfo(page)) || undefined;
          session.state = await session.context.storageState();

          // 获取完整用户资料
          if (session.userInfo?.userId) {
            session.fullProfile = (await this.extractFullUserProfile(page, session.userInfo.userId)) || undefined;
          }

          log.info('Verification successful (delayed)', { sessionId });
        } else {
          session.status = 'failed';
          session.error = 'Verification failed for unknown reason.';
        }
      }

      return session;
    } catch (e) {
      log.error('Verification submission failed', { sessionId, error: e });
      session.error = e instanceof Error ? e.message : String(e);
      return session;
    }
  }

  /**
   * 完成会话并清理浏览器
   */
  async completeSession(
    sessionId: string,
  ): Promise<{ state: any; userInfo: LoginUserInfo; fullProfile?: FullUserProfile }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'success') {
      throw new Error(`Session not successful. Status: ${session.status}`);
    }

    if (!session.state || !session.userInfo) {
      throw new Error('Session data incomplete');
    }

    const result = {
      state: session.state,
      userInfo: session.userInfo,
      fullProfile: session.fullProfile,
    };

    // 清理会话资源
    await this.closeSession(sessionId);
    log.info('Session completed', { sessionId });

    return result;
  }

  /**
   * 关闭会话并释放资源
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        await session.browser.close();
      } catch (e) {
        log.warn('Failed to close browser', { sessionId, error: e });
      }
      this.sessions.delete(sessionId);
      log.debug('Session closed', { sessionId });
    }
  }

  /**
   * 清理过期会话
   * 关闭超时会话的浏览器并从内存中移除
   */
  private cleanup(): void {
    const now = new Date();
    for (const [id, session] of this.sessions) {
      const age = now.getTime() - session.createdAt.getTime();
      if (age > SESSION_TIMEOUTS.SESSION_MAX) {
        log.info('Cleaning up expired session', { id, age });
        session.browser.close().catch(() => {});
        this.sessions.delete(id);
      }
    }
  }

  /**
   * Shutdown manager and cleanup all sessions
   */
  async shutdown(): Promise<void> {
    clearInterval(this.cleanupInterval);
    for (const [id, session] of this.sessions) {
      await session.browser.close().catch(() => {});
      this.sessions.delete(id);
    }
    log.info('LoginSessionManager shutdown complete');
  }
}

// Singleton instance
let instance: LoginSessionManager | null = null;

/**
 * Get or create the LoginSessionManager singleton
 */
export function getLoginSessionManager(): LoginSessionManager {
  if (!instance) {
    instance = new LoginSessionManager();
  }
  return instance;
}
