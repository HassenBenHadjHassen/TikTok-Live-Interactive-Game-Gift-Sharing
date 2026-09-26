# Implementation Plan: TikTok LIVE Interactive Snake Game

## Overview
A production-grade, highly modular, deterministic interactive Snake game tailored for TikTok LIVE vertical streaming (1080x1920) in OBS Studio. The game features an autonomous AI Snake playing for survival against LIVE viewers who send gifts (Roses, Hearts, Tigers, Lions, Universe, etc.) that spawn obstacles, bombs, chaser enemies, speed buffs, and trigger Apocalypse mode.

---

## Architecture & Monorepo Structure

```
tiktok-snake-ai/
├── package.json               # Root npm workspaces configuration
├── tsconfig.json              # Base TypeScript configuration
├── .env.example               # Environment variables specification
├── packages/
│   ├── shared/                # Core domain types, events, constants, grid math
│   │   ├── src/
│   │   │   ├── types/         # GameState, Snake, Obstacle, Enemy, Hazard, Food
│   │   │   ├── events/        # GiftEvent, GameEvents, WebSocket messages
│   │   │   └── constants/     # Default config, grid sizes, phase timings
│   │   └── package.json
│   └── gift-config/           # Centralized gift definitions, scaling, queue configs
│       ├── src/
│       │   ├── gifts.ts       # Rose, Heart, Gift, Tiger, Lion, Universe
│       │   ├── queue.ts       # Anti-spam and batching rules
│       │   └── index.ts
│       └── package.json
├── apps/
│   ├── server/                # Node.js backend
│   │   ├── src/
│   │   │   ├── tiktok/        # LiveEventProvider, TikTokLiveAdapter, MockLiveProvider
│   │   │   ├── events/        # EventBus, EventQueue (anti-spam, rate-limiting, batching)
│   │   │   ├── game/          # Authoritative GameEngine, Leaderboard, Attribution
│   │   │   ├── websocket/     # WS Server, snapshot broadcasting, event dispatch
│   │   │   ├── config/        # Environment and game settings
│   │   │   ├── api/           # Dev simulator REST API (/api/simulate-gift, /api/status)
│   │   │   └── main.ts        # Server entry point
│   │   └── package.json
│   └── game/                  # Frontend Vite + Canvas (1080x1920 optimized)
│       ├── index.html         # Portrait layout, OBS-ready
│       ├── src/
│       │   ├── canvas/        # CanvasManager, hi-DPI scaling, viewport
│       │   ├── rendering/     # GridRenderer, SnakeRenderer, HazardRenderer, PostFX
│       │   ├── entities/      # Entity representations, interpolation state
│       │   ├── snake/         # Snake body rendering, eye tracking, smooth trails
│       │   ├── ai/            # Autonomous AI client-side prediction / preview
│       │   ├── effects/       # Screen shake, chromatic aberration, warning banners
│       │   ├── particles/     # High-performance pooled particle system
│       │   ├── audio/         # WebAudio procedural synth + SFX fallback sound manager
│       │   ├── ui/            # HUD, Danger meter, Gift notifications stack, Leaderboard, Dev Simulator overlay
│       │   ├── state/         # Client GameStore, snapshot interpolation
│       │   ├── websocket/     # Resilient WS client with auto-reconnect and heartbeat
│       │   └── main.ts        # Game loop & orchestrator
│       └── package.json
├── tests/                     # Unit & integration tests for engine, AI, gifts, queue, attribution
│   ├── engine.test.ts
│   ├── ai.test.ts
│   ├── gifts.test.ts
│   ├── attribution.test.ts
│   └── queue.test.ts
└── docs/                      # Comprehensive documentation
    ├── architecture.md
    ├── gifts.md
    ├── obs.md
    ├── tiktok.md
    └── development.md
```

---

## 12-Phase Roadmap

### Phase 1: Workspace Setup & Core Domain (`packages/shared`, `packages/gift-config`)
- Monorepo package configs, TypeScript paths, scripts (`dev`, `build`, `test`, `lint`, etc.).
- Complete TypeScript types: `GameState`, `SnakeState`, `Food`, `Obstacle`, `Enemy`, `Hazard`, `GiftEvent`, `PlayerContribution`, `DeathInfo`, `GameStatus`.
- Centralized gift mapping configuration (`Rose`, `Heart`, `Gift`, `Tiger`, `Lion`, `Universe`).

