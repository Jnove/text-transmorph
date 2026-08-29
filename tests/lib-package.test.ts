import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

/**
 * Smoke tests for the published-package shape. These run after `npm run build:lib`
 * and verify the artifacts that end up in npm tarball match what `package.json`
 * promises to ship. They are intentionally filesystem-level (no module imports)
 * so a green run does not depend on the canvas backend being available in Node.
 */
describe('library build artifacts', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

  it('emits the ESM entry consumed by `exports.import`', () => {
    const p = resolve(root, 'dist-lib/text-transmorph.js')
    expect(existsSync(p)).toBe(true)
    const src = readFileSync(p, 'utf8')
    expect(src).toMatch(/createTextTransmorph/)
    // Banner comes from vite.lib.config → lives at the very top of the file.
    expect(src.startsWith('/*')).toBe(true)
  })

  it('emits the UMD entry consumed by `exports.require` and exposes the global name', () => {
    const p = resolve(root, 'dist-lib/text-transmorph.umd.cjs')
    expect(existsSync(p)).toBe(true)
    const src = readFileSync(p, 'utf8')
    // Vite's UMD wrapper stringifies the lib name as a quoted global lookup.
    expect(src).toMatch(/TextTransmorph/)
  })

  it('emits TypeScript declarations reachable via `exports.types`', () => {
    const typesEntry = resolve(root, 'dist-lib/types/lib/index.d.ts')
    expect(existsSync(typesEntry)).toBe(true)
    const src = readFileSync(typesEntry, 'utf8')
    expect(src).toMatch(/export declare function createTextTransmorph/)
  })
})

describe('package.json publishing metadata', () => {
  // Importing package.json works under Node ESM (Node strips JSON imports),
  // but Vitest's environment is `node` so a plain `import` works too.
  // Static-importing JSON would still need an assert; keep it fs-based for
  // portability across consumers that run vitest with esModuleInterop off.
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as Record<string, unknown>

  it('is publicly publishable (private !== true)', () => {
    expect(pkg.private).not.toBe(true)
  })

  it('declares description, license, and the entrypoints consumers expect', () => {
    expect(typeof pkg.description).toBe('string')
    expect((pkg.description as string).length).toBeGreaterThan(0)
    expect(pkg.license).toBe('MIT')
    expect(pkg.main).toBe('./dist-lib/text-transmorph.umd.cjs')
    expect(pkg.module).toBe('./dist-lib/text-transmorph.js')
    expect(pkg.types).toBe('./dist-lib/types/lib/index.d.ts')
  })

  it('exposes a Node-resolvable `exports` map', () => {
    const ex = pkg.exports as { '.': Record<string, string> }
    expect(ex['.'].import).toBe('./dist-lib/text-transmorph.js')
    expect(ex['.'].require).toBe('./dist-lib/text-transmorph.umd.cjs')
    expect(ex['.'].types).toBe('./dist-lib/types/lib/index.d.ts')
  })
})
