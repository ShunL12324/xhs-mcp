/**
 * @fileoverview Authentication service for BrowserClient.
 * Contains login and session management functionality.
 * @module xhs/clients/services/auth
 */

import { chromium } from 'playwright';
import { LoginResult, LoginUserInfo, FullUserProfile } from '../../types.js';
import { getStealthScript, sleep, generateWebId } from '../../utils/index.js';
import { saveAndOpenQrCode } from '../../../core/qrcode-utils.js';
import { config } from '../../../core/config.js';
import { BrowserContextManager, log } from '../context.js';
import {
  USER_AGENT,
  BROWSER_ARGS,
  TIMEOUTS,
  QR_CODE_SELECTOR,
  LOGIN_STATUS_SELECTOR,
  URLS,
} from '../constants.js';

/**
 * Authentication service - handles login and session management
 */
export class AuthService {
  constructor(private ctx: BrowserContextManager) {}

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

    if (this.ctx.browser) {
      log.debug('Closing existing browser instance');
      await this.ctx.browser.close();
    }

    const launchOptions: any = {
      headless: config.browser.headless,  // 可通过 XHS_MCP_HEADLESS 控制
      args: BROWSER_ARGS,
    };

    if (this.ctx.options.proxy) {
      launchOptions.proxy = { server: this.ctx.options.proxy };
      log.debug('Using proxy', { proxy: this.ctx.options.proxy });
    }

    log.debug('Launching browser...');
    this.ctx.browser = await chromium.launch(launchOptions);

    const stealthScript = await getStealthScript();

    this.ctx.context = await this.ctx.browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1920, height: 1080 }
    });

    if (stealthScript) {
      await this.ctx.context.addInitScript(stealthScript);
      log.debug('Stealth script applied');
    }

    // Add webId cookie to bypass slider verification
    await this.ctx.context.addCookies([
      {
        name: 'webId',
        value: generateWebId(),
        domain: '.xiaohongshu.com',
        path: '/',
      }
    ]);

    const page = await this.ctx.context.newPage();

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

      const userInfo = await this.ctx.extractUserInfo(page);
      const state = await this.ctx.context.storageState();

      if (this.ctx.options.onStateChange) {
        await this.ctx.options.onStateChange(state);
      }
      this.ctx.options.state = state;
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
    const ctx = this.ctx;

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
          const userInfo = await ctx.extractUserInfo(page);

          // Get cookies for debugging
          const cookies = await ctx.context!.cookies();
          log.debug('Cookies after login', {
            count: cookies.length,
            domains: [...new Set(cookies.map((c: any) => c.domain))],
          });

          // Get state and notify via callback
          const state = await ctx.context!.storageState();
          log.debug('Storage state captured', {
            cookieCount: state.cookies?.length,
            originCount: state.origins?.length,
          });

          if (ctx.options.onStateChange) {
            await ctx.options.onStateChange(state);
          }

          // Update internal state
          ctx.options.state = state;

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
   * 检查登录状态并提取用户信息
   *
   * 通过检测页面上的登录按钮来判断是否已登录。
   * 如果已登录，会从 __INITIAL_STATE__ 中提取用户信息。
   *
   * 当 DEBUG=1 或 DEBUG=true 时：
   * - 使用非 headless 模式（显示浏览器窗口）
   * - 操作完成后不关闭页面，方便调试
   *
   * @returns 登录状态、消息和用户信息（如果已登录）
   */
  async checkLoginStatus(): Promise<{
    loggedIn: boolean;
    message: string;
    userInfo?: LoginUserInfo;
    fullProfile?: FullUserProfile;
  }> {
    const isDebug = config.debug.enabled;
    log.info('Checking login status...', { debug: isDebug });

    // 通过浏览器检查 - 比检查 cookies 更可靠
    // DEBUG 模式下使用非 headless，否则使用 headless
    if (!this.ctx.context) {
      await this.ctx.init(!isDebug);
    }

    const page = await this.ctx.context!.newPage();

    try {
      await page.goto(URLS.EXPLORE, {
        timeout: TIMEOUTS.LOGIN_CHECK,
        waitUntil: 'domcontentloaded'
      });

      await sleep(2000);

      // 检查登录状态元素
      const isLoggedIn = await page.$(LOGIN_STATUS_SELECTOR);

      if (isLoggedIn) {
        log.info('User is logged in');
        const userInfo = await this.ctx.extractUserInfo(page);

        // 如果获取到 userId，进一步获取完整用户资料
        let fullProfile: FullUserProfile | undefined;
        if (userInfo?.userId) {
          fullProfile = await this.ctx.extractFullUserProfile(userInfo.userId) || undefined;
        }

        return {
          loggedIn: true,
          message: 'Logged in (user element found)',
          userInfo: userInfo || undefined,
          fullProfile
        };
      }

      // 检查登录按钮 - 如果存在则未登录
      const loginBtn = await page.$('#login-btn');

      if (loginBtn) {
        log.info('User is not logged in (login button visible)');
        return { loggedIn: false, message: 'Not logged in (login button visible)' };
      }

      // 没有登录按钮，尝试提取用户信息确认登录状态
      log.info('User is logged in (login button not found)');
      const userInfo = await this.ctx.extractUserInfo(page);

      // 如果获取到 userId，进一步获取完整用户资料
      let fullProfile: FullUserProfile | undefined;
      if (userInfo?.userId) {
        fullProfile = await this.ctx.extractFullUserProfile(userInfo.userId) || undefined;
      }

      return {
        loggedIn: true,
        message: 'Logged in (login button not found)',
        userInfo: userInfo || undefined,
        fullProfile
      };

    } catch (e) {
      log.error('checkLoginStatus error', { error: e });
      return { loggedIn: false, message: 'Check failed - please try xhs_add_account' };
    } finally {
      // DEBUG 模式下不关闭页面，方便调试
      if (!isDebug) {
        await page.close();
      } else {
        log.info('DEBUG mode: keeping browser open for debugging');
      }
    }
  }
}
