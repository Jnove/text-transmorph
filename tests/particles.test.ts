import { describe, it, expect } from 'vitest'
import {
  ParticleSystem, pairPoints, waypointFor, idleOffset, type MovementMode,
} from '../src/core/particles'
import type { Vec2 } from '../src/core/types'

const from: Vec2[] = [{ x: 0, y: 0 }, { x: 10, y: 0 }]
const to: Vec2[] = [{ x: 0, y: 10 }, { x: 10, y: 10 }]
const opts = { seed: 1, scatterAmount: 50, randomness: 0.5, ease: (t: number) => t }

describe('ParticleSystem', () => {
  it('returns exactly the source points at progress 0', () => {
    const ps = new ParticleSystem(from, to, opts)
    expect(ps.positionsAt(0)).toEqual(from)
  })

  it('returns exactly the destination points at progress 1', () => {
    const ps = new ParticleSystem(from, to, opts)
    expect(ps.positionsAt(1)).toEqual(to)
  })

  it('scatters away from the straight path at the midpoint', () => {
    const ps = new ParticleSystem(from, to, { ...opts, scatterAmount: 100 })
    const mid = ps.positionsAt(0.5)
    // straight-line midpoint of particle 0 would be (0,5); scatter must move it
    const dx = mid[0].x - 0
    const dy = mid[0].y - 5
    expect(Math.hypot(dx, dy)).toBeGreaterThan(1)
  })

  it('uses max(from,to) length and wraps the shorter set', () => {
    const ps = new ParticleSystem([{ x: 1, y: 1 }], to, opts)
    expect(ps.positionsAt(1)).toEqual(to) // 2 particles, both reach `to`
  })

  it('is deterministic for a fixed seed', () => {
    const a = new ParticleSystem(from, to, opts).positionsAt(0.5)
    const b = new ParticleSystem(from, to, opts).positionsAt(0.5)
    expect(a).toEqual(b)
  })
})

describe('pairPoints', () => {
  const CY = 50
  it('verticalCross swaps halves: top-A pairs with bottom-B, matched by x', () => {
    // A & B each have two top points (y=0) and two bottom points (y=100).
    const a: Vec2[] = [
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 100 }, { x: 10, y: 100 },
    ]
    const b: Vec2[] = [
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 100 }, { x: 10, y: 100 },
    ]
    const { src, dst } = pairPoints(a, b, 'verticalCross')
    for (let i = 0; i < src.length; i++) {
      // No horizontal drift: every pair shares an x.
      expect(dst[i].x).toBeCloseTo(src[i].x, 6)
      // Vertical swap: src and dst sit on opposite sides of the centre.
      expect(Math.sign(src[i].y - CY)).toBe(-Math.sign(dst[i].y - CY))
    }
  })
  it('horizontalCross swaps halves: left-A pairs with right-B, matched by y', () => {
    const a: Vec2[] = [
      { x: 0, y: 0 }, { x: 0, y: 10 }, { x: 100, y: 0 }, { x: 100, y: 10 },
    ]
    const b: Vec2[] = [
      { x: 0, y: 0 }, { x: 0, y: 10 }, { x: 100, y: 0 }, { x: 100, y: 10 },
    ]
    const { src, dst } = pairPoints(a, b, 'horizontalCross')
    for (let i = 0; i < src.length; i++) {
      expect(dst[i].y).toBeCloseTo(src[i].y, 6) // no vertical drift
      expect(Math.sign(src[i].x - CY)).toBe(-Math.sign(dst[i].x - CY)) // left↔right
    }
  })
  it('wraps the shorter set to max length', () => {
    const { src, dst } = pairPoints([{ x: 1, y: 1 }], [{ x: 0, y: 0 }, { x: 2, y: 0 }], 'morph')
    expect(src.length).toBe(2)
    expect(dst.length).toBe(2)
    expect(src[0]).toEqual(src[1])
  })
  it('morph feeds each target from its nearest source (no wrap streaks)', () => {
    // Unequal counts: rank-wrap would pair the far-left {0,0} with the far-right
    // {100,0} (a full-width streak). Nearest pairing must feed {100,0} from the
    // closer {50,0} instead, so no particle travels more than 50px.
    const a: Vec2[] = [{ x: 0, y: 0 }, { x: 50, y: 0 }]
    const b: Vec2[] = [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }]
    const { src, dst } = pairPoints(a, b, 'morph')
    const far = dst.findIndex((p) => p.x === 100)
    expect(src[far].x).toBe(50) // nearest source, not the far {0,0}
    for (let i = 0; i < src.length; i++) {
      expect(Math.abs(dst[i].x - src[i].x)).toBeLessThanOrEqual(50)
    }
  })
  it('gravity uses nearest pairing so the spring-up has no sideways streak', () => {
    // Same anti-streak guarantee as morph: the far target is fed from the near
    // source, so no dot travels the full width horizontally on the rise.
    const a: Vec2[] = [{ x: 0, y: 0 }, { x: 50, y: 0 }]
    const b: Vec2[] = [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }]
    const { src, dst } = pairPoints(a, b, 'gravity')
    const far = dst.findIndex((p) => p.x === 100)
    expect(src[far].x).toBe(50)
    for (let i = 0; i < src.length; i++) {
      expect(Math.abs(dst[i].x - src[i].x)).toBeLessThanOrEqual(50)
    }
  })
  it('morph covers every source point so text A renders complete at rest', () => {
    // A point with no nearest-target claim must still get a path.
    const a: Vec2[] = [{ x: 0, y: 0 }, { x: 200, y: 0 }]
    const b: Vec2[] = [{ x: 0, y: 0 }] // both A points are nearest to nothing on the right
    const { src } = pairPoints(a, b, 'morph')
    expect(src.some((p) => p.x === 0)).toBe(true)
    expect(src.some((p) => p.x === 200)).toBe(true) // the unclaimed source is included
  })
})

