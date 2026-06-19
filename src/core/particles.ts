import type { Vec2 } from './types'
import { mulberry32 } from './rng'
import { lerp, scatterEnvelope } from './easing'

export type ParticleSystemOptions = {
  seed: number
  scatterAmount: number
  randomness: number
  ease: (t: number) => number
  envelope?: (t: number) => number
}

export class ParticleSystem {
  private readonly src: Vec2[]
  private readonly dst: Vec2[]
  private readonly dir: Vec2[]
  private readonly mag: number[]
  private readonly ease: (t: number) => number
  private readonly envelope: (t: number) => number
  private readonly scatterAmount: number

  constructor(from: Vec2[], to: Vec2[], opts: ParticleSystemOptions) {
    const count = Math.max(from.length, to.length)
    const rand = mulberry32(opts.seed)
    this.ease = opts.ease
    this.envelope = opts.envelope ?? scatterEnvelope
    this.scatterAmount = opts.scatterAmount
    this.src = []
    this.dst = []
    this.dir = []
    this.mag = []
    const fallback: Vec2 = { x: 0, y: 0 }
    for (let i = 0; i < count; i++) {
      this.src.push(from.length ? from[i % from.length] : fallback)
      this.dst.push(to.length ? to[i % to.length] : fallback)
      const angle = rand() * Math.PI * 2
      this.dir.push({ x: Math.cos(angle), y: Math.sin(angle) })
      // magnitude in [1-randomness, 1]
      this.mag.push(1 - opts.randomness * rand())
    }
  }

  positionsAt(progress: number): Vec2[] {
    const e = this.ease(progress)
    const env = this.envelope(progress)
    const out: Vec2[] = []
    for (let i = 0; i < this.src.length; i++) {
      const baseX = lerp(this.src[i].x, this.dst[i].x, e)
      const baseY = lerp(this.src[i].y, this.dst[i].y, e)
      const m = this.mag[i] * this.scatterAmount * env
      out.push({ x: baseX + this.dir[i].x * m, y: baseY + this.dir[i].y * m })
    }
    return out
  }
}
