/**
 * @fileoverview 多账户客户端池，用于管理 XhsClient 实例。
 * 提供浏览器客户端的集中管理，包括创建、缓存、锁定和生命周期管理。
 * @module core/account-pool
 */

import { XhsClient, XhsClientOptions } from '../xhs/index.js';
import { XhsDatabase, Account, getDatabase } from '../db/index.js';
import { AccountLock, getAccountLock } from './account-lock.js';

/**
 * XhsClient 实例池，用于多账户管理
 *
 * 功能特性：
 * - 懒加载客户端：仅在首次请求时创建客户端
 * - 客户端缓存：复用已有客户端，避免重复启动浏览器
 * - 账户锁定：防止同一账户的并发操作
 * - 状态持久化：状态变更时自动保存 Playwright 状态到数据库
 *
 * @example
 * ```typescript
 * const pool = getAccountPool(db);
 * const client = await pool.getClient('my-account');
 * if (client) {
 *   const results = await client.search('keyword');
 * }
 * ```
 */
export class AccountPool {
  /** 账户 ID 到 XhsClient 实例的映射 */
  private clients: Map<string, XhsClient> = new Map();
  /** 数据库实例，用于账户数据存取 */
  private db: XhsDatabase;
  /** 锁管理器，用于防止并发账户访问 */
  private lock: AccountLock;

  /**
   * 创建新的 AccountPool 实例
   * @param db - 数据库实例（不提供则使用单例）
   */
  constructor(db?: XhsDatabase) {
    this.db = db || getDatabase();
    this.lock = getAccountLock();
  }

  /**
   * 将账户 ID 或名称解析为 Account 对象
   * 优先尝试 ID，然后尝试名称
   */
  private resolveAccount(accountIdOrName: string): Account | null {
    return this.db.accounts.findById(accountIdOrName) || this.db.accounts.findByName(accountIdOrName);
  }

  /**
   * 获取指定账户的客户端
   * 如果不存在则创建新客户端
   */
  async getClient(accountIdOrName: string): Promise<XhsClient | null> {
    const account = this.resolveAccount(accountIdOrName);

    if (!account) {
      return null;
    }

    // Return existing client if available
    if (this.clients.has(account.id)) {
      return this.clients.get(account.id)!;
    }

    // Create new client
    const client = new XhsClient({
      accountId: account.id,
      accountName: account.name,
      state: account.state,
      proxy: account.proxy,
      onStateChange: async (state) => {
        // Save state to database when it changes
        this.db.accounts.updateState(account!.id, state);
      },
    });

    this.clients.set(account.id, client);
    return client;
  }

  /**
   * Get clients for multiple accounts
   */
  async getClients(accountIdsOrNames: string[]): Promise<Map<string, XhsClient>> {
    const result = new Map<string, XhsClient>();

    for (const idOrName of accountIdsOrNames) {
      const client = await this.getClient(idOrName);
      if (client) {
        result.set(idOrName, client);
      }
    }

    return result;
  }

  /**
   * Get clients for all active accounts
   */
  async getAllClients(): Promise<Map<string, XhsClient>> {
    const accounts = this.db.accounts.findActive();
    const result = new Map<string, XhsClient>();

    for (const account of accounts) {
      const client = await this.getClient(account.id);
      if (client) {
        result.set(account.name, client);
      }
    }

    return result;
  }

  /**
   * Add a new account or get existing account for re-login.
   * If name is not provided, a temporary name will be used and should be updated after login.
   * Returns { account, client, isNew } where isNew indicates if account was created
   */
  async addAccount(name?: string, proxy?: string): Promise<{ account: Account; client: XhsClient; isNew: boolean }> {
    // Check if account already exists (only if name was provided)
    const existing = name ? this.db.accounts.findByName(name) : null;

    if (existing) {
      // Close existing client if any
      if (this.clients.has(existing.id)) {
        const oldClient = this.clients.get(existing.id)!;
        await oldClient.close();
        this.clients.delete(existing.id);
      }

      // Update proxy if provided
      if (proxy !== undefined) {
        this.db.accounts.updateConfig(existing.id, { proxy });
      }

      // Create new client for re-login
      const account = this.db.accounts.findById(existing.id)!;
      const client = new XhsClient({
        accountId: account.id,
        proxy: proxy || account.proxy,
        onStateChange: async (state) => {
          this.db.accounts.updateState(account.id, state);
        },
      });

      this.clients.set(account.id, client);
      return { account, client, isNew: false };
    }

    // For new login, don't create account yet - just return a temporary client
    // The account will be created after successful login using createAccountAfterLogin
    const tempClient = new XhsClient({
      proxy,
    });

    // Return a placeholder account - the real account will be created after login
    return {
      account: null as any, // Will be set after login
      client: tempClient,
      isNew: true,
    };
  }

