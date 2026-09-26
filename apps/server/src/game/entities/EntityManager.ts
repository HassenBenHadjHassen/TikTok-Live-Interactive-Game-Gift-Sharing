import {
  Point,
  Food,
  FoodType,
  Obstacle,
  Enemy,
  Hazard,
  SnakeState,
  GameConfig,
} from '@snake-live/shared';
import {
  manhattanDistance,
  isPointInBounds,
  isSamePoint,
  SeededRandom,
  ALL_DIRECTIONS,
  getNeighborPoint,
} from '@snake-live/shared';

export class EntityManager {
  private food: Food[] = [];
  private obstacles: Obstacle[] = [];
  private enemies: Enemy[] = [];
  private hazards: Hazard[] = [];
  private rng: SeededRandom;

  constructor(
    private config: GameConfig,
    seed: number = 777
  ) {
    this.rng = new SeededRandom(seed);
  }

  getFood(): Food[] {
    return this.food;
  }

  getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  getEnemies(): Enemy[] {
    return this.enemies;
  }

  getHazards(): Hazard[] {
    return this.hazards;
  }

  addObstacle(obs: Obstacle): void {
    this.obstacles.push(obs);
  }

  addEnemy(enemy: Enemy): void {
    this.enemies.push(enemy);
  }

  clear(): void {
    this.food = [];
    this.obstacles = [];
    this.enemies = [];
    this.hazards = [];
  }

  /**
   * Spawn initial food items on the board
   */
  ensureFoodSupply(snake: SnakeState, targetCount: number = 3): Food[] {
    const spawned: Food[] = [];
    while (this.food.length < targetCount) {
      const type: FoodType =
        this.rng.next() < 0.15 ? 'GOLDEN_FOOD' : 'NORMAL_FOOD';
      const foodItem = this.spawnFood(snake, type);
      if (foodItem) spawned.push(foodItem);
      else break; // grid might be too congested
    }
    return spawned;
  }

  spawnFood(snake: SnakeState, type: FoodType = 'NORMAL_FOOD'): Food | null {
    const pos = this.findFreeCell(snake, 2);
    if (!pos) return null;

    const points = type === 'GOLDEN_FOOD' ? 50 : type === 'DANGEROUS_FOOD' ? -20 : 10;
    const foodItem: Food = {
      id: `food_${Date.now()}_${this.rng.nextInt(100, 999)}`,
      position: pos,
      type,
      points,
      spawnedAt: Date.now(),
    };
    this.food.push(foodItem);
    return foodItem;
  }

  removeFood(count: number = 1): Food[] {
    return this.food.splice(0, count);
  }

  consumeFoodAt(pos: Point): Food | undefined {
    const idx = this.food.findIndex((f) => isSamePoint(f.position, pos));
    if (idx !== -1) {
      return this.food.splice(idx, 1)[0];
    }
    return undefined;
  }

  /**
   * Spawn an obstacle safely away from the snake head
   */
  spawnObstacle(snake: SnakeState, createdBy?: string, minDistance: number = 3): Obstacle | null {
    if (this.obstacles.length >= this.config.maxObstacles) {
      // Remove oldest obstacle to cap count
      this.obstacles.shift();
    }

    const pos = this.findFreeCell(snake, minDistance);
    if (!pos) return null;

    const obstacle: Obstacle = {
      id: `obs_${Date.now()}_${this.rng.nextInt(100, 999)}`,
      position: pos,
      size: 1,
      createdBy,
      createdAt: Date.now(),
    };
    this.obstacles.push(obstacle);
    return obstacle;
  }

  /**
   * Spawn a chasing hunter enemy (Lion)
   */
  spawnChaser(snake: SnakeState, createdBy?: string): Enemy | null {
    if (this.enemies.length >= this.config.maxEnemies) {
      return null;
    }

    // Spawn at the board edge furthest from snake head
    const corners: Point[] = [
      { x: 1, y: 1 },
      { x: this.config.gridWidth - 2, y: 1 },
      { x: 1, y: this.config.gridHeight - 2 },
      { x: this.config.gridWidth - 2, y: this.config.gridHeight - 2 },
    ];

    corners.sort((a, b) => {
      const da = manhattanDistance(a, snake.body[0]);
      const db = manhattanDistance(b, snake.body[0]);
      return db - da; // furthest first
    });

    const spawnPos = corners[0];

    const enemy: Enemy = {
      id: `enemy_${Date.now()}_${this.rng.nextInt(100, 999)}`,
      type: 'HUNTER',
      name: 'Hunter Lion',
      position: spawnPos,
      targetPosition: snake.body[0],
      speed: 1, // Moves every 2-3 ticks
      createdBy,
      createdAt: Date.now(),
      expiresAt: Date.now() + 20000, // 20s lifespan
    };

    this.enemies.push(enemy);
    return enemy;
  }

