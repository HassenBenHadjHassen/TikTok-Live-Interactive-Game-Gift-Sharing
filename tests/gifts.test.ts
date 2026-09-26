import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../apps/server/src/game/GameEngine';
import { EventBus } from '../apps/server/src/events/EventBus';
import { EventQueue } from '../apps/server/src/events/EventQueue';
import { findGiftDefinition } from '@snake-live/gift-config';

describe('Viewer Gift Mechanics & Configuration', () => {
  let eventBus: EventBus;
  let eventQueue: EventQueue;
  let engine: GameEngine;

  beforeEach(() => {
    eventBus = new EventBus();
    eventQueue = new EventQueue();
    engine = new GameEngine(eventBus, eventQueue);
    engine.resetGame();
  });

  it('correctly maps gift definitions and aliases', () => {
    expect(findGiftDefinition('Rose')?.action).toBe('ADD_OBSTACLE');
    expect(findGiftDefinition('rose')?.action).toBe('ADD_OBSTACLE');
    expect(findGiftDefinition('Heart')?.action).toBe('INCREASE_SPEED');
    expect(findGiftDefinition('tiger')?.action).toBe('SPAWN_BOMB');
    expect(findGiftDefinition('lion')?.action).toBe('SPAWN_CHASER');
    expect(findGiftDefinition('Universe')?.action).toBe('APOCALYPSE');
    expect(findGiftDefinition('non_existent_gift')).toBeUndefined();
  });

  it('Rose spawns an obstacle attributed to the sender', () => {
    const initialObs = engine.getState().obstacles.length;
    engine.applyGift({
      id: 'g1',
      giftId: 'rose',
      giftName: 'Rose',
      senderId: 'u1',
      senderUsername: 'Alice',
      repeatCount: 1,
      timestamp: Date.now(),
    });

    const state = engine.getState();
    expect(state.obstacles.length).toBe(initialObs + 1);
    const spawnedObs = state.obstacles[state.obstacles.length - 1];
    expect(spawnedObs.createdBy).toBe('Alice');
  });

  it('Heart increases snake speed but caps at maxSpeedMultiplier', () => {
    const initialSpeed = engine.getState().snake.speed;
    engine.applyGift({
      id: 'g2',
      giftId: 'heart',
      giftName: 'Heart',
      senderId: 'u2',
      senderUsername: 'Bob',
      repeatCount: 1,
      timestamp: Date.now(),
    });

    expect(engine.getState().snake.speed).toBeGreaterThan(initialSpeed);

    // Apply many hearts
    for (let i = 0; i < 20; i++) {
      engine.applyGift({
        id: `g_bulk_${i}`,
        giftId: 'heart',
        giftName: 'Heart',
        senderId: 'u2',
        senderUsername: 'Bob',
        repeatCount: 5,
        timestamp: Date.now(),
      });
    }

    expect(engine.getState().snake.speed).toBeLessThanOrEqual(
      engine.getConfig().maxSpeedMultiplier
    );
  });

  it('Tiger spawns countdown bombs', () => {
    const initialHazards = engine.getState().hazards.length;
    engine.applyGift({
      id: 'g3',
      giftId: 'tiger',
      giftName: 'Tiger',
      senderId: 'u3',
      senderUsername: 'Charlie',
      repeatCount: 1,
      timestamp: Date.now(),
    });

    const bombs = engine.getState().hazards.filter((h) => h.type === 'BOMB');
    expect(bombs.length).toBeGreaterThan(initialHazards);
    expect(bombs[0].createdBy).toBe('Charlie');
  });

  it('Lion spawns a hunter enemy', () => {
    const initialEnemies = engine.getState().enemies.length;
    engine.applyGift({
      id: 'g4',
      giftId: 'lion',
      giftName: 'Lion',
      senderId: 'u4',
      senderUsername: 'Diana',
      repeatCount: 1,
      timestamp: Date.now(),
    });

    expect(engine.getState().enemies.length).toBe(initialEnemies + 1);
    expect(engine.getState().enemies[0].createdBy).toBe('Diana');
  });

  it('Universe triggers APOCALYPSE phase', () => {
    engine.applyGift({
      id: 'g5',
      giftId: 'universe',
      giftName: 'Universe',
      senderId: 'u5',
      senderUsername: 'WhaleViewer',
      repeatCount: 1,
      timestamp: Date.now(),
    });

    engine.tick();
    expect(engine.getState().status).toBe('APOCALYPSE');
    expect(engine.getState().dangerLevel).toBe(100);
  });
});
