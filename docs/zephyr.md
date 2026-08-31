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
| `./sessao` | questions | the core: answering and grading |
| `./home` | questions | entry point |
| `./estatisticas` | stats | a new metric or chart never touches the session |
| `./perfil` | account | isolates data-protection and store-policy risk |

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

### 5. Log noise

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
