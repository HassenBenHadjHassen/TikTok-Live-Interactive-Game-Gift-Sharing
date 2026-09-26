import {
  ServerMessage,
  ClientMessage,
  GameState,
  GiftEvent,
  EffectEvent,
  DeathInfo,
} from '@snake-live/shared';

export interface GameSocketListeners {
  onState: (state: GameState) => void;
  onGift: (gift: GiftEvent) => void;
  onEffect: (effect: EffectEvent) => void;
  onDeath: (death: DeathInfo) => void;
  onStatusChange: (status: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING') => void;
}

export class GameSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private url: string;

  constructor(
    private listeners: GameSocketListeners,
    customUrl?: string
  ) {
    if (customUrl) {
      this.url = customUrl;
    } else {
      const loc = window.location;
      const wsProto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
      // In development, Vite runs on 5173 while server runs on 3001
      const host = loc.hostname;
      const port = (import.meta as any).env?.VITE_SERVER_WS_URL || `${wsProto}//${host}:3001/ws`;
      this.url = port;
    }
  }

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.listeners.onStatusChange(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING' as any);
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.listeners.onStatusChange('CONNECTED');
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: ServerMessage = JSON.parse(event.data);
          this.handleServerMessage(msg);
        } catch (err) {
          // ignore parsing error
        }
      };

      this.ws.onclose = () => {
        this.cleanupHeartbeat();
        this.listeners.onStatusChange('DISCONNECTED');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        if (this.ws) this.ws.close();
      };
    } catch (err) {
      this.scheduleReconnect();
    }
  }

  send(message: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private handleServerMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case 'GAME_STATE':
        this.listeners.onState(msg.state);
        break;
      case 'GIFT_EVENT':
        this.listeners.onGift(msg.gift);
        break;
      case 'EFFECT':
        this.listeners.onEffect(msg.effect);
        break;
      case 'DEATH':
        this.listeners.onDeath(msg.death);
        break;
      case 'PONG':
        break;
    }
  }

  private startHeartbeat(): void {
    this.cleanupHeartbeat();
    this.pingInterval = setInterval(() => {
      this.send({ type: 'PING', timestamp: Date.now() });
    }, 15000);
  }

  private cleanupHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectAttempts++;
    const delay = Math.min(5000, 500 * Math.pow(1.5, this.reconnectAttempts));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  disconnect(): void {
    this.cleanupHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
