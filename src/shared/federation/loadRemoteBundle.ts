/**
 * Loads a published remote without Metro's federation runtime.
 *
 * The documented path (`bundle-mf-host`) does not work on RN 0.87: the entry it
 * generates initialises federation before `react-native` is imported, and the
 * app dies on "Property 'console' doesn't exist" -- see docs/zephyr.md §6.
 *
 * What Zephyr publishes, though, is a self-contained Metro bundle. It declares
 * its own `__METRO_GLOBAL_PREFIX__` so it will not collide with the host, and on
 * evaluation it registers `{ get, init }` at
 * `globalThis.__FEDERATION__.__NATIVE__[name]`. Fetching that file and running
 * it does what the runtime would have done, minus the init order that breaks the
 * app.
 */
import { LogBox } from 'react-native';

/*
 * The remote asks for `react-native/Libraries/Network/RCTNetworking` by that
 * exact name -- it is in the published bundle's `__EARLY_SHARED__` list, and
 * lending it under any other key fails with "Invalid loadShareSync". React
 * Native 0.87 deprecates deep imports and warns about this one, which then rides
 * up as a LogBox toast over the tab bar. The import is not a mistake to fix, so
 * the notice is silenced by its exact text rather than left to cover the UI.
 */
LogBox.ignoreLogs([/Deep imports from the 'react-native' package.*RCTNetworking/]);

type RemoteExports = {
  init: (shared?: object, initScope?: unknown[]) => Promise<unknown>;
  get: (expose: string) => Promise<() => unknown>;
};

const ready = new Map<string, RemoteExports>();

function registered(name: string): RemoteExports | undefined {
  return (globalThis as any).__FEDERATION__?.__NATIVE__?.[name]?.exports;
}

/** Downloads, evaluates and initialises the remote entry. */
export async function loadRemote(url: string, name = 'Questiona'): Promise<RemoteExports> {
  const key = `${name}@${url}`;
  const cached = ready.get(key);
  if (cached) return cached;

  const response = await fetch(`${url}/${name}.bundle`);
  if (!response.ok) throw new Error(`remote entry HTTP ${response.status}`);
  const code = await response.text();

  // Metro's runtime reads `location` to work out where to fetch further chunks
  // from -- a browser API React Native does not have. Pointing it at the
  // published version lets the remote resolve its own files.
  defineLocation(url);

  // `new Function` evaluates in global scope, which is where the bundle registers
  // its modules. Hermes rejects indirect `eval` but accepts this.
  // eslint-disable-next-line no-new-func
  new Function(code)();

  const exports = registered(name);
  if (!exports) throw new Error(`remote ${name} did not register exports`);

  await exports.init(sharedScope());

  ready.set(key, exports);
  return exports;
}

/** A minimal `location`, carrying only what Metro's runtime reads. */
function defineLocation(url: string) {
  const g = globalThis as any;
  if (g.location?.href) return;

  const base = url.replace(/\/+$/, '');
  const protocol = base.startsWith('https') ? 'https:' : 'http:';
  const host = base.replace(/^https?:\/\//, '').split('/')[0];

  g.location = {
    href: `${base}/`,
    origin: base,
    protocol,
    host,
    hostname: host,
    port: '',
    pathname: '/',
    search: '',
    hash: '',
  };
}

/**
 * What the host lends the remote. Without it the remote loads its own React, and
 * two runtimes in one tree break hooks -- the error that surfaces is "Invalid
 * loadShareSync function call".
 *
 * The shape is Module Federation's share scope: package -> version -> descriptor.
 */
function sharedScope() {
  const entry = (name: string, mod: unknown) => ({
    [name]: {
      [declaredVersion(name)]: {
        // `lib` is the synchronous path: `loadShareSync` will not take the
        // promise `get` returns, and fails with "Invalid loadShareSync function
        // call".
        lib: () => mod,
        get: () => Promise.resolve(() => mod),
        loaded: true,
        version: declaredVersion(name),
        from: 'QuestionaHost',
        shareConfig: {
          singleton: true,
          eager: true,
          requiredVersion: false as const,
        },
      },
    },
  });

  // This list mirrors `shared` in metro.config.js. A missing entry brings the
  // load down with "Invalid loadShareSync", naming the package it wanted.
  return {
    ...entry('react', require('react')),
    ...entry('react-native', require('react-native')),
    ...entry(
      'react-native/Libraries/Network/RCTNetworking',
      require('react-native/Libraries/Network/RCTNetworking'),
    ),
    ...entry('@react-navigation/native', require('@react-navigation/native')),
    ...entry('react-native-safe-area-context', require('react-native-safe-area-context')),
  };
}

/**
 * The version the host offers a shared module under. It has to be a concrete
 * version, never a range: the runtime checks it with semver against the remote's
 * `requiredVersion`, and handing it `^7.3.18` makes it compare a range to a
 * range and reject its own match --
 *
 *   Version ^7.3.18 from QuestionaHost of shared singleton module
 *   @react-navigation/native does not satisfy the requirement of Questiona
 *   which needs ^7.3.18
 *
 * The remote then quietly falls back to its own copy. For a React context that
 * is fatal in a way nothing announces: navigation inside the remote screen stops
 * reaching the host's navigator, and taps on the tab bar do nothing.
 */
function declaredVersion(name: string): string {
  const pkg = require('../../../package.json');
  // react-native submodules inherit the package version.
  const root = name.startsWith('react-native/') ? 'react-native' : name;
  return String(pkg.dependencies[root] ?? '0.0.0').replace(/^[\^~><=\s]+/, '');
}

/** Loads one expose from the remote, for example `./stats`. */
export async function loadExpose<T>(url: string, expose: string): Promise<T> {
  const remote = await loadRemote(url);
  const factory = await remote.get(expose);
  return factory() as T;
}
