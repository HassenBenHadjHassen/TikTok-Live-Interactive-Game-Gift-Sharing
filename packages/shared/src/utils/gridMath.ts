import { Point, Direction } from '../types';

export function isSamePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

export function manhattanDistance(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function euclideanDistance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isPointInBounds(p: Point, width: number, height: number): boolean {
  return p.x >= 0 && p.x < width && p.y >= 0 && p.y < height;
}

export function getNeighborPoint(p: Point, dir: Direction): Point {
  switch (dir) {
    case 'UP':
      return { x: p.x, y: p.y - 1 };
    case 'DOWN':
      return { x: p.x, y: p.y + 1 };
    case 'LEFT':
      return { x: p.x - 1, y: p.y };
    case 'RIGHT':
      return { x: p.x + 1, y: p.y };
  }
}

export function getOppositeDirection(dir: Direction): Direction {
  switch (dir) {
    case 'UP':
      return 'DOWN';
    case 'DOWN':
      return 'UP';
    case 'LEFT':
      return 'RIGHT';
    case 'RIGHT':
      return 'LEFT';
  }
}

export function getDirection(from: Point, to: Point): Direction | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 1 && dy === 0) return 'RIGHT';
  if (dx === -1 && dy === 0) return 'LEFT';
  if (dx === 0 && dy === 1) return 'DOWN';
  if (dx === 0 && dy === -1) return 'UP';
  return null;
}

export const ALL_DIRECTIONS: Direction[] = ['UP', 'RIGHT', 'DOWN', 'LEFT'];

/**
 * Fast deterministic Linear Congruential Generator (LCG) PRNG
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number = 1337) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(items: T[]): T | undefined {
    if (items.length === 0) return undefined;
    return items[this.nextInt(0, items.length - 1)];
  }
}
