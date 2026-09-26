# 🐍 TikTok LIVE Interactive Snake Game: Snake vs. Everyone Watching

> A production-grade, highly modular interactive game designed specifically for **TikTok LIVE** vertical streaming (1080 × 1920) in **OBS Studio**.
>
> An autonomous AI Snake plays continuously for survival. Viewers cannot control the Snake directly; instead, viewers send gifts (Roses, Hearts, Tigers, Lions, Universe, etc.) that deploy obstacles, accelerate movement, drop countdown bombs, unleash chasing predator enemies, and initiate full Apocalypse Mode!

---

## Table of Contents

1. [Architecture & Data Pipeline](#1-architecture--data-pipeline)
2. [Prerequisites & Installation](#2-prerequisites--installation)
3. [Environment Variables (.env)](#3-environment-variables)
4. [Development & Simulator Mode](#4-development--simulator-mode)
5. [Running the Application](#5-running-the-application)
6. [Connecting to TikTok LIVE](#6-connecting-to-tiktok-live)
7. [OBS Studio Setup (1080 × 1920)](#7-obs-studio-setup)
8. [Gift Configuration & Mechanics](#8-gift-configuration--mechanics)
9. [Adding New Gifts](#9-adding-new-gifts)
10. [Adding New Effects & Audio](#10-adding-new-effects--audio)
11. [Adding New Game Mechanics & Enemies](#11-adding-new-game-mechanics--enemies)
12. [Troubleshooting & Gotchas](#12-troubleshooting--gotchas)
13. [Production Deployment](#13-production-deployment)
14. [Automated Testing](#14-automated-testing)

---

## 1. Architecture & Data Pipeline

The game adheres to a strict unidirectional, decoupled event-driven architecture. External platforms (TikTok LIVE, Twitch, YouTube) never manipulate internal game entities directly.

```
TikTok LIVE (or Mock Provider)
            ↓
TikTok LIVE Adapter (Sanitization & Normalization)
            ↓
Normalized Gift Event (GiftEvent)
            ↓
Anti-Spam Event Queue (Rate-Limiting & Streak Batching)
            ↓
Central Event Bus
            ↓
Authoritative Deterministic Game Engine
  ├── Autonomous Snake AI (A* Pathfinding & Flood-Fill Space Analysis)
  ├── Dynamic Danger & Phase Manager (PLAYING, DANGER, CHAOS, APOCALYPSE)
  ├── Collision System (Walls, Body, Obstacles, Bombs, Hazards, Hunters)
  └── Kill Attribution Tracker & Session Leaderboard
            ↓
WebSocket Server (Throttled Snapshots @ 20 Hz + Discrete Event Broadcasts)
            ↓
Browser Game Client (1080 × 1920 HTML5 Canvas + WebAudio Synthesizer)
            ↓
OBS Studio Browser Source (Streaming to TikTok LIVE)
```

---

## 2. Prerequisites & Installation

### Requirements:
- **Node.js**: `v20.0.0` or higher (`v24.x` tested)
- **NPM**: `v10.x` or higher
- **OBS Studio**: For live broadcasting

### Installation:
```bash
git clone https://github.com/your-org/tiktok-snake-ai.git
cd tiktok-snake-ai

# Install all monorepo workspace dependencies
npm install
```

---

## 3. Environment Variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend HTTP & WebSocket server port |
| `HOST` | `0.0.0.0` | Host binding interface |
| `NODE_ENV` | `development` | Environment mode (`development` or `production`) |
| `TICK_RATE` | `12` | Base engine ticks per second |
| `GRID_WIDTH` | `27` | Playfield grid columns (optimized for 9:16) |
| `GRID_HEIGHT` | `36` | Playfield grid rows |
| `AUTO_RESTART_DELAY_MS` | `6000` | Death screen duration before automatic respawn |
| `TIKTOK_PROVIDER` | `mock` | `mock` (local dev simulator) or `tiktok` (live stream) |
| `TIKTOK_USERNAME` | `""` | TikTok handle whose LIVE room to connect to |
| `WS_SNAPSHOT_INTERVAL_MS`| `50` | Snapshot broadcast interval (20 Hz) |
| `VITE_SERVER_WS_URL` | `ws://localhost:3001/ws` | WebSocket URL for client connection |

---

## 4. Development & Simulator Mode

The project includes a **full interactive developer simulator** allowing you to test every gift, streak, and edge case without connecting to TikTok or spending money on coins:

```bash
# Start both server and frontend with hot-reload
npm run dev
```

1. Open `http://localhost:5173/` in your browser.
2. Click the **`🛠️ DEV SIMULATOR`** button at the top-right.
3. Test individual gifts:
   - 🌹 **Rose**: Deploys an obstacle with sender attribution.
   - ❤️ **Heart**: Accelerates snake speed by 10%.
   - 🎁 **Gift**: Stoles snake's food source.
   - 🐯 **Tiger**: Drops countdown bombs with explosive blast zones.
   - 🦁 **Lion**: Unleashes a Hunter lion enemy that actively stalks the snake.
   - 🌌 **Universe**: Activates **APOCALYPSE MODE** (100% danger, sirens, warning banner, cluster hazards).
4. Test high-load bursts:
   - **10x Roses**: Verifies streak batching.
   - **50x Spam Burst**: Verifies anti-spam rate limiting and entity capping without frame drops.
5. **🤖 Auto-Sim Toggle**: Runs an automated simulation of random viewer gifts every 3-4 seconds.

---

## 5. Running the Application

### Running Concurrently (Recommended):
```bash
npm run dev
```

### Running Workspaces Individually:
```bash
# Terminal 1 - Server
npm run dev:server

# Terminal 2 - Frontend
npm run dev:game
```

### Production Build & Run:
```bash
npm run build
npm run start
```

---

## 6. Connecting to TikTok LIVE

To connect to a live TikTok broadcast:

1. Install `tiktok-live-connector`:
   ```bash
   npm install tiktok-live-connector --save -w @snake-live/server
   ```
2. In your `.env`, change:
   ```env
   TIKTOK_PROVIDER=tiktok
   TIKTOK_USERNAME=@your_streamer_username
   ```
3. Restart the server (`npm run dev:server`).
4. When the streamer goes LIVE on TikTok, the adapter automatically establishes a connection to the Webcast feed.

---

## 7. OBS Studio Setup

The game frontend is purpose-built for OBS Studio Browser Source:

1. In OBS Studio, add a new **Browser** source.
2. Configure settings:
   - **URL**: `http://localhost:5173/` (or your production URL)
   - **Width**: `1080`
   - **Height**: `1920`
   - **FPS**: `60`
   - **Control Audio via OBS**: `Checked`
   - **Shutdown source when not visible**: `Unchecked`
3. Click **OK**.
4. The game will automatically render pixel-perfect at 1080 × 1920, run at 60 FPS, and loop continuously across deaths and restarts.

See [`docs/obs.md`](file:///c:/Programming/tiktok-snake-ai/docs/obs.md) for transparent background instructions.

---

## 8. Gift Configuration & Mechanics

All gift parameters are configured in [`packages/gift-config/src/gifts.ts`](file:///c:/Programming/tiktok-snake-ai/packages/gift-config/src/gifts.ts):

| Gift | Action | Base Intensity | Streak Scaling | Danger Points |
|------|--------|----------------|----------------|---------------|
| **Rose** 🌹 | `ADD_OBSTACLE` | 1 | 1-10: `ceil(N*0.5)` obs; 50: 12 obs + 2 acid pools | +5 |
| **Heart** ❤️ | `INCREASE_SPEED` | +0.1x | `0.1 * log2(N + 1)` boost (capped at 2.5x) | +8 |
| **Gift** 🎁 | `REMOVE_FOOD` | 1 | 1-5: `floor(N*0.8)` foods removed | +10 |
| **Tiger** 🐯 | `SPAWN_BOMB` | 3 | `min(6, 2 + floor(N*1.5))` bombs | +25 |
| **Lion** 🦁 | `SPAWN_CHASER` | 1 | Spawns Hunter Lion tracking snake for 20s | +40 |
| **Universe** 🌌 | `APOCALYPSE` | 1 | Triggers 15s Apocalypse Mode storm | +100 |

---

## 9. Adding New Gifts

1. Open [`packages/gift-config/src/gifts.ts`](file:///c:/Programming/tiktok-snake-ai/packages/gift-config/src/gifts.ts).
2. Add the gift entry to `GIFT_DEFINITIONS`:
   ```ts
   Whale: {
     id: '5670',
     name: 'Whale',
     aliases: ['whale', 'blue_whale'],
     action: 'SPAWN_HAZARD_STORM',
     intensity: 3,
     icon: '🐋',
     dangerContribution: 50,
     notificationTitle: 'Whale Tidal Wave',
     formatDescription: (username) => `🐋 @${username} summoned a TIDAL WAVE!`,
     calculateEffectCount: (count) => ({ primaryCount: Math.min(6, count * 2) }),
   }
   ```
3. Implement the effect in `GameEngine.applyGift()` ([`apps/server/src/game/GameEngine.ts`](file:///c:/Programming/tiktok-snake-ai/apps/server/src/game/GameEngine.ts)).

---

## 10. Adding New Effects & Audio

The application includes a built-in **Web Audio API Procedural Synthesizer** that automatically generates punchy cyber sound effects for all actions without requiring external audio files.

To add custom music or sound effects:
- Drop `.mp3` background loops into `assets/audio/`:
  - `normal.mp3`, `danger.mp3`, `chaos.mp3`, `apocalypse.mp3`, `death.mp3`.
- Drop `.wav` sound effects into `assets/audio/`:
  - `gift.wav`, `obstacle.wav`, `bomb.wav`, `explosion.wav`, `lion.wav`, `universe.wav`, `death.wav`, `eat.wav`, `speed_up.wav`.
- The `AudioManager` automatically plays your audio files when present and smoothly falls back to the synthesizer if omitted!

---

## 11. Adding New Game Mechanics & Enemies

- **Entity Management**: [`apps/server/src/game/entities/EntityManager.ts`](file:///c:/Programming/tiktok-snake-ai/apps/server/src/game/entities/EntityManager.ts)
- **AI Heuristics**: [`apps/server/src/game/ai/SnakeAI.ts`](file:///c:/Programming/tiktok-snake-ai/apps/server/src/game/ai/SnakeAI.ts)
- **Canvas Rendering**: [`apps/game/src/rendering/`](file:///c:/Programming/tiktok-snake-ai/apps/game/src/rendering/)

The architecture allows adding moving walls, teleporters, boss battles, or secondary snakes without refactoring the networking or gift layers.

---

## 12. Troubleshooting & Gotchas

- **Issue**: Snake seems too fast or too slow.
  - **Solution**: Adjust `TICK_RATE` in `.env` (default is `12` ticks/sec).
- **Issue**: Audio doesn't play initially in browser.
  - **Solution**: Modern browsers enforce autoplay policies. Click or tap anywhere inside the game window once to unlock the audio context.
- **Issue**: Port 3001 or 5173 is in use.
  - **Solution**: Change `PORT=3002` in `.env` and `server.port` in `apps/game/vite.config.ts`.

---

## 13. Production Deployment

### Building:
```bash
npm run build
```

### Running with PM2:
```bash
npm install -g pm2
pm2 start dist/apps/server/src/main.js --name "tiktok-snake-server"
```

Serve the `apps/game/dist` folder via Nginx, Caddy, or Cloudflare Pages pointing WebSocket connections to `ws://your-server-ip:3001/ws`.

---

## 14. Automated Testing

Run the test suite across all packages:
```bash
npm run test
```

24 unit & integration tests verify:
- Deterministic snake movement & boundary collision
- Obstacle & enemy collisions and kill attribution
- Autonomous AI flood-fill space analysis & A* pathfinding
- Gift mechanics (Rose, Heart, Gift, Tiger, Lion, Universe)
- Anti-spam queue batching & rate-limiting
- Auto-restart lifecycle loop
