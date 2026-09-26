import { GameConfig, SnakeAIConfig } from '../types';

export const CANVAS_VIRTUAL_WIDTH = 1080;
export const CANVAS_VIRTUAL_HEIGHT = 1920;

export const DEFAULT_AI_CONFIG: SnakeAIConfig = {
  foodPriority: 1.0,
  survivalPriority: 2.5,
  explorationPriority: 0.8,
  dangerAvoidance: 3.0,
  lookaheadSteps: 12,
};

export const DEFAULT_GAME_CONFIG: GameConfig = {
  gridWidth: 27,
  gridHeight: 36,
  baseTickRate: 10, // 10 ticks per second initially
  maxSpeedMultiplier: 2.5,
  initialSnakeLength: 5,
  autoRestartDelayMs: 6000,
  apocalypseDurationMs: 15000,
  maxObstacles: 50,
  maxEnemies: 4,
  maxHazards: 12,
  aiConfig: DEFAULT_AI_CONFIG,
};

export const DANGER_THRESHOLDS = {
  PLAYING: 0,
  DANGER: 40,
  CHAOS: 70,
  APOCALYPSE: 95,
};

export const GAME_PHASES = [
  'LOBBY',
  'STARTING',
  'PLAYING',
  'DANGER',
  'CHAOS',
  'APOCALYPSE',
  'DEAD',
  'RESULTS',
  'RESTARTING',
] as const;

export const SOUND_NAMES = {
  GIFT: 'gift',
  OBSTACLE: 'obstacle',
  BOMB: 'bomb',
  EXPLOSION: 'explosion',
  LION: 'lion',
  UNIVERSE: 'universe',
  DEATH: 'death',
  EAT: 'eat',
  SPEED_UP: 'speed_up',
} as const;