describe('waypointFor (two-phase modes only)', () => {
  const center: Vec2 = { x: 0, y: 0 }
  const rd: Vec2 = { x: 1, y: 0 } // randomDir stub

  it('explode scales outward from centre (jitterFrac 0 → no random offset)', () => {
    // mid={5,0}, f=1+100/220≈1.4545 → W≈{7.27,0}, collinear and farther out.
    const w = waypointFor('explode', { x: 0, y: 0 }, { x: 10, y: 0 }, center, 100, 50, rd, 0)
    expect(w.x).toBeCloseTo(5 * (1 + 100 / 220), 5)
    expect(w.y).toBeCloseTo(0, 6)
    expect(Math.abs(w.x)).toBeGreaterThan(5) // pushed outward
  })
  it('implode with large amount collapses near centre', () => {
    const w = waypointFor('implode', { x: 6, y: 8 }, { x: 6, y: 8 }, center, 1000, 50, rd, 0)
    expect(Math.hypot(w.x, w.y)).toBeLessThan(1) // ~5% of original radius 10
  })
  it('gravity falls straight down (keeps src.x) to the floor (jitterFrac 0)', () => {
    const w = waypointFor('gravity', { x: 4, y: 0 }, { x: 6, y: 0 }, center, 100, 478, rd, 0)
    expect(w.x).toBeCloseTo(4, 6) // src.x, not mid.x — no sideways drift on the fall
    expect(w.y).toBeCloseTo(478, 6)
  })
  it('jitterFrac adds a random offset of amount×frac along randomDir', () => {
    // degenerate mid==center: base is centre, so W = randomDir*amount*frac.
    const w = waypointFor('explode', { x: 0, y: 0 }, { x: 0, y: 0 }, center, 100, 50, rd, 1)
    expect(Number.isFinite(w.x)).toBe(true)
    expect(w.x).toBeCloseTo(100, 6)
    expect(w.y).toBeCloseTo(0, 6)
  })
})

