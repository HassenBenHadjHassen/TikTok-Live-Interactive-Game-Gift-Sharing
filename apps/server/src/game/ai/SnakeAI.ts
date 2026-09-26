import {
  Point,
  Direction,
  SnakeState,
  Food,
  Obstacle,
  Enemy,
  Hazard,
  SnakeAIConfig,
} from '@snake-live/shared';
import {
  isPointInBounds,
  getNeighborPoint,
  getOppositeDirection,
  manhattanDistance,
  ALL_DIRECTIONS,
  SeededRandom,
} from '@snake-live/shared';
import { Pathfinding } from './Pathfinding';
import { SpaceAnalysis } from './SpaceAnalysis';

export interface AIDecisionContext {
  snake: SnakeState;
  food: Food[];
  obstacles: Obstacle[];
  enemies: Enemy[];
  hazards: Hazard[];
  gridWidth: number;
  gridHeight: number;
  aiConfig: SnakeAIConfig;
  seed?: number;
}

export class SnakeAI {
  private rng: SeededRandom;

  constructor(seed: number = 42) {
    this.rng = new SeededRandom(seed);
  }

  setSeed(seed: number): void {
    this.rng = new SeededRandom(seed);
  }

  /**
   * Decide the next direction for the Snake based on survival and food heuristics
   */
  decideDirection(ctx: AIDecisionContext): Direction {
    const { snake, food, obstacles, enemies, hazards, gridWidth, gridHeight, aiConfig } = ctx;
    const head = snake.body[0];
    const oppositeDir = getOppositeDirection(snake.direction);

    // Build lookup sets for fast collision detection
    const blockedSet = new Set<string>();

    // Snake body is blocked (tail may move away, so keep tail unblocked if snake is not growing)
    for (let i = 0; i < snake.body.length - 1; i++) {
      blockedSet.add(`${snake.body[i].x},${snake.body[i].y}`);
    }

    // Obstacles
    for (const obs of obstacles) {
      blockedSet.add(`${obs.position.x},${obs.position.y}`);
    }

    // Lethal hazards (active explosions or bombs about to detonate)
    for (const hazard of hazards) {
      if (hazard.isExploding || (hazard.countdown !== undefined && hazard.countdown <= 2)) {
        for (let dx = -hazard.radius; dx <= hazard.radius; dx++) {
          for (let dy = -hazard.radius; dy <= hazard.radius; dy++) {
            if (Math.abs(dx) + Math.abs(dy) <= hazard.radius) {
              const hx = hazard.position.x + dx;
              const hy = hazard.position.y + dy;
              if (isPointInBounds({ x: hx, y: hy }, gridWidth, gridHeight)) {
                blockedSet.add(`${hx},${hy}`);
              }
            }
          }
        }
      }
    }

    // Direct enemy positions
    for (const enemy of enemies) {
      blockedSet.add(`${enemy.position.x},${enemy.position.y}`);
    }

    const isBlocked = (p: Point): boolean => {
      if (!isPointInBounds(p, gridWidth, gridHeight)) return true;
      return blockedSet.has(`${p.x},${p.y}`);
    };

    // Soft threat cost for pathfinding and candidate scoring
    const getThreatCost = (p: Point): number => {
      let threat = 0;
      // Proximity to active hunter enemies
      for (const enemy of enemies) {
        const dist = manhattanDistance(p, enemy.position);
        if (dist <= 1) threat += 15 * aiConfig.dangerAvoidance;
        else if (dist <= 2) threat += 6 * aiConfig.dangerAvoidance;
        else if (dist <= 3) threat += 2 * aiConfig.dangerAvoidance;
      }
      // Proximity to ticking bombs
      for (const hazard of hazards) {
        if (hazard.type === 'BOMB' && !hazard.isExploding) {
          const dist = manhattanDistance(p, hazard.position);
          if (dist <= hazard.radius + 1) {
            threat += (4 / (dist + 0.5)) * aiConfig.dangerAvoidance;
          }
        }
      }
      return threat;
    };

    // Evaluate candidate moves
    const candidateMoves: { dir: Direction; score: number; space: number }[] = [];

    for (const dir of ALL_DIRECTIONS) {
      // Cannot turn into self (opposite direction)
      if (dir === oppositeDir && snake.body.length > 1) {
        continue;
      }

      const nextCell = getNeighborPoint(head, dir);

      // Immediate collision check
      if (isBlocked(nextCell)) {
        continue;
      }

      // 1. Space analysis (Flood fill)
      const reachableSpace = SpaceAnalysis.countReachableSpace(
        nextCell,
        { gridWidth, gridHeight, isBlocked },
        150
      );

      // Trapping penalty: if reachable space is smaller than snake length, high danger of dead end
      const trapPenalty = reachableSpace < snake.body.length ? 150 : 0;
      const spaceScore = (reachableSpace / Math.max(1, snake.body.length)) * 10 * aiConfig.survivalPriority;

      // 2. Threat proximity penalty
      const threatPenalty = getThreatCost(nextCell);

      // 3. Tail proximity bonus (Tail represents a moving exit out of tight spots)
      const tail = snake.body[snake.body.length - 1];
      const distToTail = manhattanDistance(nextCell, tail);
      const tailBonus = reachableSpace >= snake.body.length ? 2 / (distToTail + 1) : 0;

      // Base candidate score
      let score = spaceScore + tailBonus - trapPenalty - threatPenalty;

      candidateMoves.push({ dir, score, space: reachableSpace });
    }

    if (candidateMoves.length === 0) {
      // Snake is completely surrounded; return current direction as fallback
      return snake.direction;
    }

    // Try finding path to best food target using A*
    const validFoods = food.filter((f) => !isBlocked(f.position));
    if (validFoods.length > 0) {
      // Find closest accessible food
      let bestFoodPath: { path: Point[]; directions: Direction[] } | null = null;
      let minDistance = Infinity;

      // Sort foods by weighted value / distance
      const sortedFoods = [...validFoods].sort((a, b) => {
        const da = manhattanDistance(head, a.position);
        const db = manhattanDistance(head, b.position);
        return da - db;
      });

      for (const targetFood of sortedFoods.slice(0, 3)) {
        const pathResult = Pathfinding.findPath(head, targetFood.position, {
          gridWidth,
          gridHeight,
          isObstacle: isBlocked,
          costModifier: getThreatCost,
        });

        if (pathResult && pathResult.directions.length > 0) {
          const firstDir = pathResult.directions[0];
          // Ensure first move doesn't reverse
          if (firstDir !== oppositeDir || snake.body.length <= 1) {
            bestFoodPath = pathResult;
            break;
          }
        }
      }

      if (bestFoodPath && bestFoodPath.directions.length > 0) {
        const desiredFoodDir = bestFoodPath.directions[0];
        const candidate = candidateMoves.find((c) => c.dir === desiredFoodDir);

        // Only commit to food path if the move is safe (has sufficient space)
        if (candidate && candidate.space >= Math.min(snake.body.length, 10)) {
          candidate.score += 25 * aiConfig.foodPriority;
        }
      }
    }

    // Sort candidate moves by score descending
    candidateMoves.sort((a, b) => b.score - a.score);

    // If top candidates have close scores, use seeded randomness for natural motion
    const topScore = candidateMoves[0].score;
    const topCandidates = candidateMoves.filter((c) => Math.abs(c.score - topScore) < 0.5);

    if (topCandidates.length > 1) {
      const chosen = this.rng.choice(topCandidates);
      return chosen ? chosen.dir : candidateMoves[0].dir;
    }

    return candidateMoves[0].dir;
  }
}
