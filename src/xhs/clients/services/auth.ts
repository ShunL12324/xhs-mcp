/**
 * @fileoverview Authentication service for BrowserClient.
 * Contains login and session management functionality.
 * @module xhs/clients/services/auth
 */

import { chromium } from 'patchright';
import { LoginUserInfo, FullUserProfile } from '../../types.js';
import { sleep, generateWebId } from '../../utils/index.js';
import { config } from '../../../core/config.js';
import { BrowserContextManager, log } from '../context.js';
import { BROWSER_ARGS, TIMEOUTS, QR_CODE_SELECTOR, LOGIN_STATUS_SELECTOR, URLS } from '../constants.js';

/**
 * Authentication service - handles login status checking
 */
export class AuthService {
  constructor(private ctx: BrowserContextManager) {}

  /**
   * 检查登录状态并提取用户信息
   *
   * 通过检测页面上的登录按钮来判断是否已登录。
   * 如果已登录，会从 __INITIAL_STATE__ 中提取用户信息。
   *
   * 环境变量控制：
   * - XHS_MCP_HEADLESS=false：显示浏览器窗口
   * - XHS_MCP_KEEP_OPEN=true：操作完成后不关闭页面
   *
   * @returns 登录状态、消息和用户信息（如果已登录）
   */
  async checkLoginStatus(): Promise<{
    loggedIn: boolean;
    message: string;
    userInfo?: LoginUserInfo;
    fullProfile?: FullUserProfile;
  }> {
    const keepOpen = config.browser.keepOpen;
    log.info('Checking login status...', { headless: config.browser.headless, keepOpen });

    // 通过浏览器检查 - 比检查 cookies 更可靠
    if (!this.ctx.context) {
      await this.ctx.init(config.browser.headless);
    }

    const page = await this.ctx.context!.newPage();

    try {
      await page.goto(URLS.EXPLORE, {
        timeout: TIMEOUTS.LOGIN_CHECK,
        waitUntil: 'domcontentloaded',
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
          fullProfile = (await this.ctx.extractFullUserProfile(userInfo.userId)) || undefined;
        }

        return {
          loggedIn: true,
          message: 'Logged in (user element found)',
          userInfo: userInfo || undefined,
          fullProfile,
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
        fullProfile = (await this.ctx.extractFullUserProfile(userInfo.userId)) || undefined;
      }

      return {
        loggedIn: true,
        message: 'Logged in (login button not found)',
        userInfo: userInfo || undefined,
        fullProfile,
      };
    } catch (e) {
      log.error('checkLoginStatus error', { error: e });
      return { loggedIn: false, message: 'Check failed - please try xhs_add_account' };
    } finally {
      // keepOpen 模式下不关闭页面，方便调试
      if (!keepOpen) {
        await page.close();
      } else {
        log.info('Keep open mode: browser stays open for debugging');
      }
    }
  }
}
