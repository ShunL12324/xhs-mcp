/**
 * @fileoverview 账户级别互斥锁，用于防止并发操作。
 * 确保同一账户同一时间只能执行一个操作，
 * 避免竞态条件和浏览器状态冲突。
 * @module core/account-lock
 */

/**
 * 锁超时时间常量
 */
const LOCK_DEFAULTS = {
  /** 默认锁等待超时时间（毫秒） */
  TIMEOUT: 30000,
} as const;

/**
 * 已获取锁的信息
 */
interface LockEntry {
  /** 被锁定的账户 ID */
  accountId: string;
  /** 锁获取时间 */
  acquiredAt: Date;
  /** 持有锁的操作描述 */
  operation: string;
  /** 等待操作的 resolve 函数（内部使用） */
  resolve?: () => void;
}

/**
 * 账户级别锁管理器，用于防止并发访问
 *
 * 使用简单的互斥锁模式，带有等待队列以保证公平性。
 * 当锁被持有时，后续的锁请求会被排队，
 * 并在锁释放时按 FIFO 顺序处理。
 *
 * @example
 * ```typescript
 * const lock = getAccountLock();
 * const release = await lock.acquire('account-123', 'search');
 * try {
 *   // 在账户上执行操作
 * } finally {
 *   release();
 * }
 * ```
 */
export class AccountLock {
  /** 按账户 ID 索引的当前持有锁 */
  private locks: Map<string, LockEntry> = new Map();
  /** 按账户 ID 索引的等待队列 */
  private waitQueue: Map<string, Array<{ resolve: () => void; reject: (err: Error) => void }>> = new Map();
  /** 获取锁的默认超时时间 */
  private readonly defaultTimeout: number;

  /**
   * 创建新的 AccountLock 实例
   * @param defaultTimeout - 默认超时时间（毫秒，默认: 30000）
   */
  constructor(defaultTimeout: number = LOCK_DEFAULTS.TIMEOUT) {
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * 获取账户锁
   * @param accountId - 要锁定的账户
   * @param operation - 操作描述（用于调试）
   * @param timeout - 最大等待时间（毫秒）
   * @returns 完成后调用的释放函数
   */
  async acquire(accountId: string, operation: string, timeout?: number): Promise<() => void> {
    const effectiveTimeout = timeout ?? this.defaultTimeout;

    // Check if lock is already held
    const existingLock = this.locks.get(accountId);
    if (existingLock) {
      // Wait for the lock to be released
      return this.waitForLock(accountId, operation, effectiveTimeout);
    }

    // Acquire the lock
    const entry: LockEntry = {
      accountId,
      acquiredAt: new Date(),
      operation,
    };
    this.locks.set(accountId, entry);

    return () => this.release(accountId);
  }

  /**
   * Try to acquire a lock without waiting
   * @returns A release function if acquired, null if lock is held by another operation
   */
  tryAcquire(accountId: string, operation: string): (() => void) | null {
    if (this.locks.has(accountId)) {
      return null;
    }

    const entry: LockEntry = {
      accountId,
      acquiredAt: new Date(),
      operation,
    };
    this.locks.set(accountId, entry);

    return () => this.release(accountId);
  }

  /**
   * Check if an account is currently locked
   */
  isLocked(accountId: string): boolean {
    return this.locks.has(accountId);
  }

  /**
   * Get lock info for an account
   */
  getLockInfo(accountId: string): LockEntry | null {
    return this.locks.get(accountId) || null;
  }

  /**
   * Get all current locks
   */
  getAllLocks(): LockEntry[] {
    return Array.from(this.locks.values());
  }

  /**
   * Force release a lock (use with caution)
   */
  forceRelease(accountId: string): boolean {
    if (!this.locks.has(accountId)) {
      return false;
    }

    this.release(accountId);
    return true;
  }

  private release(accountId: string): void {
    this.locks.delete(accountId);

    // Check if there are waiters
    const waiters = this.waitQueue.get(accountId);
    if (waiters && waiters.length > 0) {
      const next = waiters.shift()!;
      if (waiters.length === 0) {
        this.waitQueue.delete(accountId);
      }
      next.resolve();
    }
  }

  private waitForLock(accountId: string, operation: string, timeout: number): Promise<() => void> {
    return new Promise((resolve, reject) => {
      // Add to wait queue
      if (!this.waitQueue.has(accountId)) {
        this.waitQueue.set(accountId, []);
      }

      const waiter = {
        resolve: () => {
          // Acquire the lock
          const entry: LockEntry = {
            accountId,
            acquiredAt: new Date(),
            operation,
          };
          this.locks.set(accountId, entry);
          resolve(() => this.release(accountId));
        },
        reject,
      };

      this.waitQueue.get(accountId)!.push(waiter);

      // Set timeout
      setTimeout(() => {
        const queue = this.waitQueue.get(accountId);
        if (queue) {
          const index = queue.indexOf(waiter);
          if (index !== -1) {
            queue.splice(index, 1);
            if (queue.length === 0) {
              this.waitQueue.delete(accountId);
            }
            reject(new Error(`Lock timeout for account ${accountId} after ${timeout}ms`));
          }
        }
      }, timeout);
    });
  }
}

// Singleton instance
let lockInstance: AccountLock | null = null;

/**
 * Get the account lock instance (singleton).
 * @returns The singleton AccountLock instance
 */
export function getAccountLock(): AccountLock {
  if (!lockInstance) {
    lockInstance = new AccountLock();
  }
  return lockInstance;
}
