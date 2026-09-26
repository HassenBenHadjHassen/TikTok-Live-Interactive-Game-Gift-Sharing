import {
  GameState,
  GameStatus,
  SnakeState,
  Direction,
  Point,
  GameConfig,
  GiftEvent,
  EffectEvent,
  DeathCause,
  DeathInfo,
  Obstacle,
  Enemy,
} from '@snake-live/shared';
import {
  DEFAULT_GAME_CONFIG,
  isPointInBounds,
  isSamePoint,
  getNeighborPoint,
  DANGER_THRESHOLDS,
} from '@snake-live/shared';
import { findGiftDefinition } from '@snake-live/gift-config';
import { SnakeAI } from './ai/SnakeAI';
import { EntityManager } from './entities/EntityManager';
import { AttributionTracker } from './attribution/AttributionTracker';
import { LeaderboardManager } from './attribution/LeaderboardManager';
import { EventBus } from '../events/EventBus';
import { EventQueue } from '../events/EventQueue';

export class GameEngine {
  private state: GameState;
  private config: GameConfig;
  private ai: SnakeAI;
  private entityManager: EntityManager;
  private attributionTracker: AttributionTracker;
  private leaderboardManager: LeaderboardManager;
  private tickTimer: NodeJS.Timeout | null = null;
  private gameStartTime: number = 0;
  private statusStartTime: number = 0;
  private apocalypseEndTime: number = 0;

  constructor(
    private eventBus: EventBus,
    private eventQueue: EventQueue,
    customConfig?: Partial<GameConfig>
  ) {
    this.config = { ...DEFAULT_GAME_CONFIG, ...customConfig };
    this.ai = new SnakeAI();
    this.entityManager = new EntityManager(this.config);
    this.attributionTracker = new AttributionTracker();
    this.leaderboardManager = new LeaderboardManager(this.attributionTracker);

    this.state = this.createInitialState();
  }

  getState(): GameState {
    return this.state;
  }

  getConfig(): GameConfig {
    return this.config;
  }

  getAttributionTracker(): AttributionTracker {
    return this.attributionTracker;
  }

  getLeaderboardManager(): LeaderboardManager {
    return this.leaderboardManager;
  }

  addObstacle(obs: Obstacle): void {
    this.entityManager.addObstacle(obs);
    this.state.obstacles = this.entityManager.getObstacles();
  }

  addEnemy(enemy: Enemy): void {
    this.entityManager.addEnemy(enemy);
    this.state.enemies = this.entityManager.getEnemies();
  }

  start(): void {
    if (this.tickTimer) return;
    this.resetGame();
    this.scheduleNextTick();
  }

