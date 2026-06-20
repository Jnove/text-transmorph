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
  it('verticalCross pairs by x-rank (x ascending on both sides)', () => {
    const a: Vec2[] = [{ x: 30, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }]
    const b: Vec2[] = [{ x: 25, y: 9 }, { x: 5, y: 9 }, { x: 15, y: 9 }]
    const { src, dst } = pairPoints(a, b, 'verticalCross')
    expect(src.map((p) => p.x)).toEqual([10, 20, 30])
    expect(dst.map((p) => p.x)).toEqual([5, 15, 25])
  })
  it('horizontalCross pairs by y-rank', () => {
    const a: Vec2[] = [{ x: 0, y: 30 }, { x: 0, y: 10 }, { x: 0, y: 20 }]
    const b: Vec2[] = [{ x: 9, y: 25 }, { x: 9, y: 5 }, { x: 9, y: 15 }]
    const { src, dst } = pairPoints(a, b, 'horizontalCross')
    expect(src.map((p) => p.y)).toEqual([10, 20, 30])
    expect(dst.map((p) => p.y)).toEqual([5, 15, 25])
  })
  it('wraps the shorter set to max length', () => {
    const { src, dst } = pairPoints([{ x: 1, y: 1 }], [{ x: 0, y: 0 }, { x: 2, y: 0 }], 'morph')
    expect(src.length).toBe(2)
    expect(dst.length).toBe(2)
    expect(src[0]).toEqual(src[1])
  })
})

describe('waypointFor', () => {
  const center: Vec2 = { x: 0, y: 0 }
  const rd: Vec2 = { x: 1, y: 0 } // randomDir stub

  it('morph waypoint is the straight midpoint', () => {
    expect(waypointFor('morph', { x: 0, y: 0 }, { x: 10, y: 10 }, center, 100, 50, rd, 1))
      .toEqual({ x: 5, y: 5 })
  })
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
  it('verticalCross mirrors y across center.y, keeps mid.x', () => {
    const c: Vec2 = { x: 0, y: 100 } // mid={5,20} -> W={5, 200-20}={5,180}
    const w = waypointFor('verticalCross', { x: 0, y: 10 }, { x: 10, y: 30 }, c, 100, 50, rd, 1)
    expect(w.x).toBeCloseTo(5, 6)
    expect(w.y).toBeCloseTo(180, 6)
  })
  it('horizontalCross mirrors x across center.x, keeps mid.y', () => {
    const c: Vec2 = { x: 100, y: 0 } // mid={20,5} -> W={200-20,5}={180,5}
    const w = waypointFor('horizontalCross', { x: 10, y: 0 }, { x: 30, y: 10 }, c, 100, 50, rd, 1)
    expect(w.x).toBeCloseTo(180, 6)
    expect(w.y).toBeCloseTo(5, 6)
  })
  it('degenerate mid==center for explode uses randomDir (finite)', () => {
    // mid={0,0}=center -> dir falls back to rd {1,0}; W={0,0}+{100,0}={100,0}
    const w = waypointFor('explode', { x: 0, y: 0 }, { x: 0, y: 0 }, center, 100, 50, rd, 1)
    expect(Number.isFinite(w.x)).toBe(true)
    expect(Number.isFinite(w.y)).toBe(true)
    expect(w.x).toBeCloseTo(100, 6)
  })
})

describe('ParticleSystem two-phase', () => {
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
  it('morph midpoint equals the straight lerp', () => {
    const ps = new ParticleSystem(s, d, { ...o, movement: 'morph' })
    const p = ps.positionsAt(0.5)[0]
    expect(p.x).toBeCloseTo(0, 6)
    expect(p.y).toBeCloseTo(5, 6)
  })
})
