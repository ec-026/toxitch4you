# Hosting, growth and maintenance

## Recommended infrastructure

**Today: Cloudflare Workers + Static Assets + SQLite-backed Durable Objects.** Your game assets are served from Cloudflare's CDN. Each eight-character invite room maps to a distinct Durable Object for coordinating exactly two WebSockets; room messages don't flow through a global single-process lobby. Players don't run Node.js or ngrok.

Cloudflare currently offers Durable Objects on the Workers Free tier, with limits. At the time this package was prepared, the paid Workers plan has a **$5 USD/month minimum account fee** and included usage; check https://developers.cloudflare.com/workers/platform/pricing/ before upgrading. This is not an unlimited free service. One websocket input event counts toward Durable Object message/request usage, so heavy traffic can exhaust daily free limits.

## Deployment lifecycle

- Edit `public/` for UI, `src/worker.js` for room logic.
- Test `node local/server.cjs` with two windows, and `npm run dev` for Cloudflare-specific local behavior after installing Wrangler.
- `npm run check` checks JavaScript syntax. `npm run deploy` uploads Worker + static assets in one deployment.
- Test deployed website in **two separate browser profiles / physical devices**, including direct invite URL bypassing creator notice and in-game pause.
- Use Cloudflare dashboard Workers & Pages > your Worker > Observability / metrics to inspect request and errors; avoid logging room IDs, keys, or personal data.
- Do not overwrite production SWFs until you've tested changes locally. Version and back up the existing working SWFs and the last known-good project.

## Upgrade phases

| Stage | Infrastructure | Reason |
| --- | --- | --- |
| First users | Cloudflare Workers Free | CDN assets, hosted WebSockets, separate rooms, no server management |
| Steady traffic | Workers Paid from $5 USD/month minimum | Higher request/duration quotas, usage-based overages |
| Many games | Keep common platform in `public/`, move each game to `public/games/<slug>/` and create a game registry | Easy addition of thumbnails, metadata and static resources |
| High concurrent use | Add matchmaking/rate limits, reconnect tokens, per-game room types, monitoring and load tests | Better resilience and abuse control |
| Competitive realtime play | Measure RTT, consider WebRTC channels and deterministic authoritative game simulation | Reduced input delivery delay and actual state consistency |

## Recommended multi-game structure later

```
public/
  index.html, style.css, app.js
  assets/branding/
  games/hong-kong-ninja/ (game.swf, levels, thumbnail)
  games/next-game/...
src/
  worker.js (router)
  room-protocol.js (shared validation)
  games/hong-kong-ninja.js (start & game-specific control messages)
```

Do **not** move the existing SWF and `resource/` URLs during the first deploy: the game's loader expects them in their current locations. Migrate only when you can change and test the Flash resource paths.

## Latency / reliability expectations

- Cloudflare Workers removes the operational latency associated with sleeping free web servers, but it does not eliminate internet roundtrip time.
- Room coordination is lightweight. This is WebSocket input relay, not video streaming.
- This package does **not** synchronize enemy AI, enemy health, pickups or save-state between clients, so divergent gameplay is still possible.
- A pure WebSocket relay may not be fast enough for twitch-precision gameplay across continents; monitor real two-PC ping and gameplay before claiming performance.
- For better reconnect reliability, add session credentials and role recovery. For stricter security, enforce per-IP rate limits and room timeouts.

## Security and publishing checklist

- Verify you have redistribution rights for Hong Kong Ninja and its game assets.
- Never put private tokens in `public/` or Git.
- Apply Cloudflare request/rate limiting as traffic grows.
- Consider a privacy policy before collecting analytics or adding accounts.
- Set spending alerts before enabling paid usage-based billing.

## Publishing and credential handling

Windows release command: `deploy-windows.bat` (GitHub push first, Cloudflare deployment after success). GitHub-only command: `github-push.bat`. Remote: `https://github.com/ec-026/toxitch4you.git`. Ensure repo visibility is Private in GitHub settings. Keep secrets in Cloudflare's encrypted secrets store (`npx wrangler secret put NAME`) or local ignored `.dev.vars`. The secret scanner is defensive but cannot identify every credential, so review staged changes. No force pushes are performed by the scripts.
