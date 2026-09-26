# Developer & Testing Guide

This guide covers local development, running automated test suites, debugging, and simulating viewer gifts.

---

## Quick Start Commands

```bash
# 1. Install all dependencies across monorepo workspaces
npm install

# 2. Run both the backend server and Vite frontend concurrently
npm run dev

# 3. Run individual workspaces
npm run dev:server    # Authoritative server on port 3001
npm run dev:game      # Vite Canvas frontend on port 5173

# 4. Run Vitest automated test suite
npm run test

# 5. Build production bundles
npm run build
```

---

## Developer Gift Simulator

The game frontend includes an interactive developer control drawer:

1. Open `http://localhost:5173/` in any browser.
2. Click the **`🛠️ DEV SIMULATOR`** tab on the top-right.
3. Test individual gifts:
   - **🌹 Rose (+Obs)**: Spawns an obstacle.
   - **❤️ Heart (+Speed)**: Accelerates snake.
   - **🎁 Gift (-Food)**: Removes food from field.
   - **🐯 Tiger (+Bombs)**: Drops countdown bombs.
   - **🦁 Lion (+Hunter)**: Spawns the Hunter lion enemy.
   - **🌌 Universe (APOCALYPSE)**: Initiates Apocalypse mode.
4. Test high-load bursts:
   - **🌹 10x Roses**: Tests streak batching.
   - **🌹 50x Spam Burst**: Tests queue rate-limiting and obstacle cap.
5. Auto-Simulation:
   - Click **🤖 Start Auto-Sim** to simulate continuous random viewer gifts every 3-4 seconds.

---

## REST API Endpoints for Automation & CI

The backend exposes developer endpoints under `/api`:

### 1. Trigger Simulated Gift
```bash
curl -X POST http://localhost:3001/api/simulate-gift \
  -H "Content-Type: application/json" \
  -d '{"giftName": "Lion", "username": "SuperKiller", "repeatCount": 1}'
```

### 2. Check Engine Status
```bash
curl http://localhost:3001/api/status
```

Response:
```json
{
  "status": "PLAYING",
  "tick": 240,
  "score": 340,
  "survivalTime": 24,
  "dangerLevel": 15,
  "snakeSpeed": 1.1,
  "snakeLength": 22,
  "obstacleCount": 3,
  "enemyCount": 1,
  "hazardCount": 0,
  "queueLength": 0,
  "totalEnqueued": 5,
  "droppedEvents": 0,
  "providerConnected": true
}
```

### 3. Reset Game Round
```bash
curl -X POST http://localhost:3001/api/reset
```

### 4. Background Auto-Simulation
```bash
# Start
curl -X POST http://localhost:3001/api/auto-sim/start -H "Content-Type: application/json" -d '{"intervalMs": 3000}'

# Stop
curl -X POST http://localhost:3001/api/auto-sim/stop
```

---

## Running Automated Tests

Run the Vitest test suite:
```bash
npm run test
```

All 5 core domain areas are covered:
- `tests/engine.test.ts`: Snake movement, food eating, wall collisions, obstacle collisions, enemy collisions, auto-restart loop.
- `tests/ai.test.ts`: Autonomous A* pathfinding, space analysis (flood-fill), trap avoidance, threat avoidance.
- `tests/gifts.test.ts`: Rose, Heart, Gift, Tiger, Lion, Universe, streak scaling, speed cap.
- `tests/attribution.test.ts`: Direct killer attribution, weapon identification, ambiguous final blow mob tracking, leaderboard ranking.
- `tests/queue.test.ts`: Anti-spam rate limiting, batching compression, capacity overflow drops.
