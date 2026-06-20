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

/** Two-phase modes disperse to a waypoint at progress=0.5, then form the
 *  target. Single-phase modes (cross/morph) travel straight src→dst so the
 *  motion stays purely on its axis with no parasitic detour. */
function isTwoPhase(mode: MovementMode): boolean {
  return (
    mode === 'random' ||
    mode === 'explode' ||
    mode === 'implode' ||
    mode === 'gravity' ||
    mode === 'swirl'
  )
}

function sortedByX(pts: Vec2[]): Vec2[] {
  return [...pts].sort((a, b) => a.x - b.x || a.y - b.y)
}
function sortedByY(pts: Vec2[]): Vec2[] {
  return [...pts].sort((a, b) => a.y - b.y || a.x - b.x)
}

/** Nearest point in `sorted` (already ordered by `axis`) to the given coord,
 *  via binary search. Used to relocate a leftover particle the *shortest*
 *  distance to an occupied line. `sorted` must be non-empty. */
function nearestByAxis(sorted: Vec2[], coord: number, axis: 'x' | 'y'): Vec2 {
  const val = axis === 'x' ? (p: Vec2) => p.x : (p: Vec2) => p.y
  let lo = 0
  let hi = sorted.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (val(sorted[mid]) < coord) lo = mid + 1
    else hi = mid
  }
  const a = sorted[lo]
  const b = sorted[lo > 0 ? lo - 1 : lo]
  return Math.abs(val(a) - coord) <= Math.abs(val(b) - coord) ? a : b
}

