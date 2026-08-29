import { Engine } from '../core/engine'
import { defaultConfig, type Config } from '../config/types'
import type { MovementMode } from '../core/particles'
import type { EasingName } from '../core/easing'
import type { SequenceMode } from '../core/sequencer'
import { PlaybackClock } from './playback'

/** Animation fields (everything in Config except the app-only fileName). */
export type TransmorphConfig = Omit<Config, 'fileName'>

export type TransmorphOptions = Partial<TransmorphConfig> & {
  /** Start playing immediately (default true). */
  autoplay?: boolean
  /** Pause while the canvas is out of view, play when it scrolls in
   *  (default false). */
  playOnView?: boolean
  /** Honour the OS reduced-motion preference: freeze on the static first
   *  phrase (default true). */
  respectReducedMotion?: boolean
  /** Loop the timeline forever (default true); false stops on the last
   *  phrase. */
  loop?: boolean
}

function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** Listen to the prefers-reduced-motion media query and refresh the clock's
 *  frozen state when the OS preference flips. Returns a detacher for
 *  destroy(). */
function watchReducedMotion(set: (frozen: boolean) => void): () => void {
  if (typeof matchMedia !== 'function') return () => {}
  const mq = matchMedia('(prefers-reduced-motion: reduce)')
  const onChange = (e: MediaQueryListEvent) => set(e.matches)
  mq.addEventListener?.('change', onChange)
  return () => mq.removeEventListener?.('change', onChange)
}

function raf(): (cb: FrameRequestCallback) => number {
  return typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (cb) => { cb(performance.now()); return 0 }
}

function caf(): (id: number) => void {
  return typeof cancelAnimationFrame === 'function'
    ? cancelAnimationFrame
    : () => {}
}

/**
 * Framework-agnostic embeddable text-transmorph animation. Owns a Canvas 2D
 * context, an animation loop, and an options surface mirroring the studio
 * app's controls:
 *
 *   const tm = createTextTransmorph(canvas, {
 *     phrases: ['Hello', 'World'],
 *     movement: 'explode',
 *   })
 *   tm.set({ dotSize: 10 })        // hot-updates live
 *   tm.destroy()                   // tears down loop + observers
 *
 * Drivers: autoplay (default), manual (renderAt + clock), and scroll-pause
 * via playOnView. Reduced-motion is respected unless opted out.
 */
export class Transmorph {
  private engine: Engine
  private clock: PlaybackClock
  private target: HTMLCanvasElement
  private opts: Required<Pick<TransmorphOptions, 'autoplay' | 'playOnView' | 'respectReducedMotion' | 'loop'>>
  private rafId: number | null = null
  private io: IntersectionObserver | null = null
  /** Detacher for the live reduced-motion listener, if one was attached. */
  private detachMotionWatch: () => void = () => {}
  private destroyed = false

  constructor(target: HTMLCanvasElement, options?: TransmorphOptions) {
    this.target = target
    const opts = options ?? {}
    const { autoplay = true, playOnView = false, respectReducedMotion = true, loop = true, ...config } = opts
    this.opts = { autoplay, playOnView, respectReducedMotion, loop }

    const ctx = target.getContext('2d')
    if (!ctx) throw new Error('Transmorph: canvas 2D context unavailable')

    this.engine = new Engine({
      ctx,
      config,
      onResize: (w, h) => this.syncSize(w, h),
    })
    this.clock = new PlaybackClock({
      loop,
      reducedMotion: respectReducedMotion && prefersReducedMotion(),
    })
    this.clock.setDuration(this.engine.durationMs())
    this.syncSize(this.engine.getConfig().stageWidth, this.engine.getConfig().stageHeight)
    // OS preference can change after construction — reflect it live so a user
    // flipping the system "reduce motion" toggle mid-session freezes/resumes
    // without needing a page reload. Only react when the consumer opted in
    // (respectReducedMotion === true).
    if (respectReducedMotion) {
      this.detachMotionWatch = watchReducedMotion((frozen) => {
        if (this.destroyed) return
        this.clock.setReducedMotion(frozen)
      })
    }

    if (autoplay) this.play()
    if (playOnView) this.observeVisibility()
  }

  /** The underlying engine (advanced use: engine.subscribe, resample, …). */
  get core(): Engine {
    return this.engine
  }

