# Ruffle base URL compatibility test

This is a *diagnostic* patch, not a confirmed cure for the hosted black screen.

## Install
1. Back up `public/index.html` and `public/app.js` from your existing project.
2. Copy these two files into its `public/` directory, replacing existing files.
3. Keep the existing `.git`, worker, SWF and six levels unchanged.
4. Run your normal `deploy-windows.bat` and open the published game in a private browser window.

## Changes
- Set `window.RufflePlayer.config` before loading Ruffle JS (similar loading order to Snokido).
- Set `base` explicitly to the site root (`https://.../`); the game has `resource/level_1.swf` etc there.
- Use `player.load()` and an absolute same-origin SWF URL as in Snokido's loader.
- Keep `allowScriptAccess: true` and the existing multiplayer ExternalInterface bridge.
- Do not make changes to room server, assets or game SWF.

## How to interpret result
- If the title screen now appears, the failure was associated with loader configuration or URL resolution.
- If still black, *do not keep trying random settings*: investigate Flash origin / ActionScript startup. Restore the two backed-up files if required.
- A 1/6 loading indicator means a different stage than a black title screen: inspect the Network tab to see whether `resource/level_1.swf` has been requested. The base setting controls how relative paths are resolved; it does not force the game to request levels.

Note that Snokido's main website embeds a separate player page. Their player config alone does not establish why their full website works and a direct player URL may stall at 1/6.
