import http from 'http';
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { EventBus } from './events/EventBus';
import { EventQueue } from './events/EventQueue';
import { GameEngine } from './game/GameEngine';
import { GameWebSocketServer } from './websocket/WebSocketServer';
import { LiveEventProvider } from './tiktok/LiveEventProvider';
import { MockLiveProvider } from './tiktok/MockLiveProvider';
import { TikTokLiveAdapter } from './tiktok/TikTokLiveAdapter';
import { createDevRouter } from './api/devRouter';

async function bootstrap() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const server = http.createServer(app);

  // 1. Initialize decoupled architecture
  const eventBus = new EventBus();
  const eventQueue = new EventQueue();

  // 2. Initialize Authoritative Game Engine
  const gameEngine = new GameEngine(eventBus, eventQueue, {
    gridWidth: config.gridWidth,
    gridHeight: config.gridHeight,
    baseTickRate: config.tickRate,
    autoRestartDelayMs: config.autoRestartDelayMs,
  });

  // 3. Initialize TikTok Adapter or Mock Provider
  let liveProvider: LiveEventProvider;
  if (config.tiktokProvider === 'tiktok' && config.tiktokUsername) {
    console.log(`[Bootstrap] Initializing TikTok LIVE Adapter for @${config.tiktokUsername}`);
    liveProvider = new TikTokLiveAdapter({
      username: config.tiktokUsername,
      signApiKey: config.tiktokSignApiKey || undefined,
    });
  } else {
    console.log('[Bootstrap] Initializing Mock LIVE Provider for local simulation');
    liveProvider = new MockLiveProvider();
  }

  // Decoupled connection: Provider enqueues into EventQueue; GameEngine consumes from EventQueue
  liveProvider.onGift((gift) => {
    eventQueue.enqueue(gift);
  });

  if (liveProvider.onLike) {
    liveProvider.onLike((like) => {
      eventBus.emit('like', like);
    });
  }

  if (liveProvider.onFollow) {
    liveProvider.onFollow((follow) => {
      eventBus.emit('follow', follow);
    });
  }

  if (liveProvider.onShare) {
    liveProvider.onShare((share) => {
      eventBus.emit('share', share);
    });
  }

  // 4. WebSocket Server
  const wsServer = new GameWebSocketServer(
    server,
    eventBus,
    eventQueue,
    config.wsSnapshotIntervalMs,
    config.wsHeartbeatIntervalMs
  );

  // 5. REST Dev API
  app.use('/api', createDevRouter(gameEngine, eventQueue, liveProvider));

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // 6. Connect live provider & start game engine
  await liveProvider.connect();
  gameEngine.start();

  // 7. Start HTTP & WebSocket server
  server.listen(config.port, config.host, () => {
    console.log(`====================================================`);
    console.log(`🐍 TIKTOK LIVE INTERACTIVE SNAKE SERVER RUNNING`);
    console.log(`📡 HTTP Server: http://${config.host}:${config.port}`);
    console.log(`🔌 WebSocket:   ws://${config.host}:${config.port}/ws`);
    console.log(`🎮 Provider:    ${config.tiktokProvider.toUpperCase()}`);
    console.log(`⏱️ Tick Rate:   ${config.tickRate} ticks/sec (~${Math.round(1000 / config.tickRate)}ms per step)`);
    console.log(`====================================================`);
  });

  // Graceful shutdown handling
  const shutdown = async () => {
    console.log('\n[Shutdown] Stopping server and cleaning up...');
    gameEngine.stop();
    wsServer.close();
    await liveProvider.disconnect();
    server.close(() => {
      console.log('[Shutdown] Server terminated cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('[Bootstrap] Fatal startup error:', err);
  process.exit(1);
});
