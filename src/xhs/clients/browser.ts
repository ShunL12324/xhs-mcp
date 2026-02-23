/**
 * @fileoverview Browser automation client for Xiaohongshu.
 * Uses Playwright to interact with the Xiaohongshu website with anti-detection measures.
 *
 * This module uses composition pattern to provide full browser automation functionality:
 * - AuthService: Login and session management
 * - SearchService: Search functionality
 * - ContentService: Note and user profile retrieval
 * - PublishService: Content publishing
 * - InteractService: Like, favorite, and comment actions
 *
 * @module xhs/clients/browser
 */

// Re-export types and constants for backwards compatibility
export { BrowserClientOptions } from './context.js';
export {
  BROWSER_ARGS,
  TIMEOUTS,
  SEARCH_DEFAULTS,
  SCROLL_CONFIG,
  DELAYS,
  REQUEST_INTERVAL,
  PUBLISH_SELECTORS,
  INTERACTION_SELECTORS,
  COMMENT_SELECTORS,
  SEARCH_FILTER_MAP,
  QR_CODE_SELECTOR,
  LOGIN_STATUS_SELECTOR,
  URLS,
} from './constants.js';

// Import context and services
import { BrowserContextManager, BrowserClientOptions } from './context.js';
import { AuthService } from './services/auth.js';
import { SearchService } from './services/search.js';
import { ContentService } from './services/content.js';
import { PublishService } from './services/publish.js';
import { InteractService } from './services/interact.js';
import { CreatorService } from './services/creator.js';
import { NotificationService, NotificationsResult } from './services/notification.js';
import { ExploreService, ExploreParams } from './services/explore.js';
import { ExploreSessionResult } from '../../db/index.js';

