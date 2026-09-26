import { describe, it, expect, beforeEach } from 'vitest';
import { EventQueue } from '../apps/server/src/events/EventQueue';

describe('Anti-Spam Event Queue', () => {
  let queue: EventQueue;

  beforeEach(() => {
    queue = new EventQueue({
      maxQueueLength: 50,
      maxEventsPerTick: 3,
      batchWindowMs: 200,
      rateLimitWindowMs: 1000,
      maxGiftsPerUserPerWindow: 15,
    });
  });

  it('enqueues and dequeues batches up to maxEventsPerTick', () => {
    for (let i = 0; i < 5; i++) {
      queue.enqueue({
        id: `g_${i}`,
        giftId: 'rose',
        giftName: 'Rose',
        senderId: `user_${i}`,
        senderUsername: `User_${i}`,
        repeatCount: 1,
        timestamp: Date.now(),
      });
    }

    expect(queue.getQueueLength()).toBe(5);

    const batch1 = queue.processBatch();
    expect(batch1.length).toBe(3);
    expect(queue.getQueueLength()).toBe(2);

    const batch2 = queue.processBatch();
    expect(batch2.length).toBe(2);
    expect(queue.getQueueLength()).toBe(0);
  });

  it('batches identical gifts from the same user within the batch window', () => {
    queue.enqueue({
      id: 'g1',
      giftId: 'rose',
      giftName: 'Rose',
      senderId: 'spammer_1',
      senderUsername: 'Spammer',
      repeatCount: 2,
      timestamp: Date.now(),
    });

    queue.enqueue({
      id: 'g2',
      giftId: 'rose',
      giftName: 'Rose',
      senderId: 'spammer_1',
      senderUsername: 'Spammer',
      repeatCount: 3,
      timestamp: Date.now() + 50,
    });

    // Should be batched into a single queued item with repeatCount = 5
    expect(queue.getQueueLength()).toBe(1);
    const batch = queue.processBatch();
    expect(batch[0].repeatCount).toBe(5);
  });

  it('safely handles 100 rapid spam gifts by batching into repeatCount without queue explosion', () => {
    for (let i = 0; i < 100; i++) {
      queue.enqueue({
        id: `spam_${i}`,
        giftId: 'rose',
        giftName: 'Rose',
        senderId: 'spammer_99',
        senderUsername: 'Spammer99',
        repeatCount: 1,
        timestamp: Date.now(),
      });
    }

    // Queue length should not explode; all 100 should be compressed into 1 item
    expect(queue.getQueueLength()).toBe(1);
    const item = queue.processBatch()[0];
    expect(item.repeatCount).toBe(100);
  });

  it('drops events and increments droppedCount when queue reaches maxQueueLength', () => {
    // 70 distinct users send gifts into queue with capacity 50
    for (let i = 0; i < 70; i++) {
      queue.enqueue({
        id: `user_spam_${i}`,
        giftId: `gift_${i}`,
        giftName: `Gift_${i}`,
        senderId: `user_${i}`,
        senderUsername: `User_${i}`,
        repeatCount: 1,
        timestamp: Date.now(),
      });
    }

    expect(queue.getQueueLength()).toBe(50);
    expect(queue.getDroppedCount()).toBe(20);
  });
});
