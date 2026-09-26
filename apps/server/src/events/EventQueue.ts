import { GiftEvent } from '@snake-live/shared';
import { EventQueueConfig, DEFAULT_QUEUE_CONFIG } from '@snake-live/gift-config';

interface UserRateLimitRecord {
  windowStart: number;
  count: number;
}

export class EventQueue {
  private queue: GiftEvent[] = [];
  private config: EventQueueConfig;
  private userRateLimits = new Map<string, UserRateLimitRecord>();
  private droppedCount: number = 0;
  private totalEnqueued: number = 0;

  constructor(customConfig?: Partial<EventQueueConfig>) {
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...customConfig };
  }

  /**
   * Enqueue a normalized gift event with anti-spam, batching, and rate limiting
   */
  enqueue(event: GiftEvent): boolean {
    if (!event || !event.senderUsername || !event.giftName) {
      this.droppedCount++;
      return false;
    }

    const now = Date.now();
    this.cleanRateLimits(now);

    // Rate-limit per user to prevent single-client spam exploits
    const userKey = event.senderId || event.senderUsername;
    const rateRecord = this.userRateLimits.get(userKey) || { windowStart: now, count: 0 };

    if (now - rateRecord.windowStart < this.config.rateLimitWindowMs) {
      if (rateRecord.count >= this.config.maxGiftsPerUserPerWindow) {
        // Attempt to merge into existing queued event if present
        const existingIdx = this.queue.findIndex(
          (e) =>
            (e.senderId === event.senderId || e.senderUsername === event.senderUsername) &&
            e.giftName.toLowerCase() === event.giftName.toLowerCase()
        );
        if (existingIdx !== -1) {
          this.queue[existingIdx].repeatCount += event.repeatCount;
          return true;
        }
        this.droppedCount++;
        return false;
      }
      rateRecord.count += event.repeatCount;
    } else {
      rateRecord.windowStart = now;
      rateRecord.count = event.repeatCount;
    }
    this.userRateLimits.set(userKey, rateRecord);

    // Batching: combine with recently queued identical gift from same user
    const existing = this.queue.find(
      (e) =>
        (e.senderId === event.senderId || e.senderUsername === event.senderUsername) &&
        e.giftName.toLowerCase() === event.giftName.toLowerCase() &&
        now - e.timestamp <= this.config.batchWindowMs
    );

    if (existing) {
      existing.repeatCount += event.repeatCount;
      return true;
    }

    // Queue capacity limit
    if (this.queue.length >= this.config.maxQueueLength) {
      this.droppedCount++;
      return false;
    }

    this.queue.push({
      ...event,
      timestamp: event.timestamp || now,
    });
    this.totalEnqueued++;
    return true;
  }

  /**
   * Dequeue up to maxEventsPerTick items to be processed in the game loop
   */
  processBatch(): GiftEvent[] {
    if (this.queue.length === 0) return [];
    return this.queue.splice(0, this.config.maxEventsPerTick);
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getDroppedCount(): number {
    return this.droppedCount;
  }

  getTotalEnqueued(): number {
    return this.totalEnqueued;
  }

  clear(): void {
    this.queue = [];
    this.userRateLimits.clear();
  }

  private cleanRateLimits(now: number): void {
    if (this.userRateLimits.size > 2000) {
      for (const [key, record] of this.userRateLimits.entries()) {
        if (now - record.windowStart > this.config.rateLimitWindowMs * 2) {
          this.userRateLimits.delete(key);
        }
      }
    }
  }
}
