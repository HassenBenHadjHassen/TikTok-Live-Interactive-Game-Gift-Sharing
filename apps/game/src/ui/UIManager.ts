import { GameState, GiftEvent, DeathInfo } from '@snake-live/shared';
import { GameSocketClient } from '../websocket/GameSocketClient';

/** Gift tiers — drives visual style */
type GiftTier = 'normal' | 'danger' | 'ultimate';

interface GiftConfig {
  icon: string;
  tier: GiftTier;
  effectLabel: string;  // short description shown on card
  splashAction: string; // shown in big center splash (danger/ultimate only)
}

const GIFT_CONFIGS: Record<string, GiftConfig> = {
  Rose:     { icon: '🌹', tier: 'normal',   effectLabel: 'Spawned an obstacle!',      splashAction: '' },
  Heart:    { icon: '❤️', tier: 'normal',   effectLabel: 'Made the snake faster!',    splashAction: '' },
  Gift:     { icon: '🎁', tier: 'normal',   effectLabel: 'Stole the snake\'s food!',  splashAction: '' },
  Tiger:    { icon: '🐯', tier: 'danger',   effectLabel: 'Dropped BOMBS! 💣',         splashAction: 'DROPPED BOMBS! 💣' },
  Lion:     { icon: '🦁', tier: 'danger',   effectLabel: 'Unleashed a HUNTER!',       splashAction: 'UNLEASHED A HUNTER!' },
  Universe: { icon: '🌌', tier: 'ultimate', effectLabel: '☠️ APOCALYPSE MODE!',       splashAction: '☠️ APOCALYPSE ACTIVATED!' },
};

export class UIManager {
  private timerEl       = document.getElementById('timer-val')!;
  private phaseBadgeEl  = document.getElementById('phase-badge')!;
  private notifStackEl  = document.getElementById('gift-notifications')!;
  private leaderboardEl = document.getElementById('leaderboard-list')!;
  private deathModalEl  = document.getElementById('death-modal')!;
  private deathKillerNameEl = document.getElementById('death-killer-name')!;
  private deathKillerGiftEl = document.getElementById('death-killer-gift')!;
  private deathTimeEl   = document.getElementById('death-time')!;
  private deathScoreEl  = document.getElementById('death-score')!;
  private deathCntEl    = document.getElementById('restart-countdown')!;
  private apocalypseBannerEl = document.getElementById('apocalypse-banner')!;

  // Gift splash overlay
  private splashEl       = document.getElementById('gift-splash')!;
  private splashIconEl   = document.getElementById('splash-icon')!;
  private splashUserEl   = document.getElementById('splash-username')!;
  private splashActionEl = document.getElementById('splash-action')!;
  private splashTimer: ReturnType<typeof setTimeout> | null = null;

  // Debug panel
  private dbgFpsEl     = document.getElementById('dbg-fps');
  private dbgStatusEl  = document.getElementById('dbg-status');
  private dbgSpeedEl   = document.getElementById('dbg-speed');
  private dbgLenEl     = document.getElementById('dbg-len');
  private dbgObsEl     = document.getElementById('dbg-obs');
  private dbgEnemiesEl = document.getElementById('dbg-enemies');
  private dbgHazardsEl = document.getElementById('dbg-hazards');
  private dbgWsEl      = document.getElementById('dbg-ws');

  private autoSimActive = false;

  constructor(private socketClient: GameSocketClient) {
    this.setupDevPanel();
  }

  // ─── HUD update ────────────────────────────────────────────────
  updateHUD(state: GameState, fps: number): void {
    // Survival timer
    const mins = Math.floor(state.survivalTime / 60).toString().padStart(2, '0');
    const secs = (state.survivalTime % 60).toString().padStart(2, '0');
    this.timerEl.textContent = `${mins}:${secs}`;

    // Phase badge
    const ph = state.status.toLowerCase();
    this.phaseBadgeEl.textContent = state.status;
    this.phaseBadgeEl.className = `phase-tag ${ph}`;

    // Apocalypse banner
    if (state.status === 'APOCALYPSE') {
      this.apocalypseBannerEl.classList.remove('hidden');
    } else {
      this.apocalypseBannerEl.classList.add('hidden');
    }

    // Death / Results modal
    if (state.status === 'DEAD' || state.status === 'RESULTS' || state.status === 'RESTARTING') {
      this.deathModalEl.classList.remove('hidden');
      if (state.lastDeath) {
        this.deathKillerNameEl.textContent = state.lastDeath.killerUsername
          ? `@${state.lastDeath.killerUsername}`
          : state.lastDeath.isAmbiguous
          ? '⚔️ Viewer Mob'
          : '💥 Hazard Impact';
        this.deathKillerGiftEl.textContent = state.lastDeath.killerGift
          ? GIFT_CONFIGS[state.lastDeath.killerGift]
            ? `${GIFT_CONFIGS[state.lastDeath.killerGift].icon} ${state.lastDeath.killerGift}`
            : state.lastDeath.killerGift
          : `Cause: ${state.lastDeath.cause}`;
      }
      this.deathTimeEl.textContent  = `${mins}:${secs}`;
      this.deathScoreEl.textContent = state.score.toLocaleString();

      const remainSecs = Math.max(0, Math.ceil((6000 - state.timeInCurrentStatus) / 1000));
      this.deathCntEl.textContent = String(remainSecs);
    } else {
      this.deathModalEl.classList.add('hidden');
    }

    // Leaderboard
    this.updateLeaderboard(state.leaderboard);

    // Debug stats
    if (this.dbgFpsEl)     this.dbgFpsEl.textContent     = String(fps);
    if (this.dbgStatusEl)  this.dbgStatusEl.textContent  = state.status;
    if (this.dbgSpeedEl)   this.dbgSpeedEl.textContent   = `${state.snake.speed.toFixed(1)}x`;
    if (this.dbgLenEl)     this.dbgLenEl.textContent     = String(state.snake.length);
    if (this.dbgObsEl)     this.dbgObsEl.textContent     = String(state.obstacles.length);
    if (this.dbgEnemiesEl) this.dbgEnemiesEl.textContent = String(state.enemies.length);
    if (this.dbgHazardsEl) this.dbgHazardsEl.textContent = String(state.hazards.length);
  }

