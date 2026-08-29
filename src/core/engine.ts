import type { Vec2 } from './types'
import type { Store } from '../config/store'
import { defaultConfig, type Config } from '../config/types'
import { createStore } from '../config/store'
import { sampleText, sampleWithRasterizer, ALPHA_THRESHOLD, type SampleOptions, type RasterizeFn } from './sampler'
import { ParticleSystem, idleOffset } from './particles'
import { sequenceState, cycleDuration } from './sequencer'
import { easings } from './easing'
import { drawStage, type DrawStyle } from '../render/renderer'

/** Keep the live preview below the point count where Canvas falls off a frame.
 *  Finer UI values are kept for dot sizing but must not multiply the sample
 *  grid into hundreds of thousands of animated particles. */
function effectiveGridSpacing(value: number): number {
  return Math.max(2, value)
}

function effectiveDotSize(dotSize: number, gridSpacing: number): number {
  const cell = effectiveGridSpacing(gridSpacing)
  // When the live sampler falls back to 2px, a subpixel dot would create a
  // patchy, unevenly covered glyph. Keep that fallback visually coherent.
  if (gridSpacing < 2) return cell
  return Math.min(dotSize, cell)
}

/** Fraction of the hold window spent ramping the idle shimmer in (and out
 *  again at the end), so the resting drift starts and ends at exactly zero
 *  offset — seamless with the transitions on either side. */
const IDLE_RAMP = 0.18

/** Keys that change the sampled dot layout — require re-rasterizing text. */
const RESAMPLE = new Set<keyof Config>([
  'phrases', 'gridSpacing', 'fontFamily', 'fontWeight', 'fillRatio',
  'stageWidth', 'stageHeight',
])
/** Keys that only change motion — cached particle systems must rebuild,
 *  but the sampled dots stay valid. */
const RESET = new Set<keyof Config>([
  'scatterAmount', 'randomness', 'stagger', 'easing', 'movement', 'seed',
])

export type EngineOptions = {
  /** Where frames are drawn. The engine only needs a 2D context, so it can
   *  target an offscreen canvas, a WebGL-backed texture, or any other surface
   *  exposing the Canvas 2D API. */
  ctx: CanvasRenderingContext2D
  /** Optional external config store. When omitted the engine keeps its own
   *  internal store (initialised from `config` or the defaults). */
  store?: Store
  /** Initial config when no external store is given. */
  config?: Partial<Config>
  /** Replaces the DOM canvas rasterizer (e.g. headless sampling in tests). */
  rasterize?: RasterizeFn
  /** Called whenever resampling changes the output dimensions. */
  onResize?: (width: number, height: number) => void
}

/**
 * Renders the dot-morph animation into a Canvas 2D context. Pure engine — no
 * DOM, no rAF loop, no UI: callers drive it with renderAt(elapsedMs) and
 * mutate config through setConfig()/subscribe().
 */
export class Engine {
  private stageWidth: number
  private stageHeight: number
  private ctx: CanvasRenderingContext2D
  private targets: Vec2[][] = []
  private systems = new Map<string, ParticleSystem>()
  private store: Store
  /** Custom rasterizer; undefined = the default DOM-canvas one. */
  private rasterize: RasterizeFn | undefined
  private onResize?: (width: number, height: number) => void
  private unsubscribe?: () => void
  /** Handler for `document.fonts.loadingdone`, captured so destroy() can
   *  detach it. Engine has no other DOM lifecycle hooks. */
  private onFontsLoaded: (() => void) | null = null

  constructor(options: EngineOptions) {
    this.ctx = options.ctx
    this.rasterize = options.rasterize
    this.onResize = options.onResize
    this.store =
      options.store ??
      createStore({ ...defaultConfig, ...options.config })
    this.stageWidth = this.store.get().stageWidth
    this.stageHeight = this.store.get().stageHeight
    this.resample()
    // Always hand the initial dimensions to the host so its canvas buffer is
    // sized even when the starting config equals the defaults (resample above
    // only fires onResize on actual dimension changes).
    this.onResize?.(this.stageWidth, this.stageHeight)
    // Re-rasterize once webfonts have settled: the initial resample above runs
    // synchronously at construction time and can race with async @font-face
    // declarations (e.g. Google Fonts in index.html), leaving the dot layout
    // rasterized with the fallback face. listening for both `ready` and the
    // stream-friendly `loadingdone` event catches first load and any
    // subsequent font that arrives after first paint.
    this.observeFontLoading()
    // Watch the store: structural changes re-rasterize the dots, motion-only
    // changes rebuild the particle systems. Callers may also drive either
    // explicitly through resample()/resetSystems().
    let prev = this.store.get()
    this.unsubscribe = this.store.subscribe((c) => {
      if (hasAnyChanged(prev, c, RESAMPLE)) this.resample()
      else if (hasAnyChanged(prev, c, RESET)) this.resetSystems()
      prev = c
    })
  }

  /** Current live config. */
  getConfig(): Config {
    return this.store.get()
  }

  /** Apply a config patch. Structural fields re-rasterize automatically;
   *  motion-only fields rebuild particle systems; everything else is a no-op
   *  for the renderer (consumed by the caller). */
  setConfig(patch: Partial<Config>): void {
    this.store.set(patch)
  }

