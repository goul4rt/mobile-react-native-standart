import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Which published version of the app's own remotes to load at runtime.
 *
 * Zephyr gives every build an immutable URL, so pointing this at a different
 * version and reopening the app renders code from that version — same binary,
 * no rebuild, no store. That round trip is the whole point of Module
 * Federation, and without something like this the four exposes are only
 * published artifacts nobody loads back.
 *
 * Empty means "use the screens bundled in this binary", which is also what
 * happens when the device is offline or the URL stops resolving.
 */
const STORAGE_KEY = '@questiona/remote-url';

/** `Questiona` matches the `name` in the published mf-manifest.json. */
const REMOTE_NAME = 'Questiona';

export type RemoteState = {
  url: string | null;
  /** True once registerRemotes ran for the current url. */
  registered: boolean;
};

let estado: RemoteState = { url: null, registered: false };

export function currentRemote(): RemoteState {
  return estado;
}

export async function loadSavedRemote(): Promise<string | null> {
  try {
    const url = await AsyncStorage.getItem(STORAGE_KEY);
    estado = { url, registered: false };
    return url;
  } catch {
    return null;
  }
}

export async function saveRemote(url: string | null): Promise<void> {
  const limpa = url?.trim().replace(/\/+$/, '') || null;
  estado = { url: limpa, registered: false };
  try {
    if (limpa) await AsyncStorage.setItem(STORAGE_KEY, limpa);
    else await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: the choice still applies to this session.
  }
}

/**
 * Points the federation runtime at a published version. Registering the same
 * name twice is what lets one binary switch versions between launches.
 */
export async function registerRemote(url: string): Promise<void> {
  const { registerRemotes } = await import('@module-federation/runtime');
  registerRemotes(
    [{ name: REMOTE_NAME, entry: `${url}/mf-manifest.json` }],
    // Replace an already-registered remote of the same name instead of erroring.
    { force: true },
  );
  estado = { url, registered: true };
}

/** Loads one expose from the registered remote. Throws if none is registered. */
export async function loadRemoteModule<T>(expose: string): Promise<T> {
  const { loadRemote } = await import('@module-federation/runtime');
  const mod = await loadRemote<T>(`${REMOTE_NAME}/${expose}`);
  if (!mod) throw new Error(`remote ${expose} returned nothing`);
  return mod;
}
