# Zephyr integration notes

Versions: React Native 0.87.1, React 19.2.3, `zephyr-metro-plugin@1.2.4`,
`@module-federation/metro`, Node 22, macOS 26 / Xcode 26.

Published as `questiona.questiona.questoes` (app.project.org). Latest deploy:
`https://aroldogooulart-19-questiona-questiona-questoes-314546747-ze.zephyrcloud.app/`
The `mf-manifest.json` and all four bundles return 200; the root returns 404,
since what gets published is the artifact rather than a website.

## What it took

```bash
npm install --save-dev zephyr-metro-plugin @module-federation/metro \
  @module-federation/metro-plugin-rnc-cli
npm install @module-federation/runtime
```

`metro.config.js` wraps the Metro config, and `withModuleFederation` completes
the pipeline:

```js
const zephyrConfig = await withZephyr({ name: 'Questiona', target: 'ios' })(baseConfig)
return withModuleFederation(zephyrConfig, mfConfig, { flags: { /* ... */ } })
```

`react-native.config.js` registers the command that **actually publishes**:

```js
const wrappedFuncPromise = zephyrCommandWrapper(
  commands.bundleMFRemoteCommand.func,
  commands.loadMetroConfig,
  () => updateManifest(global.__METRO_FEDERATION_MANIFEST_PATH, global.__METRO_FEDERATION_CONFIG),
)
```

```bash
react-native bundle-mf-remote --platform ios --dev false
```

## Modules

Each domain from the design gets its own expose:

| Expose | Module | Why it stands alone |
|---|---|---|
| `./session` | questions | the core: answering and grading |
| `./home` | questions | entry point |
| `./stats` | stats | a new metric or chart never touches the session |
| `./profile` | account | isolates data-protection and store-policy risk |

The concrete gain is blast radius rather than build time: changing a chart in
the stats tab publishes a bundle the answering flow never loads. With one person
that is mostly boundary discipline, which is exactly why `modules/` never
imports from `modules/`.

## Rough edges

### 1. The "simple" path from the npm README publishes nothing, and never says so

This is the most serious one, and it cost me hours.

The package README on npm shows a setup without Module Federation: just
`withZephyr` in `metro.config.js` and a script running `react-native bundle`.
The `TESTING.md` shipped inside the package doubles down, telling you to check
for "upload logs" and a "deployment URL" after a plain `react-native bundle`.

That path **publishes nothing**. And it fails in the worst possible way: it
looks like it worked. The build authenticates, greets you by name, prints the
application identifier with a version number that increments on every attempt,
writes the bundle, and exits with code 0.

```
 ZEPHYR   Hi aroldogooulart!
 ZEPHYR   gabarita.mobile-react-native-standart.goul4rt#2
LOG:Writing bundle output to: ios/main.jsbundle
LOG:Done writing bundle output
```

No upload, no URL, no warning. The version counter climbing gives the strong
impression that something was recorded server-side.

The cause is in the config, and I only found it by inspecting the object at
runtime:

```js
const z = await withZephyr({ name: 'Questiona', target: 'ios' })(baseConfig)
z.serializer.customSerializer === null // true
```

What publishes is the `bundle-mf-remote` command from
`@module-federation/metro-plugin-rnc-cli`, wrapped by `zephyrCommandWrapper`.
Without it there is no upload because there is nothing to upload: the
`mf-manifest.json` and the exposed bundles are produced by that pipeline.

Two suggestions, in order of value:

1. Make `withZephyr` warn when a build finishes with no federation serializer:
   *"nothing to publish. withModuleFederation and the bundle-mf-remote command
   are missing."* One warning would have removed the whole problem.
2. Fix the package README and `TESTING.md`, which currently describe a flow that
   does not do what they promise.

### 2. The organization comes from the git remote, and the config that overrides it is undocumented

With no configuration, Zephyr builds the identifier as `<app>.<repo>.<org>` by
reading the git remote. A repository at
`github.com/goul4rt/mobile-react-native-standart` publishes to
`gabarita.mobile-react-native-standart.goul4rt`.

Anyone who created their own organization in the dashboard will not find their
deploys there, and the dashboard gives no hint: it shows "No projects found"
while builds keep succeeding under a different org.

The escape hatch exists and is not in the docs. I found it by reading the
package types (`zephyr-agent/dist/lib/build-context/zephyr-config.d.mts`):

```js
// zephyr.config.js at the project root
module.exports = {
  org: 'questoes',
  project: 'questiona',
  appName: 'questiona',
}
```

All three override what comes from git and `package.json`. Searching the
documentation for "zephyr.config.js" does not surface this, and no build message
mentions the file. Suggestion: on a project's first build, print which org and
project were inferred, along with the path to override them.

### 3. A git repository with a remote origin is mandatory, and the Metro page does not say so

With no remote configured:

```
Git repository not found. Zephyr REQUIRES a git repository with remote origin.
Configuration accepted for THIS BUILD ONLY.
```

