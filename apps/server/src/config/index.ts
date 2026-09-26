import dotenv from 'dotenv';
import path from 'path';
import { DEFAULT_GAME_CONFIG } from '@snake-live/shared';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

export interface ServerConfig {
  port: number;
  host: string;
  nodeEnv: string;
  tickRate: number;
  gridWidth: number;
  gridHeight: number;
  autoRestartDelayMs: number;
  tiktokProvider: 'mock' | 'tiktok';
  tiktokUsername: string;
  tiktokSignApiKey: string;
  wsHeartbeatIntervalMs: number;
  wsSnapshotIntervalMs: number;
}

export const config: ServerConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  tickRate: process.env.TICK_RATE ? parseFloat(process.env.TICK_RATE) : DEFAULT_GAME_CONFIG.baseTickRate,
  gridWidth: parseInt(process.env.GRID_WIDTH || String(DEFAULT_GAME_CONFIG.gridWidth), 10),
  gridHeight: parseInt(process.env.GRID_HEIGHT || String(DEFAULT_GAME_CONFIG.gridHeight), 10),
  autoRestartDelayMs: parseInt(process.env.AUTO_RESTART_DELAY_MS || String(DEFAULT_GAME_CONFIG.autoRestartDelayMs), 10),
  tiktokProvider: (process.env.TIKTOK_PROVIDER as 'mock' | 'tiktok') || 'mock',
  tiktokUsername: process.env.TIKTOK_USERNAME || '',
  tiktokSignApiKey: process.env.TIKTOK_SIGN_API_KEY || process.env.SIGN_API_KEY || '',
  wsHeartbeatIntervalMs: parseInt(process.env.WS_HEARTBEAT_INTERVAL_MS || '30000', 10),
  wsSnapshotIntervalMs: parseInt(process.env.WS_SNAPSHOT_INTERVAL_MS || '50', 10),
};
