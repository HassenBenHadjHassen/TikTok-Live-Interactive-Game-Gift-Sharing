import { Point, Direction } from '../types';
export declare function isSamePoint(a: Point, b: Point): boolean;
export declare function manhattanDistance(a: Point, b: Point): number;
export declare function euclideanDistance(a: Point, b: Point): number;
export declare function isPointInBounds(p: Point, width: number, height: number): boolean;
export declare function getNeighborPoint(p: Point, dir: Direction): Point;
export declare function getOppositeDirection(dir: Direction): Direction;
export declare function getDirection(from: Point, to: Point): Direction | null;
export declare const ALL_DIRECTIONS: Direction[];
/**
 * Fast deterministic Linear Congruential Generator (LCG) PRNG
 */
export declare class SeededRandom {
    private seed;
    constructor(seed?: number);
    next(): number;
    nextInt(min: number, max: number): number;
    choice<T>(items: T[]): T | undefined;
}
//# sourceMappingURL=gridMath.d.ts.map