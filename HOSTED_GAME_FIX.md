# Cloudflare Ruffle game-loading fix

This edition retains the existing SWF and multiplayer scripts, changing only the Cloudflare hosting behavior and Flash loader diagnostics.

## Why this patch

Hong Kong Ninja loads `/resource/level_1.swf` through `/resource/level_6.swf` after loading its main SWF. Cloudflare's static asset MIME inference and Ruffle URL resolution may differ from the local Node server. This patch explicitly routes those requests through the Worker with `application/x-shockwave-flash`, passes Ruffle an absolute SWF URL and base path, and performs an inexpensive HEAD request preflight. It does not prove this was the root cause; inspect browser console if black persists.

## Installation

1. Back up your existing `toxitch4you_cloudflare` directory.
2. Copy the contents of this ZIP on top of that directory, retaining its `.git` folder (if present).
3. Run `deploy-windows.bat` to push the fix and redeploy the Worker.
4. Open the site in a fresh incognito window and create a room.
5. Check `https://toxitch4you.notanormalcoder.workers.dev/hongkongninja.swf` and `/resource/level_1.swf` by opening URLs. They should download or display binary data, not HTML/error text.
6. If still black, press F12 > Console and Network, filter for `swf` and `ruffle`, and share the red errors and HTTP status codes. The game top status also reports asset preflight errors.

Cloudflare credentials and account secrets are not part of this ZIP. The SWF and six level files are unchanged.
