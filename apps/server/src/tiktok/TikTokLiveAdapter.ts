import { LiveEventProvider } from './LiveEventProvider';
import { GiftEvent, LikeEvent, FollowEvent, ShareEvent } from '@snake-live/shared';

export interface TikTokAdapterConfig {
  username: string;
  signApiKey?: string;
  clientParams?: Record<string, any>;
  requestHeaders?: Record<string, any>;
}

export class TikTokLiveAdapter implements LiveEventProvider {
  private giftHandlers: ((event: GiftEvent) => void)[] = [];
  private likeHandlers: ((event: LikeEvent) => void)[] = [];
  private followHandlers: ((event: FollowEvent) => void)[] = [];
  private shareHandlers: ((event: ShareEvent) => void)[] = [];
  private chatHandlers: ((data: { username: string; comment: string }) => void)[] = [];

  private tiktokConnection: any = null;
  private connected: boolean = false;
  private currentUsername: string = '';
  private currentRoomId: string | null = null;
  private roomInfo: any = null;
  private streakMap: Map<string, number> = new Map();

  constructor(private config: TikTokAdapterConfig) {
    this.currentUsername = this.cleanUsername(config.username);
  }

  /**
   * Cleans input username (handles @, URLs, trailing slashes)
   */
  private cleanUsername(raw: string): string {
    if (!raw) return '';
    let name = raw.trim();
    if (name.includes('tiktok.com/@')) {
      const match = name.match(/@([^/?#]+)/);
      if (match) name = match[1];
    }
    return name.replace(/^@/, '').trim();
  }

  async connect(): Promise<void> {
    if (!this.currentUsername) {
      console.warn('[TikTokLiveAdapter] No TikTok username specified. Running in disconnected state.');
      return;
    }

    try {
      console.log(`[TikTokLiveAdapter] Connecting to TikTok LIVE stream: @${this.currentUsername}...`);

      // Dynamic import of modern tiktok-live-connector
      const { TikTokLiveConnection, WebcastEvent, ControlEvent } = await import('tiktok-live-connector');

      const options: any = {
        processInitialData: false,
        enableExtendedGiftInfo: true,
        webClientOptions: {
          timeout: { request: 12000 },
        },
        ...this.config.clientParams,
      };

      if (this.config.signApiKey) {
        options.signApiKey = this.config.signApiKey;
      }

      this.tiktokConnection = new TikTokLiveConnection(this.currentUsername, options);

      // 1. Connection Lifecycle Events
      this.tiktokConnection.on(ControlEvent.CONNECTED, (state: any) => {
        this.connected = true;
        this.currentRoomId = state.roomId || null;
        this.roomInfo = state.roomInfo || null;
        console.log(`[TikTokLiveAdapter] ✅ Connected to TikTok LIVE room: @${this.currentUsername} (Room ID: ${state.roomId})`);
      });

      this.tiktokConnection.on(ControlEvent.DISCONNECTED, (data: any) => {
        this.connected = false;
        console.warn(`[TikTokLiveAdapter] ⚠️ Disconnected from TikTok LIVE room (@${this.currentUsername})`, data?.reason || '');
      });

      this.tiktokConnection.on(ControlEvent.ERROR, ({ info, exception }: any) => {
        console.error(`[TikTokLiveAdapter] Error (${info}):`, exception?.message || exception);
      });

      // 2. Stream Gifts with Streak / Incremental Delta Processing
      this.tiktokConnection.on(WebcastEvent.GIFT, (data: any) => {
        this.handleRawGift(data);
      });

      // 3. Viewer Likes
      this.tiktokConnection.on(WebcastEvent.LIKE, (data: any) => {
        this.handleRawLike(data);
      });

      // 4. Viewer Follows
      this.tiktokConnection.on(WebcastEvent.FOLLOW, (data: any) => {
        this.handleRawFollow(data);
      });

      // 5. Viewer Shares
      this.tiktokConnection.on(WebcastEvent.SHARE, (data: any) => {
        this.handleRawShare(data);
      });

      // 6. Viewer Comments (Chat)
      this.tiktokConnection.on(WebcastEvent.CHAT, (data: any) => {
        const username = data.user?.uniqueId || data.user?.nickname || 'Viewer';
        const comment = data.comment || '';
        for (const handler of this.chatHandlers) {
          handler({ username, comment });
        }
      });

      // 7. Room Stats & Viewers
      this.tiktokConnection.on(WebcastEvent.ROOM_USER, (data: any) => {
        if (data.viewerCount !== undefined) {
          // Track live viewer count if needed
        }
      });

      await this.tiktokConnection.connect();
    } catch (err: any) {
      this.connected = false;
      console.error(
        `[TikTokLiveAdapter] Could not connect to TikTok LIVE for @${this.currentUsername}: ${err?.message || err}. (Streamer may be offline).`
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.tiktokConnection) {
      try {
        await this.tiktokConnection.disconnect();
      } catch (err) {
        console.error('[TikTokLiveAdapter] Error while disconnecting:', err);
      }
      this.tiktokConnection = null;
    }
    this.connected = false;
    this.streakMap.clear();
  }

  /**
   * Switch live stream connection to a new streamer username at runtime
   */
  async switchUser(newUsername: string): Promise<boolean> {
    const cleaned = this.cleanUsername(newUsername);
    if (!cleaned) return false;
    await this.disconnect();
    this.currentUsername = cleaned;
    await this.connect();
    return this.connected;
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

  onChat(handler: (data: { username: string; comment: string }) => void): void {
    this.chatHandlers.push(handler);
  }

  isConnected(): boolean {
    return this.connected;
  }

  getRoomId(): string | null {
    return this.currentRoomId;
  }

  getRoomInfo(): any {
    return this.roomInfo;
  }

  getUsername(): string {
    return this.currentUsername;
  }

  /**
   * Normalize and sanitize raw TikTok gift payload with streak combo delta tracking.
   * This ensures viewers get immediate validation on EVERY screen tap during a combo.
   */
  private handleRawGift(data: any): void {
    if (!data) return;

    const giftDetails = data.giftDetails || data.extendedGiftInfo || {};
    const rawGiftName = String(
      giftDetails.giftName || data.giftName || data.gift?.name || 'Gift'
    ).trim();

    const rawUsername = String(
      data.user?.uniqueId || data.user?.nickname || data.uniqueId || data.nickname || 'Viewer'
    )
      .replace(/[^a-zA-Z0-9_.-]/g, '')
      .substring(0, 32);

    const senderId = String(data.user?.userId || data.userId || rawUsername);
    const senderAvatar = data.user?.profilePictureUrl || data.profilePictureUrl || undefined;
    const diamondCount = Number(giftDetails.diamondCount || data.diamondCount || 0);
    const giftId = String(data.giftId || rawGiftName);
    const repeatCount = Math.max(1, Number(data.repeatCount || 1));
    const giftType = Number(giftDetails.giftType ?? data.giftType ?? 0);
    const repeatEnd = Boolean(data.repeatEnd);

    // Calculate incremental delta during combo streaks (giftType === 1)
    let countToProcess = repeatCount;
    if (giftType === 1) {
      const streakKey = `${senderId}_${giftId}_${data.groupId || ''}`;
      const prevCount = this.streakMap.get(streakKey) || 0;
      countToProcess = Math.max(1, repeatCount - prevCount);

      if (repeatEnd) {
        this.streakMap.delete(streakKey);
      } else {
        this.streakMap.set(streakKey, repeatCount);
      }
    }

    const normalizedGift: GiftEvent = {
      id: `tt_${data.msgId || Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      giftId,
      giftName: rawGiftName,
      senderId,
      senderUsername: rawUsername || 'Viewer',
      senderAvatar,
      repeatCount: countToProcess,
      diamondCount,
      timestamp: Date.now(),
    };

    for (const handler of this.giftHandlers) {
      handler(normalizedGift);
    }
  }

  private handleRawLike(data: any): void {
    if (!data) return;
    const rawUsername = String(
      data.user?.uniqueId || data.user?.nickname || data.uniqueId || 'Viewer'
    ).substring(0, 32);

    const likeEvent: LikeEvent = {
      senderId: String(data.user?.userId || data.userId || rawUsername),
      senderUsername: rawUsername,
      likeCount: Number(data.likeCount || 1),
      totalLikes: Number(data.totalLikes || data.totalLikeCount || 0),
      timestamp: Date.now(),
    };

    for (const handler of this.likeHandlers) {
      handler(likeEvent);
    }
  }

  private handleRawFollow(data: any): void {
    if (!data) return;
    const rawUsername = String(
      data.user?.uniqueId || data.user?.nickname || data.uniqueId || 'Viewer'
    ).substring(0, 32);

    const followEvent: FollowEvent = {
      senderId: String(data.user?.userId || data.userId || rawUsername),
      senderUsername: rawUsername,
      timestamp: Date.now(),
    };

    for (const handler of this.followHandlers) {
      handler(followEvent);
    }
  }

  private handleRawShare(data: any): void {
    if (!data) return;
    const rawUsername = String(
      data.user?.uniqueId || data.user?.nickname || data.uniqueId || 'Viewer'
    ).substring(0, 32);

    const shareEvent: ShareEvent = {
      senderId: String(data.user?.userId || data.userId || rawUsername),
      senderUsername: rawUsername,
      timestamp: Date.now(),
    };

    for (const handler of this.shareHandlers) {
      handler(shareEvent);
    }
  }
}
