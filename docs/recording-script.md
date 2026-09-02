# Recording script

Target: 4 to 5 minutes. The task asks for two things on camera — **the
deployment flow** and **the app running** — so both need to appear in full.
Scene 6 is the extra one worth the time: it shows a remote being consumed, which
is what turns "files were published" into "federation works".

Lines in blockquotes are meant to be said out loud. They are written to be
spoken, not read.

## Before you hit record

Start at the repository root; everything after the `cd` runs from `mobile/`.

```bash
# 1. the API. The port comes from API_PORT in .env, not necessarily 3000.
docker compose up -d
PORT=$(grep -E '^API_PORT=' .env | cut -d= -f2)
PORT=${PORT:-3000}
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:$PORT/v1/taxonomy   # want 200

cd mobile

# 2. a demo account with a history, so the stats screen has charts on camera
node scripts/seed-demo.mjs http://localhost:$PORT
#    -> aroldo@questiona.test / demo-questiona-123

# 3. point the app at that same port
#    DEV_PORT in src/shared/api/client.ts

# 4. simulator up, app installed
npx react-native run-ios --simulator "iPhone 17 Pro"

# 5. Metro in a second tab (stays off camera)
npm start

# 6. authenticate once, so Zephyr does not ask mid-take
npm run deploy:ios
```

The last one matters. If Zephyr prompts for login during the recording, you lose
the deploy shot.

**A 404 there means something else owns that port** -- another dev server, most
likely -- and the app will sit on empty screens for the whole take. Either free
the port or move the API: `API_PORT=3010 docker compose up -d`. Whatever port
wins, `DEV_PORT` in `src/shared/api/client.ts` has to match it, and so does the
argument to the seed script. A debug build points at localhost and never falls
back to the public API, so this is worth checking twice before recording.

`docker compose up -d` **starts an existing container without re-reading
API_PORT**. If you changed the port and it did not take, `docker compose up -d
--force-recreate` will. `docker compose ps` shows where it actually landed.

**Set the simulator to English.** The app follows the device locale, and the
whole script below assumes English strings:

```bash
SIM=$(xcrun simctl list devices booted | grep -oE '[0-9A-F-]{36}' | head -1)
xcrun simctl spawn $SIM defaults write -g AppleLanguages -array en-US
xcrun simctl spawn $SIM defaults write -g AppleLocale -string en_US
xcrun simctl shutdown $SIM && xcrun simctl boot $SIM
```

Have ready to switch between:

- terminal in `mobile/`, font at 14pt or larger
- editor with `metro.config.js` open
- browser at `app.zephyr-cloud.io`, already signed in
- simulator with the app closed, so you can open it on camera

Clear the terminal first. No command history in frame, and nothing showing
`.env` or a token.

---

## Scene 1 — What this is (20s)

**Screen:** the app open on Home.

> "This is an ENEM study app in React Native. The interesting part is not the
> app: it publishes four of its screens as independent remotes on Zephyr, and
> loads one of them back from the edge at runtime."

Walk Home → a question → Stats, unhurried. Just so the viewer knows what they
are looking at.

---

## Scene 2 — Where Zephyr sits (45s)

**Terminal:**

```bash
sed -n '/exposes:/,/},/p' metro.config.js
```

Four exposes, one per domain.

**Terminal:**

```bash
grep -rn "from '\.\./\(questions\|stats\|account\)/" src/modules
```

> "No output. Nothing under `modules/` imports from another `modules/`. That
> import rule is what makes the separation real — not the list of exposes."

**Editor:** show `metro.config.js`, the `withZephyr` + `withModuleFederation`
pair.

> "Federation is applied only when publishing. In development Metro runs plain.
> Applying it always breaks the dev server on React Native 0.87 — that is
> section five of the write-up."

---

## Scene 3 — The deploy (60s)

**Terminal:**

```bash
npm run deploy:ios
```

Point at the output, in this order:

1. `ZEPHYR Hi <user>!` — authenticated
2. `questiona.questiona.questoes#N` — app.project.org, version incrementing
3. four `Writing bundle output to: dist/ios/exposed/*.bundle`
4. `Done writing MF Manifest`
5. `(N/12 assets uploaded ...)` ← **stop here**
6. the immutable URL for that version

> "Watch the asset count. Run it again without changing anything and that number
> drops — Zephyr deduplicates by content. That is where the isolation becomes
> something you can measure instead of assert."

Run it again to prove it:

```bash
npm run deploy:ios
```

---

