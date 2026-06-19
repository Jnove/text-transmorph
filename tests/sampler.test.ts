import { describe, it, expect } from 'vitest'
import { sampleWithRasterizer, type SampleOptions } from '../src/core/sampler'

const opts: SampleOptions = {
  width: 4,
  height: 4,
  cell: 2,
  threshold: 128,
  fontFamily: 'sans-serif',
  fontWeight: '700',
  fillRatio: 0.6,
}

describe('sampleWithRasterizer', () => {
  it('converts a fake raster into grid points', () => {
    const fake = () => {
      const alpha = new Uint8ClampedArray(16)
      alpha[1 * 4 + 1] = 255 // top-left cell centre
      return { alpha, width: 4, height: 4 }
    }
    expect(sampleWithRasterizer('x', opts, fake)).toEqual([{ x: 1, y: 1 }])
  })

  it('returns no points for an empty raster', () => {
    const fake = () => ({ alpha: new Uint8ClampedArray(16), width: 4, height: 4 })
    expect(sampleWithRasterizer('', opts, fake)).toEqual([])
  })
})
