# Consuming the remotes (the part a running app can show)

The four exposes are published artifacts. On their own they prove the pipeline
works, not that federation does — the app renders identically whether or not
they exist.

This makes the round trip observable: the **Stats** tab loads `./stats` from a
published version instead of from the app's own bundle, and the version is
chosen at runtime. Same installed binary, different code.

## Where it lives

| File | Role |
|---|---|
| `src/shared/federation/remote.ts` | `registerRemotes` at runtime, URL persisted |
| `src/shared/federation/remoteStats.tsx` | loads `./stats`, falls back to the bundled screen |
| `src/modules/account/FederationScreen.tsx` | where the URL is pasted (Profile → Federated module) |
| `metro.config.js` | `remotes` block, empty unless `ZEPHYR_REMOTE` is set |

The expose still points at `modules/stats/StatsScreen`, not at the wrapper —
otherwise the remote would load the loader and recurse.

## Demonstrating it

Two versions are already published and differ on screen:

| Version | URL | Section heading reads |
|---|---|---|
| #39 | `https://aroldogooulart-39-questiona-questiona-questoes-7a5c52b75-ze.zephyrcloud.app` | "Accuracy by subject" |
| #41 | `https://aroldogooulart-41-questiona-questiona-questoes-be6b88b28-ze.zephyrcloud.app` | "Accuracy by subject — REMOTE v2" |

1. Open the app, go to **Stats**. The banner says
   `○ ./stats from this bundle`.
2. **Profile → Federated module**, paste the **#39** URL, tap *Use this version*.
3. Back to **Stats**. The banner turns into
   `● ./stats loaded from Zephyr edge`.
4. Return to Federated module, paste the **#41** URL, tap *Use this version*.
5. Back to **Stats**: the heading now reads **"— REMOTE v2"**.

Between steps 3 and 5 nothing was rebuilt, reinstalled or submitted anywhere.
The binary is the same one from step 1.

6. Tap *Use the bundled screen* to go back to the local one — which is also what
   happens automatically when the device is offline or a version is retired.

## Why it is worth showing

Publishing four bundles proves the build pipeline. Loading one of them back into
a running app, and swapping which version renders, is the thing Module
Federation exists for. Everything before this is setup.

## What it is not

A production app would resolve this URL from an environment — staging pointing
at one version, production at another — rather than from a text field. The text
field exists so the mechanism is visible on camera. The pieces underneath
(`registerRemotes`, `loadRemote`, fallback to bundled) are the same either way.