  /** Current effective options. */
  get(): TransmorphOptions {
    const c = this.engine.getConfig()
    const { fileName: _ignored, ...rest } = c
    void _ignored
    return {
      ...rest,
      autoplay: this.opts.autoplay,
      playOnView: this.opts.playOnView,
      respectReducedMotion: this.opts.respectReducedMotion,
      loop: this.opts.loop,
    }
  }

  /** Apply a partial update. Animation fields hot-apply (structural ones
   *  re-rasterize internally); playback flags switch behaviour immediately. */
  set(patch: TransmorphOptions): void {
    const { autoplay, playOnView, respectReducedMotion, loop, ...config } = patch
    if (autoplay !== undefined) this.opts.autoplay = autoplay
    if (loop !== undefined) {
      this.opts.loop = loop
      this.clock.setLoop(loop)
      this.clock.setDuration(this.engine.durationMs())
    }
    if (respectReducedMotion !== undefined) {
      this.opts.respectReducedMotion = respectReducedMotion
      this.clock.setReducedMotion(respectReducedMotion && prefersReducedMotion())
    }
    if (playOnView !== undefined && playOnView !== this.opts.playOnView) {
      this.opts.playOnView = playOnView
      if (playOnView) this.observeVisibility()
      else this.io?.disconnect()
    }
    if (Object.keys(config).length) this.engine.setConfig(config)
    this.clock.setDuration(this.engine.durationMs())
  }

  /** Start the animation loop. A finished single-shot replay restarts from
   *  the beginning. */
  play(): void {
    if (this.destroyed || this.rafId !== null) return
    if (!this.opts.loop && this.clock.elapsedMs >= this.engine.durationMs()) {
      this.clock.reset()
    }
    this.clock.play()
    this.rafId = raf()(this.loop)
  }

  /** Pause: the clock stops and the loop halts on the current frame. */
  pause(): void {
    this.clock.pause()
    this.stopLoop()
  }

  /** Draw a specific elapsed time (manual driver). */
  renderAt(timeMs: number): void {
    this.engine.renderAt(timeMs)
  }

  /** Re-rasterize text into dots (e.g. after fonts finished loading). */
  resample(): void {
    this.engine.resample()
  }

  /** Full loop duration in ms for the current config. */
  durationMs(): number {
    return this.engine.durationMs()
  }

  /** Stop the loop, disconnect observers, and release resources. */
  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.stopLoop()
    this.detachMotionWatch()
    this.detachMotionWatch = () => {}
    this.io?.disconnect()
    this.io = null
  }

  private loop = (now: number): void => {
    if (this.destroyed || this.rafId === null) return
    const t = this.clock.tick(now)
    if (this.opts.loop) {
      // Loop mode renders the raw elapsed time; single-shot mode clamps just
      // before the end so the last phrase rests fully formed (duration itself
      // wraps back to the first phrase in the engine's cyclic timeline).
      this.engine.renderAt(t)
    } else {
      this.engine.renderAt(Math.min(t, this.engine.durationMs() - 1))
      // Single-shot finished: hold the final frame and stop the loop.
      if (!this.clock.isPlaying) {
        this.stopLoop()
        return
      }
    }
    if (!this.destroyed) this.rafId = raf()(this.loop)
  }

  private stopLoop(): void {
    if (this.rafId !== null) {
      caf()(this.rafId)
      this.rafId = null
    }
  }

  /** Keep the canvas buffer + CSS aspect-ratio matched to the stage size. */
  private syncSize(width: number, height: number): void {
    if (this.target.width !== width) this.target.width = width
    if (this.target.height !== height) this.target.height = height
    this.target.style.aspectRatio = `${width} / ${height}`
  }

  /** Scroll-driven pause: stop while the canvas is off-screen. */
  private observeVisibility(): void {
    if (typeof IntersectionObserver !== 'function' || this.io) return
    this.io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting)
        if (visible && this.opts.autoplay) this.play()
        else this.pause()
      },
      { threshold: 0.1 },
    )
    this.io.observe(this.target)
  }
}

/** Re-export the config defaults so consumers can build options from them. */
export const transmorphDefaults: TransmorphConfig = (() => {
  const { fileName: _, ...rest } = defaultConfig
  void _
  return rest
})()

export type { MovementMode, EasingName, SequenceMode }
