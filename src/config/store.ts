import type { Config } from './types'

export type Store = {
  get(): Config
  set(patch: Partial<Config>): void
  subscribe(fn: (c: Config) => void): () => void
}

export function createStore(initial: Config): Store {
  let state: Config = { ...initial }
  const subs = new Set<(c: Config) => void>()
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...patch }
      for (const fn of subs) fn(state)
    },
    subscribe(fn) {
      subs.add(fn)
      return () => subs.delete(fn)
    },
  }
}
