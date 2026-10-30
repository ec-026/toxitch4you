toxitch4you - Away / Return Shared Pause Patch

Replace ONLY these files in your current toxitch4you_cloudflare project:
  public/app.js
  public/index.html
  public/style.css
  src/worker.js
  local/server.cjs

DO NOT replace your SWF, level files, wrangler.jsonc, .git, or deployment scripts.

IMPORTANT: If you made custom edits to public/index.html, public/app.js or public/style.css after the last Ruffle Base Path Patch, back them up and merge carefully. This patch is based on the final Ruffle Base Path Patch frontend and the existing Cloudflare/local server message protocol. It retains absolute SWF loading and the Ruffle base setting.

Deployment: backup your project, copy these files over, run existing deploy-windows.bat, force refresh both players.

Behavior:
- When either tab becomes hidden or browser window loses focus, the room pauses for both players.
- When both windows return, the room remains paused.
- The overlay shows each player's Ready/Away status and a RESUME TOGETHER button.
- Either player can resume after both return. The server rejects early resume.
- Existing in-game pause and header pause still work.
- No SWF or ActionScript changes required.

Local test: PASS (host + guest; away; early resume rejected; return still paused; manual resume accepted).
Production deployment and live SWF playback have not yet been verified.

NOTE: This intentionally pauses on WINDOW blur, not just tab hiding. Clicking another app triggers pause. Clicking controls within the same browser window normally does not.
