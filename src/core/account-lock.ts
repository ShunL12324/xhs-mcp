/**
 * @fileoverview Account-level mutex lock for preventing concurrent operations.
 * Ensures that only one operation can run on an account at a time,
 * preventing race conditions and conflicting browser states.
 * @module core/account-lock
 */

/**
 * Information about an acquired lock.
 */
interface LockEntry {
  /** Account ID that is locked */
  accountId: string;
  /** When the lock was acquired */
  acquiredAt: Date;
  /** Description of the operation holding the lock */
  operation: string;
  /** Resolve function for waiting operations (internal) */
  resolve?: () => void;
}

/**
 * Account-level lock manager for preventing concurrent access.
 *
 * Uses a simple mutex pattern with a wait queue for fairness.
 * When a lock is held, subsequent lock requests are queued and
 * processed in FIFO order when the lock is released.
 *
 * @example
 * ```typescript
 * const lock = getAccountLock();
 * const release = await lock.acquire('account-123', 'search');
 * try {
 *   // Do work with the account
 * } finally {
 *   release();
 * }
 * ```
 */
export class AccountLock {
  /** Currently held locks by account ID */
  private locks: Map<string, LockEntry> = new Map();
  /** Queue of waiting operations by account ID */
  private waitQueue: Map<string, Array<{ resolve: () => void; reject: (err: Error) => void }>> = new Map();
  /** Default timeout for acquiring a lock */
  private readonly defaultTimeout: number;

  /**
   * Create a new AccountLock.
   * @param defaultTimeout - Default timeout in milliseconds (default: 30000)
   */
  constructor(defaultTimeout: number = 30000) {
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * Acquire a lock for an account
   * @param accountId The account to lock
   * @param operation Description of the operation (for debugging)
   * @param timeout Maximum time to wait for the lock (ms)
   * @returns A release function to call when done
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
