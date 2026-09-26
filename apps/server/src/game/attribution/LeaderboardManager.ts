import { LeaderboardEntry } from '@snake-live/shared';
import { AttributionTracker } from './AttributionTracker';

export class LeaderboardManager {
  constructor(private attributionTracker: AttributionTracker) {}

  getTopKillers(limit: number = 5): LeaderboardEntry[] {
    const players = this.attributionTracker.getAllPlayers();
    const sorted = [...players].sort((a, b) => {
      if (b.kills !== a.kills) return b.kills - a.kills;
      if (b.dangerScore !== a.dangerScore) return b.dangerScore - a.dangerScore;
      return b.totalGifts - a.totalGifts;
    });

    return sorted.slice(0, limit).map((p, index) => ({
      rank: index + 1,
      username: p.username,
      userId: p.userId,
      kills: p.kills,
      dangerScore: p.dangerScore,
      giftsCount: p.totalGifts,
    }));
  }

  getMostDangerous(limit: number = 5): LeaderboardEntry[] {
    const players = this.attributionTracker.getAllPlayers();
    const sorted = [...players].sort((a, b) => b.dangerScore - a.dangerScore);

    return sorted.slice(0, limit).map((p, index) => ({
      rank: index + 1,
      username: p.username,
      userId: p.userId,
      kills: p.kills,
      dangerScore: p.dangerScore,
      giftsCount: p.totalGifts,
    }));
  }
}
