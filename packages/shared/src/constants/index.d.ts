import { GameConfig, SnakeAIConfig } from '../types';
export declare const CANVAS_VIRTUAL_WIDTH = 1080;
export declare const CANVAS_VIRTUAL_HEIGHT = 1920;
export declare const DEFAULT_AI_CONFIG: SnakeAIConfig;
export declare const DEFAULT_GAME_CONFIG: GameConfig;
export declare const DANGER_THRESHOLDS: {
    PLAYING: number;
    DANGER: number;
    CHAOS: number;
    APOCALYPSE: number;
};
export declare const GAME_PHASES: readonly ["LOBBY", "STARTING", "PLAYING", "DANGER", "CHAOS", "APOCALYPSE", "DEAD", "RESULTS", "RESTARTING"];
export declare const SOUND_NAMES: {
    readonly GIFT: "gift";
    readonly OBSTACLE: "obstacle";
    readonly BOMB: "bomb";
    readonly EXPLOSION: "explosion";
    readonly LION: "lion";
    readonly UNIVERSE: "universe";
    readonly DEATH: "death";
    readonly EAT: "eat";
    readonly SPEED_UP: "speed_up";
};
//# sourceMappingURL=index.d.ts.map