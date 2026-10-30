# Hosted game renderer A/B test

This patch leaves all SWF files and room logic untouched. It adds a diagnostic query parameter to pick the Ruffle renderer.

## Deploy
Copy files into your existing Git working directory, preserving .git, then run deploy-windows.bat.

## Test
- Default: https://toxitch4you.notanormalcoder.workers.dev/
- Canvas: https://toxitch4you.notanormalcoder.workers.dev/?renderer=canvas
- WebGL: https://toxitch4you.notanormalcoder.workers.dev/?renderer=webgl

Create a room from each test URL and check for the title screen. The renderer is captured before the application changes the URL to its room invite URL.

If one renderer works, report which one. If all are black, capture Console logs with the filter disabled, including warnings/errors, and the output of: document.querySelector('ruffle-player')?.metadata

SWF hashes from source local/cloud match. This is a diagnostic build, not a confirmed fix.
