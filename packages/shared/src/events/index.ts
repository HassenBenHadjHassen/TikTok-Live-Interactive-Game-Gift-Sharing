import { GameState, DeathInfo, Point } from '../types';

export interface GiftEvent {
  id: string;
  giftId: string;
  giftName: string;
  senderId: string;
  senderUsername: string;
  senderAvatar?: string;
  repeatCount: number;
  diamondCount?: number;
  timestamp: number;
}

export interface LikeEvent {
  senderId: string;
  senderUsername: string;
  likeCount: number;
  totalLikes: number;
  timestamp: number;
}

export interface FollowEvent {
  senderId: string;
  senderUsername: string;
  timestamp: number;
}

export interface ShareEvent {
  senderId: string;
  senderUsername: string;
  timestamp: number;
}

export type SoundType =
  | 'GIFT'
  | 'OBSTACLE'
  | 'BOMB'
  | 'EXPLOSION'
  | 'LION'
  | 'UNIVERSE'
  | 'DEATH'
  | 'EAT'
  | 'SPEED_UP';

export interface EffectEvent {
  id: string;
  type: 'EXPLOSION' | 'SHAKE' | 'ALERT' | 'SPAWN' | 'APOCALYPSE' | 'DEATH';
  position?: Point;
  intensity: number;
  duration: number; // in ms
  message?: string;
  sound?: SoundType;
  timestamp: number;
}

export type ServerMessage =
  | {
      type: 'GAME_STATE';
      state: GameState;
    }
  | {
      type: 'GIFT_EVENT';
      gift: GiftEvent;
    }
  | {
      type: 'EFFECT';
      effect: EffectEvent;
    }
  | {
      type: 'DEATH';
      death: DeathInfo;
    }
  | {
      type: 'PONG';
      timestamp: number;
    };

export type ClientMessage =
  | {
      type: 'PING';
      timestamp: number;
    }
  | {
      type: 'DEV_SIMULATE_GIFT';
      giftName: string;
      username?: string;
      repeatCount?: number;
    }
  | {
      type: 'DEV_RESET_GAME';
    };