describe('ParticleSystem two-phase (explode)', () => {
  const s: Vec2[] = [{ x: 0, y: 0 }]
  const d: Vec2[] = [{ x: 0, y: 10 }]
  const o = {
    seed: 1, scatterAmount: 100, randomness: 0,
    ease: (t: number) => t, movement: 'explode' as MovementMode, center: { x: 0, y: 0 },
  }
  it('t=0 is the source, t=1 is the destination', () => {
    const ps = new ParticleSystem(s, d, o)
    expect(ps.positionsAt(0)[0]).toEqual({ x: 0, y: 0 })
    expect(ps.positionsAt(1)[0]).toEqual({ x: 0, y: 10 })
  })
  it('t=0.5 sits at the scaled explode waypoint (randomness 0)', () => {
    // mid={0,5}, f=1+100/220 → W={0, 5*f}
    const ps = new ParticleSystem(s, d, o)
    const p = ps.positionsAt(0.5)[0]
    expect(p.x).toBeCloseTo(0, 6)
    expect(p.y).toBeCloseTo(5 * (1 + 100 / 220), 5)
  })
  it('is continuous across the midpoint', () => {
    const ps = new ParticleSystem(s, d, o)
    const before = ps.positionsAt(0.4999)[0]
    const after = ps.positionsAt(0.5001)[0]
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThan(0.5)
  })
})

describe('ParticleSystem gravity (collapse then spring)', () => {
  const o = {
    seed: 1, scatterAmount: 100, randomness: 0, ease: (t: number) => t,
    movement: 'gravity' as MovementMode, center: { x: 0, y: 0 }, floorY: 480,
  }
  const s: Vec2[] = [{ x: 0, y: 0 }]
  const d: Vec2[] = [{ x: 100, y: 10 }]
  it('falls straight down — no horizontal drift during the collapse half', () => {
    const ps = new ParticleSystem(s, d, o)
    for (const t of [0, 0.1, 0.25, 0.4, 0.5]) {
      expect(ps.positionsAt(t)[0].x).toBeCloseTo(0, 6)
    }
  })
  it('reaches the floor at the midpoint and lands exactly on dst at t=1', () => {
    const ps = new ParticleSystem(s, d, o)
    expect(ps.positionsAt(0.5)[0].y).toBeCloseTo(480, 6)
    expect(ps.positionsAt(1)[0]).toEqual({ x: 100, y: 10 })
  })
  it('springs past the target on the reform half (easeOutBack overshoot)', () => {
    const ps = new ParticleSystem(s, d, o)
    const ys = [0.7, 0.8, 0.9].map((t) => ps.positionsAt(t)[0].y)
    expect(Math.min(...ys)).toBeLessThan(10) // rises above its final y, then settles
  })
  it('pancakes: a dot near the floor lands before a dot high above it', () => {
    // dot 0 starts just above the floor (short fall); dot 1 starts high (long fall).
    const sp: Vec2[] = [{ x: 0, y: 470 }, { x: 10, y: 0 }]
    const ps = new ParticleSystem(sp, sp, o)
    const p = ps.positionsAt(0.2) // mid-collapse
    expect(p[0].y).toBeGreaterThan(475) // near-floor dot has already piled up
    expect(p[1].y).toBeLessThan(300) // high dot is still falling
  })
  it('settles on the floor and waits before the spring-up', () => {
    const ps = new ParticleSystem(s, d, o)
    const settle = ps.positionsAt(0.45)[0].y
    const stillSettled = ps.positionsAt(0.64)[0].y
    expect(settle).toBeCloseTo(480, 6)
    expect(stillSettled).toBeCloseTo(480, 6) // unchanged through the rubble pause
  })
})

describe('cross-mode perpendicular wobble', () => {
  const o = {
    seed: 1, scatterAmount: 100,
    ease: (t: number) => t, center: { x: 5, y: 50 },
  }
  it('verticalCross with randomness 0 has zero horizontal wobble', () => {
    const s: Vec2[] = [{ x: 5, y: 0 }, { x: 5, y: 100 }]
    const ps = new ParticleSystem(s, s, { ...o, randomness: 0, movement: 'verticalCross' })
    for (const p of ps.positionsAt(0.5)) expect(p.x).toBeCloseTo(5, 6)
  })
  it('verticalCross with randomness>0 wobbles horizontally, peaking mid-transition', () => {
    const s: Vec2[] = [{ x: 5, y: 0 }, { x: 5, y: 100 }]
    const ps = new ParticleSystem(s, s, { ...o, randomness: 0.8, movement: 'verticalCross' })
    // endpoints stay exact (envelope sin(πt) is 0 there)
    for (const p of ps.positionsAt(0)) expect(p.x).toBeCloseTo(5, 6)
    for (const p of ps.positionsAt(1)) expect(p.x).toBeCloseTo(5, 6)
    // at least one particle is displaced horizontally at the midpoint
    const mid = ps.positionsAt(0.5)
    expect(mid.some((p) => Math.abs(p.x - 5) > 1)).toBe(true)
  })
})