  /** Subscribe to config changes. Returns an unsubscribe function. */
  subscribe(fn: (c: Config) => void): () => void {
    return this.store.subscribe(fn)
  }

  /** Stop watching the config store and release cached systems. The engine
   *  stays usable (resample/renderAt keep working off the last config). */
  destroy(): void {
    this.unsubscribe?.()
    this.unsubscribe = undefined
    if (this.onFontsLoaded) {
      document.fonts?.removeEventListener?.('loadingdone', this.onFontsLoaded)
      this.onFontsLoaded = null
    }
    this.systems.clear()
  }

  /** Re-rasterize every phrase into dot targets, resizing the stage to the
   *  current output dimensions first. Expensive (canvas draw + getImageData
   *  per phrase) — only for changes that alter the sampled dots (text, grid,
   *  font, size). Motion-only changes should use resetSystems(). */
  resample(): void {
    const c = this.store.get()
    if (c.stageWidth !== this.stageWidth || c.stageHeight !== this.stageHeight) {
      this.stageWidth = c.stageWidth
      this.stageHeight = c.stageHeight
      this.onResize?.(this.stageWidth, this.stageHeight)
    }
    const opts: SampleOptions = {
      width: this.stageWidth,
      height: this.stageHeight,
      cell: effectiveGridSpacing(c.gridSpacing),
      threshold: ALPHA_THRESHOLD,
      fontFamily: c.fontFamily,
      fontWeight: c.fontWeight,
      fillRatio: c.fillRatio,
    }
    const phrases = c.phrases.length ? c.phrases : ['']
    const rasterize = this.rasterize
    this.targets = phrases.map((p) =>
      rasterize ? sampleWithRasterizer(p, opts, rasterize) : sampleText(p, opts))
    this.systems.clear()
  }

  /** Subscribe to the document.fonts signals so a late-arriving webfont
   *  triggers a re-sample. Guarded so it is a no-op in non-browser hosts
   *  (vitest does not provide `document.fonts`). */
  private observeFontLoading(): void {
    if (typeof document === 'undefined' || !document.fonts) return
    document.fonts.ready?.then?.(() => this.resample())?.catch?.(() => {})
    const onLoad = () => this.resample()
    document.fonts.addEventListener?.('loadingdone', onLoad)
    this.onFontsLoaded = onLoad
  }

  /** Drop cached particle systems so they rebuild with current motion params.
   *  Cheap — keeps the sampled dot targets. */
  resetSystems(): void {
    this.systems.clear()
  }

  durationMs(): number {
    const c = this.store.get()
    return cycleDuration(this.targets.length, c.holdMs, c.transitionMs)
  }

  private systemFor(fromIndex: number, toIndex: number): ParticleSystem {
    const key = `${fromIndex}->${toIndex}`
    let sys = this.systems.get(key)
    if (!sys) {
      const c = this.store.get()
      sys = new ParticleSystem(this.targets[fromIndex], this.targets[toIndex], {
        seed: c.seed + fromIndex * 131 + toIndex * 17,
        scatterAmount: c.scatterAmount,
        randomness: c.randomness,
        stagger: c.stagger,
        ease: easings[c.easing],
        movement: c.movement,
        center: { x: this.stageWidth / 2, y: this.stageHeight / 2 },
      })
      this.systems.set(key, sys)
    }
    return sys
  }

  renderAt(timeMs: number): void {
    const c = this.store.get()
    const count = this.targets.length
    const state = sequenceState(timeMs, count, c.holdMs, c.transitionMs, c.mode)
    const sys = this.systemFor(state.fromIndex, state.toIndex)
    const hold = state.phase === 'hold'
    const progress = hold ? 0 : state.progress
    const points = sys.positionsAt(progress)
    const scales = sys.scalesAt(progress)
    // Resting text shimmers gently during the hold so a static frame still
    // breathes; the transition frames already move, so leave them untouched.
    // The amplitude ramps 0→1→0 across the hold window (IDLE_RAMP at each
    // edge) so the drift is zero exactly when a transition starts or ends.
    if (hold && c.idleFloat > 0) {
      const env = Math.min(1, state.holdT / IDLE_RAMP, (1 - state.holdT) / IDLE_RAMP)
      const amp = c.idleFloat * Math.max(0, env)
      for (const p of points) {
        const o = idleOffset(p.x, p.y, timeMs, amp)
        p.x += o.x
        p.y += o.y
      }
    }
    const style: DrawStyle = {
      backgroundColor: c.backgroundColor,
      dotColor: c.dotColor,
      dotColor2: c.dotColor2,
      gradient: c.gradient,
      dotShape: c.dotShape,
      // A dot larger than its sampling cell overlaps neighbouring particles
      // and turns the text into a solid block, especially at grid=1.
      dotSize: effectiveDotSize(c.dotSize, c.gridSpacing),
    }
    drawStage(this.ctx, this.stageWidth, this.stageHeight, points, style, scales)
  }
}

function hasAnyChanged(prev: Config, next: Config, keys: Set<keyof Config>): boolean {
  for (const k of keys) {
    if (prev[k] !== next[k]) return true
  }
  return false
}
