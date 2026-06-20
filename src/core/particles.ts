import type { Vec2 } from './types'
import { mulberry32 } from './rng'
import { lerp, scatterEnvelope } from './easing'

export type MovementMode =
  | 'random'
  | 'explode'
  | 'implode'
  | 'sweepLeft'
  | 'sweepRight'
  | 'sweepUp'
  | 'sweepDown'
  | 'swirl'
  | 'gravity'
  | 'morph'

export type ParticleSystemOptions = {
  seed: number
  scatterAmount: number
  randomness: number
  ease: (t: number) => number
  envelope?: (t: number) => number
  movement?: MovementMode
  center?: Vec2
}

/** Per-particle scatter direction for a movement mode. `angle` is the
 *  pre-drawn random angle, used for 'random' and as a degenerate fallback. */
function directionFor(
  mode: MovementMode,
  src: Vec2,
  center: Vec2,
  angle: number,
): Vec2 {
  const randomDir: Vec2 = { x: Math.cos(angle), y: Math.sin(angle) }
  const rx = src.x - center.x
  const ry = src.y - center.y
  const len = Math.hypot(rx, ry)
  switch (mode) {
    case 'random':
      return randomDir
    case 'explode':
      return len > 1e-6 ? { x: rx / len, y: ry / len } : randomDir
    case 'implode':
      return len > 1e-6 ? { x: -rx / len, y: -ry / len } : randomDir
    case 'sweepLeft':
      return { x: -1, y: 0 }
    case 'sweepRight':
      return { x: 1, y: 0 }
    case 'sweepUp':
      return { x: 0, y: -1 }
    case 'sweepDown':
      return { x: 0, y: 1 }
    case 'swirl':
      return len > 1e-6 ? { x: -ry / len, y: rx / len } : randomDir
    case 'gravity':
      return { x: 0, y: 1 }
    case 'morph':
      return { x: 0, y: 0 }
    default:
      return randomDir
  }
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
    const movement = opts.movement ?? 'random'
    const center = opts.center ?? { x: 0, y: 0 }
    this.ease = opts.ease
    this.envelope = opts.envelope ?? scatterEnvelope
    this.scatterAmount = opts.scatterAmount
    this.src = []
    this.dst = []
    this.dir = []
    this.mag = []
    const fallback: Vec2 = { x: 0, y: 0 }
    for (let i = 0; i < count; i++) {
      const src = from.length ? from[i % from.length] : fallback
      this.src.push(src)
      this.dst.push(to.length ? to[i % to.length] : fallback)
      // Always draw the angle first so RNG consumption is identical across modes.
      const angle = rand() * Math.PI * 2
      this.dir.push(directionFor(movement, src, center, angle))
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
