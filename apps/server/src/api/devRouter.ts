import { Router, Request, Response } from 'express';
import { GameEngine } from '../game/GameEngine';
import { EventQueue } from '../events/EventQueue';
import { LiveEventProvider } from '../tiktok/LiveEventProvider';
import { MockLiveProvider } from '../tiktok/MockLiveProvider';
import { GiftEvent } from '@snake-live/shared';

export function createDevRouter(
  gameEngine: GameEngine,
  eventQueue: EventQueue,
  liveProvider: LiveEventProvider
): Router {
  const router = Router();

  /**
   * Simulate a gift via REST
   */
  router.post('/simulate-gift', (req: Request, res: Response) => {
    const { giftName, username = 'DevViewer', repeatCount = 1 } = req.body;

    if (!giftName) {
      return res.status(400).json({ error: 'giftName is required' });
    }

    const giftEvent: GiftEvent = {
      id: `rest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      giftId: giftName.toLowerCase(),
      giftName,
      senderId: `user_${username.toLowerCase()}`,
      senderUsername: username,
      repeatCount: Math.max(1, parseInt(repeatCount, 10) || 1),
      timestamp: Date.now(),
    };

    const enqueued = eventQueue.enqueue(giftEvent);
    return res.json({ success: enqueued, event: giftEvent });
  });

  /**
   * Reset game round
   */
  router.post('/reset', (_req: Request, res: Response) => {
    gameEngine.resetGame();
    return res.json({ success: true, message: 'Game reset successfully' });
  });

  /**
   * Start / stop background auto simulation (if using MockLiveProvider)
   */
  router.post('/auto-sim/start', (req: Request, res: Response) => {
    if (liveProvider instanceof MockLiveProvider) {
      const intervalMs = parseInt(req.body.intervalMs, 10) || 3500;
      liveProvider.startAutoSimulation(intervalMs);
      return res.json({ success: true, message: `Auto simulation started (${intervalMs}ms)` });
    }
    return res.status(400).json({ error: 'Live provider is not MockLiveProvider' });
  });

  router.post('/auto-sim/stop', (_req: Request, res: Response) => {
    if (liveProvider instanceof MockLiveProvider) {
      liveProvider.stopAutoSimulation();
      return res.json({ success: true, message: 'Auto simulation stopped' });
    }
    return res.status(400).json({ error: 'Live provider is not MockLiveProvider' });
  });

  /**
   * Engine & system status
   */
  router.get('/status', (_req: Request, res: Response) => {
    const state = gameEngine.getState();
    return res.json({
      status: state.status,
      tick: state.tick,
      score: state.score,
      survivalTime: state.survivalTime,
      dangerLevel: state.dangerLevel,
      snakeSpeed: state.snake.speed,
      snakeLength: state.snake.length,
      obstacleCount: state.obstacles.length,
      enemyCount: state.enemies.length,
      hazardCount: state.hazards.length,
      queueLength: eventQueue.getQueueLength(),
      totalEnqueued: eventQueue.getTotalEnqueued(),
      droppedEvents: eventQueue.getDroppedCount(),
      providerConnected: liveProvider.isConnected(),
    });
  });

  router.get('/leaderboard', (_req: Request, res: Response) => {
    const leaderboard = gameEngine.getLeaderboardManager().getTopKillers(10);
    return res.json({ leaderboard });
  });

  return router;
}
