import http from 'http';
import { WebSocketServer as WSServer, WebSocket } from 'ws';
import {
  ServerMessage,
  ClientMessage,
  GiftEvent,
  EffectEvent,
  DeathInfo,
  GameState,
} from '@snake-live/shared';
import { EventBus } from '../events/EventBus';
import { EventQueue } from '../events/EventQueue';

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
}

export class GameWebSocketServer {
  private wss: WSServer;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private snapshotInterval: NodeJS.Timeout | null = null;
  private latestState: GameState | null = null;

  constructor(
    server: http.Server,
    private eventBus: EventBus,
    private eventQueue: EventQueue,
    snapshotIntervalMs: number = 50,
    heartbeatIntervalMs: number = 30000
  ) {
    this.wss = new WSServer({ server, path: '/ws' });

    this.setupListeners();
    this.setupEventBusSubscriptions();
    this.startHeartbeat(heartbeatIntervalMs);
    this.startSnapshotBroadcasting(snapshotIntervalMs);
  }

  private setupListeners(): void {
    this.wss.on('connection', (ws: ExtendedWebSocket) => {
      ws.isAlive = true;

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Send initial snapshot on connect
      if (this.latestState) {
        this.sendToClient(ws, {
          type: 'GAME_STATE',
          state: this.latestState,
        });
      }

      ws.on('message', (data: string) => {
        try {
          const message: ClientMessage = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (err) {
          // Ignore malformed packets
        }
      });

      ws.on('error', (err) => {
        console.error('[WebSocket] Client error:', err.message);
      });
    });
  }

  private handleClientMessage(ws: ExtendedWebSocket, msg: ClientMessage): void {
    switch (msg.type) {
      case 'PING':
        this.sendToClient(ws, { type: 'PONG', timestamp: Date.now() });
        break;

      case 'DEV_SIMULATE_GIFT': {
        const giftEvent: GiftEvent = {
          id: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          giftId: msg.giftName.toLowerCase(),
          giftName: msg.giftName,
          senderId: `dev_${(msg.username || 'DevUser').toLowerCase()}`,
          senderUsername: msg.username || 'DevUser',
          repeatCount: Math.max(1, msg.repeatCount || 1),
          timestamp: Date.now(),
        };
        this.eventQueue.enqueue(giftEvent);
        break;
      }
    }
  }

  private setupEventBusSubscriptions(): void {
    // Cache latest state
    this.eventBus.on('stateChanged', (state: GameState) => {
      this.latestState = state;
    });

    // Broadcast instant discrete events
    this.eventBus.on('gift', (gift: GiftEvent) => {
      this.broadcast({
        type: 'GIFT_EVENT',
        gift,
      });
    });

    this.eventBus.on('effect', (effect: EffectEvent) => {
      this.broadcast({
        type: 'EFFECT',
        effect,
      });
    });

    this.eventBus.on('death', (death: DeathInfo) => {
      this.broadcast({
        type: 'DEATH',
        death,
      });
    });
  }

  private startSnapshotBroadcasting(intervalMs: number): void {
    this.snapshotInterval = setInterval(() => {
      if (this.latestState && this.wss.clients.size > 0) {
        const payload = JSON.stringify({
          type: 'GAME_STATE',
          state: this.latestState,
        } as ServerMessage);

        for (const client of this.wss.clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
          }
        }
      }
    }, intervalMs);
  }

  private startHeartbeat(intervalMs: number): void {
    this.heartbeatInterval = setInterval(() => {
      for (const client of this.wss.clients) {
        const extWs = client as ExtendedWebSocket;
        if (!extWs.isAlive) {
          client.terminate();
          continue;
        }
        extWs.isAlive = false;
        client.ping();
      }
    }, intervalMs);
  }

  broadcast(message: ServerMessage): void {
    const payload = JSON.stringify(message);
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  private sendToClient(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  close(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.snapshotInterval) clearInterval(this.snapshotInterval);
    this.wss.close();
  }
}