/** Rank-pair two point sets, wrapping the shorter one to the max length. */
function rankPair(a: Vec2[], b: Vec2[]): { src: Vec2[]; dst: Vec2[] } {
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

/** Index of the point in `pts` nearest to `t` (squared distance). */
function nearest2D(pts: Vec2[], t: Vec2): number {
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < pts.length; i++) {
    const dx = pts[i].x - t.x
    const dy = pts[i].y - t.y
    const d = dx * dx + dy * dy
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

/** Nearest-neighbour pairing for `morph`: every target B point is fed by its
 *  closest source A point, and every A point not yet consumed is sent to its
 *  closest B point. This makes the morph land each dot on the spatially nearest
 *  position — short, in-place moves — instead of the rank-wrap pairing, whose
 *  modulo step streaks left-side sources across to right-side targets when the
 *  two texts differ in point count (the "looks like a swap" artifact). */
function morphPair(from: Vec2[], to: Vec2[]): { src: Vec2[]; dst: Vec2[] } {
  if (!from.length || !to.length) return rankPair(from, to)
  const src: Vec2[] = []
  const dst: Vec2[] = []
  const usedA = new Set<number>()
  // Cover every target: each B point pulls from its nearest A point.
  for (const bp of to) {
    const ai = nearest2D(from, bp)
    usedA.add(ai)
    src.push(from[ai])
    dst.push(bp)
  }
  // Cover every source: A points no target claimed still need a path so text A
  // renders complete at rest — send each to its nearest B point.
  for (let i = 0; i < from.length; i++) {
    if (usedA.has(i)) continue
    src.push(from[i])
    dst.push(to[nearest2D(to, from[i])])
  }
  return { src, dst }
}

/** Bucket points by the rounded value of one axis (the sampler lays points on
 *  a shared grid, so both texts land on the same column/row keys). */
function bucketByAxis(pts: Vec2[], axis: 'x' | 'y'): Map<number, Vec2[]> {
  const m = new Map<number, Vec2[]>()
  for (const p of pts) {
    const k = Math.round(axis === 'x' ? p.x : p.y)
    const arr = m.get(k)
    if (arr) arr.push(p)
    else m.set(k, [p])
  }
  return m
}

/** Swap pairing for cross modes, done *within each shared grid line* so the
 *  swap is local to a glyph's column/row and horizontal (resp. vertical)
 *  drift stays near zero — matching the user's "单个字的上方点向下" intent.
 *  verticalCross (axis 'y'): per x-column, top point ↔ bottom point.
 *  horizontalCross (axis 'x'): per y-row, left point ↔ right point.
 *  Points whose grid line has no counterpart fall back to nearest-rank
 *  pairing so every particle is still placed. */
function crossPair(from: Vec2[], to: Vec2[], axis: 'x' | 'y'): { src: Vec2[]; dst: Vec2[] } {
  // axis 'y' swaps along y within x-columns; axis 'x' swaps along x within y-rows.
  const lineAxis: 'x' | 'y' = axis === 'y' ? 'x' : 'y'
  const swapVal = axis === 'y' ? (p: Vec2) => p.y : (p: Vec2) => p.x
  const A = bucketByAxis(from, lineAxis)
  const B = bucketByAxis(to, lineAxis)
  const src: Vec2[] = []
  const dst: Vec2[] = []
  const aOnly: Vec2[] = []
  const bOnly: Vec2[] = []
  const keys = new Set<number>([...A.keys(), ...B.keys()])
  for (const k of keys) {
    const ac = A.get(k)
    const bc = B.get(k)
    if (ac && bc) {
      const as = [...ac].sort((p, q) => swapVal(p) - swapVal(q)) // ascending
      const bs = [...bc].sort((p, q) => swapVal(q) - swapVal(p)) // descending → swap
      const n = Math.max(as.length, bs.length)
      for (let i = 0; i < n; i++) {
        src.push(as[i % as.length])
        dst.push(bs[i % bs.length])
      }
    } else if (ac) {
      for (const p of ac) aOnly.push(p)
    } else if (bc) {
      for (const p of bc) bOnly.push(p)
    }
  }
  // Leftover grid lines present on only one side: send each particle the
  // *shortest* distance to the nearest occupied line on the other side
  // (relocating, not swapping) so no particle streaks across the stage.
  if (aOnly.length || bOnly.length) {
    const toSorted = lineAxis === 'x' ? sortedByX(to) : sortedByY(to)
    const fromSorted = lineAxis === 'x' ? sortedByX(from) : sortedByY(from)
    const lineCoord = lineAxis === 'x' ? (p: Vec2) => p.x : (p: Vec2) => p.y
    for (const p of aOnly) {
      src.push(p)
      dst.push(nearestByAxis(toSorted, lineCoord(p), lineAxis))
    }
    for (const p of bOnly) {
      src.push(nearestByAxis(fromSorted, lineCoord(p), lineAxis))
      dst.push(p)
    }
  }
  return { src, dst }
}

/** Pair text-A points to text-B points. Cross modes use swap pairing (top↔
 *  bottom / left↔right); morph uses nearest-neighbour pairing (minimal,
 *  in-place motion); dispersing modes rank-pair by x (pairing is hidden by the
 *  midpoint scatter). Shorter set is index-wrapped to the max length. */
export function pairPoints(
  from: Vec2[],
  to: Vec2[],
  mode: MovementMode,
): { src: Vec2[]; dst: Vec2[] } {
  if (mode === 'verticalCross') return crossPair(from, to, 'y')
  if (mode === 'horizontalCross') return crossPair(from, to, 'x')
  if (mode === 'morph') return morphPair(from, to)
  return rankPair(sortedByX(from), sortedByX(to))
}

function normalize(v: Vec2): Vec2 {
  const l = Math.hypot(v.x, v.y)
  return l > 1e-6 ? { x: v.x / l, y: v.y / l } : { x: 0, y: 0 }
}

/** Scale that maps `scatterAmount` to a radial expand/collapse factor.
 *  amount 0 → 1 (no change); amount 220 → explode ×2 / implode ×0. */
const RADIAL_REF = 220

/** The waypoint a two-phase particle passes through at progress=0.5. Each
 *  mode shapes the fully-dispersed midpoint; `amount` is the dispersal
 *  distance. `jitterFrac` = randomness × rand() ∈ [0, randomness): the share
 *  of `amount` applied as a per-particle random offset, which breaks the text
 *  structure into a cloud at the midpoint (kills the readable "shadow").
 *  Only called for two-phase modes. */
export function waypointFor(
  mode: MovementMode,
  src: Vec2,
  dst: Vec2,
  center: Vec2,
  amount: number,
  floorY: number,
  randomDir: Vec2,
  jitterFrac: number,
): Vec2 {
  const mid: Vec2 = { x: (src.x + dst.x) / 2, y: (src.y + dst.y) / 2 }
  const toMid: Vec2 = { x: mid.x - center.x, y: mid.y - center.y }
  const dist = Math.hypot(toMid.x, toMid.y)
  const jx = randomDir.x * amount * jitterFrac
  const jy = randomDir.y * amount * jitterFrac
  switch (mode) {
    case 'explode': {
      // Multiplicative burst: scale every point outward from centre so the
      // core empties out, then sprinkle random jitter on top.
      const f = 1 + amount / RADIAL_REF
      return { x: center.x + toMid.x * f + jx, y: center.y + toMid.y * f + jy }
    }
    case 'implode': {
      // Tight collapse toward centre (factor → 0 as amount grows).
      const f = Math.max(0.05, 1 - amount / RADIAL_REF)
      return { x: center.x + toMid.x * f + jx, y: center.y + toMid.y * f + jy }
    }
    case 'gravity':
      // Building collapse: fall straight down (keep the source column, no
      // sideways drift — that was the parasitic "swap shadow"), piling into a
      // shallow rubble band just above the floor. Horizontal travel to the new
      // layout happens only on the bounce-up phase.
      return { x: src.x, y: floorY - Math.abs(jy) * 0.15 }
    case 'swirl': {
      const d = dist > 1e-6 ? normalize({ x: -toMid.y, y: toMid.x }) : randomDir
      return { x: mid.x + d.x * amount + jx, y: mid.y + d.y * amount + jy }
    }
    case 'random':
    default:
      // Random scatter: full radial magnitude minus the jitter share.
      return {
        x: mid.x + randomDir.x * amount * (1 - jitterFrac),
        y: mid.y + randomDir.y * amount * (1 - jitterFrac),
      }
  }
}

/** How much of `randomness × scatterAmount` becomes peak perpendicular wobble
 *  on the single-phase cross modes. */
const CROSS_WOBBLE = 0.5

/** Gravity timeline (fractions of the transition):
 *  [0, GRAVITY_COLLAPSE_END]  collapse — dots fall and pancake onto the floor
 *  [..., GRAVITY_RISE_START]  settle — rubble rests in place (the "wait")
 *  [..., 1]                   reform — spring up into the next text */
const GRAVITY_COLLAPSE_END = 0.42
const GRAVITY_RISE_START = 0.65

/** Accelerating fall — heavy, gravity-like (slow start, fast finish). */
function easeInQuad(t: number): number {
  return t * t
}
/** Spring-up with overshoot — the dots shoot past the new layout, then settle
 *  ("弹起" / bounce into the next text). */
function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

export class ParticleSystem {
  private readonly src: Vec2[]
  private readonly dst: Vec2[]
  private readonly way: Vec2[] | null
  /** Per-particle perpendicular wobble vector for cross modes (else null). */
  private readonly perp: Vec2[] | null
  private readonly ease: (t: number) => number
  /** Per-particle landing progress for gravity (else null): the progress at
   *  which this dot reaches the floor. Tall dots land later → pancake pile-up. */
  private readonly gLand: number[] | null

  constructor(from: Vec2[], to: Vec2[], opts: ParticleSystemOptions) {
    const movement = opts.movement ?? 'random'
    const center = opts.center ?? { x: 0, y: 0 }
    const floorY = opts.floorY ?? center.y * 2 * 0.92
    const rand = mulberry32(opts.seed)
    this.ease = opts.ease
    const paired = pairPoints(from, to, movement)
    this.src = paired.src
    this.dst = paired.dst

    if (isTwoPhase(movement)) {
      const way: Vec2[] = []
      for (let i = 0; i < this.src.length; i++) {
        const angle = rand() * Math.PI * 2
        const randomDir: Vec2 = { x: Math.cos(angle), y: Math.sin(angle) }
        const jitterFrac = opts.randomness * rand()
        way.push(
          waypointFor(
            movement, this.src[i], this.dst[i], center,
            opts.scatterAmount, floorY, randomDir, jitterFrac,
          ),
        )
      }
      this.way = way
      this.perp = null
      if (movement === 'gravity') {
        // Pancake timing: a dot's fall time scales with √(fall distance) under
        // constant gravity, so tall dots land later and the pile builds from the
        // bottom up. Normalise so the tallest dot lands exactly at COLLAPSE_END.
        let hMax = 1e-6
        for (let i = 0; i < this.src.length; i++) {
          hMax = Math.max(hMax, way[i].y - this.src[i].y)
        }
        const gLand: number[] = []
        for (let i = 0; i < this.src.length; i++) {
          const h = Math.max(0, way[i].y - this.src[i].y)
          gLand.push(GRAVITY_COLLAPSE_END * Math.sqrt(h / hMax))
        }
        this.gLand = gLand
      } else {
        this.gLand = null
      }
    } else if (movement === 'verticalCross' || movement === 'horizontalCross') {
      // Single-phase swap with a perpendicular wobble so the fold is not rigid:
      // verticalCross wobbles in x, horizontalCross in y. Signed per particle,
      // peaks mid-transition (see positionsAt), magnitude set by randomness.
      const amp = opts.randomness * opts.scatterAmount * CROSS_WOBBLE
      const horizontal = movement === 'verticalCross'
      const perp: Vec2[] = []
      for (let i = 0; i < this.src.length; i++) {
        const signed = rand() * 2 - 1
        perp.push(
          horizontal
            ? { x: signed * amp, y: 0 }
            : { x: 0, y: signed * amp },
        )
      }
      this.way = null
      this.perp = perp
      this.gLand = null
    } else {
      // morph: straight src→dst, no waypoint, no wobble.
      this.way = null
      this.perp = null
      this.gLand = null
    }
  }

  positionsAt(progress: number): Vec2[] {
    const out: Vec2[] = []
    const way = this.way
    if (way === null) {
      // Single-phase: a straight, eased lerp from src to dst, plus (for cross
      // modes) a perpendicular wobble that vanishes at both endpoints.
      const e = this.ease(progress)
      const env = this.perp ? Math.sin(Math.PI * progress) : 0
      for (let i = 0; i < this.src.length; i++) {
        const wob = this.perp ? this.perp[i] : null
        out.push({
          x: lerp(this.src[i].x, this.dst[i].x, e) + (wob ? wob.x * env : 0),
          y: lerp(this.src[i].y, this.dst[i].y, e) + (wob ? wob.y * env : 0),
        })
      }
      return out
    }
    const gLand = this.gLand
    if (gLand !== null) {
      // Gravity: per-dot pancake collapse → settle → spring-up reform.
      for (let i = 0; i < this.src.length; i++) {
        const rest = way[i]
        if (progress < GRAVITY_RISE_START) {
          // Collapse then settle: accelerating fall to the floor by this dot's
          // landing time, then it simply stays at rest (the "wait" before rise).
          const pl = gLand[i]
          const f = easeInQuad(pl > 1e-6 ? Math.min(1, progress / pl) : 1)
          out.push({
            x: lerp(this.src[i].x, rest.x, f), // rest.x === src.x → straight down
            y: lerp(this.src[i].y, rest.y, f),
          })
        } else {
          // Reform: spring up out of the rubble into the next layout.
          const e = easeOutBack((progress - GRAVITY_RISE_START) / (1 - GRAVITY_RISE_START))
          out.push({
            x: lerp(rest.x, this.dst[i].x, e),
            y: lerp(rest.y, this.dst[i].y, e),
          })
        }
      }
      return out
    }
    for (let i = 0; i < this.src.length; i++) {
      if (progress <= 0.5) {
        const e = this.ease(progress / 0.5)
        out.push({
          x: lerp(this.src[i].x, way[i].x, e),
          y: lerp(this.src[i].y, way[i].y, e),
        })
      } else {
        const e = this.ease((progress - 0.5) / 0.5)
        out.push({
          x: lerp(way[i].x, this.dst[i].x, e),
          y: lerp(way[i].y, this.dst[i].y, e),
        })
      }
    }
    return out
  }
}
