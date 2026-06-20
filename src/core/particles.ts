import type { Vec2 } from './types'
import { mulberry32 } from './rng'
import { lerp } from './easing'

export type MovementMode =
  | 'random'
  | 'explode'
  | 'implode'
  | 'gravity'
  | 'verticalCross'
  | 'horizontalCross'
  | 'swirl'
  | 'morph'

export type ParticleSystemOptions = {
  seed: number
  scatterAmount: number
  randomness: number
  ease: (t: number) => number
  movement?: MovementMode
  center?: Vec2
  floorY?: number
}

function sortedByX(pts: Vec2[]): Vec2[] {
  return [...pts].sort((a, b) => a.x - b.x || a.y - b.y)
}
function sortedByY(pts: Vec2[]): Vec2[] {
  return [...pts].sort((a, b) => a.y - b.y || a.x - b.x)
}

/** Pair text-A points to text-B points by a mode-dependent rank so motion
 *  stays on the mode's axis. Shorter set is index-wrapped to max length. */
export function pairPoints(
  from: Vec2[],
  to: Vec2[],
  mode: MovementMode,
): { src: Vec2[]; dst: Vec2[] } {
  const a = mode === 'horizontalCross' ? sortedByY(from) : sortedByX(from)
  const b = mode === 'horizontalCross' ? sortedByY(to) : sortedByX(to)
  const n = Math.max(a.length, b.length)
  const src: Vec2[] = []
  const dst: Vec2[] = []
  const fb: Vec2 = { x: 0, y: 0 }
  for (let i = 0; i < n; i++) {
    src.push(a.length ? a[i % a.length] : fb)
    dst.push(b.length ? b[i % b.length] : fb)
  }
  return { src, dst }
}

function normalize(v: Vec2): Vec2 {
  const l = Math.hypot(v.x, v.y)
  return l > 1e-6 ? { x: v.x / l, y: v.y / l } : { x: 0, y: 0 }
}

/** The single waypoint a particle passes through at progress=0.5. Each mode
 *  shapes the fully-dispersed midpoint; `amount` is the dispersal distance. */
export function waypointFor(
  mode: MovementMode,
  src: Vec2,
  dst: Vec2,
  center: Vec2,
  amount: number,
  floorY: number,
  randomDir: Vec2,
  jitter: number,
): Vec2 {
  const mid: Vec2 = { x: (src.x + dst.x) / 2, y: (src.y + dst.y) / 2 }
  const toMid: Vec2 = { x: mid.x - center.x, y: mid.y - center.y }
  const dist = Math.hypot(toMid.x, toMid.y)
  switch (mode) {
    case 'explode': {
      const d = dist > 1e-6 ? normalize(toMid) : randomDir
      return { x: mid.x + d.x * amount, y: mid.y + d.y * amount }
    }
    case 'implode': {
      const d = normalize({ x: center.x - mid.x, y: center.y - mid.y })
      const m = Math.min(amount, dist)
      return { x: mid.x + d.x * m, y: mid.y + d.y * m }
    }
    case 'gravity':
      return { x: mid.x, y: floorY }
    case 'swirl': {
      const d = dist > 1e-6 ? normalize({ x: -toMid.y, y: toMid.x }) : randomDir
      return { x: mid.x + d.x * amount, y: mid.y + d.y * amount }
    }
    case 'random':
      return {
        x: mid.x + randomDir.x * amount * jitter,
        y: mid.y + randomDir.y * amount * jitter,
      }
    case 'verticalCross':
      return { x: mid.x, y: 2 * center.y - mid.y }
    case 'horizontalCross':
      return { x: 2 * center.x - mid.x, y: mid.y }
    case 'morph':
    default:
      return mid
  }
}

export class ParticleSystem {
  private readonly src: Vec2[]
  private readonly dst: Vec2[]
  private readonly way: Vec2[]
  private readonly ease: (t: number) => number

  constructor(from: Vec2[], to: Vec2[], opts: ParticleSystemOptions) {
    const movement = opts.movement ?? 'random'
    const center = opts.center ?? { x: 0, y: 0 }
    const floorY = opts.floorY ?? center.y * 2 * 0.92
    const rand = mulberry32(opts.seed)
    this.ease = opts.ease
    const paired = pairPoints(from, to, movement)
    this.src = paired.src
    this.dst = paired.dst
    this.way = []
    for (let i = 0; i < this.src.length; i++) {
      const angle = rand() * Math.PI * 2
      const randomDir: Vec2 = { x: Math.cos(angle), y: Math.sin(angle) }
      const jitter = 1 - opts.randomness * rand()
      this.way.push(
        waypointFor(
          movement, this.src[i], this.dst[i], center,
          opts.scatterAmount, floorY, randomDir, jitter,
        ),
      )
    }
  }

  positionsAt(progress: number): Vec2[] {
    const out: Vec2[] = []
    for (let i = 0; i < this.src.length; i++) {
      if (progress <= 0.5) {
        const e = this.ease(progress / 0.5)
        out.push({
          x: lerp(this.src[i].x, this.way[i].x, e),
          y: lerp(this.src[i].y, this.way[i].y, e),
        })
      } else {
        const e = this.ease((progress - 0.5) / 0.5)
        out.push({
          x: lerp(this.way[i].x, this.dst[i].x, e),
          y: lerp(this.way[i].y, this.dst[i].y, e),
        })
      }
    }
    return out
  }
}
