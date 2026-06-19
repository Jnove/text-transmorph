import { describe, it, expect } from 'vitest'
import { ParticleSystem } from '../src/core/particles'
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
