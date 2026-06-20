import { describe, it, expect } from 'vitest'
import { ParticleSystem, pairPoints, waypointFor, type MovementMode } from '../src/core/particles'
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
})

describe('waypointFor (two-phase modes only)', () => {
  const center: Vec2 = { x: 0, y: 0 }
  const rd: Vec2 = { x: 1, y: 0 } // randomDir stub

  it('explode waypoint sits outside the midpoint along mid-center', () => {
    // mid={5,0}, dir={1,0}, W={5+100,0}={105,0}
    const w = waypointFor('explode', { x: 0, y: 0 }, { x: 10, y: 0 }, center, 100, 50, rd, 1)
    expect(w.x).toBeCloseTo(105, 6)
    expect(w.y).toBeCloseTo(0, 6)
  })
  it('implode with large amount collapses to center', () => {
    const w = waypointFor('implode', { x: 6, y: 8 }, { x: 6, y: 8 }, center, 1000, 50, rd, 1)
    expect(w.x).toBeCloseTo(0, 6)
    expect(w.y).toBeCloseTo(0, 6)
  })
  it('gravity waypoint keeps mid.x and drops to floorY', () => {
    const w = waypointFor('gravity', { x: 4, y: 0 }, { x: 6, y: 0 }, center, 100, 478, rd, 1)
    expect(w.x).toBeCloseTo(5, 6)
    expect(w.y).toBeCloseTo(478, 6)
  })
  it('swirl waypoint is tangential to the radius (perpendicular to mid-center)', () => {
    // mid={5,0}, toMid={5,0}, tangent dir={0,1}; W={5, 0+100}={5,100}
    const w = waypointFor('swirl', { x: 0, y: 0 }, { x: 10, y: 0 }, center, 100, 50, rd, 1)
    expect(w.x).toBeCloseTo(5, 6)
    expect(w.y).toBeCloseTo(100, 6)
  })
  it('degenerate mid==center for explode uses randomDir (finite)', () => {
    // mid={0,0}=center -> dir falls back to rd {1,0}; W={0,0}+{100,0}={100,0}
    const w = waypointFor('explode', { x: 0, y: 0 }, { x: 0, y: 0 }, center, 100, 50, rd, 1)
    expect(Number.isFinite(w.x)).toBe(true)
    expect(Number.isFinite(w.y)).toBe(true)
    expect(w.x).toBeCloseTo(100, 6)
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
  it('t=0.5 sits at the explode waypoint {0,105}', () => {
    // mid={0,5}, dir=normalize({0,5})={0,1}, W={0,5+100}={0,105}
    const ps = new ParticleSystem(s, d, o)
    const p = ps.positionsAt(0.5)[0]
    expect(p.x).toBeCloseTo(0, 6)
    expect(p.y).toBeCloseTo(105, 6)
  })
  it('is continuous across the midpoint', () => {
    const ps = new ParticleSystem(s, d, o)
    const before = ps.positionsAt(0.4999)[0]
    const after = ps.positionsAt(0.5001)[0]
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThan(0.5)
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
})
