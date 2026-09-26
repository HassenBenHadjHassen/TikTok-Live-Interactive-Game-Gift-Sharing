import { LiveEventProvider } from './LiveEventProvider';
import { GiftEvent, LikeEvent, FollowEvent, ShareEvent } from '@snake-live/shared';

export interface TikTokAdapterConfig {
  username: string;
  clientParams?: Record<string, any>;
  requestHeaders?: Record<string, any>;
}

export class TikTokLiveAdapter implements LiveEventProvider {
  private giftHandlers: ((event: GiftEvent) => void)[] = [];
  private likeHandlers: ((event: LikeEvent) => void)[] = [];
  private followHandlers: ((event: FollowEvent) => void)[] = [];
  private shareHandlers: ((event: ShareEvent) => void)[] = [];
  private tiktokConnection: any = null;
  private connected: boolean = false;

  constructor(private config: TikTokAdapterConfig) {}

  async connect(): Promise<void> {
    if (!this.config.username) {
      console.warn('[TikTokLiveAdapter] No username specified. Operating in disconnected state.');
      return;
    }

    try {
      // Dynamic import of tiktok-live-connector to ensure decoupled installation
      const tiktokModule = await import('tiktok-live-connector' as any);
      const WebcastPushConnection = tiktokModule.WebcastPushConnection;

      this.tiktokConnection = new WebcastPushConnection(this.config.username, {
        processInitialData: false,
        enableExtendedGiftInfo: true,
        ...this.config.clientParams,
      });

      this.tiktokConnection.on('gift', (data: any) => {
        this.handleRawGift(data);
      });

      this.tiktokConnection.on('like', (data: any) => {
        this.handleRawLike(data);
      });

      this.tiktokConnection.on('follow', (data: any) => {
        this.handleRawFollow(data);
      });

      this.tiktokConnection.on('share', (data: any) => {
        this.handleRawShare(data);
      });

      this.tiktokConnection.on('connected', () => {
        this.connected = true;
        console.log(`[TikTokLiveAdapter] Connected to TikTok LIVE room: @${this.config.username}`);
      });

      this.tiktokConnection.on('disconnected', () => {
        this.connected = false;
        console.warn(`[TikTokLiveAdapter] Disconnected from TikTok LIVE room`);
      });

      this.tiktokConnection.on('error', (err: any) => {
        console.error(`[TikTokLiveAdapter] TikTok Connection error:`, err?.message || err);
      });

      await this.tiktokConnection.connect();
    } catch (err: any) {
      console.error(
        `[TikTokLiveAdapter] Could not connect to TikTok LIVE: ${err.message}. If tiktok-live-connector is not installed, use TIKTOK_PROVIDER=mock.`
      );
      this.connected = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.tiktokConnection && this.connected) {
      try {
        await this.tiktokConnection.disconnect();
      } catch (err) {
        console.error('[TikTokLiveAdapter] Error while disconnecting:', err);
      }
    }
    this.connected = false;
  }

  onGift(handler: (event: GiftEvent) => void): void {
    this.giftHandlers.push(handler);
  }

  onLike(handler: (event: LikeEvent) => void): void {
    this.likeHandlers.push(handler);
  }

  onFollow(handler: (event: FollowEvent) => void): void {
    this.followHandlers.push(handler);
  }

  onShare(handler: (event: ShareEvent) => void): void {
    this.shareHandlers.push(handler);
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Normalize and sanitize raw TikTok gift payload
   */
  private handleRawGift(data: any): void {
    if (!data) return;

    // Sanitize & validate fields to adhere to Security requirements (Section 34)
    const rawGiftName = String(data.giftName || data.gift?.name || 'Gift').trim();
    const rawUsername = String(
      data.uniqueId || data.nickname || data.user?.uniqueId || 'Anonymous'
    )
      .replace(/[^a-zA-Z0-9_.-]/g, '')
      .substring(0, 32);

    const senderId = String(data.userId || data.user?.userId || rawUsername);
    const repeatCount = Math.max(1, Math.min(1000, Number(data.repeatCount || 1)));
    const giftId = String(data.giftId || rawGiftName);

    const normalizedGift: GiftEvent = {
      id: `tt_${data.msgId || Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      giftId,
      giftName: rawGiftName,
      senderId,
      senderUsername: rawUsername || 'Viewer',
      senderAvatar: data.profilePictureUrl || undefined,
      repeatCount,
      diamondCount: Number(data.diamondCount || 0),
      timestamp: Date.now(),
    };

    for (const handler of this.giftHandlers) {
      handler(normalizedGift);
    }
  }

  private handleRawLike(data: any): void {
    if (!data) return;
    const rawUsername = String(data.uniqueId || 'Viewer').substring(0, 32);
    const likeEvent: LikeEvent = {
      senderId: String(data.userId || rawUsername),
      senderUsername: rawUsername,
      likeCount: Number(data.likeCount || 1),
      totalLikes: Number(data.totalLikes || 0),
      timestamp: Date.now(),
    };
    for (const handler of this.likeHandlers) {
      handler(likeEvent);
    }
  }

  private handleRawFollow(data: any): void {
    if (!data) return;
    const rawUsername = String(data.uniqueId || 'Viewer').substring(0, 32);
    const followEvent: FollowEvent = {
      senderId: String(data.userId || rawUsername),
      senderUsername: rawUsername,
      timestamp: Date.now(),
    };
    for (const handler of this.followHandlers) {
      handler(followEvent);
    }
  }

  private handleRawShare(data: any): void {
    if (!data) return;
    const rawUsername = String(data.uniqueId || 'Viewer').substring(0, 32);
    const shareEvent: ShareEvent = {
      senderId: String(data.userId || rawUsername),
      senderUsername: rawUsername,
      timestamp: Date.now(),
    };
    for (const handler of this.shareHandlers) {
      handler(shareEvent);
    }
  }
}
