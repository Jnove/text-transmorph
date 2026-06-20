import { describe, it, expect } from 'vitest'
import { ParticleSystem, type MovementMode } from '../src/core/particles'
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

describe('ParticleSystem movement modes', () => {
  const src: Vec2[] = [{ x: 10, y: 0 }]
  const dst: Vec2[] = [{ x: 0, y: 10 }]
  const base = {
    seed: 1, scatterAmount: 100, randomness: 0,
    ease: (t: number) => t,
    center: { x: 0, y: 0 },
  }
  const make = (movement: MovementMode) =>
    new ParticleSystem(src, dst, { ...base, movement })

  // straight midpoint (no scatter) is lerp(src,dst,0.5) = {5,5}
  it('morph has zero scatter — midpoint equals the straight lerp', () => {
    const p = make('morph').positionsAt(0.5)[0]
    expect(p.x).toBeCloseTo(5, 6)
    expect(p.y).toBeCloseTo(5, 6)
  })

  it('explode pushes outward from center (src-center direction)', () => {
    // src-center = {10,0} -> dir {1,0}; offset = {100,0}; pos = {5+100, 5}
    const p = make('explode').positionsAt(0.5)[0]
    expect(p.x).toBeCloseTo(105, 4)
    expect(p.y).toBeCloseTo(5, 4)
  })

  it('implode pushes toward center', () => {
    // dir {-1,0}; offset {-100,0}; pos {5-100, 5}
    const p = make('implode').positionsAt(0.5)[0]
    expect(p.x).toBeCloseTo(-95, 4)
    expect(p.y).toBeCloseTo(5, 4)
  })

  it('sweepLeft offsets along -x only', () => {
    const p = make('sweepLeft').positionsAt(0.5)[0]
    expect(p.x).toBeCloseTo(-95, 4) // 5 + (-100)
    expect(p.y).toBeCloseTo(5, 4)
  })

  it('swirl offset is perpendicular to the radial vector', () => {
    // radial = src-center = {10,0}; offset must be ~ along y -> dot ~ 0
    const p = make('swirl').positionsAt(0.5)[0]
    const offset = { x: p.x - 5, y: p.y - 5 }
    const dot = offset.x * 10 + offset.y * 0
    expect(Math.abs(dot)).toBeLessThan(1e-3)
    expect(Math.hypot(offset.x, offset.y)).toBeGreaterThan(50)
  })

  it('gravity offsets downward (+y)', () => {
    const p = make('gravity').positionsAt(0.5)[0]
    expect(p.y).toBeGreaterThan(5)
    expect(p.x).toBeCloseTo(5, 4)
  })

  it('degenerate src==center falls back to a finite random direction', () => {
    const ps = new ParticleSystem(
      [{ x: 0, y: 0 }], [{ x: 0, y: 0 }],
      { ...base, movement: 'explode' },
    )
    const p = ps.positionsAt(0.5)[0]
    expect(Number.isFinite(p.x)).toBe(true)
    expect(Number.isFinite(p.y)).toBe(true)
  })

  it('omitting movement still behaves as random (back-compat)', () => {
    const withDefault = new ParticleSystem(src, dst, base).positionsAt(0.5)[0]
    const explicit = make('random').positionsAt(0.5)[0]
    expect(withDefault).toEqual(explicit)
  })
})
