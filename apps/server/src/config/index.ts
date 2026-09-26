import dotenv from 'dotenv';
import path from 'path';

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
  wsHeartbeatIntervalMs: number;
  wsSnapshotIntervalMs: number;
}

export const config: ServerConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  tickRate: parseInt(process.env.TICK_RATE || '12', 10),
  gridWidth: parseInt(process.env.GRID_WIDTH || '27', 10),
  gridHeight: parseInt(process.env.GRID_HEIGHT || '36', 10),
  autoRestartDelayMs: parseInt(process.env.AUTO_RESTART_DELAY_MS || '6000', 10),
  tiktokProvider: (process.env.TIKTOK_PROVIDER as 'mock' | 'tiktok') || 'mock',
  tiktokUsername: process.env.TIKTOK_USERNAME || '',
  wsHeartbeatIntervalMs: parseInt(process.env.WS_HEARTBEAT_INTERVAL_MS || '30000', 10),
  wsSnapshotIntervalMs: parseInt(process.env.WS_SNAPSHOT_INTERVAL_MS || '50', 10),
};
