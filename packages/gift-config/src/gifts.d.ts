export type GiftActionType = 'ADD_OBSTACLE' | 'INCREASE_SPEED' | 'REMOVE_FOOD' | 'SPAWN_BOMB' | 'SPAWN_CHASER' | 'APOCALYPSE';
export interface GiftDefinition {
    id: string;
    name: string;
    aliases: string[];
    action: GiftActionType;
    intensity: number;
    icon: string;
    dangerContribution: number;
    notificationTitle: string;
    formatDescription: (username: string, count: number) => string;
    /**
     * Scale repeat count safely according to Section 15:
     * e.g. 1 Rose -> 1 obstacle, 10 Roses -> 5 obstacles, 50 Roses -> major hazard event
     */
    calculateEffectCount: (repeatCount: number) => {
        primaryCount: number;
        spawnHazards?: number;
        speedBoost?: number;
    };
}
export declare const GIFT_DEFINITIONS: Record<string, GiftDefinition>;
export declare function findGiftDefinition(nameOrId: string): GiftDefinition | undefined;
//# sourceMappingURL=gifts.d.ts.map