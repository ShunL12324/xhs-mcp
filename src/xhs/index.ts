/**
 * @fileoverview XhsClient facade class for Xiaohongshu operations.
 * Provides a clean API wrapping the underlying BrowserClient.
 * @module xhs
 */

import { BrowserClient, BrowserClientOptions } from './clients/browser.js';
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
} from './types.js';

/**
 * Configuration options for XhsClient.
 */
export interface XhsClientOptions {
  /** Account ID for this client instance */
  accountId?: string;
  /** Playwright storage state (cookies, localStorage) for session persistence */
  state?: any;
  /** Proxy server URL (e.g., "http://proxy:8080") */
  proxy?: string;
  /** Callback invoked when session state changes (e.g., after login) */
  onStateChange?: (state: any) => void | Promise<void>;
}

/**
 * High-level client for interacting with Xiaohongshu.
 *
 * Wraps BrowserClient to provide a clean facade for all Xiaohongshu operations.
 * Each XhsClient instance is associated with a single account.
 *
 * @example
 * ```typescript
 * const client = new XhsClient({
 *   accountId: 'my-account',
 *   state: savedState,
 *   onStateChange: (state) => saveState(state),
 * });
 *
 * const results = await client.search('keyword');
 * await client.close();
 * ```
 */
export class XhsClient {
  private browserClient: BrowserClient;
  private options: XhsClientOptions;

  constructor(options: XhsClientOptions = {}) {
    this.options = options;
    this.browserClient = new BrowserClient({
      accountId: options.accountId,
      state: options.state,
      proxy: options.proxy,
      onStateChange: options.onStateChange,
    });
  }

  get accountId(): string | undefined {
    return this.options.accountId;
  }

  async init() {
    await this.browserClient.init();
  }

  async login(): Promise<{ qrCodePath: string; waitForLogin: () => Promise<any> }> {
    return await this.browserClient.login();
  }

  async checkLoginStatus(): Promise<{ loggedIn: boolean; message: string }> {
    return await this.browserClient.checkLoginStatus();
  }

  async search(
    keyword: string,
    count: number = 20,
    timeout: number = 60000,
    filters?: XhsSearchFilters
  ): Promise<XhsSearchItem[]> {
    return await this.browserClient.search(keyword, count, timeout, filters);
  }

  async getNote(noteId: string, xsecToken?: string): Promise<XhsNote | null> {
    return await this.browserClient.getNote(noteId, xsecToken);
  }

  async getUserProfile(userId: string, xsecToken?: string): Promise<XhsUserInfo | null> {
    return await this.browserClient.getUserProfile(userId, xsecToken);
  }

  async listFeeds(): Promise<XhsSearchItem[]> {
    return await this.browserClient.listFeeds();
  }

  // New methods for publishing
  async publishContent(params: PublishContentParams): Promise<PublishResult> {
    return await this.browserClient.publishContent(params);
  }

  async publishVideo(params: PublishVideoParams): Promise<PublishResult> {
    return await this.browserClient.publishVideo(params);
  }

  // New methods for interactions
  async likeFeed(noteId: string, xsecToken: string, unlike: boolean = false): Promise<InteractionResult> {
    return await this.browserClient.likeFeed(noteId, xsecToken, unlike);
  }

  async favoriteFeed(noteId: string, xsecToken: string, unfavorite: boolean = false): Promise<InteractionResult> {
    return await this.browserClient.favoriteFeed(noteId, xsecToken, unfavorite);
  }

  // New methods for comments
  async postComment(noteId: string, xsecToken: string, content: string): Promise<CommentResult> {
    return await this.browserClient.postComment(noteId, xsecToken, content);
  }

  async replyComment(
    noteId: string,
    xsecToken: string,
    commentId: string,
    content: string
  ): Promise<CommentResult> {
    return await this.browserClient.replyComment(noteId, xsecToken, commentId, content);
  }

  // Cookie management
  async deleteCookies(): Promise<{ success: boolean; error?: string }> {
    return await this.browserClient.deleteCookies();
  }

  async close() {
    await this.browserClient.close();
  }
}
