import { describe, it, expect } from 'vitest';
import { SnakeAI } from '../apps/server/src/game/ai/SnakeAI';
import { DEFAULT_AI_CONFIG, SnakeState, Food, Obstacle, Enemy, Hazard } from '@snake-live/shared';

describe('Autonomous Snake AI', () => {
  const ai = new SnakeAI(12345);
  const gridWidth = 20;
  const gridHeight = 20;

  it('avoids turning directly backwards into its own body', () => {
    const snake: SnakeState = {
      body: [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 },
      ],
      direction: 'UP',
      nextDirection: 'UP',
      speed: 1.0,
      length: 3,
      isAlive: true,
      invulnerableUntil: 0,
    };

    const dir = ai.decideDirection({
      snake,
      food: [],
      obstacles: [],
      enemies: [],
      hazards: [],
      gridWidth,
      gridHeight,
      aiConfig: DEFAULT_AI_CONFIG,
    });

    expect(dir).not.toBe('DOWN');
  });

  it('avoids hitting walls when facing the boundary', () => {
    const snake: SnakeState = {
      body: [
        { x: 10, y: 0 }, // At top wall
        { x: 10, y: 1 },
        { x: 10, y: 2 },
      ],
      direction: 'UP',
      nextDirection: 'UP',
      speed: 1.0,
      length: 3,
      isAlive: true,
      invulnerableUntil: 0,
    };

    const dir = ai.decideDirection({
      snake,
      food: [],
      obstacles: [],
      enemies: [],
      hazards: [],
      gridWidth,
      gridHeight,
      aiConfig: DEFAULT_AI_CONFIG,
    });

    expect(dir).not.toBe('UP');
    expect(['LEFT', 'RIGHT']).toContain(dir);
  });

  it('avoids direct obstacles placed in its line of sight', () => {
    const snake: SnakeState = {
      body: [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 },
      ],
      direction: 'UP',
      nextDirection: 'UP',
      speed: 1.0,
      length: 3,
      isAlive: true,
      invulnerableUntil: 0,
    };

    const obstacles: Obstacle[] = [
      { id: 'obs1', position: { x: 10, y: 9 }, size: 1, createdAt: Date.now() },
    ];

    const dir = ai.decideDirection({
      snake,
      food: [],
      obstacles,
      enemies: [],
      hazards: [],
      gridWidth,
      gridHeight,
      aiConfig: DEFAULT_AI_CONFIG,
    });

    expect(dir).not.toBe('UP');
  });

  it('seeks out food when available and safe', () => {
    const snake: SnakeState = {
      body: [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 },
      ],
      direction: 'UP',
      nextDirection: 'UP',
      speed: 1.0,
      length: 3,
      isAlive: true,
      invulnerableUntil: 0,
    };

    // Food placed directly above snake
    const food: Food[] = [
      { id: 'f1', position: { x: 10, y: 8 }, points: 10, type: 'NORMAL_FOOD', spawnedAt: Date.now() },
    ];

    const dir = ai.decideDirection({
      snake,
      food,
      obstacles: [],
      enemies: [],
      hazards: [],
      gridWidth,
      gridHeight,
      aiConfig: DEFAULT_AI_CONFIG,
    });

    expect(dir).toBe('UP');
  });

  it('avoids walking into an active hunter enemy', () => {
    const snake: SnakeState = {
      body: [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 },
      ],
      direction: 'UP',
      nextDirection: 'UP',
      speed: 1.0,
      length: 3,
      isAlive: true,
      invulnerableUntil: 0,
    };

    const enemies: Enemy[] = [
      {
        id: 'lion1',
        type: 'HUNTER',
        name: 'Lion',
        position: { x: 10, y: 9 },
        speed: 1,
        createdAt: Date.now(),
        expiresAt: Date.now() + 10000,
      },
    ];

    const dir = ai.decideDirection({
      snake,
      food: [],
      obstacles: [],
      enemies,
      hazards: [],
      gridWidth,
      gridHeight,
      aiConfig: DEFAULT_AI_CONFIG,
    });

    expect(dir).not.toBe('UP');
  });
});
