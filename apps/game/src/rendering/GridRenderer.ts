import { CanvasManager } from '../canvas/CanvasManager';
import { GameStatus } from '@snake-live/shared';

export class GridRenderer {
  constructor(
    private canvasMgr: CanvasManager,
    private gridWidth: number = 27,
    private gridHeight: number = 36
  ) {}

  render(status: GameStatus, dangerLevel: number, timestamp: number): void {
    const ctx = this.canvasMgr.getContext();
    const bounds = this.canvasMgr.getBoardBounds();

    ctx.save();

    // 1. Board background fill
    ctx.fillStyle = 'rgba(10, 13, 20, 0.95)';
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // 2. Subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= this.gridWidth; x++) {
      const px = bounds.x + x * bounds.cellSize;
      ctx.beginPath();
      ctx.moveTo(px, bounds.y);
      ctx.lineTo(px, bounds.y + bounds.height);
      ctx.stroke();
    }

    for (let y = 0; y <= this.gridHeight; y++) {
      const py = bounds.y + y * bounds.cellSize;
      ctx.beginPath();
      ctx.moveTo(bounds.x, py);
      ctx.lineTo(bounds.x + bounds.width, py);
      ctx.stroke();
    }

    // 3. Dynamic glowing boundary border
    let borderColor = 'rgba(0, 240, 255, 0.4)';
    let shadowBlur = 10;

    if (status === 'APOCALYPSE') {
      const pulse = (Math.sin(timestamp * 0.01) + 1) / 2;
      borderColor = `rgba(255, 26, 64, ${0.6 + pulse * 0.4})`;
      shadowBlur = 24 + pulse * 12;
    } else if (dangerLevel >= 70) {
      borderColor = 'rgba(255, 0, 119, 0.6)';
      shadowBlur = 18;
    } else if (dangerLevel >= 40) {
      borderColor = 'rgba(255, 119, 0, 0.5)';
      shadowBlur = 14;
    }

    ctx.strokeStyle = borderColor;
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = shadowBlur;
    ctx.lineWidth = 3;
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

    ctx.restore();
  }
}
