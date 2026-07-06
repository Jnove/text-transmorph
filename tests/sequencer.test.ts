import { describe, it, expect } from 'vitest'
import { sequenceState, cycleDuration } from '../src/core/sequencer'

const HOLD = 1000
const TRANS = 500

describe('cycleDuration', () => {
  it('is count * (hold + transition)', () => {
    expect(cycleDuration(3, HOLD, TRANS)).toBe(3 * 1500)
  })
})

describe('sequenceState (sequence mode)', () => {
  it('holds on phrase 0 at the start', () => {
    const s = sequenceState(0, 3, HOLD, TRANS, 'sequence')
    expect(s).toEqual({ fromIndex: 0, toIndex: 1, progress: 0, phase: 'hold', holdT: 0 })
  })
  it('tracks 0→1 progress inside the hold window', () => {
    expect(sequenceState(HOLD * 0.25, 3, HOLD, TRANS, 'sequence').holdT).toBeCloseTo(0.25, 6)
    expect(sequenceState(HOLD * 0.75, 3, HOLD, TRANS, 'sequence').holdT).toBeCloseTo(0.75, 6)
  })
  it('enters transition after the hold window', () => {
    const s = sequenceState(HOLD + TRANS / 2, 3, HOLD, TRANS, 'sequence')
    expect(s.phase).toBe('transition')
    expect(s.fromIndex).toBe(0)
    expect(s.toIndex).toBe(1)
    expect(s.progress).toBeCloseTo(0.5, 6)
    expect(s.holdT).toBe(0) // idle shimmer must be inert during transitions
  })
  it('advances to the next phrase in the next unit', () => {
    const s = sequenceState(1500, 3, HOLD, TRANS, 'sequence')
    expect(s.fromIndex).toBe(1)
    expect(s.toIndex).toBe(2)
  })
  it('wraps the final phrase back to the first', () => {
    const s = sequenceState(2 * 1500 + HOLD + 1, 3, HOLD, TRANS, 'sequence')
    expect(s.fromIndex).toBe(2)
    expect(s.toIndex).toBe(0)
  })
  it('loops after a full cycle', () => {
    const dur = cycleDuration(3, HOLD, TRANS)
    expect(sequenceState(dur, 3, HOLD, TRANS, 'sequence')).toEqual(
      sequenceState(0, 3, HOLD, TRANS, 'sequence'),
    )
  })
})

describe('sequenceState (breathe mode)', () => {
  it('keeps toIndex equal to fromIndex', () => {
    const s = sequenceState(HOLD + TRANS / 2, 2, HOLD, TRANS, 'breathe')
    expect(s.fromIndex).toBe(0)
    expect(s.toIndex).toBe(0)
    expect(s.phase).toBe('transition')
  })
})
