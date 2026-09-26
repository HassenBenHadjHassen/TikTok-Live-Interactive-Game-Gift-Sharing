export interface EventQueueConfig {
    maxQueueLength: number;
    maxEventsPerTick: number;
    batchWindowMs: number;
    maxActiveObstacles: number;
    maxActiveEnemies: number;
    maxActiveBombs: number;
    maxActiveHazards: number;
    rateLimitWindowMs: number;
    maxGiftsPerUserPerWindow: number;
}
export declare const DEFAULT_QUEUE_CONFIG: EventQueueConfig;
//# sourceMappingURL=queue.d.ts.map