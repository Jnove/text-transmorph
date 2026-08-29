import { describe, it, expect } from 'vitest'
import { gridDimensions, pointsFromAlpha } from '../src/core/grid'

describe('gridDimensions', () => {
  it('counts whole cells and centres them', () => {
    const d = gridDimensions(10, 6, 2)
    expect(d.cols).toBe(5)
    expect(d.rows).toBe(3)
    expect(d.offsetX).toBe(0)
    expect(d.offsetY).toBe(0)
  })
  it('offsets when cells do not fill the canvas', () => {
    const d = gridDimensions(11, 6, 2) // 5 cells = 10px, 1px remainder
    expect(d.cols).toBe(5)
    expect(d.offsetX).toBeCloseTo(0.5)
  })

  it('supports subpixel sampling cells', () => {
    const d = gridDimensions(4, 2, 0.5)
    expect(d.cols).toBe(8)
    expect(d.rows).toBe(4)
    expect(d.offsetX).toBe(0)
    expect(d.offsetY).toBe(0)
  })
})

describe('pointsFromAlpha', () => {
  it('emits a point only where the cell-centre alpha clears the threshold', () => {
    // 4x4, cell=2 -> 2x2 grid; centres at pixel (1,1),(3,1),(1,3),(3,3)
    const w = 4, h = 4
    const alpha = new Uint8ClampedArray(w * h) // all 0
    alpha[1 * w + 1] = 255 // top-left cell centre lit
    const pts = pointsFromAlpha(alpha, w, h, 2, 128)
    expect(pts).toEqual([{ x: 1, y: 1 }])
  })

  it('emits nothing for a blank field', () => {
    const alpha = new Uint8ClampedArray(16)
    expect(pointsFromAlpha(alpha, 4, 4, 2, 128)).toEqual([])
  })

  it('deduplicates raster pixels for subpixel cells', () => {
    const alpha = new Uint8ClampedArray([255, 0])
    expect(pointsFromAlpha(alpha, 2, 1, 0.5, 128)).toEqual([{ x: 0.5, y: 0.5 }])
  })
})
