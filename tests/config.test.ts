import { describe, it, expect, vi } from 'vitest'
import { createStore } from '../src/config/store'
import { defaultConfig } from '../src/config/types'

describe('config store', () => {
  it('returns the initial config', () => {
    const s = createStore(defaultConfig)
    expect(s.get()).toEqual(defaultConfig)
  })
  it('merges patches', () => {
    const s = createStore(defaultConfig)
    s.set({ dotShape: 'circle' })
    expect(s.get().dotShape).toBe('circle')
    expect(s.get().phrases).toEqual(defaultConfig.phrases)
  })
  it('notifies subscribers on change', () => {
    const s = createStore(defaultConfig)
    const fn = vi.fn()
    s.subscribe(fn)
    s.set({ holdMs: 999 })
    expect(fn).toHaveBeenCalledOnce()
    expect(fn.mock.calls[0][0].holdMs).toBe(999)
  })
  it('stops notifying after unsubscribe', () => {
    const s = createStore(defaultConfig)
    const fn = vi.fn()
    const off = s.subscribe(fn)
    off()
    s.set({ holdMs: 1 })
    expect(fn).not.toHaveBeenCalled()
  })
})
