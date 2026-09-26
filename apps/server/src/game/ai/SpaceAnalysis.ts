import { Point, isPointInBounds, getNeighborPoint, ALL_DIRECTIONS } from '@snake-live/shared';

export interface SpaceAnalysisContext {
  gridWidth: number;
  gridHeight: number;
  isBlocked: (p: Point) => boolean;
}

export class SpaceAnalysis {
  /**
   * Performs a Breadth-First-Search (BFS) flood fill to calculate
   * the number of reachable, unblocked tiles from a start position.
   */
  static countReachableSpace(
    start: Point,
    ctx: SpaceAnalysisContext,
    maxLimit: number = 250
  ): number {
    if (!isPointInBounds(start, ctx.gridWidth, ctx.gridHeight) || ctx.isBlocked(start)) {
      return 0;
    }

    const queue: Point[] = [start];
    const visited = new Set<string>();
    visited.add(`${start.x},${start.y}`);

    let count = 0;

    while (queue.length > 0 && count < maxLimit) {
      const current = queue.shift()!;
      count++;

      for (const dir of ALL_DIRECTIONS) {
        const neighbor = getNeighborPoint(current, dir);

        if (!isPointInBounds(neighbor, ctx.gridWidth, ctx.gridHeight)) {
          continue;
        }

        const key = `${neighbor.x},${neighbor.y}`;
        if (visited.has(key)) continue;

        if (ctx.isBlocked(neighbor)) continue;

        visited.add(key);
        queue.push(neighbor);
      }
    }

    return count;
  }
}