## Scene 4 — The dashboard (30s)

**Screen:** `app.zephyr-cloud.io`. Show the version that just went up and the
four artifacts, each with its own URL and immutable version.

---

## Scene 5 — The app running (60s)

**Screen:** the simulator.

1. Home → tap **Mathematics**
2. Answer one question: pick an option, tap **Answer**, see the correction
3. Move to the next one
4. Leave with the **X**
5. Open the **Stats** tab

> "Accuracy per subject, the totals, average time per question."

**Let the banner at the top read clearly:**

```
● ./stats loaded from Zephyr edge
```

> "That strip is not decoration. This screen was fetched from Zephyr's edge a
> second ago — it is not in the app's bundle. Let me prove it."

---

## Scene 6 — Consuming a remote (75s) — **the money shot**

**Editor, on camera.** Open `src/modules/stats/StatsScreen.tsx` and add a marker
to the title:

```tsx
{t('stats.title')} · edge v2
```

**Terminal:**

```bash
npm run deploy:ios
```

Copy the new URL. Now **undo the edit, on camera**:

```bash
git checkout src/modules/stats/StatsScreen.tsx
grep -c "edge v2" src/modules/stats/StatsScreen.tsx    # 0
```

> "The local file is back to what it was. The grep finds nothing. The app was
> not rebuilt."

**Editor:** paste the new URL into `src/shared/federation/remoteUrl.ts` and save.
The app reloads on its own.

**Screen:** the title now reads **Stats · edge v2**.

> "That text exists nowhere on this machine. It came from the edge. That is the
> whole point of the pattern: four teams, four deploys, none of them touching
> the app binary."

The `git checkout` is what makes the proof valid. Without it the dev server
would be serving the same new text from the local file, and you would have
proven nothing.

---

## Scene 7 — The honest limit (30s)

> "One caveat, because it cost a day. The documented way to consume a remote is
> `bundle-mf-host`, and on React Native 0.87 it does not work: federation
> initialises before React Native creates `console`, and the app dies at launch
> on `Property 'console' doesn't exist`. Six different attempts, same crash."

> "What you just saw goes around it. The bundle Zephyr publishes is
> self-contained — it registers `{ get, init }` on a global — so the app fetches
> it and evaluates it directly, once React Native is already up. About eighty
> lines, in `src/shared/federation/loadRemoteBundle.ts`. Publishing was never the
> problem; the host runtime was."

> "Three traps on the way, all of them silent. The worst: offering `^7.3.18`
> where the runtime wants `7.3.18`. It compares a range against a range, rejects
> its own match, logs it at info level — and the consequence shows up much later
> as a tab bar that stops responding."

> "It is all in `docs/zephyr.md`, section six, each step with the error it
> produced."

**Terminal, to close:**

```bash
npm run e2e
```

> "Six flows, with the stats screen coming from the edge."

---

## After recording

```bash
git checkout src/shared/federation/remoteUrl.ts
```

That points the app back at the committed deployment instead of the throwaway
`edge v2` one. If you moved the API port, revert `src/shared/api/client.ts` too.

## What not to do

- **Do not compare bundle hashes between builds.** The Metro build with Module
  Federation is not deterministic: two builds of identical source produce
  different hashes across all four bundles, and `session.bundle` varied by
  415 KB between runs. You would be showing noise while claiming to show
  isolation.
- **Scenes 1 and 5 do not demonstrate federation** — the app renders the same
  whether or not the remotes exist. What demonstrates it is scene 6, where the
  version being loaded changes without a rebuild. Keep the claim attached to the
  right scene.
- **Do not skip the revert in scene 6.** Deploying and reloading proves nothing
  on its own.
- **Do not cut a failure.** A deploy that fails and gets fixed on camera is
  worth more than a flawless take.

## If something breaks mid-take

Deploy failing on authentication: you skipped the pre-record step above. The
token lives in `~/.zephyr` after the first successful run.

Red screen on the simulator: the dev server runs plain Metro on purpose —
federation is applied only when publishing, see `docs/zephyr.md` §5. A Module
Federation error there means `metro.config.js` was changed.

Banner reads `○ ./stats from this bundle` in scene 5 or 6: the fetch failed and
the app fell back to its own screen, which is the intended behaviour but not the
shot you want. The reason is printed next to the banner. Most likely
`remoteUrl.ts` still points at an older deployment.

Empty screens everywhere: the API is not on the port `DEV_PORT` names. Re-run
the `curl` from the setup block.
