# TikTok LIVE Integration Guide

The game connects to TikTok LIVE streams through an abstract, decoupled interface: `LiveEventProvider`.

```ts
export interface LiveEventProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onGift(handler: (event: GiftEvent) => void): void;
  onLike?(handler: (event: LikeEvent) => void): void;
  onFollow?(handler: (event: FollowEvent) => void): void;
  onShare?(handler: (event: ShareEvent) => void): void;
  isConnected(): boolean;
}
```

This guarantees that TikTok-specific protocol changes or library updates never impact the game engine or rendering logic.

---

## 1. Operating Modes

The server supports two provider modes via `.env`:

### Mode A: Mock Simulator (Default)
```env
TIKTOK_PROVIDER=mock
```
- No TikTok account or live stream required.
- Enables the in-browser Developer Control Drawer (`🛠️ DEV SIMULATOR`).
- Supports the REST simulation API (`POST /api/simulate-gift`).
- Supports automated background gift simulation (`POST /api/auto-sim/start`).

### Mode B: Real TikTok LIVE Connection
```env
TIKTOK_PROVIDER=tiktok
TIKTOK_USERNAME=your_tiktok_username
```
- Connects directly to the live Webcast room of the specified username.
- Automatically receives real viewer gifts (Roses, Hearts, Tigers, Lions, Universes).
- No TikTok API keys or developer credentials required (listens to the public Webcast WebSocket feed).

---

## 2. Installing `tiktok-live-connector`

To use the live TikTok integration:

```bash
npm install tiktok-live-connector --save -w @snake-live/server
```

Then update your `.env`:
```env
TIKTOK_PROVIDER=tiktok
TIKTOK_USERNAME=@your_streamer_handle
```

Restart the server:
```bash
npm run dev:server
```

---

## 3. Data Sanitization & Security

Per project security requirements (Section 34):
- Raw TikTok payloads are **never** trusted or executed.
- `TikTokLiveAdapter` strictly sanitizes usernames (strips special characters, truncates to 32 chars).
- Gift counts are clamped between `1` and `1000`.
- All timestamps and IDs are validated before entering the `EventQueue`.
- Server secrets are never passed to the client WebSocket.

---

## 4. Multi-Platform Extensibility

Because the system uses `LiveEventProvider`, you can seamlessly add other platforms by implementing the same interface:
- `TwitchLiveAdapter` (`packages/shared/src/events/twitch.ts`)
- `YouTubeLiveAdapter`
- `KickLiveAdapter`
