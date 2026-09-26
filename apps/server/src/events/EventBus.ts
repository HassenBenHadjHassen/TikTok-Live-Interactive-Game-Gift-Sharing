import { EventEmitter } from 'events';
import {
  GiftEvent,
  EffectEvent,
  GameState,
  DeathInfo,
  LeaderboardEntry,
  LikeEvent,
  FollowEvent,
  ShareEvent,
} from '@snake-live/shared';

export interface EventBusMap {
  gift: (event: GiftEvent) => void;
  like: (event: LikeEvent) => void;
  follow: (event: FollowEvent) => void;
  share: (event: ShareEvent) => void;
  effect: (event: EffectEvent) => void;
  death: (info: DeathInfo) => void;
  stateChanged: (state: GameState) => void;
  leaderboardUpdated: (leaderboard: LeaderboardEntry[]) => void;
}

export class EventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  on<K extends keyof EventBusMap>(event: K, listener: EventBusMap[K]): this {
    this.emitter.on(event, listener as (...args: any[]) => void);
    return this;
  }

  off<K extends keyof EventBusMap>(event: K, listener: EventBusMap[K]): this {
    this.emitter.off(event, listener as (...args: any[]) => void);
    return this;
  }

  emit<K extends keyof EventBusMap>(event: K, ...args: Parameters<EventBusMap[K]>): boolean {
    return this.emitter.emit(event, ...args);
  }

  removeAllListeners(): void {
    this.emitter.removeAllListeners();
  }
}
