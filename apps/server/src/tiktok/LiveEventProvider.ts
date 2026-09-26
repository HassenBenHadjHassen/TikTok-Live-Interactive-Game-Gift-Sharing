import { GiftEvent, LikeEvent, FollowEvent, ShareEvent } from '@snake-live/shared';

export interface LiveEventProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onGift(handler: (event: GiftEvent) => void): void;
  onLike?(handler: (event: LikeEvent) => void): void;
  onFollow?(handler: (event: FollowEvent) => void): void;
  onShare?(handler: (event: ShareEvent) => void): void;
  isConnected(): boolean;
  getRoomId?(): string | null;
  switchUser?(username: string): Promise<boolean>;
}