The build proceeds but declares itself invalid for production. A local
`git init` is not enough. It makes sense once you know org and project come from
the remote, but it is a hard prerequisite that only surfaces on failure.

### 4. Without a TTY, the authentication URL is never printed

From `zephyr-agent/dist/lib/auth/login.mjs`:

```js
authenticationPromptForTerminal(authUrl, interactive = isTTY) {
  if (!interactive) return formatLogMsg('A private authentication link was generated. Waiting for browser authentication.')
  return ['Authentication URL (shown only in this terminal):', authUrl, 'Hit Enter to open it in your browser.'].join('\n')
}
```

With a TTY the URL appears and Enter opens the browser. Without one, whether
that is CI, an agent, or any `npm run build > log.txt`, all you get is the
generic sentence. The URL never reaches stdout, stderr, or a file, and the
process waits for a browser nobody is going to open.

The documented way out for CI is `ZE_SECRET_TOKEN`, but obtaining it requires
authenticating first. Anyone starting from a non-TTY environment has no path
forward. Printing the URL in non-interactive mode as well would fix it.

### 5. Module Federation breaks the Metro dev server on RN 0.87

The publishing path works: `bundle-mf-remote` builds, uploads and deploys. What
does not survive is `react-native start` with the same config, and it fails
before a single line of app code runs.

With `unstable_patchInitializeCore: true` the app dies on a red screen:

```
cannot read property 'setGlobalHandler' of undefined
  at setUpDefaltReactNativeEnvironment
  at metroRequire
```

The cause is in `@module-federation/metro/babel-plugin/patch-initialize-core.js`,
which injects `require('mf:init-host')` immediately after the `'use strict'`
directive of React Native's InitializeCore. On RN 0.87 that lands **before**
`setUpDefaltReactNativeEnvironment` creates the global `ErrorUtils`, so the
federation host runs first and RN never finishes booting.

Turning the flag off does not fix it, it only moves the failure:

```
[ Federation Runtime ]: Invalid loadShareSync function call — RUNTIME-006
args: {"hostName":"Questiona","sharedPkgName":"react"}
```

Now the host is never initialized, so the shared `react` cannot resolve. Both
positions of the same switch break the dev server, and neither error mentions
Module Federation as the thing to look at: the first points at React Native's
own bootstrap, the second at a runtime guide that assumes a web bundler.

Reproduced with a clean cache (`--reset-cache`, `watchman watch-del-all`,
`dist/` and `node_modules/.cache` removed), so it is not stale state.

The workaround is to apply federation only when publishing:

```js
// PLATFORM is only set by deploy:ios / deploy:android
const publishing = Boolean(process.env.PLATFORM)
if (!publishing) return baseConfig   // dev server runs plain Metro
```

This costs nothing here because the app does not consume remotes: the four
exposes exist to be published, not to be loaded back. An app that actually
loaded remotes in development would have no way out of this.

Suggestion: inject the host require **after** RN's environment setup rather than
at the top of InitializeCore, and detect the dev server to skip the patch when
no remote is configured.

### 6. Consuming remotes on React Native: how far I got, and where it stops

Publishing the four exposes works. Loading one back into the running app does
not, and the failures come in a chain where each one only surfaces after the
previous is fixed. Every step below was reproduced on RN 0.87 with
`@module-federation/metro@2.9.0`.

**1. The build dies inside `node_modules`.**

```
node_modules/@module-federation/runtime-core/dist/utils/load.js
Invalid call at line 42: import(/* webpackIgnore: true */
```

The package calls `import(url)` with a variable, behind a Webpack magic comment.
Metro only accepts dynamic import with a string literal, and the whole build
fails with `xcodebuild exited 65`. Workaround: a copy of that file with the ESM
branch replaced by a reject, wired through `resolver.resolveRequest`. The ESM
path is unreachable on React Native anyway — loading goes through Metro's own
module registry.

**2. `process.env` does not survive bundling.** Only `NODE_ENV` is substituted,
so a remote URL set at build time never reaches the running code. It has to be
written into a source file before bundling.

**3. Nobody creates the runtime instance.** `loadRemote` and `registerRemotes`
fail with `Please call createInstance first`, and `getInstance()` returns null,
because `mf:init-host` is not in the bundle.

**4. There are two bundling commands, and the docs mention neither.** The plugin
prints them in a help message: `bundle-mf-remote` for what gets published, and
`bundle-mf-host` for the app that consumes. A plain `react-native bundle` — which
is what `run-ios` calls — skips the federation transformer, so `mf:init-host`
never lands. Running `bundle-mf-host` by hand does produce a correct bundle:
`loadRemoteToRegistry` present, remote URL embedded.

**5. `run-ios` does not forward env vars to Xcode.** `BUNDLE_COMMAND` has to go
through `ios/.xcode.env.local`, which is not versioned.

