# Hong Kong Ninja — State Sync Phase 1 (test build, NOT full synchronization)

This patch is built against the exact `toxitch4you_cloudflare.zip` supplied in the conversation, plus the full JPEXS ActionScript export. It does not contain a new SWF or overwrite original game assets.

## What is implemented

- Host Flash bridge `hknGetWorldSnapshot()` reads the two hero XYZ positions and living enemy positions (`Global.camp3`, keyed by `myID`) every 150 ms.
- Cloudflare Durable Object (and local test server) relays host-only `world-state` messages to the guest **without writing snapshots to persistent storage**.
- Guest Flash bridge `hknApplyWorldSnapshot()` checks current mission/section/level and corrects matching hero and enemy XYZ positions.
- Existing key relay, shared away-pause, room code, and session logic remain in place.

## What is NOT implemented — read carefully

**This is not full game-state synchronization.** The guest still runs its own enemy AI, collision detection, damage, animations, HP, pickups, spawning, and level transitions. Position corrections can look jerky and will not fix divergent kills, missing enemies, or progress. `myID` might not match when spawn orders differ. No snapshot is persisted for reconnection, and this iteration has not been compiled or tested as a SWF in two browsers. Do not deploy this patch publicly as a completed fix.

## Windows test — minimal changes

1. Back up your working SWF and your Cloudflare project folder.
2. Place the unmodified, **latest tested working** `hongkongninja.swf` somewhere safe. Do not use the debug overlay build.
3. With JPEXS 26 installed, run `build-swf.bat`. It asks for the path to `ffdec-cli.exe` and the source SWF, and writes `hongkongninja_phase1_test.swf` in this patch folder. It never overwrites the source.
4. If FFDec compilation fails, stop and share the error. You can instead import the one `.as` class with JPEXS GUI; do not discard errors.
5. Reopen the test SWF in JPEXS, find `UserControl`, and verify callbacks `hknGetWorldSnapshot` and `hknApplyWorldSnapshot` are present. Preserve all other existing callbacks.
6. In a **copy** of your project, replace `public/app.js`, `src/worker.js`, and `local/server.cjs` with the three files from this patch. Copy and rename the test SWF to `public/hongkongninja.swf` in that copy.
7. Start local server with `start-local.bat`. Create/join with two browsers, test all seven keyboard controls, pause, room join, and spawn/kill behavior; compare two screens and watch for jumps or missing enemies.
8. Only if the test does not regress gameplay, consider a separate Cloudflare preview deployment. Do not automatically run `deploy-windows.bat` on your production project yet: that publishes the test SWF and commits it to GitHub.

## Next phase for real world authority

Host needs to be the sole executor of enemy AI, hit/damage resolution, pickup collection, spawn/despawn, and section advancement. Guest needs authoritative entity creation/removal and replication of HP, animation/actions, projectiles, pickups and world progress, plus recovery from a snapshot on reconnect. These systems are interdependent in `BasicEnemy`, `BasicLiveObject`, `GameControl`, `BasicHero`, `BasicObject`, and related classes. A full conversion requires isolating those writes and testing every mission in two browsers, not only relaying positions. This patch starts with the communication path and leaves the tested build untouched.

## Backout

Restore backed-up `public/app.js`, `src/worker.js`, `local/server.cjs`, and `public/hongkongninja.swf`. Do not import replacement source into the only copy of your SWF.

## JPEXS reference

JPEXS documents the `-replace <infile> <outfile> <scriptname> <ActionScript-file>` command and `-importScript` bulk import. For a one-class change, `-replace` is safer than importing all decompiled classes. See https://github.com/jindrapetrik/jpexs-decompiler/wiki/Commandline-arguments
