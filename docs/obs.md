# OBS Studio Setup Guide

The game frontend is specifically architected for seamless streaming via **OBS Studio Browser Source** in vertical 9:16 portrait format (1080 × 1920).

---

## OBS Studio Configuration Steps

1. **Launch OBS Studio**.
2. Under **Sources**, click the **`+`** (Add) button and select **Browser**.
3. Name the source (e.g., `TikTok Snake Game`).
4. Configure the Browser Source properties:
   - **URL**: `http://localhost:5173/` (or your production hosting URL)
   - **Width**: `1080`
   - **Height**: `1920`
   - **Custom Frame Rate**: Check box and set to `60` FPS
   - **Control audio via OBS**: Check box (allows desktop audio control in OBS mixer)
   - **Shutdown source when not visible**: Unchecked (keeps game running continuously)
   - **Refresh browser when scene becomes active**: Unchecked (preserves game state during scene switches)
5. Click **OK**.

---

## Transparent Background Setup

If you want the game board and HUD to float over live webcam footage or custom stream background:

1. In `.env`, set:
   ```env
   VITE_OBS_TRANSPARENT_BG=true
   ```
2. In OBS Browser Source properties:
   - Under **Custom CSS**, replace the default CSS with:
     ```css
     body {
       background-color: rgba(0, 0, 0, 0);
       margin: 0px auto;
       overflow: hidden;
     }
     #stream-container {
       background-color: transparent !important;
       box-shadow: none !important;
     }
     ```

---

## Hiding the Dev Simulator Panel in OBS

The developer drawer is designed to be invisible to stream viewers:
- In production mode (`NODE_ENV=production`), the panel is completely suppressed.
- During local streaming, simply keep the drawer in its default collapsed state, or hide it via custom CSS in OBS:
  ```css
  #dev-panel {
    display: none !important;
  }
  ```

---

## Reliability & Auto-Recovery in OBS

- **Automatic Reconnection**: If the server restarts or network fluctuates, the WebSocket client automatically reconnects using exponential backoff without requiring browser refresh.
- **Continuous Death Loop**: When the snake dies, the game automatically displays the death screen for 6 seconds and starts a new snake without any manual intervention.
