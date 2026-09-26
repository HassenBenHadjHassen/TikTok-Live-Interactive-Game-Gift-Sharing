import { LiveEventProvider } from './LiveEventProvider';
import { GiftEvent } from '@snake-live/shared';

export class MockLiveProvider implements LiveEventProvider {
  private giftHandlers: ((event: GiftEvent) => void)[] = [];
  private connected: boolean = false;
  private autoSimInterval: NodeJS.Timeout | null = null;

  async connect(): Promise<void> {
    this.connected = true;
    console.log('[MockLiveProvider] Connected in Simulation Mode');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    if (this.autoSimInterval) {
      clearInterval(this.autoSimInterval);
      this.autoSimInterval = null;
    }
    console.log('[MockLiveProvider] Disconnected');
  }

  onGift(handler: (event: GiftEvent) => void): void {
    this.giftHandlers.push(handler);
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Manually trigger a simulated gift (called by Dev API or UI)
   */
  simulateGift(
    giftName: string,
    username: string = 'Viewer_' + Math.floor(Math.random() * 1000),
    repeatCount: number = 1
  ): GiftEvent {
    const giftEvent: GiftEvent = {
      id: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      giftId: giftName.toLowerCase(),
      giftName,
      senderId: `user_${username.toLowerCase()}`,
      senderUsername: username,
      repeatCount,
      timestamp: Date.now(),
    };

    for (const handler of this.giftHandlers) {
      handler(giftEvent);
    }

    return giftEvent;
  }

  /**
   * Start or stop automatic background gift simulation for testing
   */
  startAutoSimulation(intervalMs: number = 4000): void {
    if (this.autoSimInterval) clearInterval(this.autoSimInterval);

    const gifts = ['Rose', 'Rose', 'Heart', 'Rose', 'Gift', 'Tiger', 'Lion'];
    const users = ['Alex', 'Sarah', 'Mohamed', 'Jordan', 'PixelKing', 'GamerX', 'SnakeBane'];

    this.autoSimInterval = setInterval(() => {
      if (!this.connected) return;
      const gift = gifts[Math.floor(Math.random() * gifts.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      const repeat = Math.random() < 0.2 ? Math.floor(Math.random() * 5) + 1 : 1;
      this.simulateGift(gift, user, repeat);
    }, intervalMs);
  }

  stopAutoSimulation(): void {
    if (this.autoSimInterval) {
      clearInterval(this.autoSimInterval);
      this.autoSimInterval = null;
    }
  }
}
