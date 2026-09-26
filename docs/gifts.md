# Gift Configuration & Mechanics Guide

All gift definitions, intensity scalings, danger values, and streak formulas are centralized in [`packages/gift-config/src/gifts.ts`](file:///c:/Programming/tiktok-snake-ai/packages/gift-config/src/gifts.ts).

---

## Default Gift Mappings

| Gift Name | Action Type | Default Effect | Streak Scaling Formula | Danger Pts |
|-----------|-------------|----------------|------------------------|------------|
| **Rose** 🌹 | `ADD_OBSTACLE` | Spawns 1 obstacle with sender attribution | 1-10: `ceil(N * 0.5)` obstacles<br>50: 12 obstacles + 2 hazard zones | +5 |
| **Heart** ❤️ | `INCREASE_SPEED` | Increases speed by +10% (capped at 2.5x) | `0.1 * log2(N + 1)` speed boost | +8 |
| **Gift / Donut** 🎁 | `REMOVE_FOOD` | Removes 1 food source from the board | 1-5: removes `floor(N * 0.8)` foods; N >= 5 spawns acid pool | +10 |
| **Tiger** 🐯 | `SPAWN_BOMB` | Spawns 2-3 countdown bombs | `min(6, 2 + floor(N * 1.5))` bombs | +25 |
| **Lion** 🦁 | `SPAWN_CHASER` | Spawns a Hunter enemy tracking the snake for 20s | Spawns up to 2 hunters simultaneously | +40 |
| **Universe** 🌌 | `APOCALYPSE` | Triggers **APOCALYPSE MODE** (100% danger, siren, speed surge, cluster bombs & obstacles) | Fixed duration 15s apocalypse storm | +100 |

---

## How to Add a New Gift

To introduce a new TikTok gift (e.g. `Dragon`, `Whale`, or `Sunglasses`):

1. **Define the Action Type** in `packages/gift-config/src/gifts.ts`:
   ```ts
   export type GiftActionType =
     | 'ADD_OBSTACLE'
     | 'INCREASE_SPEED'
     | 'REMOVE_FOOD'
     | 'SPAWN_BOMB'
     | 'SPAWN_CHASER'
     | 'APOCALYPSE'
     | 'SPAWN_METEOR_SHOWER'; // <- New action
   ```

2. **Add the Gift Definition** to `GIFT_DEFINITIONS` in `packages/gift-config/src/gifts.ts`:
   ```ts
   Dragon: {
     id: '5665',
     name: 'Dragon',
     aliases: ['dragon', 'fire_dragon'],
     action: 'SPAWN_METEOR_SHOWER',
     intensity: 2,
     icon: '🐉',
     dangerContribution: 60,
     notificationTitle: 'Dragon Strike',
     formatDescription: (username) => `🐉 @${username} called in a METEOR SHOWER!`,
     calculateEffectCount: (count) => ({ primaryCount: Math.min(8, count * 2) }),
   },
   ```

3. **Handle the Action in `GameEngine.applyGift()`** (`apps/server/src/game/GameEngine.ts`):
   ```ts
   case 'SPAWN_METEOR_SHOWER': {
     for (let i = 0; i < primaryCount; i++) {
       this.entityManager.spawnHazardZone(this.state.snake, 'FIRE_ZONE', gift.senderUsername);
     }
     this.eventBus.emit('effect', {
       id: `fx_dragon_${Date.now()}`,
       type: 'ALERT',
       intensity: 2.5,
       duration: 1000,
       sound: 'EXPLOSION',
       message: def.formatDescription(gift.senderUsername, gift.repeatCount),
       timestamp: Date.now(),
     });
     break;
   }
   ```

4. **Add a Simulator Button** in `apps/game/index.html` within `#dev-panel`:
   ```html
   <button class="gift-btn" data-gift="Dragon">🐉 Dragon (+Meteors)</button>
   ```

---

## Rules on Game Balance (Anti-Pay-to-Win)

Per project design guidelines:
- Viewer gifts must **never** assist the Snake (no healing, no slowing enemies, no clearing obstacles).
- The dynamic is always **Snake vs. Everyone Watching**.
