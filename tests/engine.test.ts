import { describe, it, expect, vi } from 'vitest'
import { Engine } from '../src/core/engine'
import type { RasterizeFn } from '../src/core/sampler'
import { defaultConfig } from '../src/config/types'

/** Minimal Canvas 2D context stub — enough to exercise drawStage. */
function fakeCtx() {
  const calls: string[] = []
  const ctx = {
    fillStyle: '',
    fillRect: () => calls.push('fillRect'),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    beginPath: () => calls.push('beginPath'),
    moveTo: () => {},
    arc: () => {},
    fill: () => calls.push('fill'),
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls }
}

/** A headless rasterizer: every pixel opaque → a dense dot grid at cell size. */
const rasterize: RasterizeFn = (_text, opts) => {
  const alpha = new Uint8ClampedArray(opts.width * opts.height)
  alpha.fill(255)
  return { alpha, width: opts.width, height: opts.height }
}

describe('Engine', () => {
  it('renders a frame without touching the DOM', () => {
    const { ctx, calls } = fakeCtx()
    const engine = new Engine({ ctx, config: { phrases: ['A', 'B'], gridSpacing: 8 }, rasterize })
    expect(() => engine.renderAt(0)).not.toThrow()
    // Square dots draw with fillRect (the default shape), then a circle shape
    // exercises the batched arc path + fill.
    expect(calls.filter((c) => c === 'fillRect').length).toBeGreaterThan(1)
    engine.setConfig({ dotShape: 'circle' })
    expect(() => engine.renderAt(0)).not.toThrow()
    expect(calls).toContain('fill')
  })

  it('honours custom dimensions and reports them via onResize', () => {
    const onResize = vi.fn()
    const engine = new Engine({
      ctx: fakeCtx().ctx,
      config: { stageWidth: 320, stageHeight: 180, phrases: ['X'] },
      rasterize,
      onResize,
    })
    const c = engine.getConfig()
    expect(c.stageWidth).toBe(320)
    engine.setConfig({ stageWidth: 640, stageHeight: 360 })
    expect(onResize).toHaveBeenCalledWith(640, 360)
    expect(engine.getConfig().stageWidth).toBe(640)
  })

  it('re-rasterizes on structural changes, not on motion changes', () => {
    const spy = vi.fn(rasterize)
    const engine = new Engine({
      ctx: fakeCtx().ctx,
      config: { phrases: ['A'] },
      rasterize: spy,
    })
    const before = spy.mock.calls.length
    engine.setConfig({ gridSpacing: 6 })       // structural → resample
    expect(spy.mock.calls.length).toBeGreaterThan(before)
    const afterResample = spy.mock.calls.length
    engine.setConfig({ scatterAmount: 500 })   // motion-only → no rasterize
    expect(spy.mock.calls.length).toBe(afterResample)
    engine.setConfig({ movement: 'swirl' })    // motion-only → no rasterize
    expect(spy.mock.calls.length).toBe(afterResample)
  })

  it('re-samples when phrases change and the loop length follows', () => {
    const engine = new Engine({ ctx: fakeCtx().ctx, config: { phrases: ['A', 'B'], holdMs: 500, transitionMs: 500 }, rasterize })
    expect(engine.durationMs()).toBe(2000) // 2 phrases × (500 + 500)
    engine.setConfig({ phrases: ['A', 'B', 'C'] })
    expect(engine.durationMs()).toBe(3000)
  })

  it('notifies subscribers on config changes', () => {
    const engine = new Engine({ ctx: fakeCtx().ctx, rasterize })
    const fn = vi.fn()
    engine.subscribe(fn)
    engine.setConfig({ dotColor: '#000000' })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('keeps defaults when no config is given', () => {
    const engine = new Engine({ ctx: fakeCtx().ctx, rasterize })
    const c = engine.getConfig()
    expect(c.phrases).toEqual(defaultConfig.phrases)
    expect(c.dotSize).toBe(defaultConfig.dotSize)
  })
})
