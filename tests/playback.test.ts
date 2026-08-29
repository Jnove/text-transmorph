import { describe, it, expect } from 'vitest'
import { PlaybackClock } from '../src/lib/playback'

describe('PlaybackClock', () => {
  it('starts at zero and accumulates wall-clock deltas while playing', () => {
    const c = new PlaybackClock()
    c.play()
    expect(c.tick(100)).toBe(0)
    expect(c.tick(100)).toBe(0)
    expect(c.tick(140)).toBe(40)
    expect(c.tick(200)).toBe(100)
  })

  it('holds its value while paused and resumes from there', () => {
    const c = new PlaybackClock()
    c.play()
    c.tick(100)
    c.tick(160)
    c.pause()
    expect(c.tick(999)).toBe(60)
    c.play()
    expect(c.tick(999)).toBe(60) // resume tick re-bases without advancing
    expect(c.tick(1020)).toBe(81)
    expect(c.tick(1070)).toBe(131)
  })

  it('reset rewinds to zero', () => {
    const c = new PlaybackClock()
    c.play()
    c.tick(0)
    c.tick(500)
    c.reset()
    expect(c.tick(600)).toBe(0)
  })

  it('reduced motion freezes at zero', () => {
    const c = new PlaybackClock({ reducedMotion: true })
    c.play()
    expect(c.tick(123)).toBe(0)
    c.setReducedMotion(false)
    c.play()
    c.tick(100)
    c.tick(200)
    expect(c.elapsedMs).toBe(100)
    c.setReducedMotion(true)
    expect(c.elapsedMs).toBe(0)
  })

  it('loops by default', () => {
    const c = new PlaybackClock({ durationMs: 1000 })
    c.play()
    c.tick(0)
    c.tick(600)
    c.tick(1400)
    expect(c.tick(1500)).toBe(500)
  })

  it('single-shot clamps at the duration and stops', () => {
    const c = new PlaybackClock({ durationMs: 1000, loop: false })
    c.play()
    c.tick(0)
    c.tick(600)
    expect(c.isPlaying).toBe(true)
    expect(c.tick(1600)).toBe(1000)
    expect(c.isPlaying).toBe(false)
    expect(c.tick(99999)).toBe(1000)
  })

  it('setDuration + setLoop retune a running clock', () => {
    const c = new PlaybackClock({ durationMs: 1000 })
    c.play()
    c.tick(0)
    c.tick(500)
    c.setDuration(2000)
    c.setLoop(false)
    expect(c.tick(2500)).toBe(2000) // clamped to the new duration
    expect(c.isPlaying).toBe(false)
  })
})
