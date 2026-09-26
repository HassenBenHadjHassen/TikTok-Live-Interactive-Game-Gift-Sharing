import { GameState, GiftEvent, DeathInfo } from '@snake-live/shared';
import { GameSocketClient } from '../websocket/GameSocketClient';

export class UIManager {
  private timerEl = document.getElementById('timer-val')!;
  private scoreEl = document.getElementById('score-val')!;
  private highScoreEl = document.getElementById('high-score-val')!;
  private phaseBadgeEl = document.getElementById('phase-badge')!;
  private dangerPctEl = document.getElementById('danger-pct')!;
  private dangerBarEl = document.getElementById('danger-bar')!;
  private notifStackEl = document.getElementById('gift-notifications')!;
  private leaderboardListEl = document.getElementById('leaderboard-list')!;
  private deathModalEl = document.getElementById('death-modal')!;
  private deathKillerNameEl = document.getElementById('death-killer-name')!;
  private deathKillerGiftEl = document.getElementById('death-killer-gift')!;
  private deathTimeEl = document.getElementById('death-time')!;
  private deathScoreEl = document.getElementById('death-score')!;
  private deathCountdownEl = document.getElementById('restart-countdown')!;
  private apocalypseBannerEl = document.getElementById('apocalypse-banner')!;

  // Debug monitor elements
  private dbgFpsEl = document.getElementById('dbg-fps');
  private dbgStatusEl = document.getElementById('dbg-status');
  private dbgSpeedEl = document.getElementById('dbg-speed');
  private dbgLenEl = document.getElementById('dbg-len');
  private dbgObsEl = document.getElementById('dbg-obs');
  private dbgEnemiesEl = document.getElementById('dbg-enemies');
  private dbgHazardsEl = document.getElementById('dbg-hazards');
  private dbgWsEl = document.getElementById('dbg-ws');

  private autoSimActive: boolean = false;

  constructor(private socketClient: GameSocketClient) {
    this.setupDevPanel();
  }

  updateHUD(state: GameState, fps: number): void {
    // 1. Survival Timer
    const mins = Math.floor(state.survivalTime / 60)
      .toString()
      .padStart(2, '0');
    const secs = (state.survivalTime % 60).toString().padStart(2, '0');
    this.timerEl.textContent = `${mins}:${secs}`;

    // 2. Score & High Score
    this.scoreEl.textContent = state.score.toLocaleString();
    this.highScoreEl.textContent = state.highScore.toLocaleString();

    // 3. Phase Badge
    this.phaseBadgeEl.textContent = state.status;
    this.phaseBadgeEl.className = `phase-tag ${state.status.toLowerCase()}`;

    // 4. Danger Meter
    this.dangerPctEl.textContent = `${state.dangerLevel}%`;
    this.dangerBarEl.style.width = `${state.dangerLevel}%`;

    // 5. Apocalypse Banner
    if (state.status === 'APOCALYPSE') {
      this.apocalypseBannerEl.classList.remove('hidden');
    } else {
      this.apocalypseBannerEl.classList.add('hidden');
    }

    // 6. Death & Results Modal
    if (state.status === 'DEAD' || state.status === 'RESULTS' || state.status === 'RESTARTING') {
      this.deathModalEl.classList.remove('hidden');
      if (state.lastDeath) {
        this.deathKillerNameEl.textContent = state.lastDeath.killerUsername
          ? `@${state.lastDeath.killerUsername}`
          : state.lastDeath.isAmbiguous
          ? 'Viewer Mob Attack'
          : 'Hazard Impact';
        this.deathKillerGiftEl.textContent = state.lastDeath.killerGift
          ? `${state.lastDeath.killerGift}`
          : `Cause: ${state.lastDeath.cause}`;
      }
      this.deathTimeEl.textContent = `${mins}:${secs}`;
      this.deathScoreEl.textContent = state.score.toLocaleString();

      const remainingSecs = Math.max(
        0,
        Math.ceil((6000 - state.timeInCurrentStatus) / 1000)
      );
      this.deathCountdownEl.textContent = String(remainingSecs);
    } else {
      this.deathModalEl.classList.add('hidden');
    }

    // 7. Leaderboard
    this.updateLeaderboard(state.leaderboard);

    // 8. Debug monitor stats
    if (this.dbgFpsEl) this.dbgFpsEl.textContent = String(fps);
    if (this.dbgStatusEl) this.dbgStatusEl.textContent = state.status;
    if (this.dbgSpeedEl) this.dbgSpeedEl.textContent = `${state.snake.speed.toFixed(1)}x`;
    if (this.dbgLenEl) this.dbgLenEl.textContent = String(state.snake.length);
    if (this.dbgObsEl) this.dbgObsEl.textContent = String(state.obstacles.length);
    if (this.dbgEnemiesEl) this.dbgEnemiesEl.textContent = String(state.enemies.length);
    if (this.dbgHazardsEl) this.dbgHazardsEl.textContent = String(state.hazards.length);
  }