  /**
   * Spawn a countdown bomb (Tiger)
   */
  spawnBomb(snake: SnakeState, createdBy?: string): Hazard | null {
    if (this.hazards.length >= this.config.maxHazards) {
      return null;
    }

    const pos = this.findFreeCell(snake, 2);
    if (!pos) return null;

    const bomb: Hazard = {
      id: `bomb_${Date.now()}_${this.rng.nextInt(100, 999)}`,
      type: 'BOMB',
      position: pos,
      radius: 2,
      createdBy,
      createdAt: Date.now(),
      countdown: 10, // 10 ticks before explosion
      duration: 3, // explodes for 3 ticks
      isArming: true,
      isExploding: false,
    };

    this.hazards.push(bomb);
    return bomb;
  }

  /**
   * Spawn a temporary hazard zone (Fire/Acid)
   */
  spawnHazardZone(snake: SnakeState, type: 'FIRE_ZONE' | 'ACID_POOL', createdBy?: string): Hazard | null {
    const pos = this.findFreeCell(snake, 2);
    if (!pos) return null;

    const hazard: Hazard = {
      id: `hazard_${Date.now()}_${this.rng.nextInt(100, 999)}`,
      type,
      position: pos,
      radius: 1,
      createdBy,
      createdAt: Date.now(),
      duration: 30, // 30 ticks
      isExploding: true,
    };

    this.hazards.push(hazard);
    return hazard;
  }

  /**
   * Update moving enemies, countdown bombs, and active hazards on each tick
   */
  updateEntities(snake: SnakeState, tickNumber: number): {
    explodedBombs: Hazard[];
    expiredEnemies: Enemy[];
  } {
    const now = Date.now();
    const explodedBombs: Hazard[] = [];
    const expiredEnemies: Enemy[] = [];

    // 1. Update enemies (Hunters)
    this.enemies = this.enemies.filter((enemy) => {
      if (now >= enemy.expiresAt) {
        expiredEnemies.push(enemy);
        return false;
      }

      // Hunters step towards snake every 3 ticks
      if (tickNumber % 3 === 0 && snake.body.length > 0) {
        const head = snake.body[0];
        let bestDir: Point | null = null;
        let bestDist = Infinity;

        for (const dir of ALL_DIRECTIONS) {
          const next = getNeighborPoint(enemy.position, dir);
          if (isPointInBounds(next, this.config.gridWidth, this.config.gridHeight)) {
            const dist = manhattanDistance(next, head);
            if (dist < bestDist) {
              bestDist = dist;
              bestDir = next;
            }
          }
        }

        if (bestDir) {
          enemy.position = bestDir;
        }
      }

      return true;
    });

    // 2. Update hazards & bombs
    const activeHazards: Hazard[] = [];
    for (const h of this.hazards) {
      if (h.type === 'BOMB') {
        if (h.countdown !== undefined && h.countdown > 0) {
          h.countdown--;
          activeHazards.push(h);
        } else if (!h.isExploding) {
          // Detonate!
          h.isExploding = true;
          h.isArming = false;
          explodedBombs.push(h);
          activeHazards.push(h);
        } else {
          // Already exploding, decrement explosion duration
          h.duration--;
          if (h.duration > 0) {
            activeHazards.push(h);
          }
        }
      } else {
        // Fire/Acid zone
        h.duration--;
        if (h.duration > 0) {
          activeHazards.push(h);
        }
      }
    }
    this.hazards = activeHazards;

    return { explodedBombs, expiredEnemies };
  }

  /**
   * Find an unoccupied cell on the board satisfying minimum distance from the snake head
   */
  private findFreeCell(snake: SnakeState, minDistanceFromHead: number = 2): Point | null {
    const occupied = new Set<string>();

    for (const seg of snake.body) {
      occupied.add(`${seg.x},${seg.y}`);
    }
    for (const f of this.food) {
      occupied.add(`${f.position.x},${f.position.y}`);
    }
    for (const o of this.obstacles) {
      occupied.add(`${o.position.x},${o.position.y}`);
    }
    for (const e of this.enemies) {
      occupied.add(`${e.position.x},${e.position.y}`);
    }
    for (const h of this.hazards) {
      occupied.add(`${h.position.x},${h.position.y}`);
    }

    const head = snake.body[0];
    const freeCells: Point[] = [];

    for (let x = 1; x < this.config.gridWidth - 1; x++) {
      for (let y = 1; y < this.config.gridHeight - 1; y++) {
        if (!occupied.has(`${x},${y}`)) {
          const pt = { x, y };
          if (!head || manhattanDistance(pt, head) >= minDistanceFromHead) {
            freeCells.push(pt);
          }
        }
      }
    }

    if (freeCells.length === 0) return null;
    return this.rng.choice(freeCells) || null;
  }
}
