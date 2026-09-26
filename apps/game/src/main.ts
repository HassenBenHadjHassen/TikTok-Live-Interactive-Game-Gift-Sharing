import { GameState, Point, GiftEvent, EffectEvent, DeathInfo } from '@snake-live/shared';
import { CanvasManager } from './canvas/CanvasManager';
import { GridRenderer } from './rendering/GridRenderer';
import { SnakeRenderer } from './rendering/SnakeRenderer';
import { HazardRenderer } from './rendering/HazardRenderer';
import { ParticleSystem } from './particles/ParticleSystem';
import { AudioManager } from './audio/AudioManager';
import { GameSocketClient } from './websocket/GameSocketClient';
import { UIManager } from './ui/UIManager';

class GameApp {
  private canvasMgr: CanvasManager;
  private gridRenderer: GridRenderer;
  private snakeRenderer: SnakeRenderer;
  private hazardRenderer: HazardRenderer;
  private particles: ParticleSystem;
  private audio: AudioManager;
  private socketClient: GameSocketClient;
  private ui: UIManager;

  private latestState: GameState | null = null;
  private prevSnakeBody: Point[] = [];
  private lastSnapshotTimestamp: number = 0;
  private snapshotDurationMs: number = 75; // dynamic average tick interval

  private frameCount: number = 0;
  private lastFpsCalcTime: number = 0;
  private currentFps: number = 60;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.canvasMgr = new CanvasManager(canvas, 27, 36);
    this.gridRenderer = new GridRenderer(this.canvasMgr, 27, 36);
    this.snakeRenderer = new SnakeRenderer(this.canvasMgr);
    this.hazardRenderer = new HazardRenderer(this.canvasMgr);
    this.particles = new ParticleSystem();
    this.audio = new AudioManager();

    // Initialize WebSocket client
    this.socketClient = new GameSocketClient({
      onState: (state) => this.handleServerState(state),
      onGift: (gift) => this.handleGift(gift),
      onEffect: (effect) => this.handleEffect(effect),
      onDeath: (death) => this.handleDeath(death),
      onStatusChange: (status) => this.ui.setWsStatus(status),
    });

    this.ui = new UIManager(this.socketClient);

    // Audio context gesture unlock on window click/tap
    window.addEventListener(
      'pointerdown',
      () => {
        this.audio.playSound('EAT');
      },
      { once: true }
    );
  }

  start(): void {
    this.socketClient.connect();
    requestAnimationFrame((t) => this.loop(t));
  }

  private handleServerState(state: GameState): void {
    const now = performance.now();
    if (this.lastSnapshotTimestamp > 0) {
      const delta = now - this.lastSnapshotTimestamp;
      this.snapshotDurationMs = this.snapshotDurationMs * 0.8 + delta * 0.2;
    }
    this.lastSnapshotTimestamp = now;

    if (this.latestState) {
      this.prevSnakeBody = this.latestState.snake.body.map((p) => ({ ...p }));
    } else {
      this.prevSnakeBody = state.snake.body.map((p) => ({ ...p }));
    }

    this.latestState = state;
    this.audio.updatePhaseMusic(state.status);
  }

  private handleGift(gift: GiftEvent): void {
    this.ui.showGiftNotification(gift);
    this.audio.playSound('GIFT');
  }

  private handleEffect(effect: EffectEvent): void {
    if (effect.sound) {
      this.audio.playSound(effect.sound);
    }

    if (effect.type === 'EXPLOSION') {
      this.canvasMgr.addTrauma(0.5);
      if (effect.position) {
        const pt = this.canvasMgr.gridToPixel(effect.position);
        this.particles.spawnExplosion(pt.x, pt.y, '#ff1a40', 45);
      }
    } else if (effect.type === 'DEATH') {
      this.canvasMgr.addTrauma(0.9);
      if (effect.position) {
        const pt = this.canvasMgr.gridToPixel(effect.position);
        this.particles.spawnDeathBurst(pt.x, pt.y);
      }
    } else if (effect.type === 'APOCALYPSE') {
      this.canvasMgr.addTrauma(0.7);
    }
  }

  private handleDeath(_death: DeathInfo): void {
    this.audio.playSound('DEATH');
  }

  private loop(timestamp: number): void {
    // 1. Calculate FPS
    this.frameCount++;
    if (timestamp - this.lastFpsCalcTime >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsCalcTime = timestamp;
    }

    // 2. Begin canvas frame & apply screen shake
    this.canvasMgr.beginFrame();

    if (this.latestState) {
      // Compute interpolation factor alpha [0.0 ... 1.0]
      const elapsed = performance.now() - this.lastSnapshotTimestamp;
      const alpha = Math.min(1.0, elapsed / Math.max(30, this.snapshotDurationMs));

      // Render grid background
      this.gridRenderer.render(
        this.latestState.status,
        this.latestState.dangerLevel,
        timestamp
      );

      // Render foods
      this.hazardRenderer.renderFood(this.latestState.food, timestamp);

      // Render obstacles
      this.hazardRenderer.renderObstacles(this.latestState.obstacles);

      // Render hazards & bombs
      this.hazardRenderer.renderHazards(this.latestState.hazards, timestamp);

      // Render enemies
      this.hazardRenderer.renderEnemies(this.latestState.enemies, timestamp);

      // Render smooth interpolated snake
      this.snakeRenderer.render(
        this.latestState.snake,
        this.prevSnakeBody,
        alpha,
        timestamp
      );

      // Spawn subtle particle trail from snake head while alive
      if (this.latestState.snake.isAlive && this.latestState.snake.body.length > 0) {
        const head = this.latestState.snake.body[0];
        const headPixel = this.canvasMgr.gridToPixel(head);
        const cs = this.canvasMgr.getBoardBounds().cellSize;
        this.particles.spawnSnakeTrail(headPixel.x + cs / 2, headPixel.y + cs / 2);
      }

      // Update HUD elements
      this.ui.updateHUD(this.latestState, this.currentFps);
    }

    // Update and render particles
    this.particles.update();
    this.particles.render(this.canvasMgr.getContext());

    // End canvas frame
    this.canvasMgr.endFrame();

    requestAnimationFrame((t) => this.loop(t));
  }
}

// Bootstrap Game Application
const app = new GameApp();
app.start();
