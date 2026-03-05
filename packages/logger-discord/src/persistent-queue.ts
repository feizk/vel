import { writeFile, readFile, access, mkdir } from 'fs/promises';
import { dirname } from 'path';

/**
 * Priority levels for queued messages
 */
export type QueuePriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Options for configuring the persistent queue
 */
export interface PersistentQueueOptions {
  /** Storage type: 'memory' or 'file' */
  storage: 'memory' | 'file';
  /** File path for file-based storage */
  filePath?: string;
  /** Maximum queue size (default: 10000) */
  maxSize?: number;
  /** Maximum retries for failed messages (default: 5) */
  maxRetries?: number;
  /** Flush interval in ms for file storage (default: 5000) */
  flushIntervalMs?: number;
}

/**
 * Queued message structure
 */
export interface QueuedMessage {
  /** Unique message ID */
  id: string;
  /** Message payload */
  payload: unknown;
  /** Number of retry attempts */
  retryCount: number;
  /** Timestamp when message was queued */
  timestamp: number;
  /** Message priority */
  priority: QueuePriority;
}

/**
 * Priority order for sorting (lower = higher priority)
 */
const PRIORITY_ORDER: Record<QueuePriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

/**
 * Persistent queue for storing failed messages.
 * Supports in-memory or file-based storage with priority queuing.
 *
 * @example
 * ```typescript
 * const queue = new PersistentQueue({
 *   storage: 'file',
 *   filePath: './queue.json',
 *   maxSize: 10000,
 * });
 *
 * await queue.enqueue(payload, 'high');
 * const message = queue.dequeue();
 * ```
 */
export class PersistentQueue {
  private queue: QueuedMessage[] = [];
  private readonly options: Required<PersistentQueueOptions>;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isDestroyed = false;

  /**
   * Create a new persistent queue instance
   * @param options - Configuration options
   */
  constructor(options: PersistentQueueOptions) {
    this.options = {
      maxSize: 10000,
      maxRetries: 5,
      filePath: '.vel/discord-queue.json',
      flushIntervalMs: 5000,
      ...options,
    };

    // Load persisted messages on startup
    void this.load();

    // Schedule periodic persistence for file storage
    if (this.options.storage === 'file') {
      this.schedulePersistence();
    }
  }

  /**
   * Add a message to the queue
   * @param payload - Message payload to store
   * @param priority - Message priority (default: 'normal')
   * @returns Promise that resolves when message is queued
   */
  async enqueue(
    payload: unknown,
    priority: QueuePriority = 'normal',
  ): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('Queue has been destroyed');
    }

    const message: QueuedMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      payload,
      retryCount: 0,
      timestamp: Date.now(),
      priority,
    };

    // Insert based on priority
    const insertIndex = this.queue.findIndex(
      (m) => PRIORITY_ORDER[m.priority] > PRIORITY_ORDER[priority],
    );

    if (insertIndex === -1) {
      this.queue.push(message);
    } else {
      this.queue.splice(insertIndex, 0, message);
    }

    // Trim if exceeds max size (remove oldest low priority first)
    if (this.queue.length > this.options.maxSize) {
      const lowPriorityIndex = this.findLastLowPriorityIndex();
      if (lowPriorityIndex !== -1) {
        this.queue.splice(lowPriorityIndex, 1);
      } else {
        this.queue.shift(); // Remove oldest
      }
    }

    // Persist immediately for critical messages
    if (priority === 'critical' && this.options.storage === 'file') {
      await this.persist();
    }
  }

  /**
   * Remove and return the highest priority message
   * @returns The message or undefined if queue is empty
   */
  dequeue(): QueuedMessage | undefined {
    return this.queue.shift();
  }

  /**
   * Peek at the highest priority message without removing it
   * @returns The message or undefined if queue is empty
   */
  peek(): QueuedMessage | undefined {
    return this.queue[0];
  }

  /**
   * Requeue a failed message for retry
   * @param message - The message to requeue
   * @returns true if requeued, false if dropped (max retries exceeded)
   */
  requeue(message: QueuedMessage): boolean {
    if (this.isDestroyed) {
      return false;
    }

    message.retryCount++;

    if (message.retryCount > this.options.maxRetries) {
      return false; // Drop message after max retries
    }

    // Requeue at same priority
    const insertIndex = this.queue.findIndex(
      (m) => PRIORITY_ORDER[m.priority] > PRIORITY_ORDER[message.priority],
    );

    if (insertIndex === -1) {
      this.queue.push(message);
    } else {
      this.queue.splice(insertIndex, 0, message);
    }

    return true;
  }

  /**
   * Get the current queue size
   * @returns Number of messages in queue
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   * @returns true if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Get all messages in queue (for debugging)
   * @returns Array of queued messages
   */
  getAll(): QueuedMessage[] {
    return [...this.queue];
  }

  /**
   * Clear all messages from queue
   */
  clear(): void {
    this.queue = [];
  }

  private findLastLowPriorityIndex(): number {
    for (let i = this.queue.length - 1; i >= 0; i--) {
      if (this.queue[i].priority === 'low') {
        return i;
      }
    }
    return -1;
  }

  private async persist(): Promise<void> {
    if (this.options.storage !== 'file' || !this.options.filePath) {
      return;
    }

    try {
      const dir = dirname(this.options.filePath);
      await mkdir(dir, { recursive: true });
      await writeFile(
        this.options.filePath,
        JSON.stringify(this.queue, null, 2),
        'utf-8',
      );
    } catch (error) {
      console.error('[PersistentQueue] Failed to persist:', error);
    }
  }

  private async load(): Promise<void> {
    if (this.options.storage !== 'file' || !this.options.filePath) {
      return;
    }

    try {
      await access(this.options.filePath);
      const data = await readFile(this.options.filePath, 'utf-8');
      this.queue = JSON.parse(data) as QueuedMessage[];
    } catch {
      // File doesn't exist or is corrupted, start fresh
      this.queue = [];
    }
  }

  private schedulePersistence(): void {
    this.flushTimer = setInterval(() => {
      void this.persist();
    }, this.options.flushIntervalMs);
  }

  /**
   * Clean up resources and persist final state
   */
  async destroy(): Promise<void> {
    this.isDestroyed = true;

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.persist();
  }
}