// Import types for method signatures
import {
  LoginUserInfo,
  FullUserProfile,
  XhsSearchItem,
  XhsSearchFilters,
  XhsNote,
  XhsUserInfo,
  PublishContentParams,
  PublishVideoParams,
  PublishResult,
  InteractionResult,
  CommentResult,
} from '../types.js';

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
  private ctx: BrowserContextManager;
  private authService: AuthService;
  private searchService: SearchService;
  private contentService: ContentService;
  private publishService: PublishService;
  private interactService: InteractService;
  private creatorService: CreatorService;
  private notificationService: NotificationService;
  private exploreService: ExploreService;

  constructor(options: BrowserClientOptions = {}) {
    this.ctx = new BrowserContextManager(options);
    this.authService = new AuthService(this.ctx);
    this.searchService = new SearchService(this.ctx);
    this.contentService = new ContentService(this.ctx);
    this.publishService = new PublishService(this.ctx);
    this.interactService = new InteractService(this.ctx);
    this.creatorService = new CreatorService(this.ctx);
    this.notificationService = new NotificationService(this.ctx);
    this.exploreService = new ExploreService(this.ctx);
  }

  // ============ Context Methods ============

  /**
   * Get the current account ID
   */
  get accountId(): string | undefined {
    return this.ctx.accountId;
  }

  /**
   * Initialize browser with optional headless mode
   */
  async init(headless = true): Promise<void> {
    return this.ctx.init(headless);
  }

  /**
   * Close browser and cleanup resources
   */
  async close(): Promise<void> {
    return this.ctx.close();
  }

  /**
   * Delete login cookies and clear session state.
   */
  async deleteCookies(): Promise<{ success: boolean; error?: string }> {
    return this.ctx.deleteCookies();
  }

  // ============ Auth Methods ============

  /**
   * Check login status and extract user info
   */
  async checkLoginStatus(): Promise<{
    loggedIn: boolean;
    message: string;
    userInfo?: LoginUserInfo;
    fullProfile?: FullUserProfile;
  }> {
    return this.authService.checkLoginStatus();
  }

  // ============ Search Methods ============

  /**
   * Search Xiaohongshu notes
   */
  async search(
    keyword: string,
    count?: number,
    timeout?: number,
    filters?: XhsSearchFilters,
  ): Promise<XhsSearchItem[]> {
    return this.searchService.search(keyword, count, timeout, filters);
  }

  // ============ Content Methods ============

  /**
   * Get note details including content, images, stats, and comments
   */
  async getNote(noteId: string, xsecToken?: string): Promise<XhsNote | null> {
    return this.contentService.getNote(noteId, xsecToken);
  }

  /**
   * Get user profile information and their published notes
   */
  async getUserProfile(userId: string, xsecToken?: string): Promise<XhsUserInfo | null> {
    return this.contentService.getUserProfile(userId, xsecToken);
  }

  /**
   * Get homepage recommended feeds
   */
  async listFeeds(): Promise<XhsSearchItem[]> {
    return this.contentService.listFeeds();
  }

  // ============ Publish Methods ============

  /**
   * Publish an image/text note
   */
  async publishContent(params: PublishContentParams): Promise<PublishResult> {
    return this.publishService.publishContent(params);
  }

  /**
   * Publish a video note
   */
  async publishVideo(params: PublishVideoParams): Promise<PublishResult> {
    return this.publishService.publishVideo(params);
  }

  // ============ Interact Methods ============

  /**
   * Like or unlike a note
   */
  async likeFeed(noteId: string, xsecToken: string, unlike?: boolean): Promise<InteractionResult> {
    return this.interactService.likeFeed(noteId, xsecToken, unlike);
  }

  /**
   * Favorite (collect) or unfavorite a note
   */
  async favoriteFeed(noteId: string, xsecToken: string, unfavorite?: boolean): Promise<InteractionResult> {
    return this.interactService.favoriteFeed(noteId, xsecToken, unfavorite);
  }

  /**
   * Post a comment on a note
   */
  async postComment(noteId: string, xsecToken: string, content: string): Promise<CommentResult> {
    return this.interactService.postComment(noteId, xsecToken, content);
  }

  /**
   * Reply to a comment on a note
   */
  async replyComment(noteId: string, xsecToken: string, commentId: string, content: string): Promise<CommentResult> {
    return this.interactService.replyComment(noteId, xsecToken, commentId, content);
  }

  /**
   * Like or unlike a comment
   */
  async likeComment(
    noteId: string,
    xsecToken: string,
    commentId: string,
    unlike?: boolean,
  ): Promise<InteractionResult> {
    return this.interactService.likeComment(noteId, xsecToken, commentId, unlike);
  }

  // ============ Creator Methods ============

  /**
   * Get list of published notes from creator center
   */
  async getMyPublishedNotes(tab?: number, limit?: number, timeout?: number): Promise<any[]> {
    return this.creatorService.getMyPublishedNotes(tab, limit, timeout);
  }

  // ============ Notification Methods ============

  /**
   * Get notifications (mentions, likes, connections)
   */
  async getNotifications(
    type?: 'mentions' | 'likes' | 'connections' | 'all',
    limit?: number,
  ): Promise<NotificationsResult> {
    return this.notificationService.getNotifications(type, limit);
  }

  // ============ Explore Methods ============

  /**
   * Automatically browse the explore page
   * Simulates human behavior, opening notes, liking, and commenting based on probability
   */
  async explore(accountId: string, accountName: string, params?: ExploreParams): Promise<ExploreSessionResult> {
    return this.exploreService.explore(accountId, accountName, params);
  }

  /**
   * 停止 explore 会话
   * @param sessionId 会话 ID，不指定则停止所有会话
   * @returns 被停止的会话 ID 列表
   */
  stopExplore(sessionId?: string): string[] {
    return this.exploreService.stopExplore(sessionId);
  }

  /**
   * 获取当前正在运行的 explore 会话 ID 列表
   */
  getActiveExploreSessions(): string[] {
    return this.exploreService.getActiveSessions();
  }
}
