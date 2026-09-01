# Recording script

Target: 4 to 5 minutes. The task asks for two things on camera — **the
deployment flow** and **the app running** — so both need to appear in full.

Lines in blockquotes are meant to be said out loud. They are written to be
spoken, not read.

## Before you hit record

All commands run from `mobile/`.

```bash
cd mobile

# 1. simulator up, app installed
npx react-native run-ios --simulator "iPhone 17 Pro"

# 2. Metro in a second tab (stays off camera)
npm start

# 3. authenticate once, so Zephyr does not ask mid-take
npm run deploy:ios
```

That third one matters. If Zephyr prompts for login during the recording, you
lose the main shot.

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

## Scene 3 — The deploy (60s) — **the main shot**

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

## Scene 6 — Swapping a remote version live (60s) — **the payoff**

Two versions are already published and differ on screen:

| Version | Heading in the Stats tab |
|---|---|
| `#39` | "Accuracy by subject" |
| `#41` | "Accuracy by subject — REMOTE v2" |

URLs are in `docs/consuming-remotes.md`. Have them ready to paste.

On the simulator:

1. **Stats** tab — banner reads `○ ./stats from this bundle`
2. **Profile → Federated module**, paste the **#39** URL, tap *Use this version*
3. back to **Stats** — banner turns to `● ./stats loaded from Zephyr edge`
4. **Federated module** again, paste **#41**, tap *Use this version*
5. back to **Stats** — the heading now reads **"— REMOTE v2"**

> "Same app. I did not rebuild it, reinstall it, or ship anything to a store.
> I pointed it at a different published version and the screen came from there.
> That is what Module Federation buys you, and it is why the immutable URL per
> build matters — rolling back is pointing at the previous one."

6. Tap *Use the bundled screen* to fall back.

> "And when the edge is unreachable, it falls back to the screen compiled into
> the binary. Federation adds a path, it does not remove the local one."

## Scene 7 — The honest limit (15s)

> "One caveat. The host here is the app itself: it publishes these remotes and
> loads one back. A production setup would resolve that URL from an environment
> rather than a text field, and a separate host app would consume remotes it
> does not publish. The mechanism is the same — registerRemotes, loadRemote,
> fallback to bundled — but the topology is simpler than a real
> micro-frontend deployment."

End there.

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
- **Do not cut a failure.** A deploy that fails and gets fixed on camera is
  worth more than a flawless take.

## If something breaks mid-take

Deploy failing on authentication: you skipped the pre-record step above. The
token lives in `~/.zephyr` after the first successful run.

Red screen on the simulator: the dev server runs plain Metro on purpose —
federation is applied only when publishing, see `docs/zephyr.md` §5. A Module
Federation error there means `metro.config.js` was changed.
