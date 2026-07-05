import type { Vec2 } from './types'
import type { Store } from '../config/store'
import { sampleText, ALPHA_THRESHOLD, type SampleOptions } from './sampler'
import { ParticleSystem, idleOffset } from './particles'
import { sequenceState, cycleDuration } from './sequencer'
import { easings } from './easing'
import { drawStage, type DrawStyle } from '../render/renderer'

export class Engine {
  private stage: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private targets: Vec2[][] = []
  private systems = new Map<string, ParticleSystem>()

  constructor(
    stage: HTMLCanvasElement,
    private store: Store,
  ) {
    this.stage = stage
    this.ctx = stage.getContext('2d')!
    this.resample()
  }

  /** Re-rasterize every phrase into dot targets, resizing the stage canvas to
   *  the current output dimensions first. Expensive (canvas draw + getImageData
   *  per phrase) — only for changes that alter the sampled dots (text, grid,
   *  font, size). Motion-only changes should use resetSystems(). */
  resample(): void {
    const c = this.store.get()
    this.stage.width = c.stageWidth
    this.stage.height = c.stageHeight
    const opts: SampleOptions = {
      width: c.stageWidth,
      height: c.stageHeight,
      cell: Math.max(2, Math.round(c.gridSpacing)),
      threshold: ALPHA_THRESHOLD,
      fontFamily: c.fontFamily,
      fontWeight: c.fontWeight,
      fillRatio: c.fillRatio,
    }
    const phrases = c.phrases.length ? c.phrases : ['']
    this.targets = phrases.map((p) => sampleText(p, opts))
    this.systems.clear()
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
        center: { x: c.stageWidth / 2, y: c.stageHeight / 2 },
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
    if (hold && c.idleFloat > 0) {
      for (const p of points) {
        const o = idleOffset(p.x, p.y, timeMs, c.idleFloat)
        p.x += o.x
        p.y += o.y
      }
    }
    const style: DrawStyle = {
      backgroundColor: c.backgroundColor,
      dotColor: c.dotColor,
      dotShape: c.dotShape,
      dotSize: c.dotSize,
    }
    drawStage(this.ctx, c.stageWidth, c.stageHeight, points, style, scales)
  }
}