  stop(): void {
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }
  }

  /**
   * Main deterministic game tick
   */
  tick(forcedDirection?: Direction): void {
    this.state.tick++;
    const now = Date.now();
    this.state.timeInCurrentStatus = now - this.statusStartTime;

    // 1. Handle auto-restart transitions if dead
    if (this.state.status === 'DEAD') {
      if (this.state.timeInCurrentStatus >= 2000) {
        this.setStatus('RESULTS');
      }
      this.scheduleNextTick();
      return;
    }

    if (this.state.status === 'RESULTS') {
      if (this.state.timeInCurrentStatus >= this.config.autoRestartDelayMs) {
        this.setStatus('RESTARTING');
      }
      this.scheduleNextTick();
      return;
    }

    if (this.state.status === 'RESTARTING') {
      this.resetGame();
      this.setStatus('PLAYING');
      this.scheduleNextTick();
      return;
    }

    // Update survival time in seconds
    if (this.state.snake.isAlive) {
      this.state.survivalTime = Math.floor((now - this.gameStartTime) / 1000);
    }

    // 2. Process incoming viewer gifts from the anti-spam queue
    this.processQueuedGifts();

    // 3. Update dynamic hazards, ticking bombs, and hunter enemies
    const { explodedBombs } = this.entityManager.updateEntities(
      this.state.snake,
      this.state.tick
    );

    for (const bomb of explodedBombs) {
      this.eventBus.emit('effect', {
        id: `fx_exp_${Date.now()}_${Math.random()}`,
        type: 'EXPLOSION',
        position: bomb.position,
        intensity: 2.0,
        duration: 800,
        sound: 'EXPLOSION',
        message: 'BOOM!',
        timestamp: Date.now(),
      });
    }

    // 4. Update dynamic danger level and game status phases
    this.updateDangerAndPhases(now);

    // 5. Check if snake is dead due to hazard explosion
    if (this.checkHazardOrBombCollision(this.state.snake.body[0])) {
      return;
    }

    // 6. Movement decision (Forced for testing or AI evaluation)
    const nextDir =
      forcedDirection ||
      this.ai.decideDirection({
        snake: this.state.snake,
        food: this.entityManager.getFood(),
        obstacles: this.entityManager.getObstacles(),
        enemies: this.entityManager.getEnemies(),
        hazards: this.entityManager.getHazards(),
        gridWidth: this.config.gridWidth,
        gridHeight: this.config.gridHeight,
        aiConfig: this.config.aiConfig,
      });

    this.state.snake.nextDirection = nextDir;
    this.state.snake.direction = nextDir;

    // 7. Move snake forward
    this.moveSnake();

    // 8. Sync state collections
    this.state.food = this.entityManager.getFood();
    this.state.obstacles = this.entityManager.getObstacles();
    this.state.enemies = this.entityManager.getEnemies();
    this.state.hazards = this.entityManager.getHazards();
    this.state.leaderboard = this.leaderboardManager.getTopKillers(5);

    // 9. Emit state change to listeners
    this.eventBus.emit('stateChanged', this.state);

    this.scheduleNextTick();
  }

  /**
   * Reset game state for a new round
   */
  resetGame(): void {
    this.entityManager.clear();
    const centerX = Math.floor(this.config.gridWidth / 2);
    const centerY = Math.floor(this.config.gridHeight / 2);

    const initialBody: Point[] = [];
    for (let i = 0; i < this.config.initialSnakeLength; i++) {
      initialBody.push({ x: centerX, y: centerY + i });
    }

    this.state.snake = {
      body: initialBody,
      direction: 'UP',
      nextDirection: 'UP',
      speed: 1.0,
      length: initialBody.length,
      isAlive: true,
      invulnerableUntil: Date.now() + 1500, // 1.5s grace period
    };

    this.state.score = 0;
    this.state.survivalTime = 0;
    this.state.dangerLevel = 0;
    this.state.activeEffects = [];
    this.state.recentGifts = [];
    this.state.lastDeath = undefined;
    this.gameStartTime = Date.now();
    this.setStatus('PLAYING');

    // Spawn starting food
    this.entityManager.ensureFoodSupply(this.state.snake, 3);
    this.state.food = this.entityManager.getFood();
  }

  /**
   * Process batched gifts from EventQueue
   */
  private processQueuedGifts(): void {
    const batch = this.eventQueue.processBatch();
    for (const gift of batch) {
      this.applyGift(gift);
    }
  }

  /**
   * Apply a normalized gift to the game engine
   */
  applyGift(gift: GiftEvent): void {
    const def = findGiftDefinition(gift.giftName);
    if (!def) return;

    // Track attribution & leaderboard stats
    this.attributionTracker.recordGift(
      gift.senderUsername,
      gift.senderId,
      def.name,
      def.dangerContribution * gift.repeatCount
    );

    // Store in recent gifts for HUD
    this.state.recentGifts.unshift(gift);
    if (this.state.recentGifts.length > 8) {
      this.state.recentGifts.pop();
    }

    const { primaryCount, spawnHazards, speedBoost } = def.calculateEffectCount(
      gift.repeatCount
    );

    switch (def.action) {
      case 'ADD_OBSTACLE': {
        for (let i = 0; i < primaryCount; i++) {
          const obs = this.entityManager.spawnObstacle(
            this.state.snake,
            gift.senderUsername,
            3
          );
          if (obs) {
            this.attributionTracker.recordObstacle(gift.senderUsername, gift.senderId);
          }
        }
        if (spawnHazards) {
          for (let i = 0; i < spawnHazards; i++) {
            this.entityManager.spawnHazardZone(this.state.snake, 'ACID_POOL', gift.senderUsername);
            this.attributionTracker.recordHazard(gift.senderUsername, gift.senderId);
          }
        }
        this.eventBus.emit('effect', {
          id: `fx_obs_${Date.now()}`,
          type: 'SPAWN',
          intensity: 1.0,
          duration: 400,
          sound: 'OBSTACLE',
          message: def.formatDescription(gift.senderUsername, gift.repeatCount),
          timestamp: Date.now(),
        });
        break;
      }

      case 'INCREASE_SPEED': {
        const boost = speedBoost || 0.1;
        this.state.snake.speed = Math.min(
          this.config.maxSpeedMultiplier,
          this.state.snake.speed + boost
        );
        this.eventBus.emit('effect', {
          id: `fx_spd_${Date.now()}`,
          type: 'ALERT',
          intensity: 1.2,
          duration: 600,
          sound: 'SPEED_UP',
          message: def.formatDescription(gift.senderUsername, gift.repeatCount),
          timestamp: Date.now(),
        });
        break;
      }

      case 'REMOVE_FOOD': {
        this.entityManager.removeFood(primaryCount);
        if (spawnHazards) {
          this.entityManager.spawnHazardZone(this.state.snake, 'ACID_POOL', gift.senderUsername);
          this.attributionTracker.recordHazard(gift.senderUsername, gift.senderId);
        }
        this.eventBus.emit('effect', {
          id: `fx_food_${Date.now()}`,
          type: 'ALERT',
          intensity: 1.0,
          duration: 500,
          message: def.formatDescription(gift.senderUsername, gift.repeatCount),
          timestamp: Date.now(),
        });
        break;
      }

      case 'SPAWN_BOMB': {
        for (let i = 0; i < primaryCount; i++) {
          const bomb = this.entityManager.spawnBomb(this.state.snake, gift.senderUsername);
          if (bomb) {
            this.attributionTracker.recordHazard(gift.senderUsername, gift.senderId);
          }
        }
        this.eventBus.emit('effect', {
          id: `fx_bomb_${Date.now()}`,
          type: 'ALERT',
          intensity: 1.5,
          duration: 800,
          sound: 'BOMB',
          message: def.formatDescription(gift.senderUsername, gift.repeatCount),
          timestamp: Date.now(),
        });
        break;
      }

      case 'SPAWN_CHASER': {
        for (let i = 0; i < primaryCount; i++) {
          const chaser = this.entityManager.spawnChaser(this.state.snake, gift.senderUsername);
          if (chaser) {
            this.attributionTracker.recordEnemy(gift.senderUsername, gift.senderId);
          }
        }
        this.eventBus.emit('effect', {
          id: `fx_lion_${Date.now()}`,
          type: 'ALERT',
          intensity: 2.0,
          duration: 1200,
          sound: 'LION',
          message: def.formatDescription(gift.senderUsername, gift.repeatCount),
          timestamp: Date.now(),
        });
        break;
      }

      case 'APOCALYPSE': {
        this.apocalypseEndTime = Date.now() + this.config.apocalypseDurationMs;
        this.state.snake.speed = Math.min(
          this.config.maxSpeedMultiplier,
          this.state.snake.speed + 0.4
        );
        // Spawn cluster of obstacles and hazards
        for (let i = 0; i < 6; i++) {
          this.entityManager.spawnObstacle(this.state.snake, gift.senderUsername, 3);
          this.attributionTracker.recordObstacle(gift.senderUsername, gift.senderId);
        }
        for (let i = 0; i < 3; i++) {
          this.entityManager.spawnBomb(this.state.snake, gift.senderUsername);
          this.attributionTracker.recordHazard(gift.senderUsername, gift.senderId);
        }
        this.entityManager.spawnChaser(this.state.snake, gift.senderUsername);
        this.attributionTracker.recordEnemy(gift.senderUsername, gift.senderId);

        this.eventBus.emit('effect', {
          id: `fx_univ_${Date.now()}`,
          type: 'APOCALYPSE',
          intensity: 3.0,
          duration: 3000,
          sound: 'UNIVERSE',
          message: '🌌 UNIVERSE ACTIVATED: APOCALYPSE MODE!',
          timestamp: Date.now(),
        });
        break;
      }
    }

    // Sync active entities to state
    this.state.obstacles = this.entityManager.getObstacles();
    this.state.hazards = this.entityManager.getHazards();
    this.state.enemies = this.entityManager.getEnemies();
    this.state.food = this.entityManager.getFood();
  }

  /**
   * Move snake one grid step forward and check for collisions
   */
  private moveSnake(): void {
    const head = this.state.snake.body[0];
    const newHead = getNeighborPoint(head, this.state.snake.direction);

    // 1. Wall collision
    if (!isPointInBounds(newHead, this.config.gridWidth, this.config.gridHeight)) {
      this.handleDeath('WALL', newHead);
      return;
    }

    // 2. Self collision
    for (let i = 0; i < this.state.snake.body.length - 1; i++) {
      if (isSamePoint(newHead, this.state.snake.body[i])) {
        this.handleDeath('SELF', newHead);
        return;
      }
    }

    // 3. Obstacle collision
    const hitObstacle = this.entityManager
      .getObstacles()
      .find((obs) => isSamePoint(obs.position, newHead));
    if (hitObstacle) {
      this.handleDeath('OBSTACLE', newHead, { obstacle: hitObstacle });
      return;
    }

    // 4. Enemy collision (Lion / Hunter)
    const hitEnemy = this.entityManager
      .getEnemies()
      .find((enemy) => isSamePoint(enemy.position, newHead));
    if (hitEnemy) {
      this.handleDeath('ENEMY', newHead, { enemy: hitEnemy });
      return;
    }

    // 5. Active exploding bomb or hazard
    if (this.checkHazardOrBombCollision(newHead)) {
      return;
    }

    // Check food consumption
    const eatenFood = this.entityManager.consumeFoodAt(newHead);
    if (eatenFood) {
      this.state.score += eatenFood.points;
      if (this.state.score > this.state.highScore) {
        this.state.highScore = this.state.score;
      }
      this.state.snake.body.unshift(newHead);
      this.state.snake.length = this.state.snake.body.length;

      this.eventBus.emit('effect', {
        id: `fx_eat_${Date.now()}`,
        type: 'ALERT',
        position: newHead,
        intensity: 0.8,
        duration: 200,
        sound: 'EAT',
        timestamp: Date.now(),
      });

      // Replenish food supply
      this.entityManager.ensureFoodSupply(this.state.snake, 3);
    } else {
      // Normal move: advance head, remove tail
      this.state.snake.body.unshift(newHead);
      this.state.snake.body.pop();
    }
  }

  private checkHazardOrBombCollision(pos: Point): boolean {
    const hazards = this.entityManager.getHazards();
    for (const h of hazards) {
      if (h.isExploding) {
        const dx = Math.abs(pos.x - h.position.x);
        const dy = Math.abs(pos.y - h.position.y);
        if (dx + dy <= h.radius) {
          this.handleDeath(h.type === 'BOMB' ? 'BOMB' : 'HAZARD', pos, { hazard: h });
          return true;
        }
      }
    }
    return false;
  }

  private handleDeath(
    cause: DeathCause,
    pos: Point,
    entities: {
      obstacle?: any;
      enemy?: any;
      hazard?: any;
    } = {}
  ): void {
    if (!this.state.snake.isAlive) return;

    this.state.snake.isAlive = false;
    const deathInfo = this.attributionTracker.determineDeathAttribution(
      cause,
      pos,
      this.state.survivalTime,
      this.state.score,
      entities
    );

    this.state.lastDeath = deathInfo;
    this.setStatus('DEAD');

    this.eventBus.emit('death', deathInfo);
    this.eventBus.emit('effect', {
      id: `fx_death_${Date.now()}`,
      type: 'DEATH',
      position: pos,
      intensity: 3.0,
      duration: 1500,
      sound: 'DEATH',
      message: deathInfo.killerUsername
        ? `💀 KILLED BY @${deathInfo.killerUsername} (${deathInfo.killerGift || deathInfo.cause})!`
        : `💀 SNAKE DESTROYED (${deathInfo.cause})!`,
      timestamp: Date.now(),
    });
  }

  private setStatus(newStatus: GameStatus): void {
    if (this.state.status === newStatus) return;
    this.state.status = newStatus;
    this.statusStartTime = Date.now();
    this.state.timeInCurrentStatus = 0;
  }

  private updateDangerAndPhases(now: number): void {
    // If apocalypse active
    if (now < this.apocalypseEndTime) {
      this.state.dangerLevel = 100;
      this.setStatus('APOCALYPSE');
      return;
    }

    // Dynamic danger computation
    const obsCount = this.entityManager.getObstacles().length;
    const enemyCount = this.entityManager.getEnemies().length;
    const bombCount = this.entityManager.getHazards().length;
    const speedRatio = (this.state.snake.speed - 1.0) / (this.config.maxSpeedMultiplier - 1.0);

    const danger = Math.min(
      100,
      Math.floor(
        (obsCount / this.config.maxObstacles) * 35 +
          enemyCount * 18 +
          bombCount * 12 +
          Math.max(0, speedRatio) * 20 +
          Math.min(15, this.state.survivalTime / 8)
      )
    );

    this.state.dangerLevel = danger;

    if (danger >= DANGER_THRESHOLDS.APOCALYPSE) {
      this.setStatus('APOCALYPSE');
    } else if (danger >= DANGER_THRESHOLDS.CHAOS) {
      this.setStatus('CHAOS');
    } else if (danger >= DANGER_THRESHOLDS.DANGER) {
      this.setStatus('DANGER');
    } else {
      this.setStatus('PLAYING');
    }
  }

  private scheduleNextTick(): void {
    const baseInterval = 1000 / this.config.baseTickRate;
    const actualInterval = Math.max(35, Math.floor(baseInterval / this.state.snake.speed));
    this.tickTimer = setTimeout(() => this.tick(), actualInterval);
  }

  private createInitialState(): GameState {
    const centerX = Math.floor(this.config.gridWidth / 2);
    const centerY = Math.floor(this.config.gridHeight / 2);
    const initialBody: Point[] = [];
    for (let i = 0; i < this.config.initialSnakeLength; i++) {
      initialBody.push({ x: centerX, y: centerY + i });
    }

    return {
      status: 'PLAYING',
      tick: 0,
      snake: {
        body: initialBody,
        direction: 'UP',
        nextDirection: 'UP',
        speed: 1.0,
        length: initialBody.length,
        isAlive: true,
        invulnerableUntil: 0,
      },
      food: [],
      obstacles: [],
      enemies: [],
      hazards: [],
      score: 0,
      highScore: 0,
      survivalTime: 0,
      difficulty: 1.0,
      dangerLevel: 0,
      activeEffects: [],
      leaderboard: [],
      recentGifts: [],
      timeInCurrentStatus: 0,
    };
  }
}
