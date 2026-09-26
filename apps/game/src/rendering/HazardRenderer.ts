import { Food, Obstacle, Enemy, Hazard } from '@snake-live/shared';
import { CanvasManager } from '../canvas/CanvasManager';

export class HazardRenderer {
  constructor(private canvasMgr: CanvasManager) {}

  renderFood(foods: Food[], timestamp: number): void {
    const ctx    = this.canvasMgr.getContext();
    const bounds = this.canvasMgr.getBoardBounds();
    const cs     = bounds.cellSize;

    for (const f of foods) {
      const px  = bounds.x + f.position.x * cs + cs / 2;
      const py  = bounds.y + f.position.y * cs + cs / 2;
      const bob = Math.sin(timestamp * 0.006 + f.position.x * 2) * 2;

      ctx.save();
      ctx.translate(px, py + bob);

      if (f.type === 'GOLDEN_FOOD') {
        const glow = 12 + Math.sin(timestamp * 0.01) * 6;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur  = glow;
        ctx.fillStyle   = '#ffd700';
        ctx.beginPath();
        ctx.arc(0, 0, cs * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, cs * 0.18, 0, Math.PI * 2);
        ctx.fill();
      } else if (f.type === 'DANGEROUS_FOOD') {
        ctx.shadowColor = '#aa00ff';
        ctx.shadowBlur  = 12;
        ctx.fillStyle   = '#aa00ff';
        ctx.beginPath();
        ctx.arc(0, 0, cs * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.font          = `${Math.floor(cs * 0.5)}px sans-serif`;
        ctx.textAlign     = 'center';
        ctx.textBaseline  = 'middle';
        ctx.fillText('💀', 0, 0);
      } else {
        ctx.shadowColor = '#ff2255';
        ctx.shadowBlur  = 10;
        ctx.fillStyle   = '#ff2255';
        ctx.beginPath();
        ctx.arc(0, 0, cs * 0.34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff99aa';
        ctx.beginPath();
        ctx.arc(-cs * 0.1, -cs * 0.1, cs * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  renderObstacles(obstacles: Obstacle[]): void {
    const ctx    = this.canvasMgr.getContext();
    const bounds = this.canvasMgr.getBoardBounds();
    const cs     = bounds.cellSize;

    for (const obs of obstacles) {
      const px = bounds.x + obs.position.x * cs;
      const py = bounds.y + obs.position.y * cs;

      ctx.save();

      // Cyber barrier block
      ctx.fillStyle = '#1e2433';
      ctx.fillRect(px + 2, py + 2, cs - 4, cs - 4);

      // Warning hazard border
      ctx.strokeStyle = '#ffd000';
      ctx.lineWidth   = 2.5;
      ctx.strokeRect(px + 2, py + 2, cs - 4, cs - 4);

      // Diagonal stripes
      ctx.beginPath();
      ctx.moveTo(px + 4, py + cs - 4);
      ctx.lineTo(px + cs - 4, py + 4);
      ctx.strokeStyle = 'rgba(255, 208, 0, 0.4)';
      ctx.lineWidth   = 1.5;
      ctx.stroke();

      // @username label above obstacle — validates the sender
      if (obs.createdBy) {
        this.drawEntityLabel(ctx, `@${obs.createdBy}`, px + cs / 2, py - 4, '#ffd000');
      }

      ctx.restore();
    }
  }

  renderHazards(hazards: Hazard[], timestamp: number): void {
    const ctx    = this.canvasMgr.getContext();
    const bounds = this.canvasMgr.getBoardBounds();
    const cs     = bounds.cellSize;

    for (const h of hazards) {
      const px = bounds.x + h.position.x * cs + cs / 2;
      const py = bounds.y + h.position.y * cs + cs / 2;

      ctx.save();
      ctx.translate(px, py);

      if (h.type === 'BOMB') {
        if (h.isExploding) {
          // Explosion shockwave ring
          const radius = h.radius * cs * 1.2;
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.fillStyle   = 'rgba(255, 50, 50, 0.4)';
          ctx.shadowColor = '#ff2200';
          ctx.shadowBlur  = 25;
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth   = 4;
          ctx.stroke();
        } else {
          // Pulsing blast zone warning radius
          const blastRadius = h.radius * cs;
          const pulse = (Math.sin(timestamp * 0.015) + 1) / 2;
          ctx.beginPath();
          ctx.arc(0, 0, blastRadius, 0, Math.PI * 2);
          ctx.fillStyle   = `rgba(255, 26, 64, ${0.07 + pulse * 0.1})`;
          ctx.strokeStyle = `rgba(255, 26, 64, ${0.25 + pulse * 0.4})`;
          ctx.lineWidth   = 1.5;
          ctx.fill();
          ctx.stroke();

          // Bomb body
          ctx.beginPath();
          ctx.arc(0, 0, cs * 0.38, 0, Math.PI * 2);
          ctx.fillStyle   = '#141822';
          ctx.shadowColor = '#ff1a40';
          ctx.shadowBlur  = 12;
          ctx.fill();
          ctx.strokeStyle = '#ff1a40';
          ctx.lineWidth   = 2;
          ctx.stroke();

          // Countdown digit
          if (h.countdown !== undefined) {
            ctx.fillStyle      = '#fff';
            ctx.font           = `bold ${Math.floor(cs * 0.45)}px 'Outfit', sans-serif`;
            ctx.textAlign      = 'center';
            ctx.textBaseline   = 'middle';
            ctx.shadowBlur     = 0;
            ctx.fillText(String(Math.ceil(h.countdown / 2)), 0, 1);
          }

          // @username above bomb
          if (h.createdBy) {
            ctx.restore();
            ctx.save();
            this.drawEntityLabel(ctx, `@${h.createdBy}`, px, py - cs * 0.55, '#ff1a40');
          }
        }
      } else {
        // Acid / Fire zone
        const radius = (h.radius + 0.5) * cs;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle   = 'rgba(0, 255, 136, 0.22)';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur  = 14;
        ctx.fill();
      }

      ctx.restore();
    }
  }

  renderEnemies(enemies: Enemy[], timestamp: number): void {
    const ctx    = this.canvasMgr.getContext();
    const bounds = this.canvasMgr.getBoardBounds();
    const cs     = bounds.cellSize;

    for (const enemy of enemies) {
      const px    = bounds.x + enemy.position.x * cs + cs / 2;
      const py    = bounds.y + enemy.position.y * cs + cs / 2;
      const pulse = Math.sin(timestamp * 0.01) * 2;

      ctx.save();
      ctx.translate(px, py);

      // Menacing red aura + lion
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur  = 20;
      ctx.fillStyle   = '#ff0055';
      ctx.beginPath();
      ctx.arc(0, 0, cs * 0.45 + pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.font         = `${Math.floor(cs * 0.6)}px sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🦁', 0, 1);

      // @username above enemy — prominent on-screen validation
      ctx.restore();
      ctx.save();
      if (enemy.createdBy) {
        this.drawEntityLabel(ctx, `@${enemy.createdBy}`, px, py - cs * 0.65, '#ff0055');
      }

      ctx.restore();
    }
  }

  /**
   * Draws a small pill-shaped username label above an entity.
   * This is how viewers see their name appear on the game board.
   */
  private drawEntityLabel(
    ctx: CanvasRenderingContext2D,
    text: string,
    cx: number,
    cy: number,
    accentColor: string
  ): void {
    const fontSize = 11;
    ctx.save();
    ctx.font         = `bold ${fontSize}px 'Inter', sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';

    const measured = ctx.measureText(text).width;
    const padX     = 6;
    const padY     = 3;
    const w        = measured + padX * 2;
    const h        = fontSize + padY * 2;
    const rx       = 5;

    const bx = cx - w / 2;
    const by = cy - h;

    // Background pill
    ctx.fillStyle   = 'rgba(6, 8, 13, 0.82)';
    ctx.shadowBlur  = 0;
    ctx.beginPath();
    ctx.roundRect(bx, by, w, h, rx);
    ctx.fill();

    // Accent border
    ctx.strokeStyle = accentColor;
    ctx.lineWidth   = 1.2;
    ctx.stroke();

    // Text
    ctx.fillStyle  = '#ffffff';
    ctx.shadowBlur = 4;
    ctx.shadowColor = accentColor;
    ctx.fillText(text, cx, by + h - padY);

    ctx.restore();
  }
}