**6. And there it stops, for the same reason as §5.** Two ways in, both closed.

From Xcode's build phase, `bundle-mf-host` fails with `Expected virtual module
setup to be finished`, whether invoked raw or through the plugin's own
`loadMetroConfig`.

Running the command standalone does produce a correct bundle, so I dropped it
into the built `.app` by hand — which is the same thing Zephyr does in
production, swapping the JS of an already-compiled binary. The app crashes on
launch, and the crash log names the cause:

```
ReferenceError: Property 'console' doesn't exist
  at installConsoleErrorReporter
```

`mf:init-host` runs **before React Native creates `console`**. That is the same
root cause as §5, one step earlier in the boot sequence: the patch injects the
federation host at the top of InitializeCore, ahead of the environment it needs.
In §5 the missing global was `ErrorUtils`; here it is `console`.

I then patched the plugin itself — moving the `mf:init-host` injection from the
top of InitializeCore to the bottom, past React Native's environment setup. The
crash does not move. So the early code is not only `mf:init-host`; the same
applies to `unstable_patchRuntimeRequire`, and that flag has no working position
either:

| `unstable_patchRuntimeRequire` | crash |
|---|---|
| `true`  | `Property 'console' doesn't exist` |
| `false` | `Property 'Questiona__r' doesn't exist` |

The patch is required — it defines the federated `require` — and it runs before
the environment it needs. Both positions of the switch fail, which is the same
shape as §5 one layer down.

Six separate attempts, all ending at the same crash:

| Attempt | Result |
|---|---|
| `unstable_patchInitializeCore: true` | `console doesn't exist` |
| `unstable_patchInitializeCore: false` | `loadShareSync` / no host |
| Patch the plugin, inject at the *end* of InitializeCore | unchanged |
| Import `mf:init-host` from `index.js`, after RN loads | unchanged |
| `unstable_patchRuntimeRequire: false` | `Questiona__r doesn't exist` |
| Prepend a `console` polyfill to the bundle (`global` and `globalThis`) | unchanged |
| Patch `host-entry.js` to `import 'react-native'` before `mf:init-host` | unchanged |

The generated host entry shows why. `bundle-mf-host` replaces the entry file
with:

```js
import 'mf:init-host';
import 'mf:async-require';
__ENTRYPOINT_IMPORT__;   // the real index.js
```

Federation initializes **before `react-native` is ever imported** — so before
InitializeCore, before `console`. Reordering those imports does not help either:
Metro resolves by dependency graph, not by the order lines appear in a file.

And even with a console shim as the first statement in the bundle, the crash is
identical. The federation code does not run after
the bundle's first line — the `customSerializer` places it ahead of everything,
including anything the entry file could prepend.

There is no application-side workaround. Patching the plugin's injection point
does not help either, because the injection point is not the only thing running
early. The Metro federation runtime assumes it can execute ahead of React
Native's bootstrap, and on RN 0.87 that assumption does not hold — for consuming
remotes. Publishing them, which is what this project does, works fine.

**What this means in practice.** A React Native app can publish federated
remotes with this stack — that part is solid, and this project does it. Loading
them back requires clearing six undocumented obstacles, and the sixth has no
workaround I could find. The failure messages point at React Native internals,
at a Node.js entry loader, or at a virtual module system, never at the actual
cause.

**Suggestions**, in order of value:

1. Document `bundle-mf-host` on the Metro page. It is the single missing piece
   most people will hit, and it only appears in a CLI help message.
2. Ship the runtime without Webpack-only syntax, or a React Native build of it.
3. Inject `mf:init-host` **after** React Native's environment setup, not at the
   top of InitializeCore. The same ordering bug closes both §5 and §6: the
   federation host starts before `console` and `ErrorUtils` exist.
4. Make `Expected virtual module setup to be finished` say what setup is missing
   and which command performs it.

### 7. Log noise

Every build repeats the missing `zephyr:dependencies` warning, even in an app
with no remotes, where its absence is the correct configuration. The command
also emits `Validation Warning: Unknown option "server.tls"` twice per run,
coming from the plugin itself rather than from the project's config.

## What worked well

- Once on the right path, deploying is fast and informative: snapshot in 409 ms,
  12 assets (25 MB) in 2716 ms, edge in 2976 ms, with the URL at the end.
- Authentication persists in `~/.zephyr`; only the first build asks for a login.
- Development is unaffected. The Metro dev server keeps serving the bundle
  normally (4 MB, HTTP 200) with no authentication at all. Only publishing needs
  the login, which is the right split.
- The error messages that do exist tell you what to do, with the commands ready
  to paste. The git warning lists `git init`, `git remote add` and `git commit`.
- `zephyr-metro-plugin@1.2.4` installed with no conflict on RN 0.87, even though
  the documentation's examples use 0.80.
- Immutable versioning is real: every build becomes a version with its own URL,
  visible in the dashboard.