### Phase 2: Authoritative Deterministic Game Engine (`apps/server/src/game`)
- Grid math, tick execution, collision detection (walls, body, obstacles, hazards, enemies).
- Food spawning (normal, golden, dangerous) with safety validation.
- Enemy tracking (Lion/Hunter intercepting snake), Bombs (countdown + explosion shockwaves), Hazards.
- Game phase manager: `LOBBY` -> `STARTING` -> `PLAYING` -> `DANGER` -> `CHAOS` -> `APOCALYPSE` -> `DEAD` -> `RESULTS` -> `RESTARTING`.

### Phase 3: Autonomous Snake AI (`apps/server/src/game/ai` & shared)
- Multi-tier AI heuristic:
  1. A* shortest path to food / safe zones.
  2. Voronoi / Flood-fill reachable space analysis to prevent self-trapping in dead ends.
  3. Hazard & dynamic enemy proximity penalty.
  4. Aggressiveness/survival config.
  5. Deterministic fallback when boxed in.

### Phase 4: Anti-Spam Event Queue, Gift Processor & Kill Attribution
- Queue with rate-limiting, batching (e.g. 100 roses compressed into safe grid clusters), max active entity caps.
- Streak scaling (repeat gifts).
- Kill attribution tracker: logs who spawned which hazard/obstacle; attributes final blow or group contributors on snake demise.
- Session leaderboard: Top Killers, Most Dangerous, Most Obstacles, Most Gifts.

### Phase 5: TikTok LIVE Event Adapter & Mock Simulator
- `LiveEventProvider` interface: clean decoupling.
- `TikTokLiveAdapter` using `tiktok-live-connector` (with graceful fallback).
- `MockLiveProvider` and Developer API (`/api/gift/simulate`) to fire any gift, streak, or spam burst.

### Phase 6: WebSocket Server & Client Architecture
- Low-latency typed WebSocket protocol.
- Controlled state snapshots (20-30 Hz) + instant event broadcasts (gifts, explosions, deaths).
- Heartbeat ping/pong, auto-reconnection, OBS browser source recovery.

### Phase 7: Canvas Renderer & Smooth Interpolation (`apps/game`)
- Dedicated 1080x1920 portrait canvas with high-DPI scaling and responsive auto-fit.
- Visual grid, glowing neon snake with eye dynamics, tongue flicks, and smooth segment interpolation.
- Obstacle drop animations, bomb warning radii, hunter enemy animations, hazard zones.

### Phase 8: Visual Effects & Particle System
- Object-pooled particle engine: explosion bursts, spark trails, glowing food aura, confetti, smoke.
- Screen effects: camera shake, danger flash, apocalypse red distortion, shockwave ripples.
- Full support for `prefers-reduced-motion`.

### Phase 9: Audio Engine
- WebAudio procedural sound synthesizer (works out-of-the-box with zero external audio assets required).
- Support for optional royalty-free mp3/wav files with smooth phase crossfading (Normal -> Danger -> Chaos -> Apocalypse -> Death).

### Phase 10: 9:16 Vertical HUD & UI Overlays
- Top header: Game title, survival timer, score, high score, alive indicator.
- Center HUD: Danger progress meter with phase status tags.
- Gift notification stack: animated pop-in cards showing sender avatar/username, gift icon, and effect.
- Bottom panel: Top Snake Killers leaderboard, recent contributors.
- Death & Results Screen: Final Blow attribution, killer name, survival time, countdown to auto-restart.
- Developer Debug & Control Overlay: Trigger buttons for all gifts, stats monitor (FPS, memory, WS status, entity counts).

### Phase 11: Unit & Integration Test Suite
- Vitest suite verifying:
  - Game Engine mechanics (movement, food, collisions, death, restart loop).
  - AI survival heuristics (finds food, avoids dead ends, avoids moving enemies).
  - Gift mechanics & queue rate limiting (100 spam gifts safely handled).
  - Kill attribution correctness (solo kill vs. ambiguous group).

### Phase 12: Production Readiness, OBS Testing & Documentation
- Test running Vite + Express dev servers concurrently.
- Validate in OBS Browser Source specifications (transparent/custom backgrounds, resolution, auto-restart).
- Comprehensive docs: README.md, `architecture.md`, `gifts.md`, `obs.md`, `tiktok.md`, `development.md`.