describe('ParticleSystem swirl (polar arc)', () => {
  const o = {
    seed: 1, scatterAmount: 200, randomness: 0, ease: (t: number) => t,
    movement: 'swirl' as MovementMode, center: { x: 0, y: 0 },
  }
  const s: Vec2[] = [{ x: 10, y: 0 }]
  const d: Vec2[] = [{ x: 0, y: 10 }]
  it('lands exactly on src at t=0 and dst at t=1', () => {
    const ps = new ParticleSystem(s, d, o)
    const p0 = ps.positionsAt(0)[0]
    const p1 = ps.positionsAt(1)[0]
    expect(p0.x).toBeCloseTo(10, 4)
    expect(p0.y).toBeCloseTo(0, 4)
    expect(p1.x).toBeCloseTo(0, 4)
    expect(p1.y).toBeCloseTo(10, 4)
  })
  it('bows off the straight src→dst chord at the midpoint (curved path)', () => {
    const ps = new ParticleSystem(s, d, o)
    const mid = ps.positionsAt(0.5)[0]
    // straight-line midpoint would be (5,5); the polar arc must deviate.
    expect(Math.hypot(mid.x - 5, mid.y - 5)).toBeGreaterThan(2)
  })
  it('keeps a roughly constant radius when src and dst share a radius', () => {
    // both points 10px from centre → the arc should ride near r=10, not detour
    // through the origin the way a straight lerp would.
    const ps = new ParticleSystem(s, d, { ...o, scatterAmount: 0 })
    const mid = ps.positionsAt(0.5)[0]
    expect(Math.hypot(mid.x, mid.y)).toBeCloseTo(10, 0)
  })
})

describe('ParticleSystem stagger', () => {
  const from: Vec2[] = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }]
  const to: Vec2[] = [{ x: 0, y: 40 }, { x: 10, y: 40 }, { x: 20, y: 40 }]
  const base = {
    seed: 3, scatterAmount: 0, randomness: 0, ease: (t: number) => t,
    movement: 'morph' as MovementMode, center: { x: 10, y: 20 },
  }
  it('keeps endpoints exact for every particle despite the spread', () => {
    const ps = new ParticleSystem(from, to, { ...base, stagger: 0.5 })
    expect(ps.positionsAt(0)).toEqual(from)
    expect(ps.positionsAt(1)).toEqual(to)
  })
  it('spreads mid-transition progress across particles', () => {
    const ps = new ParticleSystem(from, to, { ...base, stagger: 0.5 })
    const ys = ps.positionsAt(0.5).map((p) => p.y)
    // With a spread, the three dots are not all at the same y at t=0.5.
    expect(new Set(ys.map((y) => Math.round(y))).size).toBeGreaterThan(1)
  })
  it('stagger 0 is identical to no stagger (default off)', () => {
    const a = new ParticleSystem(from, to, base).positionsAt(0.5)
    const b = new ParticleSystem(from, to, { ...base, stagger: 0 }).positionsAt(0.5)
    expect(a).toEqual(b)
  })

  it('uses a spatial wave with only a small seeded jitter', () => {
    const source: Vec2[] = [
      { x: 50, y: 0 }, { x: 500, y: 0 }, { x: 950, y: 0 },
    ]
    const target: Vec2[] = source.map((p) => ({ x: p.x, y: 100 }))
    const ps = new ParticleSystem(source, target, {
      ...base, center: { x: 500, y: 50 }, stagger: 0.6,
    })
    const early = ps.positionsAt(0.2)
    expect(early[0].y).toBeGreaterThan(0)
    expect(early[2].y).toBe(0)
  })
})

