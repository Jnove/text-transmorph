import { describe, it, expect } from 'vitest'
import { lerp, easings, scatterEnvelope } from '../src/core/easing'

describe('lerp', () => {
  it('interpolates endpoints and midpoint', () => {
    expect(lerp(0, 10, 0)).toBe(0)
    expect(lerp(0, 10, 1)).toBe(10)
    expect(lerp(0, 10, 0.5)).toBe(5)
  })
})

describe('easings', () => {
  it('all map 0->0 and 1->1', () => {
    for (const fn of Object.values(easings)) {
      expect(fn(0)).toBeCloseTo(0, 6)
      expect(fn(1)).toBeCloseTo(1, 6)
    }
  })
  it('easeInOutCubic is symmetric around 0.5', () => {
    expect(easings.easeInOutCubic(0.5)).toBeCloseTo(0.5, 6)
  })
})

describe('scatterEnvelope', () => {
  it('is 0 at the endpoints and 1 at the middle', () => {
    expect(scatterEnvelope(0)).toBeCloseTo(0, 6)
    expect(scatterEnvelope(1)).toBeCloseTo(0, 6)
    expect(scatterEnvelope(0.5)).toBeCloseTo(1, 6)
  })
})
