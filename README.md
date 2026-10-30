# toxitch4you — single-instance co-op WebRTC TEST BUILD

This test build uses exactly **one Flash/Ruffle simulation per room**. The **host browser runs the SWF**, simulating both heroes, enemies, damage, pickups and levels. The **guest browser DOES NOT load the SWF**; instead it receives the host's game canvas as a WebRTC video stream. Guest keyboard input passes through the room WebSocket to the host's existing `hknRemoteDown/Up` bridge. The Cloudflare Durable Object only handles signaling and room/pause control, not gameplay simulation or media forwarding.

**Not a validated production release.** Video connection and actual dual-player gameplay have not been browser-tested yet. This version uses public STUN only; a TURN service may be needed for restrictive or carrier-grade NAT. Browser video capture support and encoder performance vary. No game audio is streamed in this prototype. WebRTC latency is normal, and host tab suspension can stop video; keep the shared away-pause feature.

## Safe install / deployment

1. **Back up** the current working `toxitch4you_cloudflare` project and its `public/hongkongninja.swf`.
2. Extract this ZIP to a **new directory**. Do not overwrite the old project while testing.
3. Copy your **latest confirmed working, location-validation-fixed SWF** into `public/hongkongninja.swf` if it differs from the included current-project file. The SWF was not edited for this test.
4. Run `npm install` and `npm run check` (Node.js required).
5. For testing on your PC, use `start-local.bat`, then open **two different browser windows/profiles** at `http://localhost:8765`.
6. Host: create room, click the original PLAY screen and choose a character. Guest: join code, click the video view to focus keys. Wait for video to connect, then use WASD / JKL. Both players should see **the same host game**.
7. Only after a successful local test, copy updated project files to your existing Git checkout (keep its `.git` folder), and run your original `deploy-windows.bat` to push/deploy.

### Test checklist
- Host runs the game and sees both heroes; guest does **not** load a second SWF.
- Guest receives live video (not a blank window); click the picture once before WASD / JKL.
- Guest input moves Hero 2 **on the host screen**; host moves Hero 1.
- Enemies, damage, health and level screen are exactly the same video on both screens.
- Minimize either window: both pause; return and Resume Together.
- Disconnect guest: stream closes safely; reconnect with a fresh room if necessary.

### Troubleshooting
- `STREAM ERROR: Ruffle canvas unavailable`: Ruffle's canvas is not capturable in that browser; inspect the shadow DOM and update `findGameCanvas` in `public/app.js`.
- `VIDEO CONNECTION FAILED`: peer-to-peer WebRTC failed. Test the same Wi-Fi first, then add properly configured TURN credentials. **Never commit TURN secrets to public JS.** Use a backend endpoint to mint short-lived TURN credentials.
- Video is black but host game is visible: captureStream on the WebGL canvas may not yield pixels in your browser. A host-display capture prompt (`getDisplayMedia`) or another supported capture pathway would be required.
- Guest can't move: click the video to focus it; make sure the SWF has the tested input bridge and that the host has reached mission gameplay.
- Site loads but game black: use the SWF with the authorized Miniclip location-check fix, not an older debug SWF.

### Files changed
- `public/app.js`: Ruffle for host only, WebRTC video, guest keys, existing pause and room flows.
- `public/index.html`: remote `<video>` for guest.
- `public/style.css`: remote video viewport styling.
- `src/worker.js`: room-scoped validated WebRTC signaling relay.
- `local/server.cjs`: matching local signaling relay.

All other website files and game assets come from your uploaded Cloudflare project.
