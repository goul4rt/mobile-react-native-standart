# Validating (and demonstrating) the Module Federation setup

Four steps, each producing something verifiable in the terminal. The point is
for the demonstration to be measured, not asserted.

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

## The honest limit

This app **exposes** remotes, it does not **consume** them. The core promise of
Module Federation — swapping a remote's version without rebuilding the host — is
not demonstrable here, because no host loads `./stats` at a pinned version. What
exists is the separation that makes it possible: four independently publishable
artifacts and the import discipline that keeps them separable.

Stating that limit is worth more than pretending the running app demonstrates
federation. It runs identically with or without it.
