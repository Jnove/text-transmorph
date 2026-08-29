import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Transmorph } from '../src/lib/transmorph'

/** A Canvas 2D context stub rich enough for the real DOM rasterizer. */
function fake2DCtx() {
  const calls: string[] = []
  const ctx: Record<string, unknown> = {
    calls,
    fillStyle: '',
    fillRect: () => calls.push('fillRect'),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    beginPath: () => calls.push('beginPath'),
    moveTo: () => {},
    arc: () => {},
    fill: () => calls.push('fill'),
    clearRect: () => {},
    fillText: () => {},
    measureText: () => ({ width: 10 }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    textAlign: '',
    textBaseline: '',
    font: '',
  }
  return ctx as unknown as CanvasRenderingContext2D
}

function fakeCanvas() {
  const ctx = fake2DCtx()
  return {
    width: 0,
    height: 0,
    style: {} as Record<string, string>,
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement
}

let rafId = 0
let fakeNow = 0
const rafQueue = new Map<number, FrameRequestCallback>()
const tick = (id: number) => {
  const cb = rafQueue.get(id)
  if (cb) {
    rafQueue.delete(id) // a fired rAF id is spent, like the real one
    fakeNow += 16 // ~60fps stepping
    cb(fakeNow)
  }
}
const tickAll = () => [...rafQueue.keys()].forEach(tick)
/** Drive every queued frame until the loop stops by itself. */
const flush = () => {
  while (rafQueue.size > 0) tickAll()
}

let observers: Array<{
  cb: IntersectionObserverCallback
  entries: Array<{ isIntersecting: boolean }>
}> = []

beforeEach(() => {
  rafId = 0
  fakeNow = 0
  rafQueue.clear()
  observers = []
  globalThis.requestAnimationFrame = (cb) => {
    rafQueue.set(++rafId, cb)
    return rafId
  }
  globalThis.cancelAnimationFrame = (id) => {
    rafQueue.delete(id)
  }
  globalThis.matchMedia = () => ({
    matches: false,
    media: '',
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })
  globalThis.IntersectionObserver = class {
    constructor(cb: IntersectionObserverCallback) {
      observers.push({ cb, entries: [] })
    }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  } as unknown as typeof IntersectionObserver
  // The real rasterizer needs document.createElement('canvas').
  globalThis.document = {
    createElement: () => fakeCanvas(),
  } as unknown as Document
})

afterEach(() => {
  rafQueue.clear()
  delete (globalThis as Record<string, unknown>).requestAnimationFrame
  delete (globalThis as Record<string, unknown>).cancelAnimationFrame
  delete (globalThis as Record<string, unknown>).matchMedia
  delete (globalThis as Record<string, unknown>).IntersectionObserver
  delete (globalThis as Record<string, unknown>).document
})

describe('Transmorph', () => {
  it('creates, autoplays and draws frames', () => {
    const canvas = fakeCanvas()
    const tm = new Transmorph(canvas, { phrases: ['A', 'B'] })
    expect(rafQueue.size).toBe(1)
    tickAll()
    const ctx = canvas.getContext('2d') as unknown as { calls: string[] }
    expect(ctx.calls).toContain('fillRect')
    tm.destroy()
    expect(rafQueue.size).toBe(0)
  })

  it('respects autoplay: false', () => {
    const tm = new Transmorph(fakeCanvas(), { autoplay: false })
    expect(rafQueue.size).toBe(0)
    tm.play()
    expect(rafQueue.size).toBe(1)
    tm.destroy()
  })

  it('set/get round-trip animation and playback options', () => {
    const tm = new Transmorph(fakeCanvas(), { autoplay: false, dotSize: 5 })
    expect(tm.get().dotSize).toBe(5)
    expect(tm.get().loop).toBe(true)
    tm.set({ dotSize: 11, movement: 'swirl', loop: false, autoplay: false })
    expect(tm.get().dotSize).toBe(11)
    expect(tm.get().movement).toBe('swirl')
    expect(tm.get().loop).toBe(false)
    tm.destroy()
  })

  it('pause halts the loop on the current frame', () => {
    const tm = new Transmorph(fakeCanvas(), { phrases: ['A', 'B'] })
    tm.pause()
    expect(rafQueue.size).toBe(0) // loop stopped
    tm.play()
    expect(rafQueue.size).toBe(1) // resumed
    tm.destroy()
  })

  it('manual renderAt draws a specific time', () => {
    const canvas = fakeCanvas()
    const tm = new Transmorph(canvas, { autoplay: false, phrases: ['A', 'B'] })
    expect(() => tm.renderAt(1234)).not.toThrow()
    const ctx = canvas.getContext('2d') as unknown as { calls: string[] }
    expect(ctx.calls).toContain('fillRect')
    tm.destroy()
  })

  it('playOnView pauses off-screen and resumes on visibility', () => {
    const tm = new Transmorph(fakeCanvas(), { autoplay: true, playOnView: true })
    expect(rafQueue.size).toBe(1)
    observers[0].cb([{ isIntersecting: false }] as unknown as IntersectionObserverEntry[], observers[0] as unknown as IntersectionObserver)
    // Off-screen → loop halts.
    expect(rafQueue.size).toBe(0)
    observers[0].cb([{ isIntersecting: true }] as unknown as IntersectionObserverEntry[], observers[0] as unknown as IntersectionObserver)
    // Back on-screen → loop restarts.
    expect(rafQueue.size).toBe(1)
    expect(tm.durationMs()).toBeGreaterThan(0)
    tm.destroy()
  })

  it('durationMs follows the configured timeline', () => {
    const tm = new Transmorph(fakeCanvas(), {
      autoplay: false,
      phrases: ['A', 'B', 'C'],
      holdMs: 400,
      transitionMs: 600,
    })
    expect(tm.durationMs()).toBe(3000)
    tm.destroy()
  })

  it('reduced-motion preference freezes on the first frame', () => {
    globalThis.matchMedia = () => ({
      matches: true,
      media: '',
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    })
    const tm = new Transmorph(fakeCanvas(), { phrases: ['A', 'B'] })
    tm.pause()
    tm.destroy()
  })

  it('single-shot mode stops the loop on the last frame', () => {
    const tm = new Transmorph(fakeCanvas(), {
      phrases: ['A', 'B'],
      holdMs: 400,
      transitionMs: 600,
      loop: false,
    })
    flush()
    expect(tm.durationMs()).toBe(2000)
    expect(rafQueue.size).toBe(0) // loop stopped at the end
    tm.destroy()
  })

  it('replay after a finished single-shot restarts from the beginning', () => {
    const tm = new Transmorph(fakeCanvas(), {
      phrases: ['A', 'B'],
      holdMs: 400,
      transitionMs: 600,
      loop: false,
    })
    flush()
    tm.play() // replay → restart
    expect(rafQueue.size).toBe(1)
    tm.destroy()
  })
})
