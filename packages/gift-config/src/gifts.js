export const GIFT_DEFINITIONS = {
    Rose: {
        id: '5655',
        name: 'Rose',
        aliases: ['rose', 'roses'],
        action: 'ADD_OBSTACLE',
        intensity: 1,
        icon: '🌹',
        dangerContribution: 5,
        notificationTitle: 'Obstacle Deployed',
        formatDescription: (username, count) => count > 1
            ? `🌹 @${username} sent ${count} Roses (+obstacles)!`
            : `🌹 @${username} added an obstacle!`,
        calculateEffectCount: (count) => {
            if (count <= 1)
                return { primaryCount: 1 };
            if (count <= 10)
                return { primaryCount: Math.min(5, Math.ceil(count * 0.5)) };
            // 50 roses -> 10 obstacles + 2 hazards
            return {
                primaryCount: Math.min(12, Math.floor(10 + (count - 10) * 0.1)),
                spawnHazards: Math.min(4, Math.floor(count / 20)),
            };
        },
    },
    Heart: {
        id: '5656',
        name: 'Heart',
        aliases: ['heart', 'love', 'hearts'],
        action: 'INCREASE_SPEED',
        intensity: 0.1, // +10% speed
        icon: '❤️',
        dangerContribution: 8,
        notificationTitle: 'Speed Surge',
        formatDescription: (username, count) => count > 1
            ? `❤️ @${username} hyper-accelerated the Snake (${count}x)!`
            : `❤️ @${username} made the Snake faster!`,
        calculateEffectCount: (count) => {
            // 10% per heart, scaled logarithmically to prevent absurd jumps
            const boost = Math.min(0.8, 0.1 * Math.log2(count + 1));
            return { primaryCount: 1, speedBoost: boost };
        },
    },
    Gift: {
        id: '5657',
        name: 'Gift',
        aliases: ['gift', 'doughnut', 'coffee', 'ice_cream'],
        action: 'REMOVE_FOOD',
        intensity: 1,
        icon: '🎁',
        dangerContribution: 10,
        notificationTitle: 'Food Stolen',
        formatDescription: (username, count) => count > 1
            ? `🎁 @${username} wiped out ${count} food sources!`
            : `🎁 @${username} stole the snake's food!`,
        calculateEffectCount: (count) => {
            return {
                primaryCount: Math.min(5, Math.max(1, Math.floor(count * 0.8))),
                spawnHazards: count >= 5 ? 1 : 0,
            };
        },
    },
    Tiger: {
        id: '5658',
        name: 'Tiger',
        aliases: ['tiger', 'tigers'],
        action: 'SPAWN_BOMB',
        intensity: 3,
        icon: '🐯',
        dangerContribution: 25,
        notificationTitle: 'Bombs Dropped',
        formatDescription: (username, count) => count > 1
            ? `🐯 @${username} dropped ${count * 3} BOMBS!`
            : `🐯 @${username} dropped BOMBS!`,
        calculateEffectCount: (count) => {
            const bombs = Math.min(6, 2 + Math.floor(count * 1.5));
            return { primaryCount: bombs };
        },
    },
    Lion: {
        id: '5659',
        name: 'Lion',
        aliases: ['lion', 'lions'],
        action: 'SPAWN_CHASER',
        intensity: 1,
        icon: '🦁',
        dangerContribution: 40,
        notificationTitle: 'Hunter Unleashed',
        formatDescription: (username) => `🦁 @${username} unleashed a HUNTER!`,
        calculateEffectCount: (count) => {
            // Lions are dangerous: max 2 hunters at a time from a single burst
            return { primaryCount: Math.min(2, Math.max(1, Math.floor(count * 0.5))) };
        },
    },
    Universe: {
        id: '5660',
        name: 'Universe',
        aliases: ['universe', 'tiktok_universe', 'galaxy'],
        action: 'APOCALYPSE',
        intensity: 1,
        icon: '🌌',
        dangerContribution: 100,
        notificationTitle: 'UNIVERSE ACTIVATED',
        formatDescription: (username) => `🌌 @${username} INITIATED APOCALYPSE MODE!`,
        calculateEffectCount: () => {
            return {
                primaryCount: 1,
                spawnHazards: 5,
                speedBoost: 0.35,
            };
        },
    },
};
export function findGiftDefinition(nameOrId) {
    if (!nameOrId)
        return undefined;
    if (GIFT_DEFINITIONS[nameOrId])
        return GIFT_DEFINITIONS[nameOrId];
    const lower = nameOrId.toLowerCase().trim();
    for (const def of Object.values(GIFT_DEFINITIONS)) {
        if (def.name.toLowerCase() === lower || def.id === nameOrId)
            return def;
        if (def.aliases.some((a) => a.toLowerCase() === lower))
            return def;
    }
    return undefined;
}
//# sourceMappingURL=gifts.js.map