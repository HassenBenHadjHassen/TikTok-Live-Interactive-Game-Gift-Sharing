export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  fadeRate: number;
  glow: boolean;
}

export class ParticleSystem {
  private pool: Particle[] = [];
  private readonly MAX_PARTICLES = 400;

  constructor() {
    // Pre-allocate particle pool to prevent GC frame drops
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.pool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 2,
        color: '#fff',
        alpha: 1,
        fadeRate: 0.02,
        glow: false,
      });
    }
  }

  spawnExplosion(x: number, y: number, color: string = '#ff0055', count: number = 30): void {
    let spawned = 0;
    for (const p of this.pool) {
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 2;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.size = Math.random() * 6 + 3;
        p.color = Math.random() < 0.3 ? '#ffd000' : color;
        p.alpha = 1.0;
        p.fadeRate = Math.random() * 0.03 + 0.02;
        p.glow = true;

        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  spawnFoodPickup(x: number, y: number, color: string = '#00ff88', count: number = 15): void {
    let spawned = 0;
    for (const p of this.pool) {
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed - 1.5; // slight upward lift
        p.size = Math.random() * 4 + 2;
        p.color = color;
        p.alpha = 1.0;
        p.fadeRate = 0.04;
        p.glow = true;

        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  spawnSnakeTrail(x: number, y: number, color: string = '#00f0ff'): void {
    for (const p of this.pool) {
      if (!p.active) {
        p.active = true;
        p.x = x + (Math.random() * 6 - 3);
        p.y = y + (Math.random() * 6 - 3);
        p.vx = (Math.random() - 0.5) * 0.6;
        p.vy = (Math.random() - 0.5) * 0.6;
        p.size = Math.random() * 3 + 2;
        p.color = color;
        p.alpha = 0.6;
        p.fadeRate = 0.05;
        p.glow = false;
        break;
      }
    }
  }

  spawnDeathBurst(x: number, y: number): void {
    this.spawnExplosion(x, y, '#ff1a40', 80);
    this.spawnExplosion(x, y, '#ffd000', 40);
  }

  update(): void {
    for (const p of this.pool) {
      if (p.active) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.alpha -= p.fadeRate;

        if (p.alpha <= 0) {
          p.active = false;
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.pool) {
      if (p.active) {
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;

        if (p.glow) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  clear(): void {
    for (const p of this.pool) {
      p.active = false;
    }
  }
}
