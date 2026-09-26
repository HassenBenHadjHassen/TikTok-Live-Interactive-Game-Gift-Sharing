# Architecture Overview

## System Flow & Data Pipeline

The TikTok LIVE Interactive Snake Game is built on a strictly decoupled, event-driven architecture designed to ensure that external live platforms (TikTok, Twitch, YouTube) never mutate game state directly.

```
TikTok LIVE Stream
        ↓
TikTok Adapter (or Mock Simulator)
        ↓
Normalized Gift Events (GiftEvent)
        ↓
Anti-Spam Event Queue (Batching & Rate-Limiting)
        ↓
Central Event Bus (Typed Event Emitter)
        ↓
Authoritative Game Engine (Tick Loop @ 10-25 Hz)
  ├── Autonomous Snake AI (A* Pathfinding & Space Flood-Fill)
  ├── Collision System (Walls, Body, Obstacles, Hazards, Enemies)
  ├── Entity Manager (Food, Obstacles, Bombs, Hunters, Hazards)
  ├── Kill Attribution Tracker & Session Leaderboard
  └── Phase State Machine (PLAYING, DANGER, CHAOS, APOCALYPSE, DEAD, RESULTS, RESTARTING)
        ↓
WebSocket Server (Snapshots @ 20 Hz + Instant Discrete Events)
        ↓
Browser Frontend (Vite + HTML5 Canvas)
  ├── Canvas 2D Renderer (1080x1920 logical portrait, 60 FPS interpolation)
  ├── Pooled Particle Engine (Zero-allocation bursts, shockwaves, sparkles)
  ├── Web Audio API Procedural Synthesizer & SFX
  └── Vertical HUD Overlay (Glassmorphism, Danger Bar, Gift Notification Cards)
        ↓
OBS Studio Browser Source (1080 × 1920)
        ↓
TikTok LIVE Broadcast
```

---

## Monorepo Structure

```
tiktok-snake-ai/
├── apps/
│   ├── game/                  # Frontend Vite + Canvas (1080x1920)
│   │   ├── src/
│   │   │   ├── audio/         # WebAudio procedural synthesizer
│   │   │   ├── canvas/        # Virtual resolution & camera trauma
│   │   │   ├── particles/     # 400-particle pooled engine
│   │   │   ├── rendering/     # Grid, Snake (interpolated), Hazards
│   │   │   ├── ui/            # HUD, notifications stack, dev panel
│   │   │   ├── websocket/     # Resilient auto-reconnecting client
│   │   │   └── main.ts        # 60 FPS requestAnimationFrame loop
│   └── server/                # Node.js authoritative backend
│       ├── src/
│       │   ├── api/           # REST endpoints (/api/simulate-gift, /api/status)
│       │   ├── config/        # Environment config loader
│       │   ├── events/        # Typed EventBus & EventQueue
│       │   ├── game/          # GameEngine, SnakeAI, EntityManager, Attribution
│       │   ├── tiktok/        # LiveEventProvider, MockLiveProvider, TikTokLiveAdapter
│       │   ├── websocket/     # WebSocket server
│       │   └── main.ts        # Application bootstrap
├── packages/
│   ├── shared/                # Core types, events, constants, grid math
│   └── gift-config/           # Centralized gift definitions, scaling, queue configs
├── tests/                     # Vitest unit & integration test suite
└── docs/                      # Architectural & integration guides
```

---

## Autonomous Snake AI Heuristic

The Snake plays completely autonomously using a multi-tiered heuristic evaluation:

1. **Immediate Hard Collision Pruning**:
   - Out of bounds / walls
   - Snake body segments (excluding tail if snake is not growing)
   - Active obstacles
   - Exploding bombs or hazardous ground tiles
   - Direct positions of moving enemies (Hunter Lion)

2. **Reachable Space Analysis (Flood Fill / Voronoi)**:
   - For every candidate direction (`UP`, `RIGHT`, `DOWN`, `LEFT`), a Breadth-First-Search (BFS) flood fill calculates total accessible tiles.
   - If reachable space is strictly less than snake length, the move is flagged as a lethal cul-de-sac / trap and heavily penalized.

3. **Threat Distance Cost Modifier**:
   - Moving Hunter enemies emit an exponential proximity penalty within 3 tiles.
   - Ticking bombs emit a radial penalty proportional to their countdown and blast radius.

4. **Goal Navigation (A* Pathfinding)**:
   - Evaluates the shortest path to reachable food items.
   - Commits to food path only if the snake maintains a safe exit route (space >= snake length).

5. **Tail Following Fallback (Survival Loop)**:
   - When no food is safely reachable, the AI tracks its own moving tail or maximizes flood-fill free space to outlast hazards.

---

## Deterministic Anti-Spam & Streak Batching

TikTok gifts can arrive in massive bursts (e.g., 100 roses within 500ms). The `EventQueue` prevents server freeze and visual degradation:

- **Per-User Rate Limiting**: Max 25 gifts per user per second. Excess gifts from the same user are combined into the existing queued event's `repeatCount`.
- **Streak Batching Window**: Gifts sent within a 250ms window are merged:
  - 1 Rose -> 1 obstacle
  - 10 Roses -> 5 obstacles
  - 50 Roses -> 12 obstacles + 2 hazard zones
- **Hard Entity Caps**: The `EntityManager` strictly enforces maximum concurrent entities (45 obstacles, 4 hunters, 8 bombs, 12 hazards). When caps are reached, oldest obstacles are safely recycled.
