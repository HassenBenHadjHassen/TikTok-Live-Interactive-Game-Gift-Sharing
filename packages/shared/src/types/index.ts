export interface Point {
  x: number;
  y: number;
}

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type GameStatus =
  | 'LOBBY'
  | 'STARTING'
  | 'PLAYING'
  | 'DANGER'
  | 'CHAOS'
  | 'APOCALYPSE'
  | 'DEAD'
  | 'RESULTS'
  | 'RESTARTING';

export interface SnakeState {
  body: Point[];
  direction: Direction;
  nextDirection: Direction;
  speed: number; // ticks per second or movement multiplier
  length: number;
  isAlive: boolean;
  invulnerableUntil: number;
}

export type FoodType = 'NORMAL_FOOD' | 'GOLDEN_FOOD' | 'DANGEROUS_FOOD';

export interface Food {
  id: string;
  position: Point;
  type: FoodType;
  points: number;
  spawnedAt: number;
  duration?: number;
}

export interface Obstacle {
  id: string;
  position: Point;
  size: number;
  createdBy?: string;
  createdAt: number;
  health?: number;
}

export type EnemyType = 'HUNTER' | 'PATROL' | 'INTERCEPTOR';

export interface Enemy {
  id: string;
  type: EnemyType;
  position: Point;
  targetPosition?: Point;
  speed: number;
  createdBy?: string;
  createdAt: number;
  expiresAt: number;
  name: string;
}

export type HazardType = 'BOMB' | 'FIRE_ZONE' | 'ACID_POOL' | 'METEOR';

export interface Hazard {
  id: string;
  type: HazardType;
  position: Point;
  radius: number;
  createdBy?: string;
  createdAt: number;
  countdown?: number; // In ticks or milliseconds
  duration: number;
  isArming?: boolean;
  isExploding?: boolean;
}

export interface ActiveEffect {
  id: string;
  name: string;
  type: string;
  startedAt: number;
  duration: number;
  intensity: number;
  senderUsername?: string;
}

export type DeathCause =
  | 'WALL'
  | 'SELF'
  | 'OBSTACLE'
  | 'BOMB'
  | 'ENEMY'
  | 'HAZARD';

export interface DeathInfo {
  cause: DeathCause;
  killerUsername?: string;
  killerGift?: string;
  killerEntityId?: string;
  position: Point;
  survivalTime: number; // in seconds
  score: number;
  timestamp: number;
  finalContributors: string[];
  isAmbiguous: boolean;
}

export interface PlayerContribution {
  username: string;
  userId: string;
  avatarUrl?: string;
  totalGifts: number;
  dangerScore: number;
  obstaclesCreated: number;
  hazardsCreated: number;
  enemiesSpawned: number;
  kills: number;
  lastActive: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  userId: string;
  avatarUrl?: string;
  kills: number;
  dangerScore: number;
  giftsCount: number;
}

export interface SnakeAIConfig {
  foodPriority: number;
  survivalPriority: number;
  explorationPriority: number;
  dangerAvoidance: number;
  lookaheadSteps: number;
}

export interface GameConfig {
  gridWidth: number;
  gridHeight: number;
  baseTickRate: number;
  maxSpeedMultiplier: number;
  initialSnakeLength: number;
  autoRestartDelayMs: number;
  apocalypseDurationMs: number;
  maxObstacles: number;
  maxEnemies: number;
  maxHazards: number;
  aiConfig: SnakeAIConfig;
}

export interface GameState {
  status: GameStatus;
  tick: number;
  snake: SnakeState;
  food: Food[];
  obstacles: Obstacle[];
  enemies: Enemy[];
  hazards: Hazard[];
  score: number;
  highScore: number;
  survivalTime: number; // in seconds
  difficulty: number;
  dangerLevel: number; // 0 to 100 percentage
  activeEffects: ActiveEffect[];
  lastDeath?: DeathInfo;
  leaderboard: LeaderboardEntry[];
  recentGifts: import('../events').GiftEvent[];
  timeInCurrentStatus: number;
}