describe('ParticleSystem scalesAt', () => {
  const s: Vec2[] = [{ x: 0, y: 0 }]
  const d: Vec2[] = [{ x: 0, y: 10 }]
  const o = {
    seed: 1, scatterAmount: 0, randomness: 0, ease: (t: number) => t,
    movement: 'morph' as MovementMode, center: { x: 0, y: 5 },
  }
  it('is full size at both endpoints and smaller mid-flight', () => {
    const ps = new ParticleSystem(s, d, o)
    expect(ps.scalesAt(0)[0]).toBeCloseTo(1, 6)
    expect(ps.scalesAt(1)[0]).toBeCloseTo(1, 6)
    expect(ps.scalesAt(0.5)[0]).toBeLessThan(1)
    expect(ps.scalesAt(0.5)[0]).toBeGreaterThan(0)
  })
})

describe('idleOffset', () => {
  it('is zero when amplitude is zero', () => {
    expect(idleOffset(100, 50, 1234, 0)).toEqual({ x: 0, y: 0 })
  })
  it('stays within the amplitude bound and is deterministic', () => {
    const a = idleOffset(100, 50, 1234, 2)
    const b = idleOffset(100, 50, 1234, 2)
    expect(a).toEqual(b)
    expect(Math.abs(a.x)).toBeLessThanOrEqual(2)
    expect(Math.abs(a.y)).toBeLessThanOrEqual(2)
  })
  it('differs between two distinct positions at the same time', () => {
    const a = idleOffset(100, 50, 1234, 2)
    const b = idleOffset(101, 50, 1234, 2)
    expect(a).not.toEqual(b)
  })
  it('moves neighbouring dots coherently, not in opposite directions', () => {
    // Two dots one grid cell apart (default spacing 14px) must drift almost
    // together — a per-dot random phase would let them pull apart, which
    // renders as boiling jitter instead of a calm breathe.
    const amp = 2
    const a = idleOffset(500, 260, 1000, amp)
    const b = idleOffset(514, 260, 1000, amp)
    const c = idleOffset(500, 274, 1000, amp)
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(amp * 0.25)
    expect(Math.hypot(a.x - c.x, a.y - c.y)).toBeLessThan(amp * 0.25)
  })
})

describe('ParticleSystem single-phase (cross / morph)', () => {
  const o = {
    seed: 1, scatterAmount: 100, randomness: 0,
    ease: (t: number) => t, center: { x: 0, y: 0 },
  }
  it('morph midpoint equals the straight lerp', () => {
    const ps = new ParticleSystem([{ x: 0, y: 0 }], [{ x: 0, y: 10 }], { ...o, movement: 'morph' })
    const p = ps.positionsAt(0.5)[0]
    expect(p.x).toBeCloseTo(0, 6)
    expect(p.y).toBeCloseTo(5, 6)
  })
  it('verticalCross slides straight down with no horizontal motion', () => {
    // top-A (x=5,y=0) swaps with bottom-B (x=5,y=100): pure vertical descent.
    const s: Vec2[] = [{ x: 5, y: 0 }, { x: 5, y: 100 }]
    const d: Vec2[] = [{ x: 5, y: 0 }, { x: 5, y: 100 }]
    const ps = new ParticleSystem(s, d, { ...o, movement: 'verticalCross', center: { x: 5, y: 50 } })
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      for (const p of ps.positionsAt(t)) expect(p.x).toBeCloseTo(5, 6)
    }
  })

  it('cross modes stay synchronized even when stagger is requested', () => {
    const ps = new ParticleSystem(
      [{ x: 5, y: 0 }, { x: 5, y: 100 }],
      [{ x: 5, y: 0 }, { x: 5, y: 100 }],
      {
        ...o,
        movement: 'verticalCross',
        center: { x: 5, y: 50 },
        stagger: 0.6,
      },
    )
    const points = ps.positionsAt(0.25)
    expect(points[0].y).toBeCloseTo(25, 6)
    expect(points[1].y).toBeCloseTo(75, 6)
  })
})
