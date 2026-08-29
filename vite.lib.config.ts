import { defineConfig } from 'vite'

/** Banner prepended to every output file: keeps the license visible even when
 *  the package is consumed via a CDN that strips source comments. */
const BANNER = `/*!
 * text-transmorph v0.1.0
 * (c) 2026 Jnove
 * Released under the MIT License.
 */`

// Library build: the embeddable API only (src/lib) — no demo UI, no exporters.
// App bundle stays on `vite build` (main config); this outputs dist-lib/.
export default defineConfig({
  build: {
    lib: {
      entry: 'src/lib/index.ts',
      name: 'TextTransmorph',
      formats: ['es', 'umd'],
      fileName: (format) => `text-transmorph.${format === 'es' ? 'js' : 'umd.cjs'}`,
    },
    outDir: 'dist-lib',
    sourcemap: true,
    // Keep readable output for now — source maps are emitted, so debugging
    // still works, and the unminified form plays nicer with bundler tools that
    // surface library code in their trace views.
    minify: false,
    rollupOptions: {
      output: {
        banner: BANNER,
      },
    },
  },
})
