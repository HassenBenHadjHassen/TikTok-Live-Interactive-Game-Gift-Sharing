import { Point, Direction } from '@snake-live/shared';
import {
  manhattanDistance,
  isPointInBounds,
  getNeighborPoint,
  getDirection,
  ALL_DIRECTIONS,
} from '@snake-live/shared';

interface Node {
  point: Point;
  g: number;
  h: number;
  f: number;
  parent?: Node;
  dir?: Direction;
}

export interface PathfindingContext {
  gridWidth: number;
  gridHeight: number;
  isObstacle: (p: Point) => boolean;
  costModifier?: (p: Point) => number; // for soft hazards/enemy danger zones
}

export class Pathfinding {
  /**
   * Find shortest path using A*
   */
  static findPath(
    start: Point,
    target: Point,
    ctx: PathfindingContext
  ): { path: Point[]; directions: Direction[] } | null {
    const startKey = `${start.x},${start.y}`;
    const targetKey = `${target.x},${target.y}`;

    if (startKey === targetKey) {
      return { path: [start], directions: [] };
    }

    const openSet: Node[] = [];
    const closedSet = new Set<string>();
    const nodeMap = new Map<string, Node>();

    const startNode: Node = {
      point: start,
      g: 0,
      h: manhattanDistance(start, target),
      f: manhattanDistance(start, target),
    };

    openSet.push(startNode);
    nodeMap.set(startKey, startNode);

    let iterations = 0;
    const maxIterations = 800; // safety budget to prevent lag

    while (openSet.length > 0 && iterations++ < maxIterations) {
      // Find node with lowest f
      let lowestIdx = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[lowestIdx].f) {
          lowestIdx = i;
        }
      }

      const current = openSet.splice(lowestIdx, 1)[0];
      const currentKey = `${current.point.x},${current.point.y}`;
      closedSet.add(currentKey);

      if (current.point.x === target.x && current.point.y === target.y) {
        // Reconstruct path
        const path: Point[] = [];
        const directions: Direction[] = [];
        let curr: Node | undefined = current;

        while (curr && curr.parent) {
          path.unshift(curr.point);
          if (curr.dir) directions.unshift(curr.dir);
          curr = curr.parent;
        }
        path.unshift(start);

        return { path, directions };
      }

      for (const dir of ALL_DIRECTIONS) {
        const neighborPoint = getNeighborPoint(current.point, dir);

        if (!isPointInBounds(neighborPoint, ctx.gridWidth, ctx.gridHeight)) {
          continue;
        }

        const neighborKey = `${neighborPoint.x},${neighborPoint.y}`;
        if (closedSet.has(neighborKey)) continue;

        // Target cell itself is allowed even if marked as food, but not if it's an obstacle
        const isTarget = neighborPoint.x === target.x && neighborPoint.y === target.y;
        if (!isTarget && ctx.isObstacle(neighborPoint)) {
          continue;
        }

        const extraCost = ctx.costModifier ? ctx.costModifier(neighborPoint) : 0;
        const tentativeG = current.g + 1 + extraCost;

        let neighborNode = nodeMap.get(neighborKey);
        if (!neighborNode) {
          neighborNode = {
            point: neighborPoint,
            g: tentativeG,
            h: manhattanDistance(neighborPoint, target),
            f: tentativeG + manhattanDistance(neighborPoint, target),
            parent: current,
            dir,
          };
          nodeMap.set(neighborKey, neighborNode);
          openSet.push(neighborNode);
        } else if (tentativeG < neighborNode.g) {
          neighborNode.g = tentativeG;
          neighborNode.f = tentativeG + neighborNode.h;
          neighborNode.parent = current;
          neighborNode.dir = dir;
        }
      }
    }

    return null;
  }
}
