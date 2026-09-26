import { SnakeState, Point, Direction } from '@snake-live/shared';
import { CanvasManager } from '../canvas/CanvasManager';

export class SnakeRenderer {
  constructor(private canvasMgr: CanvasManager) {}

  render(
    snake: SnakeState,
    prevBody: Point[] | undefined,
    alpha: number,
    timestamp: number
  ): void {
    if (!snake || snake.body.length === 0) return;

    const ctx = this.canvasMgr.getContext();
    const bounds = this.canvasMgr.getBoardBounds();
    const cs = bounds.cellSize;

    // Calculate interpolated segment positions
    const renderPoints: { x: number; y: number }[] = [];

    for (let i = 0; i < snake.body.length; i++) {
      const curr = snake.body[i];
      const prev = prevBody && prevBody[i] ? prevBody[i] : curr;

      // Handle wrap/large jumps gracefully
      let ix = prev.x + (curr.x - prev.x) * alpha;
      let iy = prev.y + (curr.y - prev.y) * alpha;

      const px = bounds.x + ix * cs + cs / 2;
      const py = bounds.y + iy * cs + cs / 2;
      renderPoints.push({ x: px, y: py });
    }

    ctx.save();

    // 1. Draw glowing outer trail / body line
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = renderPoints.length - 1; i >= 0; i--) {
      const pt = renderPoints[i];
      const ratio = 1 - i / Math.max(1, renderPoints.length);
      const radius = (cs * 0.42) * (0.65 + ratio * 0.35);

      // Glowing body segment
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);

      // Gradient from head (cyan) to tail (emerald green)
      const r = Math.floor(0 + ratio * 0);
      const g = Math.floor(255 - ratio * 15);
      const b = Math.floor(136 + ratio * 119);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

      if (i === 0) {
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#00f0ff';
      } else {
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(0, 255, 136, 0.4)';
      }
      ctx.fill();

      // Inner highlight
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.shadowBlur = 0;
      ctx.fill();
    }

    // 2. Draw Head Details (Eyes & Flickering Tongue)
    const head = renderPoints[0];
    if (head) {
      this.renderHeadDetails(ctx, head, snake.direction, cs, timestamp);
    }

    ctx.restore();
  }

  private renderHeadDetails(
    ctx: CanvasRenderingContext2D,
    head: { x: number; y: number },
    dir: Direction,
    cellSize: number,
    timestamp: number
  ): void {
    const eyeOffset = cellSize * 0.22;
    const eyeRadius = cellSize * 0.12;
    const pupilRadius = cellSize * 0.06;

    let leftEye = { x: 0, y: 0 };
    let rightEye = { x: 0, y: 0 };
    let tongueBase = { x: 0, y: 0 };
    let tongueTip = { x: 0, y: 0 };

    switch (dir) {
      case 'UP':
        leftEye = { x: head.x - eyeOffset, y: head.y - eyeOffset * 0.5 };
        rightEye = { x: head.x + eyeOffset, y: head.y - eyeOffset * 0.5 };
        tongueBase = { x: head.x, y: head.y - cellSize * 0.45 };
        tongueTip = { x: head.x, y: head.y - cellSize * 0.85 };
        break;
      case 'DOWN':
        leftEye = { x: head.x + eyeOffset, y: head.y + eyeOffset * 0.5 };
        rightEye = { x: head.x - eyeOffset, y: head.y + eyeOffset * 0.5 };
        tongueBase = { x: head.x, y: head.y + cellSize * 0.45 };
        tongueTip = { x: head.x, y: head.y + cellSize * 0.85 };
        break;
      case 'LEFT':
        leftEye = { x: head.x - eyeOffset * 0.5, y: head.y + eyeOffset };
        rightEye = { x: head.x - eyeOffset * 0.5, y: head.y - eyeOffset };
        tongueBase = { x: head.x - cellSize * 0.45, y: head.y };
        tongueTip = { x: head.x - cellSize * 0.85, y: head.y };
        break;
      case 'RIGHT':
        leftEye = { x: head.x + eyeOffset * 0.5, y: head.y - eyeOffset };
        rightEye = { x: head.x + eyeOffset * 0.5, y: head.y + eyeOffset };
        tongueBase = { x: head.x + cellSize * 0.45, y: head.y };
        tongueTip = { x: head.x + cellSize * 0.85, y: head.y };
        break;
    }

    // Eyes
    for (const eye of [leftEye, rightEye]) {
      ctx.beginPath();
      ctx.arc(eye.x, eye.y, eyeRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#fff';
      ctx.fill();

      // Pupils looking outward in direction
      ctx.beginPath();
      ctx.arc(eye.x, eye.y, pupilRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#06080d';
      ctx.shadowBlur = 0;
      ctx.fill();
    }

    // Flickering Tongue (periodic animation)
    const tongueFlick = Math.sin(timestamp * 0.015) > 0.5;
    if (tongueFlick) {
      ctx.beginPath();
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 2.5;
      ctx.moveTo(tongueBase.x, tongueBase.y);
      ctx.lineTo(tongueTip.x, tongueTip.y);
      ctx.stroke();
    }
  }
}
