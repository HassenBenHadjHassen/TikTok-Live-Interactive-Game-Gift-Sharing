import { Point } from '@snake-live/shared';
import { CANVAS_VIRTUAL_WIDTH, CANVAS_VIRTUAL_HEIGHT } from '@snake-live/shared';

export interface BoardBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  cellSize: number;
}

export class CanvasManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private trauma: number = 0;
  private readonly MAX_OFFSET = 18;
  private readonly MAX_ANGLE = 0.03; // radians
  private boardBounds: BoardBounds;

  constructor(canvas: HTMLCanvasElement, gridWidth: number = 27, gridHeight: number = 36) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Could not get 2D rendering context');
    this.ctx = context;

    // Fixed virtual resolution of 1080x1920
    this.canvas.width = CANVAS_VIRTUAL_WIDTH;
    this.canvas.height = CANVAS_VIRTUAL_HEIGHT;

    // Calculate centered board dimensions
    const cellSize = 36;
    const boardWidth = gridWidth * cellSize;
    const boardHeight = gridHeight * cellSize;
    const boardX = Math.floor((CANVAS_VIRTUAL_WIDTH - boardWidth) / 2);
    const boardY = 170; // reduced — slimmer header without stats/danger meter

    this.boardBounds = {
      x: boardX,
      y: boardY,
      width: boardWidth,
      height: boardHeight,
      cellSize,
    };
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  getBoardBounds(): BoardBounds {
    return this.boardBounds;
  }

  /**
   * Convert grid point (gx, gy) to virtual canvas pixel coordinates
   */
  gridToPixel(p: Point): { x: number; y: number } {
    return {
      x: this.boardBounds.x + p.x * this.boardBounds.cellSize,
      y: this.boardBounds.y + p.y * this.boardBounds.cellSize,
    };
  }

  /**
   * Add screen shake trauma (0.0 to 1.0)
   */
  addTrauma(amount: number): void {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  /**
   * Pre-render pass: clears canvas and applies screen shake transforms
   */
  beginFrame(): void {
    this.ctx.clearRect(0, 0, CANVAS_VIRTUAL_WIDTH, CANVAS_VIRTUAL_HEIGHT);
    this.ctx.save();

    // Decay trauma over time
    if (this.trauma > 0) {
      const shakeFactor = this.trauma * this.trauma;
      const offsetX = (Math.random() * 2 - 1) * this.MAX_OFFSET * shakeFactor;
      const offsetY = (Math.random() * 2 - 1) * this.MAX_OFFSET * shakeFactor;
      const angle = (Math.random() * 2 - 1) * this.MAX_ANGLE * shakeFactor;

      this.ctx.translate(CANVAS_VIRTUAL_WIDTH / 2, CANVAS_VIRTUAL_HEIGHT / 2);
      this.ctx.rotate(angle);
      this.ctx.translate(-CANVAS_VIRTUAL_WIDTH / 2 + offsetX, -CANVAS_VIRTUAL_HEIGHT / 2 + offsetY);

      this.trauma = Math.max(0, this.trauma - 0.025);
    }
  }

  /**
   * Post-render pass
   */
  endFrame(): void {
    this.ctx.restore();
  }
}
