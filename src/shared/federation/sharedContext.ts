import { createContext } from 'react';

/**
 * A federated remote carries its own copy of every module the host did not lend
 * it, and some modules only work as a single instance. A React context is
 * matched by object identity, so two copies mean the Provider mounted by the
 * host is invisible to the hook called inside the remote -- it throws "must be
 * used inside Provider" with the Provider right there in the tree. The i18n
 * instance has the same shape of problem: the host sets the locale on its copy,
 * the remote reads a fresh one and renders in the wrong language.
 *
 * Module Federation solves this by sharing the module, but its Metro plugin
 * matches `shared` entries against the literal import string, and ours are
 * relative paths that change with each file's depth. Keying on a global gives
 * the same guarantee without that constraint: whichever copy loads first creates
 * the value, the rest reuse it.
 */
export function sharedSingleton<T>(key: string, create: () => T): T {
  const registry = ((globalThis as any).__QUESTIONA_SHARED__ ??= {});
  return (registry[key] ??= create()) as T;
}

/** `sharedSingleton` for a React context, which is the common case. */
export function sharedContext<T>(key: string, initial: T) {
  return sharedSingleton(`context:${key}`, () => createContext<T>(initial));
}
