import { describe, expect, it, vi } from 'vitest'
import { drawStage } from '../src/render/renderer'
import type { Vec2 } from '../src/core/types'

const style = {
  backgroundColor: '#000000',
  dotColor: '#ffffff',
  dotColor2: '#ffffff',
  gradient: false,
  dotShape: 'circle' as const,
  dotSize: 4,
}

function fakeContext() {
  return {
    fillStyle: '',
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
  } as unknown as CanvasRenderingContext2D
}

describe('drawStage', () => {
  it('keeps dense circle paths bounded', () => {
    const ctx = fakeContext()
    const points: Vec2[] = Array.from({ length: 1025 }, (_, i) => ({ x: i, y: 0 }))

    drawStage(ctx, 1200, 520, points, style)

    expect(ctx.beginPath).toHaveBeenCalledTimes(3)
    expect(ctx.fill).toHaveBeenCalledTimes(3)
    expect(ctx.moveTo).toHaveBeenCalledTimes(points.length)
    expect(ctx.arc).toHaveBeenCalledTimes(points.length)
  })

  it('accepts fractional particle sizes', () => {
    const ctx = fakeContext()

    drawStage(ctx, 100, 100, [{ x: 10, y: 10 }], { ...style, dotSize: 0.5 })

    expect(ctx.arc).toHaveBeenCalledWith(10, 10, 0.25, 0, Math.PI * 2)
  })
})
