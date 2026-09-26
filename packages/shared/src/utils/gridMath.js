export function isSamePoint(a, b) {
    return a.x === b.x && a.y === b.y;
}
export function manhattanDistance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
export function euclideanDistance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}
export function isPointInBounds(p, width, height) {
    return p.x >= 0 && p.x < width && p.y >= 0 && p.y < height;
}
export function getNeighborPoint(p, dir) {
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
export function getOppositeDirection(dir) {
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
export function getDirection(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (dx === 1 && dy === 0)
        return 'RIGHT';
    if (dx === -1 && dy === 0)
        return 'LEFT';
    if (dx === 0 && dy === 1)
        return 'DOWN';
    if (dx === 0 && dy === -1)
        return 'UP';
    return null;
}
export const ALL_DIRECTIONS = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
/**
 * Fast deterministic Linear Congruential Generator (LCG) PRNG
 */
export class SeededRandom {
    seed;
    constructor(seed = 1337) {
        this.seed = seed % 2147483647;
        if (this.seed <= 0)
            this.seed += 2147483646;
    }
    next() {
        this.seed = (this.seed * 16807) % 2147483647;
        return (this.seed - 1) / 2147483646;
    }
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
    choice(items) {
        if (items.length === 0)
            return undefined;
        return items[this.nextInt(0, items.length - 1)];
    }
}
//# sourceMappingURL=gridMath.js.map