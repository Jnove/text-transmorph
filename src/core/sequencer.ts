export type SequenceMode = 'sequence' | 'breathe'

export type SegmentState = {
  fromIndex: number
  toIndex: number
  progress: number
  phase: 'hold' | 'transition'
  /** 0→1 position inside the hold window (0 during transition). Lets effects
   *  that only run while resting (idle shimmer) fade in/out at the hold edges
   *  so they hand off seamlessly to the surrounding transitions. */
  holdT: number
}

export function cycleDuration(
  count: number,
  holdMs: number,
  transitionMs: number,
): number {
  return count * (holdMs + transitionMs)
}

export function sequenceState(
  elapsedMs: number,
  count: number,
  holdMs: number,
  transitionMs: number,
  mode: SequenceMode,
): SegmentState {
  const unit = holdMs + transitionMs
  const total = count * unit
  const local = ((elapsedMs % total) + total) % total
  const seg = Math.floor(local / unit)
  const within = local - seg * unit
  const fromIndex = seg
  const toIndex = mode === 'sequence' ? (seg + 1) % count : seg
  if (within < holdMs) {
    return { fromIndex, toIndex, progress: 0, phase: 'hold', holdT: within / holdMs }
  }
  return {
    fromIndex,
    toIndex,
    progress: (within - holdMs) / transitionMs,
    phase: 'transition',
    holdT: 0,
  }
}
