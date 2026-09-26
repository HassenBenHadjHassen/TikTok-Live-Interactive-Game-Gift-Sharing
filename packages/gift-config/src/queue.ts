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

export const DEFAULT_QUEUE_CONFIG: EventQueueConfig = {
  maxQueueLength: 200,
  maxEventsPerTick: 3,
  batchWindowMs: 250, // Group identical gifts within 250ms
  maxActiveObstacles: 45,
  maxActiveEnemies: 4,
  maxActiveBombs: 8,
  maxActiveHazards: 12,
  rateLimitWindowMs: 1000,
  maxGiftsPerUserPerWindow: 25,
};
