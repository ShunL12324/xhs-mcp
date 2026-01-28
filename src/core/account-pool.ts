/**
 * @fileoverview Multi-account client pool for managing XhsClient instances.
 * Provides centralized management of browser clients, including creation,
 * caching, locking, and lifecycle management.
 * @module core/account-pool
 */

import { XhsClient, XhsClientOptions } from '../xhs/index.js';
import { XhsDatabase, Account, getDatabase } from '../db/index.js';
import { AccountLock, getAccountLock } from './account-lock.js';

/**
 * Pool of XhsClient instances for multi-account management.
 *
 * Features:
 * - Lazy client creation: clients are only created when first requested
 * - Client caching: reuses existing clients to avoid repeated browser launches
 * - Account locking: prevents concurrent operations on the same account
 * - State persistence: automatically saves Playwright state to database on changes
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
  /** Map of account ID to XhsClient instance */
  private clients: Map<string, XhsClient> = new Map();
  /** Database instance for account data */
  private db: XhsDatabase;
  /** Lock manager for preventing concurrent account access */
  private lock: AccountLock;

  /**
   * Create a new AccountPool.
   * @param db - Database instance (uses singleton if not provided)
   */
  constructor(db?: XhsDatabase) {
    this.db = db || getDatabase();
    this.lock = getAccountLock();
  }

  /**
   * Resolve account ID or name to Account object
   * Tries ID first, then name
   */
  private resolveAccount(accountIdOrName: string): Account | null {
    return this.db.getAccountById(accountIdOrName) || this.db.getAccountByName(accountIdOrName);
  }

  /**
   * Get a client for the specified account
   * Creates a new client if one doesn't exist
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
      state: account.state,
      proxy: account.proxy,
      onStateChange: async (state) => {
        // Save state to database when it changes
        this.db.updateAccountState(account!.id, state);
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
    const accounts = this.db.getActiveAccounts();
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
   * Add a new account or get existing account for re-login
   * Returns { account, client, isNew } where isNew indicates if account was created
   */
  async addAccount(name: string, proxy?: string): Promise<{ account: Account; client: XhsClient; isNew: boolean }> {
    // Check if account already exists
    const existing = this.db.getAccountByName(name);

    if (existing) {
      // Close existing client if any
      if (this.clients.has(existing.id)) {
        const oldClient = this.clients.get(existing.id)!;
        await oldClient.close();
        this.clients.delete(existing.id);
      }

      // Update proxy if provided
      if (proxy !== undefined) {
        this.db.updateAccountConfig(existing.id, { proxy });
      }

      // Create new client for re-login
      const account = this.db.getAccountById(existing.id)!;
      const client = new XhsClient({
        accountId: account.id,
        proxy: proxy || account.proxy,
        onStateChange: async (state) => {
          this.db.updateAccountState(account.id, state);
        },
      });

      this.clients.set(account.id, client);
      return { account, client, isNew: false };
    }

    // Create new account in database
    const account = this.db.createAccount(name, proxy);

    // Create client with login callback
    const client = new XhsClient({
      accountId: account.id,
      proxy: account.proxy,
      onStateChange: async (state) => {
        this.db.updateAccountState(account.id, state);
      },
    });

    this.clients.set(account.id, client);

    return { account, client, isNew: true };
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
    return this.db.deleteAccount(account.id);
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
    return this.db.getAllAccounts();
  }

  /**
   * Update account configuration
   */
  async updateAccountConfig(
    accountIdOrName: string,
    updates: { proxy?: string; status?: 'active' | 'suspended' | 'banned' }
  ): Promise<boolean> {
    const account = this.resolveAccount(accountIdOrName);

    if (!account) {
      return false;
    }

    this.db.updateAccountConfig(account.id, updates);

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
      this.db.touchAccount(account.id);
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
