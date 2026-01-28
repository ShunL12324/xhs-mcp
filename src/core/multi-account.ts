/**
 * @fileoverview Multi-account operation execution helpers.
 * Provides utilities for running operations on single or multiple accounts
 * with automatic locking, logging, and error handling.
 * @module core/multi-account
 */

import { AccountPool } from './account-pool.js';
import { XhsDatabase } from '../db/index.js';
import { XhsClient } from '../xhs/index.js';

/**
 * Parameters for specifying which account(s) to use for an operation.
 */
export interface MultiAccountParams {
  /** Single account name or ID */
  account?: string;
  /** Multiple accounts: array of names/IDs, or 'all' for all active accounts */
  accounts?: string[] | 'all';
}

/**
 * Context provided to operation callbacks.
 * Contains the resolved account information and client instance.
 */
export interface OperationContext {
  /** Account ID */
  accountId: string;
  /** Account name */
  accountName: string;
  /** XhsClient instance for performing operations */
  client: XhsClient;
}

/**
 * Result of an operation on a single account.
 * @template T - Type of the operation result
 */
export interface OperationResult<T> {
  /** Account name the operation was performed on */
  account: string;
  /** Whether the operation succeeded */
  success: boolean;
  /** Operation result (if successful) */
  result?: T;
  /** Error message (if failed) */
  error?: string;
  /** Operation duration in milliseconds */
  durationMs?: number;
}

/**
 * Execute an operation on a single account.
 * Handles locking, error handling, and operation logging automatically.
 *
 * @template T - Type of the operation result
 * @param pool - Account pool instance
 * @param db - Database instance
 * @param accountIdOrName - Account to use (ID or name)
 * @param action - Action name for logging
 * @param operation - Async function to execute
 * @param options - Optional parameters for logging and locking
 * @returns Operation result with success status and timing
 */
export async function executeWithAccount<T>(
  pool: AccountPool,
  db: XhsDatabase,
  accountIdOrName: string,
  action: string,
  operation: (ctx: OperationContext) => Promise<T>,
  options?: {
    logParams?: any;
    lockTimeout?: number;
  }
): Promise<OperationResult<T>> {
  const account = pool.getAccount(accountIdOrName);
  if (!account) {
    return {
      account: accountIdOrName,
      success: false,
      error: `Account not found: ${accountIdOrName}`,
    };
  }

  const startTime = Date.now();
  let release: (() => void) | null = null;

  try {
    // Acquire lock
    release = await pool.acquireLock(account.id, action, options?.lockTimeout);

    // Get client
    const client = await pool.getClient(account.id);
    if (!client) {
      throw new Error('Failed to get client for account');
    }

    // Execute operation
    const result = await operation({
      accountId: account.id,
      accountName: account.name,
      client,
    });

    const durationMs = Date.now() - startTime;

    // Log success
    db.logOperation({
      accountId: account.id,
      action,
      params: options?.logParams,
      result: result as any,
      success: true,
      durationMs,
    });

    // Touch account
    pool.touchAccount(account.id);

    return {
      account: account.name,
      success: true,
      result,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log failure
    db.logOperation({
      accountId: account.id,
      action,
      params: options?.logParams,
      success: false,
      error: errorMessage,
      durationMs,
    });

    return {
      account: account.name,
      success: false,
      error: errorMessage,
      durationMs,
    };
  } finally {
    if (release) {
      release();
    }
  }
}

/**
 * Execute an operation on multiple accounts.
 * Supports single account, multiple accounts, or all active accounts.
 * Handles account resolution, parallel/sequential execution, and aggregated results.
 *
 * @template T - Type of the operation result
 * @param pool - Account pool instance
 * @param db - Database instance
 * @param params - Account selection parameters
 * @param action - Action name for logging
 * @param operation - Async function to execute on each account
 * @param options - Optional parameters including sequential execution mode
 * @returns Array of operation results for all accounts
 */
export async function executeWithMultipleAccounts<T>(
  pool: AccountPool,
  db: XhsDatabase,
  params: MultiAccountParams,
  action: string,
  operation: (ctx: OperationContext) => Promise<T>,
  options?: {
    logParams?: any;
    lockTimeout?: number;
    sequential?: boolean; // Run operations sequentially instead of in parallel
  }
): Promise<OperationResult<T>[]> {
  // Determine which accounts to use
  let accountNames: string[];

  if (params.accounts === 'all') {
    const allAccounts = pool.listAccounts().filter((a) => a.status === 'active');
    accountNames = allAccounts.map((a) => a.name);
  } else if (params.accounts && params.accounts.length > 0) {
    accountNames = params.accounts;
  } else if (params.account) {
    accountNames = [params.account];
  } else {
    // No account specified - use default if there's only one
    const allAccounts = pool.listAccounts().filter((a) => a.status === 'active');
    if (allAccounts.length === 0) {
      return [
        {
          account: 'none',
          success: false,
          error: 'No active accounts found. Use xhs_add_account to add one.',
        },
      ];
    }
    if (allAccounts.length === 1) {
      accountNames = [allAccounts[0].name];
    } else {
      return [
        {
          account: 'none',
          success: false,
          error: `Multiple accounts available. Please specify which account(s) to use: ${allAccounts.map((a) => a.name).join(', ')}`,
        },
      ];
    }
  }

  if (accountNames.length === 0) {
    return [
      {
        account: 'none',
        success: false,
        error: 'No accounts specified.',
      },
    ];
  }

  // Execute operations
  if (options?.sequential) {
    // Sequential execution
    const results: OperationResult<T>[] = [];
    for (const accountName of accountNames) {
      const result = await executeWithAccount(pool, db, accountName, action, operation, options);
      results.push(result);
    }
    return results;
  } else {
    // Parallel execution
    const promises = accountNames.map((accountName) =>
      executeWithAccount(pool, db, accountName, action, operation, options)
    );
    return Promise.all(promises);
  }
}

/**
 * Resolve account selection from parameters.
 * If no account specified and only one active account exists, uses that.
 *
 * @param pool - Account pool instance
 * @param params - Account selection parameters
 * @returns Resolved account name or error message
 */
export function resolveAccount(
  pool: AccountPool,
  params: MultiAccountParams
): { account: string | null; error?: string } {
  if (params.account) {
    const account = pool.getAccount(params.account);
    if (!account) {
      return { account: null, error: `Account not found: ${params.account}` };
    }
    return { account: account.name };
  }

  // Try to use default if only one account exists
  const allAccounts = pool.listAccounts().filter((a) => a.status === 'active');
  if (allAccounts.length === 0) {
    return { account: null, error: 'No active accounts. Use xhs_add_account to add one.' };
  }
  if (allAccounts.length === 1) {
    return { account: allAccounts[0].name };
  }

  return {
    account: null,
    error: `Multiple accounts available. Please specify which account to use: ${allAccounts.map((a) => a.name).join(', ')}`,
  };
}
