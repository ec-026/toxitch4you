# toxitch4you — Cloudflare deployment edition

The original Hong Kong Ninja assets and SWF are under `public/`. The multiplayer browser client is `public/app.js`. The live room relay is `src/worker.js`, using one Cloudflare Durable Object per room. All room codes and game inputs are transmitted over TLS/WSS on Cloudflare.

## Publish to your private GitHub repo AND Cloudflare (Windows)

The configured repository is `https://github.com/ec-026/toxitch4you.git`. This URL is a destination, **not** proof that the repository is private. Open **GitHub → repository → Settings → General → Danger Zone** and confirm the visibility is **Private** before pushing.

1. Install [Node.js LTS](https://nodejs.org/) and [Git for Windows](https://git-scm.com/downloads/win). Git for Windows includes Git Credential Manager for secure GitHub browser sign-in. Never enter access tokens into scripts.
2. Extract the ZIP into a fresh folder, then double-click `deploy-windows.bat`.
3. The script installs npm dependencies, checks JavaScript, scans for obvious secrets, initializes Git if necessary, commits changes, and pushes `main` to the configured GitHub repository **without force**. It may prompt for Git author name/email or GitHub browser authentication on first use.
4. **Only if the GitHub push succeeds**, the script logs into the **same Cloudflare account** as your existing Pages portfolio and deploys `toxitch4you` as a separate Worker.
5. For GitHub-only updates, run `github-push.bat`. For later site releases, rerun `deploy-windows.bat`.

If the remote repository already contains commits (for example a GitHub-generated README), pushing a fresh unrelated history safely fails. **Do not force push.** Either clone the existing repository first and copy the extracted project files into that checkout, or reconcile the histories deliberately using Git. If you cloned first, copy the files over *without overwriting the `.git/` directory*, then run the scripts from that checkout.

**Secrets:** `.gitignore` excludes `.env`, `.env.*`, `.dev.vars`, local credentials, private keys, `.npmrc`, tooling files and dependency directories. The included `scripts/check-secrets.cjs` scans for common secret patterns and refuses to commit suspicious staged files. This is not exhaustive: inspect `git status` / `git diff --cached` before the first push. **Never store passwords, API keys, Cloudflare tokens or session secrets inside browser JS or HTML.** Set production secrets through `npx wrangler secret put NAME` (or Cloudflare dashboard settings); use `.dev.vars` locally. Wrangler browser login handles Cloudflare authentication without embedding a secret in this project. The present multiplayer project needs no user-supplied environment secrets for ordinary deployment.

**Privacy distinction:** GitHub **Private** limits repository access; files deployed under `public/`, including the Flash SWF and level files, are still accessible to visitors on the public website. Confirm distribution rights for third-party game assets before public release.

## Quick start: local

- Install Node.js LTS.
- Windows: double-click `start-local.bat` (uses the `local/server.cjs` test server, with no npm install).
- Other systems: `node local/server.cjs`.
- Open http://localhost:8765, create a room; open a second tab/window, join by code or invite link.
- This local server replicates the room protocol, but Cloudflare will use the Durable Object implementation instead.

## Deploy free to Cloudflare

1. Create a Cloudflare account at https://dash.cloudflare.com/sign-up and enable the free Workers subdomain (workers.dev), if prompted.
2. Install Node.js LTS from https://nodejs.org/ on your deployment computer.
3. Open a terminal **in this folder**, which contains `package.json` and `wrangler.jsonc`.
4. Run `npm install` (downloads Wrangler, developer tooling only; players install nothing).
5. Run `npx wrangler login` and authorize Cloudflare in your browser.
6. Run `npm run deploy` (same as `npx wrangler deploy`). Confirm the `workers.dev` deployment URL shown in the terminal.
7. Open that HTTPS URL in two separate browser profiles or PCs, create a room on one, open its invite link on the other. Test controls, skills, jump, start synchronization, and shared pause.

**Do not deploy by uploading only the `public/` folder to a static site**: that would omit the WebSocket/room backend. Deploy the full project with Wrangler.

If `npm install` fails because Node/npm are too old, update to current Node LTS. If `wrangler deploy` fails about Durable Objects, confirm the free plan supports **SQLite-backed Durable Objects** for your account and the `v1` migration is applied.

## Directory map

```
toxitch4you_cloudflare/
├── public/                 Static files: game, images, HTML, CSS, browser JS
│   ├── index.html
│   ├── style.css
│   ├── app.js              UI, Ruffle, room WebSocket client
│   ├── hongkongninja.swf   Tested modified game
│   └── resource/level_*.swf
├── src/worker.js           Cloudflare entry + room Durable Object
├── local/server.cjs        Developer-only local WebSocket server
├── docs/                   Operating and scaling instructions
├── wrangler.jsonc          Cloudflare deployment configuration
├── package.json           Wrangler dependency and scripts
└── start-local.bat         Local testing shortcut
```

## Changes from the tested build

- The browser generates a random 8-hex-character room code with `crypto.getRandomValues` and opens `/ws?room=CODE&mode=create` or `mode=join`. The original standalone Node server generated the code after connection.
- The live Cloudflare Worker uses one Durable Object per room, keeping distinct pairs isolated without an always-running server.
- All original game SWFs, layout markup, CSS, character controls, network bridge methods, and game graphics are left as supplied.
- `public/_headers` adds asset caching rules. Browser client files use no-cache to simplify releases.
- A small Node-only local server remains, strictly for developer testing; it understands the new room URL protocol.

## Important caveats

- A browser-based two-player room *does not guarantee identical enemy/health/mission simulation*. The previously reported game-state synchronization limitation remains. Inputs, character selection, shared start, and pause are handled by the room server.
- There is no authentication or abuse protection yet. Rooms are private-by-code, not access-controlled by accounts. Do not expose admin routes or personal data through this service.
- The HTML currently loads Ruffle from the external `unpkg.com` CDN. If availability or performance becomes an issue, bundle a known-good Ruffle release locally in `public/vendor/ruffle/` and update the script path.
- You need permission to redistribute the original game's SWF, artwork, and external level files publicly. Confirm rights before deploying.
- Cloudflare Free has request/message limits, and users' ping and animation performance depend on their hardware and internet paths; no host can promise zero latency.

See `docs/OPERATIONS.md` for monitoring, upgrade path, testing and future games.
