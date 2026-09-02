# Validating (and demonstrating) the Module Federation setup

Five steps, each producing something verifiable. The first four run in the
terminal; the fifth runs on the simulator and is the one that proves the app
actually consumes what it publishes. The point is for the demonstration to be
measured, not asserted.

Every path below is relative to `mobile/`, so start there:

```bash
cd mobile
```

## 1. What gets exposed

```bash
sed -n '/exposes:/,/},/p' metro.config.js
```

Four remotes, one per domain:

| Expose | File |
|---|---|
| `./session` | `src/modules/questions/SessionScreen.tsx` |
| `./home` | `src/modules/questions/HomeScreen.tsx` |
| `./stats` | `src/modules/stats/StatsScreen.tsx` |
| `./profile` | `src/modules/account/ProfileScreen.tsx` |

What makes the separation real is not this list, it is the import rule: nothing
under `modules/` imports from another `modules/`, only from `shared/`. To check:

```bash
grep -rn "from '\.\./\(questions\|stats\|account\)/" src/modules
```

No output means no module depends on another.

## 2. Publish

```bash
npm run deploy:android      # or deploy:ios
```

What the output proves, in order:

- `ZEPHYR Hi <user>!` — authenticated
- `questiona.questiona.questoes#N` — app.project.org, incrementing version
- four `Writing bundle output to: dist/android/exposed/*.bundle`
- `Done writing MF Manifest to: dist/android/mf-manifest.json`
- `(N/12 assets uploaded ...)` — **the line that matters**, see step 4
- the immutable URL for that version

## 3. The manifest

Requires a previous `deploy:*` run — `dist/` only exists after one, and the APK
build (`apk:release`) does not create it.

```bash
python3 -c "
import json; d = json.load(open('dist/android/mf-manifest.json'))
print(d['name'])
[print(' ', e['name'], '->', e['assets']['js']['sync'][0]) for e in d['exposes']]
"
```

Each expose becomes its own artifact, with its own URL and immutable version.

## 4. The isolation, measured

Run the deploy **twice in a row, changing nothing**:

```bash
npm run deploy:android && npm run deploy:android
```

| Run | Assets uploaded | Volume |
|---|---|---|
| first  | 10/12 | ~25,000 kb |
| second | **1/12** | **0.10 kb** |

Zephyr deduplicates by content: whatever is already on the edge does not go up
again. That is where the isolation becomes verifiable.

### What does NOT work as a demonstration

Comparing local bundle hashes between builds. **The Metro build with Module
Federation is not deterministic**: two builds of identical source produce
different hashes across all four bundles, and `session.bundle` varied by 415 KB
between identical runs. Measured like this:

```bash
shasum -a 256 dist/android/exposed/*.bundle > /tmp/h1.txt
npm run deploy:android >/dev/null 2>&1
shasum -a 256 dist/android/exposed/*.bundle > /tmp/h2.txt
diff /tmp/h1.txt /tmp/h2.txt    # differs, without touching the source
```

The isolation is real, but it is Zephyr that delivers it on upload, not the
bundler on output.

## 5. The consumption, on the simulator

Steps 1 to 4 prove the artifacts are published and isolated. They do not prove
the app loads one back — for that, the screen has to change without a rebuild.

The stats tab renders `./stats` from the edge. `src/shared/federation/` holds the
three pieces:

| File | Role |
|---|---|
| `remoteUrl.ts` | which published version to load; empty means "use the local screen" |
| `loadRemoteBundle.ts` | fetches the bundle, evaluates it, lends the shared modules |
| `RemoteStats.tsx` | renders remote or local, with a banner naming the origin |

Open the Stats tab. The banner reads one of two things, and both are correct
outcomes:

```
● ./stats loaded from Zephyr edge     the remote answered
○ ./stats from this bundle            it did not, and the reason is printed next to it
```

To prove the first banner is not a label on local code, make the published
version differ from the local one:

```bash
# 1. mark the screen
sed -i '' "s#{t('stats.title')}#{t('stats.title')} · edge v2#" src/modules/stats/StatsScreen.tsx

# 2. publish it
npm run deploy:ios

# 3. take the marker back out of the local source
git checkout src/modules/stats/StatsScreen.tsx
grep -c "edge v2" src/modules/stats/StatsScreen.tsx    # 0 — it is gone locally

# 4. point at the deployment the command just printed
#    src/shared/federation/remoteUrl.ts

# 5. reload the app (no rebuild, no reinstall)
```

The title reads **Stats · edge v2** — text that no longer exists on the machine
running it. That is the swap Module Federation promises, and step 3 is what makes
it unambiguous: without the revert, the dev server would be serving the same new
text from the local file.

## The path this does not take

The documented way to consume — `bundle-mf-host` — does not work on React Native
0.87: federation initialises before React Native creates `console`, and the app
dies at launch. Six attempts, one crash, written up in
[zephyr.md](zephyr.md) §6 along with the workaround used here.

Worth knowing before reading `loadRemoteBundle.ts` and wondering why it does not
call `loadRemote` from the runtime.
