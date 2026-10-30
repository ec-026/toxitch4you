# Ruffle hosted-game troubleshooting

This revision removes the HEAD/content-type preflight added in the previous patch and restores the exact locally-tested relative SWF URL. The earlier strict preflight could itself prevent boot.

## After deployment
1. Hard-refresh with Ctrl+Shift+R or use incognito.
2. Create a room and wait for the SWF to display.
3. If the black screen remains, open DevTools F12 > Network > All, tick Preserve log and reload. Filter by `swf`, then inspect status + response type of `hongkongninja.swf` and `resource/level_1.swf`. Open Console and copy red errors.
4. If the first SWF is 200 but level 1 never starts, the SWF itself may be requesting another URL or a Flash security context; inspect request URLs and Ruffle console messages.
5. Compare with your working localhost build under the same Ruffle version.

**A direct SWF URL downloading is normal and does not prove that Ruffle can execute it or load all its linked assets.**

This build has been checked for syntax but has not been verified in live Chrome against your Cloudflare account.
