import type { Vec2 } from './types'
import type { Store } from '../config/store'
import { STAGE_WIDTH, STAGE_HEIGHT } from '../config/types'
import { sampleText, type SampleOptions } from './sampler'
import { ParticleSystem } from './particles'
import { sequenceState, cycleDuration } from './sequencer'
import { easings } from './easing'
import { drawStage, type DrawStyle } from '../render/renderer'

export class Engine {
  private ctx: CanvasRenderingContext2D
  private targets: Vec2[][] = []
  private systems = new Map<string, ParticleSystem>()

  constructor(
    stage: HTMLCanvasElement,
    private store: Store,
  ) {
    stage.width = STAGE_WIDTH
    stage.height = STAGE_HEIGHT
    this.ctx = stage.getContext('2d')!
    this.resample()
  }

  /** Re-rasterize every phrase into dot targets. Expensive (canvas draw +
   *  getImageData per phrase) — only for changes that alter the sampled dots
   *  (text, grid, font). Motion-only changes should use resetSystems(). */
  resample(): void {
    const c = this.store.get()
    const opts: SampleOptions = {
      width: STAGE_WIDTH,
      height: STAGE_HEIGHT,
      cell: Math.max(2, Math.round(c.gridSpacing)),
      threshold: c.threshold,
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
        ease: easings[c.easing],
        movement: c.movement,
        center: { x: STAGE_WIDTH / 2, y: STAGE_HEIGHT / 2 },
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
    const points = sys.positionsAt(state.phase === 'hold' ? 0 : state.progress)
    const style: DrawStyle = {
      backgroundColor: c.backgroundColor,
      dotColor: c.dotColor,
      dotShape: c.dotShape,
      dotSize: c.dotSize,
    }
    drawStage(this.ctx, STAGE_WIDTH, STAGE_HEIGHT, points, style)
  }
}
