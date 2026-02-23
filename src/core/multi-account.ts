/**
 * @fileoverview 多账户操作执行辅助工具。
 * 提供在单个或多个账户上运行操作的实用函数，
 * 包含自动锁定、日志记录和错误处理。
 * @module core/multi-account
 */

import { AccountPool } from './account-pool.js';
import { XhsDatabase } from '../db/index.js';
import { XhsClient } from '../xhs/index.js';

/**
 * 指定使用哪个账户执行操作的参数
 */
export interface MultiAccountParams {
  /** 单个账户名称或 ID */
  account?: string;
  /** 多个账户：名称/ID 数组，或 'all' 表示所有活跃账户 */
  accounts?: string[] | 'all';
}

/**
 * 提供给操作回调的上下文
 * 包含解析后的账户信息和客户端实例
 */
export interface OperationContext {
  /** 账户 ID */
  accountId: string;
  /** 账户名称 */
  accountName: string;
  /** 用于执行操作的 XhsClient 实例 */
  client: XhsClient;
}

/**
 * 单个账户操作的结果
 * @template T - 操作结果的类型
 */
export interface OperationResult<T> {
  /** 执行操作的账户名称 */
  account: string;
  /** 操作是否成功 */
  success: boolean;
  /** 操作结果（成功时） */
  result?: T;
  /** 错误信息（失败时） */
  error?: string;
  /** 操作耗时（毫秒） */
  durationMs?: number;
}

/**
 * 在单个账户上执行操作
 *
 * 自动处理锁定、错误处理和操作日志记录。
 *
 * @template T - 操作结果的类型
 * @param pool - 账户池实例
 * @param db - 数据库实例
 * @param accountIdOrName - 要使用的账户（ID 或名称）
 * @param action - 操作名称（用于日志）
 * @param operation - 要执行的异步函数
 * @param options - 可选的日志和锁定参数
 * @returns 包含成功状态和耗时的操作结果
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
  },
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
    db.operations.log({
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
    db.operations.log({
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
 * 在多个账户上执行操作
 *
 * 支持单个账户、多个账户或所有活跃账户。
 * 处理账户解析、并行/串行执行和聚合结果。
 *
 * 执行策略：
 * - 默认并行执行：同时在所有账户上执行操作，提高效率
 * - 可选串行执行：按顺序执行，适用于需要控制执行顺序的场景
 *
 * @template T - 操作结果的类型
 * @param pool - 账户池实例
 * @param db - 数据库实例
 * @param params - 账户选择参数
 * @param action - 操作名称（用于日志）
 * @param operation - 在每个账户上执行的异步函数
 * @param options - 可选参数，包括串行执行模式
 * @returns 所有账户的操作结果数组
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
  },
): Promise<OperationResult<T>[]> {
  // 确定要使用的账户列表
  let accountNames: string[];

  if (params.accounts === 'all') {
    // 使用所有活跃账户
    const allAccounts = pool.listAccounts().filter((a) => a.status === 'active');
    accountNames = allAccounts.map((a) => a.name);
  } else if (params.accounts && params.accounts.length > 0) {
    // 使用指定的多个账户
    accountNames = params.accounts;
  } else if (params.account) {
    // 使用单个指定账户
    accountNames = [params.account];
  } else {
    // 未指定账户 - 如果只有一个活跃账户则使用它
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

  // 执行操作
  if (options?.sequential) {
    // 串行执行：按顺序在每个账户上执行
    const results: OperationResult<T>[] = [];
    for (const accountName of accountNames) {
      const result = await executeWithAccount(pool, db, accountName, action, operation, options);
      results.push(result);
    }
    return results;
  } else {
    // 并行执行：同时在所有账户上执行（默认）
    const promises = accountNames.map((accountName) =>
      executeWithAccount(pool, db, accountName, action, operation, options),
    );
    return Promise.all(promises);
  }
}

/**
 * 从参数中解析账户选择
 *
 * 如果未指定账户且只有一个活跃账户，则使用该账户。
 *
 * @param pool - 账户池实例
 * @param params - 账户选择参数
 * @returns 解析后的账户名称或错误信息
 */
export function resolveAccount(
  pool: AccountPool,
  params: MultiAccountParams,
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
