import { describe, it, expect, beforeEach } from 'vitest';
import { AttributionTracker } from '../apps/server/src/game/attribution/AttributionTracker';
import { LeaderboardManager } from '../apps/server/src/game/attribution/LeaderboardManager';
import { Obstacle, Enemy } from '@snake-live/shared';

describe('Kill Attribution & Leaderboard Tracker', () => {
  let tracker: AttributionTracker;
  let leaderboard: LeaderboardManager;

  beforeEach(() => {
    tracker = new AttributionTracker();
    leaderboard = new LeaderboardManager(tracker);
  });

  it('correctly attributes kill to the obstacle creator', () => {
    tracker.recordObstacle('Alex', 'user_alex');
    const obs: Obstacle = {
      id: 'obs_1',
      position: { x: 5, y: 5 },
      size: 1,
      createdBy: 'Alex',
      createdAt: Date.now(),
    };

    const deathInfo = tracker.determineDeathAttribution(
      'OBSTACLE',
      { x: 5, y: 5 },
      120,
      1500,
      { obstacle: obs }
    );

    expect(deathInfo.killerUsername).toBe('Alex');
    expect(deathInfo.cause).toBe('OBSTACLE');
    expect(deathInfo.isAmbiguous).toBe(false);

    // Alex should now have 1 kill
    const alex = tracker.getPlayer('Alex');
    expect(alex?.kills).toBe(1);

    const top = leaderboard.getTopKillers(3);
    expect(top[0].username).toBe('Alex');
    expect(top[0].kills).toBe(1);
  });

  it('correctly attributes kill to hunter enemy summoner', () => {
    tracker.recordEnemy('Sarah', 'user_sarah');
    const enemy: Enemy = {
      id: 'lion_1',
      type: 'HUNTER',
      name: 'Lion',
      position: { x: 8, y: 8 },
      speed: 1,
      createdBy: 'Sarah',
      createdAt: Date.now(),
      expiresAt: Date.now() + 10000,
    };

    const deathInfo = tracker.determineDeathAttribution(
      'ENEMY',
      { x: 8, y: 8 },
      45,
      600,
      { enemy }
    );

    expect(deathInfo.killerUsername).toBe('Sarah');
    expect(deathInfo.cause).toBe('ENEMY');
    expect(tracker.getPlayer('Sarah')?.kills).toBe(1);
  });

  it('flags ambiguous attribution when multiple users attack right before wall collision', () => {
    tracker.recordGift('UserA', 'u_a', 'Heart', 10);
    tracker.recordGift('UserB', 'u_b', 'Tiger', 25);

    const deathInfo = tracker.determineDeathAttribution(
      'WALL',
      { x: 0, y: 10 },
      80,
      1200,
      {}
    );

    expect(deathInfo.isAmbiguous).toBe(true);
    expect(deathInfo.finalContributors).toContain('UserA');
    expect(deathInfo.finalContributors).toContain('UserB');
  });
});
