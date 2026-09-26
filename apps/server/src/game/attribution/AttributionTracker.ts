import {
  PlayerContribution,
  DeathInfo,
  DeathCause,
  Point,
  Obstacle,
  Enemy,
  Hazard,
} from '@snake-live/shared';

interface RecentAction {
  username: string;
  userId: string;
  action: string;
  timestamp: number;
}

export class AttributionTracker {
  private players = new Map<string, PlayerContribution>();
  private recentActions: RecentAction[] = [];
  private readonly RECENT_WINDOW_MS = 6000;

  recordGift(username: string, userId: string, giftName: string, dangerScore: number): void {
    const player = this.getOrCreatePlayer(username, userId);
    player.totalGifts += 1;
    player.dangerScore += dangerScore;
    player.lastActive = Date.now();

    this.recentActions.push({
      username,
      userId,
      action: giftName,
      timestamp: Date.now(),
    });
    this.pruneRecentActions();
  }

  recordObstacle(username: string, userId: string): void {
    const player = this.getOrCreatePlayer(username, userId);
    player.obstaclesCreated += 1;
  }

  recordHazard(username: string, userId: string): void {
    const player = this.getOrCreatePlayer(username, userId);
    player.hazardsCreated += 1;
  }

  recordEnemy(username: string, userId: string): void {
    const player = this.getOrCreatePlayer(username, userId);
    player.enemiesSpawned += 1;
  }

  /**
   * Determine attribution when the Snake dies
   */
  determineDeathAttribution(
    cause: DeathCause,
    deathPos: Point,
    survivalTime: number,
    score: number,
    entities: {
      obstacle?: Obstacle;
      enemy?: Enemy;
      hazard?: Hazard;
    }
  ): DeathInfo {
    const now = Date.now();
    this.pruneRecentActions();

    let killerUsername: string | undefined;
    let killerGift: string | undefined;
    let killerEntityId: string | undefined;
    let isAmbiguous = false;

    if (entities.obstacle && entities.obstacle.createdBy) {
      killerUsername = entities.obstacle.createdBy;
      killerGift = 'Rose';
      killerEntityId = entities.obstacle.id;
    } else if (entities.enemy && entities.enemy.createdBy) {
      killerUsername = entities.enemy.createdBy;
      killerGift = 'Lion';
      killerEntityId = entities.enemy.id;
    } else if (entities.hazard && entities.hazard.createdBy) {
      killerUsername = entities.hazard.createdBy;
      killerGift = entities.hazard.type === 'BOMB' ? 'Tiger' : 'Hazard';
      killerEntityId = entities.hazard.id;
    } else {
      // Wall or Self collision under pressure from viewers
      const uniqueRecentUsers = Array.from(
        new Set(this.recentActions.map((a) => a.username))
      );

      if (uniqueRecentUsers.length === 1) {
        killerUsername = uniqueRecentUsers[0];
        const lastAction = this.recentActions[this.recentActions.length - 1];
        killerGift = lastAction ? lastAction.action : 'Pressure';
      } else if (uniqueRecentUsers.length > 1) {
        isAmbiguous = true;
      }
    }

    // Award kill to killer if identified
    if (killerUsername) {
      const killerPlayer = Array.from(this.players.values()).find(
        (p) => p.username.toLowerCase() === killerUsername!.toLowerCase()
      );
      if (killerPlayer) {
        killerPlayer.kills += 1;
      }
    }

    const finalContributors = Array.from(
      new Set(this.recentActions.map((a) => a.username))
    ).slice(0, 5);

    return {
      cause,
      killerUsername,
      killerGift,
      killerEntityId,
      position: deathPos,
      survivalTime,
      score,
      timestamp: now,
      finalContributors,
      isAmbiguous,
    };
  }

  getPlayer(username: string): PlayerContribution | undefined {
    return Array.from(this.players.values()).find(
      (p) => p.username.toLowerCase() === username.toLowerCase()
    );
  }

  getAllPlayers(): PlayerContribution[] {
    return Array.from(this.players.values());
  }

  private getOrCreatePlayer(username: string, userId: string): PlayerContribution {
    const key = (userId || username).toLowerCase();
    let player = this.players.get(key);
    if (!player) {
      player = {
        username,
        userId: userId || username,
        totalGifts: 0,
        dangerScore: 0,
        obstaclesCreated: 0,
        hazardsCreated: 0,
        enemiesSpawned: 0,
        kills: 0,
        lastActive: Date.now(),
      };
      this.players.set(key, player);
    }
    // Update username if changed
    player.username = username;
    return player;
  }

  private pruneRecentActions(): void {
    const cutoff = Date.now() - this.RECENT_WINDOW_MS;
    this.recentActions = this.recentActions.filter((a) => a.timestamp >= cutoff);
  }
}
