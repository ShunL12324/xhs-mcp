/**
 * @fileoverview Shared browser context manager for composition pattern.
 * All service classes receive this context to access browser/context/options.
 * @module xhs/clients/context
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { LoginUserInfo } from '../types.js';
import { getStealthScript, generateWebId } from '../utils/index.js';
import { createLogger } from '../../core/logger.js';
import { USER_AGENT, BROWSER_ARGS } from './constants.js';

// Create logger for browser module
export const log = createLogger('browser');

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

/**
 * Shared browser context manager.
 * Encapsulates browser lifecycle and provides shared access to browser/context.
 * All service classes receive an instance of this class.
 */
export class BrowserContextManager {
  browser: Browser | null = null;
  context: BrowserContext | null = null;
  options: BrowserClientOptions;

  constructor(options: BrowserClientOptions = {}) {
    this.options = options;
  }

  /**
   * Get the current account ID
   */
  get accountId(): string | undefined {
    return this.options.accountId;
  }

  /**
   * Initialize browser with optional headless mode
   */
  async init(headless = true): Promise<void> {
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
   * Close browser and cleanup resources
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
    }
  }

  /**
   * Ensure context is initialized, initializing if needed
   */
  async ensureContext(headless = true): Promise<BrowserContext> {
    if (!this.context) {
      await this.init(headless);
    }
    return this.context!;
  }

  /**
   * Create a new page from the current context
   */
  async newPage(): Promise<Page> {
    const context = await this.ensureContext();
    return context.newPage();
  }

  /**
   * Extract current user info from page's __INITIAL_STATE__.user.userInfo
   */
  async extractUserInfo(page: Page): Promise<LoginUserInfo | null> {
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
   * Delete login cookies and clear session state.
   * Used to log out or force re-authentication.
   */
  async deleteCookies(): Promise<{ success: boolean; error?: string }> {
    try {
      // Clear internal state
      this.options.state = undefined;

      // Close browser instance
      await this.close();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Save current storage state and notify via callback
   */
  async saveState(): Promise<any> {
    if (!this.context) return null;

    const state = await this.context.storageState();
    this.options.state = state;

    if (this.options.onStateChange) {
      await this.options.onStateChange(state);
    }

    return state;
  }
}