  /**
   * 登录成功后创建或更新账户。
   * 优先通过 userId 检测是否为已有账户的重新登录。
   */
  async createAccountAfterLogin(
    nickname: string,
    state: any,
    proxy?: string,
    userId?: string,
  ): Promise<{ account: Account; isExisting: boolean }> {
    // 通过 userId 检测已有账户（重新登录场景）
    if (userId) {
      const existingProfile = this.db.profiles.findByUserId(userId);
      if (existingProfile) {
        const existingAccount = this.db.accounts.findById(existingProfile.accountId);
        if (existingAccount) {
          // 关闭旧客户端
          const oldClient = this.clients.get(existingAccount.id);
          if (oldClient) {
            await oldClient.close();
            this.clients.delete(existingAccount.id);
          }

          // 更新 session state
          this.db.accounts.updateState(existingAccount.id, state);
          if (proxy !== undefined) {
            this.db.accounts.updateConfig(existingAccount.id, { proxy });
          }

          // 创建新客户端
          const client = new XhsClient({
            accountId: existingAccount.id,
            accountName: existingAccount.name,
            state,
            proxy: proxy ?? existingAccount.proxy,
            onStateChange: async (newState) => {
              this.db.accounts.updateState(existingAccount.id, newState);
            },
          });
          this.clients.set(existingAccount.id, client);

          return { account: existingAccount, isExisting: true };
        }
      }
    }

    // 新账户：检查名称冲突
    let accountName = nickname;
    const existing = this.db.accounts.findByName(nickname);
    if (existing) {
      accountName = `${nickname}_${Date.now()}`;
    }

    const account = this.db.accounts.create(accountName, proxy);
    this.db.accounts.updateState(account.id, state);

    const client = new XhsClient({
      accountId: account.id,
      accountName: account.name,
      state,
      proxy: account.proxy,
      onStateChange: async (newState) => {
        this.db.accounts.updateState(account.id, newState);
      },
    });
    this.clients.set(account.id, client);

    return { account, isExisting: false };
  }

  /**
   * Remove client without removing account (for re-login)
   */
  async removeClient(accountId: string): Promise<void> {
    const client = this.clients.get(accountId);
    if (client) {
      await client.close();
      this.clients.delete(accountId);
    }
  }

  /**
   * Remove an account
   */
  async removeAccount(accountIdOrName: string): Promise<boolean> {
    const account = this.resolveAccount(accountIdOrName);

    if (!account) {
      return false;
    }

    // Close and remove client
    const client = this.clients.get(account.id);
    if (client) {
      await client.close();
      this.clients.delete(account.id);
    }

    // Delete from database
    return this.db.accounts.delete(account.id);
  }

  /**
   * Get account info
   */
  getAccount(accountIdOrName: string): Account | null {
    return this.resolveAccount(accountIdOrName);
  }

  /**
   * List all accounts
   */
  listAccounts(): Account[] {
    return this.db.accounts.findAll();
  }

  /**
   * Update account configuration
   */
  async updateAccountConfig(
    accountIdOrName: string,
    updates: { name?: string; proxy?: string; status?: 'active' | 'suspended' | 'banned' },
  ): Promise<boolean> {
    const account = this.resolveAccount(accountIdOrName);

    if (!account) {
      return false;
    }

    this.db.accounts.updateConfig(account.id, updates);

    // If proxy changed, recreate the client
    if (updates.proxy !== undefined && this.clients.has(account.id)) {
      const oldClient = this.clients.get(account.id)!;
      await oldClient.close();
      this.clients.delete(account.id);
    }

    return true;
  }

  /**
   * Acquire lock for an account
   */
  async acquireLock(accountIdOrName: string, operation: string, timeout?: number): Promise<() => void> {
    const account = this.resolveAccount(accountIdOrName);

    if (!account) {
      throw new Error(`Account not found: ${accountIdOrName}`);
    }

    return this.lock.acquire(account.id, operation, timeout);
  }

  /**
   * Try to acquire lock without waiting
   */
  tryAcquireLock(accountIdOrName: string, operation: string): (() => void) | null {
    const account = this.resolveAccount(accountIdOrName);

    if (!account) {
      return null;
    }

    return this.lock.tryAcquire(account.id, operation);
  }

  /**
   * Check if account is locked
   */
  isAccountLocked(accountIdOrName: string): boolean {
    const account = this.resolveAccount(accountIdOrName);

    if (!account) {
      return false;
    }

    return this.lock.isLocked(account.id);
  }

  /**
   * Touch account to update last active time
   */
  touchAccount(accountIdOrName: string): void {
    const account = this.resolveAccount(accountIdOrName);

    if (account) {
      this.db.accounts.touch(account.id);
    }
  }

  /**
   * Close all clients
   */
  async closeAll(): Promise<void> {
    for (const client of this.clients.values()) {
      await client.close();
    }
    this.clients.clear();
  }
}

// Singleton instance
let poolInstance: AccountPool | null = null;

/**
 * Get the account pool instance (singleton).
 * Creates a new instance if one doesn't exist.
 * @param db - Optional database instance to use
 * @returns The singleton AccountPool instance
 */
export function getAccountPool(db?: XhsDatabase): AccountPool {
  if (!poolInstance) {
    poolInstance = new AccountPool(db);
  }
  return poolInstance;
}
