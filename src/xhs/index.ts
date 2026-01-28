import { BrowserClient } from './clients/browser.js';
import { XhsNote, XhsSearchItem, XhsUserInfo } from './types.js';

export class XhsClient {
  private browserClient: BrowserClient;

  constructor() {
    this.browserClient = new BrowserClient();
  }

  async init() {
    await this.browserClient.init();
  }

  async login() {
    await this.browserClient.login();
  }

  async checkLoginStatus(): Promise<{ loggedIn: boolean; message: string }> {
    return await this.browserClient.checkLoginStatus();
  }

  async search(keyword: string, count: number = 20, timeout: number = 60000): Promise<XhsSearchItem[]> {
    return await this.browserClient.search(keyword, count, timeout);
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

  async close() {
    await this.browserClient.close();
  }
}
