import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../apps/server/src/game/GameEngine';
import { EventBus } from '../apps/server/src/events/EventBus';
import { EventQueue } from '../apps/server/src/events/EventQueue';
import { Point } from '@snake-live/shared';

describe('GameEngine Core Mechanics', () => {
  let eventBus: EventBus;
  let eventQueue: EventQueue;
  let engine: GameEngine;

  beforeEach(() => {
    eventBus = new EventBus();
    eventQueue = new EventQueue();
    engine = new GameEngine(eventBus, eventQueue, {
      gridWidth: 20,
      gridHeight: 20,
      baseTickRate: 100, // fast for testing
    });
    engine.resetGame();
  });

  it('initializes with a valid living snake in PLAYING status', () => {
    const state = engine.getState();
    expect(state.status).toBe('PLAYING');
    expect(state.snake.isAlive).toBe(true);
    expect(state.snake.body.length).toBe(5);
    expect(state.score).toBe(0);
    expect(state.food.length).toBeGreaterThan(0);
  });

  it('advances snake movement forward deterministically on tick', () => {
    const state = engine.getState();
    const initialHead = { ...state.snake.body[0] };
    engine.tick();
    const newHead = state.snake.body[0];
    expect(newHead.x !== initialHead.x || newHead.y !== initialHead.y).toBe(true);
  });

  it('detects obstacle collision and triggers death', () => {
    const state = engine.getState();
    const head = state.snake.body[0];
    const targetCell: Point = { x: head.x, y: head.y - 1 };

    // Place obstacle right ahead of snake
    engine.addObstacle({
      id: 'test_obs',
      position: targetCell,
      size: 1,
      createdBy: 'TestViewer',
      createdAt: Date.now(),
    });
    state.snake.direction = 'UP';

    engine.tick('UP');

    expect(engine.getState().snake.isAlive).toBe(false);
    expect(engine.getState().status).toBe('DEAD');
    expect(engine.getState().lastDeath?.cause).toBe('OBSTACLE');
    expect(engine.getState().lastDeath?.killerUsername).toBe('TestViewer');
  });

  it('detects wall collision and triggers death', () => {
    const state = engine.getState();
    // Move snake to top edge
    state.snake.body[0] = { x: 10, y: 0 };
    state.snake.direction = 'UP';

    engine.tick('UP');

    expect(engine.getState().snake.isAlive).toBe(false);
    expect(engine.getState().status).toBe('DEAD');
    expect(engine.getState().lastDeath?.cause).toBe('WALL');
  });

  it('detects enemy collision and attributes kill to enemy creator', () => {
    const state = engine.getState();
    const head = state.snake.body[0];
    const targetCell: Point = { x: head.x, y: head.y - 1 };

    engine.addEnemy({
      id: 'test_lion',
      type: 'HUNTER',
      name: 'Hunter',
      position: targetCell,
      speed: 1,
      createdBy: 'LionMaster',
      createdAt: Date.now(),
      expiresAt: Date.now() + 10000,
    });
    state.snake.direction = 'UP';

    engine.tick('UP');

    expect(engine.getState().snake.isAlive).toBe(false);
    expect(engine.getState().lastDeath?.cause).toBe('ENEMY');
    expect(engine.getState().lastDeath?.killerUsername).toBe('LionMaster');
  });

  it('auto-restarts cleanly when in RESULTS phase after timeout', () => {
    const state = engine.getState();
    state.snake.isAlive = false;
    state.status = 'RESULTS';
    state.timeInCurrentStatus = 7000; // exceeded autoRestartDelay

    engine.tick();

    expect(engine.getState().status).toBe('RESTARTING');
    engine.tick();
    expect(engine.getState().status).toBe('PLAYING');
    expect(engine.getState().snake.isAlive).toBe(true);
  });
});
