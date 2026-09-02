# Recording script

Target: 4 to 5 minutes. The task asks for two things on camera — **the
deployment flow** and **the app running** — so both need to appear in full.
Scene 6 is the extra one worth the time: it shows a remote being consumed, which
is the part that turns "files were published" into "federation works".

Lines in blockquotes are meant to be said out loud. They are written to be
spoken, not read.

## Before you hit record

Start at the repository root; everything after the `cd` runs from `mobile/`.

```bash
# 1. the API, from the repository root
docker compose up -d
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/v1/taxonomy   # want 200

cd mobile

# 2. simulator up, app installed
npx react-native run-ios --simulator "iPhone 17 Pro"

# 3. Metro in a second tab (stays off camera)
npm start

# 4. authenticate once, so Zephyr does not ask mid-take
npm run deploy:ios
```

The last one matters. If Zephyr prompts for login during the recording, you lose
the deploy shot.

**If that `curl` returns 404**, something else owns port 3000 and the app will
sit on empty screens for the whole take. Free the port, or move both ends:
`API_PORT=3010 docker compose up -d` and `DEV_PORT` in
`src/shared/api/client.ts`. Check the curl again before recording — a debug
build points at localhost, and there is no fallback to the public API.

Have ready to switch between:

- terminal in `mobile/`, font at 14pt or larger
- editor with `metro.config.js` open
- browser at `app.zephyr-cloud.io`, already signed in
- simulator with the app closed, so you can open it on camera

Clear the terminal first. No command history in frame.

---

## Scene 1 — What this is (15s)

Simulator, app on the home screen.

> "This is a study app for the ENEM, Brazil's national university entrance exam.
> It holds 2,735 real questions, with images and long supporting texts. Real
> content stresses a bundler in ways a to-do list never does, which is why I
> built this instead of a starter template."

Scroll through the four subjects.

## Scene 2 — Where Zephyr sits (45s)

Editor, `metro.config.js`.

> "Zephyr does not replace Metro. Metro still resolves the imports, runs the
> Babel transforms and produces the bundle. Zephyr hooks onto the end of that:
> it takes the output, versions it immutably, and pushes it to the edge."

Show, in this order:

1. `exposes` (around line 24) — four remotes, one per domain
2. `withZephyr` + `withModuleFederation` — both are required
3. `react-native.config.js` — the `zephyrCommandWrapper`

> "This wrapper is what actually publishes. `withZephyr` alone in the Metro
> config publishes nothing — it authenticates, greets you by name, bumps a
> version counter, writes the bundle and exits zero. That one cost me hours, and
> it is the first item in my feedback notes."

## Scene 3 — The deploy (60s)

Terminal:

```bash
npm run deploy:ios
```

While it runs, point at:

- `ZEPHYR Hi <user>!` — authentication
- `questiona.questiona.questoes#N` — app.project.org, incrementing version
- four `Writing bundle output to: dist/ios/exposed/*.bundle`
- `Done writing MF Manifest`
- `(N/12 assets uploaded ...)`
- the version URL

**As soon as it finishes, run it again:**

```bash
npm run deploy:ios
```

> "Same command, nothing changed in between. First run uploaded twenty-five
> megabytes. This one uploaded one asset out of twelve — a tenth of a kilobyte,
> in under four hundred milliseconds. Zephyr deduplicates by content: whatever
> is already on the edge does not go up again."

This comparison is the strongest moment in the video. Keep both numbers on
screen together if you can.

## Scene 4 — The dashboard (30s)

Browser, `app.zephyr-cloud.io`, organization `questoes`, project `questiona`.

Show the version list and open the latest.

> "Every build becomes a version with its own URL. That is what makes a
> JavaScript rollback a matter of pointing an environment at the previous
> version, instead of shipping a hotfix through the store."

## Scene 5 — The app running (60s)

Simulator. Take the short, real path:

1. sign in
2. tap Mathematics
3. **let the question load with its image** — this shows the bundle serving real
   content, not a mock
4. pick an answer, tap submit
5. the correct choice turns green
6. open the Stats tab

No rush here. This is the proof that the published bundle works.

## Scene 6 — Consuming a remote (75s) — **the money shot**

This is the one that shows federation doing something, rather than just
producing files. It is a live swap: change the published screen, and the running
app picks it up with no rebuild and no reinstall.

Open the Stats tab first and let the banner read on camera:

```
● ./stats loaded from Zephyr edge
```

> "That banner is not decoration. This screen was fetched from Zephyr's edge a
> second ago — it is not in the app's own bundle. Let me prove it."

On camera, edit `src/modules/stats/StatsScreen.tsx` and add a marker to the
title:

```tsx
{t('stats.title')} · edge v2
```

Deploy, then **revert the file**:

```bash
npm run deploy:ios
git checkout src/modules/stats/StatsScreen.tsx
```

Show the revert. Show that the local source no longer contains `edge v2`. Then
paste the new URL into `src/shared/federation/remoteUrl.ts` and reload the app.

> "The local file is back to what it was. The app was not rebuilt. And the
> screen now says 'edge v2' — text that exists nowhere on this machine. It came
> from the edge."

Show the title: **Stats · edge v2**.

> "That is the whole point of the pattern. Four teams, four exposes, each one
> shipping to production without touching the app binary."

## Scene 7 — The honest limit (30s)

> "One caveat, because it cost me a day. The documented way to consume a remote
> is `bundle-mf-host`, and on React Native 0.87 it does not work: federation
> initialises before React Native creates `console`, and the app dies at launch
> on `Property 'console' doesn't exist`. Six different attempts, same crash."

> "What you just saw goes around it. The bundle Zephyr publishes is
> self-contained — it registers `{ get, init }` on a global — so the app fetches
> it and evaluates it directly, after React Native is already up. About eighty
> lines, in `src/shared/federation/loadRemoteBundle.ts`. Publishing was never the
> problem; the host runtime was."

> "All of it is written up in `docs/zephyr.md`, section six, each step
> reproduced with the error it produced."

End there. Saying what was in the way is worth more than pretending the path was
clear.

---

## What not to do

- **Do not compare bundle hashes between builds.** The build is not
  deterministic: two builds of identical source produce different hashes across
  all four bundles, and `session.bundle` varied by 415 KB between runs. You
  would be showing noise while claiming to show isolation.
- **Scenes 1 and 5 do not demonstrate federation** — the app renders the same
  whether or not the remotes exist. What demonstrates it is scene 6, where the
  version being loaded changes without a rebuild. Keep the claim attached to the
  right scene.
- **Do not skip the revert in scene 6.** Deploying and reloading proves nothing
  on its own: the dev server would serve the same new text from the local file.
  The revert is what makes the marker unambiguous.
- **Do not cut a failure.** A deploy that fails and gets fixed on camera is
  worth more than a flawless take.

## If something breaks mid-take

Deploy failing on authentication: you skipped the pre-record step above. The
token lives in `~/.zephyr` after the first successful run.

Red screen on the simulator: the dev server runs plain Metro on purpose —
federation is applied only when publishing, see `docs/zephyr.md` §5. A Module
Federation error there means `metro.config.js` was changed.

Banner reads `○ ./stats from this bundle` in scene 6: the fetch failed and the
app fell back to its own screen, which is the intended behaviour but not the
shot you want. The reason is printed next to the banner. Most likely
`remoteUrl.ts` still points at the previous deployment.