  showGiftNotification(gift: GiftEvent): void {
    const card = document.createElement('div');
    card.className = 'gift-card-notification';

    let icon = '🎁';
    if (gift.giftName === 'Rose') icon = '🌹';
    else if (gift.giftName === 'Heart') icon = '❤️';
    else if (gift.giftName === 'Tiger') icon = '🐯';
    else if (gift.giftName === 'Lion') icon = '🦁';
    else if (gift.giftName === 'Universe') icon = '🌌';

    card.innerHTML = `
      <div class="gift-card-icon">${icon}</div>
      <div class="gift-card-info">
        <span class="gift-card-user">@${gift.senderUsername}</span>
        <span class="gift-card-desc">sent ${gift.repeatCount > 1 ? `${gift.repeatCount}x ` : ''}${gift.giftName}</span>
      </div>
    `;

    this.notifStackEl.prepend(card);

    // Keep max 4 visible cards
    while (this.notifStackEl.children.length > 4) {
      this.notifStackEl.lastElementChild?.remove();
    }

    // Fade out and remove after 3.5s
    setTimeout(() => {
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.opacity = '0';
      card.style.transform = 'translateX(60px)';
      setTimeout(() => card.remove(), 400);
    }, 3200);
  }

  setWsStatus(status: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING'): void {
    if (this.dbgWsEl) {
      this.dbgWsEl.textContent = status;
      this.dbgWsEl.style.color =
        status === 'CONNECTED' ? '#00ff88' : status === 'RECONNECTING' ? '#ffd000' : '#ff1a40';
    }
  }

  private updateLeaderboard(leaderboard: any[]): void {
    if (!leaderboard || leaderboard.length === 0) {
      this.leaderboardListEl.innerHTML =
        '<div class="empty-state">No kills yet! Send gifts to eliminate the snake!</div>';
      return;
    }

    this.leaderboardListEl.innerHTML = leaderboard
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
            <div class="lb-right">
              <span class="lb-kills">${entry.kills} kills</span>
            </div>
          </div>
        `;
      })
      .join('');
  }

  private setupDevPanel(): void {
    const devPanel = document.getElementById('dev-panel');
    const closeBtn = document.getElementById('dev-close-btn');
    const usernameInput = document.getElementById('dev-username') as HTMLInputElement;
    const titleBadge = document.querySelector('.stream-title-badge');

    // Close button inside panel
    closeBtn?.addEventListener('click', () => {
      devPanel?.classList.add('collapsed');
    });

    // Clicking title badge toggles dev panel
    if (titleBadge) {
      (titleBadge as HTMLElement).style.pointerEvents = 'auto';
      (titleBadge as HTMLElement).style.cursor = 'pointer';
      titleBadge.setAttribute('title', "Click or press 'D' to toggle Dev Simulator");
      titleBadge.addEventListener('click', () => {
        devPanel?.classList.toggle('collapsed');
      });
    }

    // Keyboard shortcut: Press 'D', 'F2', or '~' to toggle dev panel
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'd' || e.key === 'D' || e.key === 'F2' || e.key === '`') {
        devPanel?.classList.toggle('collapsed');
      }
    });

    // Individual gift buttons
    const giftBtns = document.querySelectorAll('.gift-btn');
    giftBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const giftName = btn.getAttribute('data-gift');
        const username = usernameInput?.value.trim() || 'DevUser';
        if (giftName) {
          this.socketClient.send({
            type: 'DEV_SIMULATE_GIFT',
            giftName,
            username,
            repeatCount: 1,
          });
        }
      });
    });

    // 10x Roses streak
    document.getElementById('btn-streak-10')?.addEventListener('click', () => {
      const username = usernameInput?.value.trim() || 'DevUser';
      this.socketClient.send({
        type: 'DEV_SIMULATE_GIFT',
        giftName: 'Rose',
        username,
        repeatCount: 10,
      });
    });

    // 50x Roses spam burst
    document.getElementById('btn-spam-50')?.addEventListener('click', () => {
      const username = usernameInput?.value.trim() || 'SpamViewer';
      this.socketClient.send({
        type: 'DEV_SIMULATE_GIFT',
        giftName: 'Rose',
        username,
        repeatCount: 50,
      });
    });

    // Reset game
    document.getElementById('btn-reset-game')?.addEventListener('click', () => {
      fetch('http://localhost:3001/api/reset', { method: 'POST' }).catch(() => {});
    });

    // Auto-simulation toggle
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
        autoSimBtn.textContent = this.autoSimActive
          ? '⏹️ Stop Auto-Sim'
          : '🤖 Start Auto-Sim (3s)';
      }
    });
  }
}