  // ─── Gift notification (tiered) ────────────────────────────────
  showGiftNotification(gift: GiftEvent): void {
    const cfg = GIFT_CONFIGS[gift.giftName] ?? {
      icon: '🎁',
      tier: 'normal' as GiftTier,
      effectLabel: `sent ${gift.giftName}`,
      splashAction: '',
    };

    // Always show side card
    this.showSideCard(gift, cfg);

    // For danger / ultimate: show center splash
    if (cfg.tier === 'danger' || cfg.tier === 'ultimate') {
      this.showCenterSplash(gift, cfg);
    }
  }

  // Small card on the right side — validates the sender instantly
  private showSideCard(gift: GiftEvent, cfg: GiftConfig): void {
    const card = document.createElement('div');
    card.className = `gift-card-notification tier-${cfg.tier === 'normal' ? '' : cfg.tier}`.trim();

    const repeatLabel = gift.repeatCount > 1 ? ` ×${gift.repeatCount}` : '';

    card.innerHTML = `
      <div class="gift-card-icon">${cfg.icon}</div>
      <div class="gift-card-info">
        <span class="gift-card-user tier-${cfg.tier === 'normal' ? '' : cfg.tier}">@${gift.senderUsername}</span>
        <span class="gift-card-desc">${gift.giftName}${repeatLabel}</span>
        <span class="gift-card-effect">${cfg.effectLabel}</span>
      </div>
    `;

    this.notifStackEl.prepend(card);

    // Cap at 5 visible
    while (this.notifStackEl.children.length > 5) {
      this.notifStackEl.lastElementChild?.remove();
    }

    // Fade out after 3.5s
    const displayMs = cfg.tier === 'ultimate' ? 4500 : 3200;
    setTimeout(() => {
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.opacity = '0';
      card.style.transform = 'translateX(60px)';
      setTimeout(() => card.remove(), 400);
    }, displayMs);
  }

  // Big center-screen splash for big gifts — makes sender feel like a star
  private showCenterSplash(gift: GiftEvent, cfg: GiftConfig): void {
    // Cancel any existing splash timer
    if (this.splashTimer !== null) {
      clearTimeout(this.splashTimer);
    }

    // Populate
    this.splashIconEl.textContent   = cfg.icon;
    this.splashUserEl.textContent   = `@${gift.senderUsername}`;
    this.splashActionEl.textContent = cfg.splashAction;

    // Style by tier
    this.splashEl.className = `gift-splash tier-${cfg.tier}`;

    // Animate in by briefly removing/re-adding to force reflow
    this.splashEl.style.animation = 'none';
    void this.splashEl.offsetWidth; // force reflow
    this.splashEl.style.animation = '';

    const displayMs = cfg.tier === 'ultimate' ? 3500 : 2500;
    this.splashTimer = setTimeout(() => {
      this.splashEl.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      this.splashEl.style.opacity = '0';
      this.splashEl.style.transform = 'translate(-50%, -50%) scale(0.92)';
      setTimeout(() => {
        this.splashEl.className = 'gift-splash hidden';
        this.splashEl.style.opacity = '';
        this.splashEl.style.transform = '';
        this.splashEl.style.transition = '';
      }, 400);
    }, displayMs);
  }

  setWsStatus(status: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING'): void {
    if (this.dbgWsEl) {
      this.dbgWsEl.textContent = status;
      this.dbgWsEl.style.color =
        status === 'CONNECTED' ? '#00ff88'
        : status === 'RECONNECTING' ? '#ffd000'
        : '#ff1a40';
    }
  }

