import type { Config } from './types'

/** Percent-encoded JSON — portable across browser and Node (no btoa), unicode
 *  safe (Chinese phrases survive), and directly usable as a URL hash fragment. */
export function encodeConfig(c: Config): string {
  return encodeURIComponent(JSON.stringify(c))
}

/** Copy only keys that exist on `base` and whose value has a matching shape
 *  (same primitive type, or a string[] for array fields). Anything unknown,
 *  missing, or mistyped falls back to `base` — a malformed share link can never
 *  put the app into a broken state. */
export function mergeKnown(base: Config, raw: unknown): Config {
  const out: Config = { ...base }
  if (typeof raw !== 'object' || raw === null) return out
  const src = raw as Record<string, unknown>
  for (const key of Object.keys(base) as (keyof Config)[]) {
    const v = src[key]
    if (v === undefined || v === null) continue
    const ref = base[key]
    if (Array.isArray(ref)) {
      if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
        ;(out[key] as unknown) = v
      }
    } else if (typeof v === typeof ref) {
      ;(out[key] as unknown) = v
    }
  }
  return out
}

/** Decode an encoded config string over `base`. Returns `base` untouched on any
 *  parse error. */
export function decodeConfig(str: string, base: Config): Config {
  try {
    return mergeKnown(base, JSON.parse(decodeURIComponent(str)))
  } catch {
    return base
  }
}

/** Resolve the config to start from: a share-link hash wins over a previously
 *  saved local config, which wins over the built-in defaults. */
export function pickInitial(
  base: Config,
  hash: string | null,
  stored: string | null,
): Config {
  if (hash) return decodeConfig(hash, base)
  if (stored) return decodeConfig(stored, base)
  return base
}