  // ─── Leaderboard ───────────────────────────────────────────────
  private updateLeaderboard(leaderboard: any[]): void {
    if (!leaderboard || leaderboard.length === 0) {
      this.leaderboardEl.innerHTML =
        '<div class="empty-state">No kills yet — be the first! 🎯</div>';
      return;
    }

    this.leaderboardEl.innerHTML = leaderboard
      .slice(0, 3)
      .map((entry, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
        const rankClass = idx === 0 ? 'gold' : idx === 1 ? 'silver' : 'bronze';
        return `
          <div class="lb-row">
            <div class="lb-left">
              <span class="lb-rank ${rankClass}">${medal}</span>
              <span class="lb-username">@${entry.username}</span>
            </div>
            <div class="lb-kills">${entry.kills} kills</div>
          </div>
        `;
      })
      .join('');
  }

  // ─── Dev panel setup ───────────────────────────────────────────
  private setupDevPanel(): void {
    const devPanel     = document.getElementById('dev-panel');
    const closeBtn     = document.getElementById('dev-close-btn');
    const usernameInput = document.getElementById('dev-username') as HTMLInputElement;

    closeBtn?.addEventListener('click', () => {
      devPanel?.classList.add('collapsed');
    });

    // Keyboard: D / F2 / ` toggles panel
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'd' || e.key === 'D' || e.key === 'F2' || e.key === '`') {
        devPanel?.classList.toggle('collapsed');
      }
    });

    // Individual gift buttons
    document.querySelectorAll('.gift-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const giftName = btn.getAttribute('data-gift');
        const username = usernameInput?.value.trim() || 'DevUser';
        if (giftName) {
          this.socketClient.send({ type: 'DEV_SIMULATE_GIFT', giftName, username, repeatCount: 1 });
        }
      });
    });

    // Streak buttons
    document.getElementById('btn-streak-10')?.addEventListener('click', () => {
      const username = usernameInput?.value.trim() || 'DevUser';
      this.socketClient.send({ type: 'DEV_SIMULATE_GIFT', giftName: 'Rose', username, repeatCount: 10 });
    });

    document.getElementById('btn-spam-50')?.addEventListener('click', () => {
      const username = usernameInput?.value.trim() || 'SpamViewer';
      this.socketClient.send({ type: 'DEV_SIMULATE_GIFT', giftName: 'Rose', username, repeatCount: 50 });
    });

    // Reset
    document.getElementById('btn-reset-game')?.addEventListener('click', () => {
      fetch('http://localhost:3001/api/reset', { method: 'POST' }).catch(() => {});
    });

    // Auto-sim toggle
    const autoSimBtn = document.getElementById('btn-auto-sim');
    autoSimBtn?.addEventListener('click', () => {
      this.autoSimActive = !this.autoSimActive;
      const endpoint = this.autoSimActive ? '/api/auto-sim/start' : '/api/auto-sim/stop';
      fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervalMs: 3000 }),
      }).catch(() => {});
      if (autoSimBtn) {
        autoSimBtn.textContent = this.autoSimActive ? '⏹️ Stop Auto-Sim' : '🤖 Auto-Sim (4s)';
      }
    });

    // TikTok LIVE Streamer Connect
    const ttConnectBtn = document.getElementById('btn-tiktok-connect');
    const ttInput = document.getElementById('tiktok-target-user') as HTMLInputElement;
    const ttStatus = document.getElementById('tiktok-status-msg');

    const updateTtStatus = () => {
      fetch('http://localhost:3001/api/tiktok/status')
        .then((r) => r.json())
        .then((data) => {
          if (!ttStatus) return;
          if (data.connected && data.username) {
            ttStatus.textContent = `🟢 LIVE: @${data.username} (Room: ${data.roomId || 'Active'})`;
            ttStatus.style.color = '#00ff88';
            if (ttInput && !ttInput.value) ttInput.value = `@${data.username}`;
          } else if (data.username) {
            ttStatus.textContent = `🟡 Connecting to @${data.username}...`;
            ttStatus.style.color = '#ffd000';
          } else {
            ttStatus.textContent = `⚪ Provider: ${data.provider.toUpperCase()} (Not connected to LIVE)`;
            ttStatus.style.color = '#8899a6';
          }
        })
        .catch(() => {});
    };

    updateTtStatus();

    ttConnectBtn?.addEventListener('click', async () => {
      const username = ttInput?.value.trim();
      if (!username) return;
      if (ttStatus) {
        ttStatus.textContent = `⏳ Connecting to TikTok LIVE @${username}...`;
        ttStatus.style.color = '#ffd000';
      }
      try {
        const res = await fetch('http://localhost:3001/api/tiktok/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        });
        const json = await res.json();
        if (ttStatus) {
          if (json.success) {
            ttStatus.textContent = `🟢 Connected to @${username}!`;
            ttStatus.style.color = '#00ff88';
          } else {
            ttStatus.textContent = `⚠️ Connecting to @${username}... (May take a few moments)`;
            ttStatus.style.color = '#ffaa00';
          }
        }
        setTimeout(updateTtStatus, 3000);
      } catch (err: any) {
        if (ttStatus) {
          ttStatus.textContent = `❌ Error: ${err.message}`;
          ttStatus.style.color = '#ff1a40';
        }
      }
    });
  }
}
