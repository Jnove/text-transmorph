export type ClockOptions = {
  /** Loop the timeline forever (default true). */
  loop?: boolean
  /** Timeline length in ms — end of the loop / hard stop. */
  durationMs?: number
  /** Freeze at elapsed 0 (reduced-motion mode). */
  reducedMotion?: boolean
}

/**
 * Time base for driving the engine. Pure logic — no DOM, no rAF: the host
 * calls tick(now) once per animation frame with its own timestamp source.
 *
 * - playing: elapsed accumulates from the last tick
 * - paused: elapsed stays put
 * - reduced-motion: always 0 (the static first phrase)
 * - non-looping with a duration: clamps and stops at the end
 */
export class PlaybackClock {
  private elapsed = 0
  private last = -1
  private playing = false
  private loop: boolean
  private duration: number
  private frozen: boolean

  constructor(options?: ClockOptions) {
    this.loop = options?.loop ?? true
    this.duration = options?.durationMs ?? Infinity
    this.frozen = options?.reducedMotion ?? false
  }

  /** Start (or resume) advancing. A resume continues from the paused point. */
  play(): void {
    this.playing = true
    this.last = -1
    if (this.frozen) this.elapsed = 0
  }

  /** Stop advancing; elapsed holds its value. */
  pause(): void {
    this.playing = false
    this.last = -1
  }

  /** Rewind to the start. */
  reset(): void {
    this.elapsed = 0
    this.last = -1
  }

  setLoop(loop: boolean): void {
    this.loop = loop
  }

  setDuration(durationMs: number): void {
    this.duration = durationMs
  }

  /** true freezes at elapsed 0 (static first frame); false resumes. */
  setReducedMotion(frozen: boolean): void {
    this.frozen = frozen
    if (frozen) this.elapsed = 0
  }

  get isPlaying(): boolean {
    return this.playing
  }

  get elapsedMs(): number {
    return this.frozen ? 0 : this.elapsed
  }

  /** Advance by the wall-clock delta since the previous tick and return the
   *  current elapsed time in ms. */
  tick(now: number): number {
    if (this.frozen) return 0
    if (!this.playing) return this.elapsed
    if (this.last < 0) this.last = now
    this.elapsed += now - this.last
    this.last = now
    if (this.duration !== Infinity) {
      if (this.loop) {
        this.elapsed %= this.duration
      } else if (this.elapsed >= this.duration) {
        this.elapsed = this.duration
        this.playing = false
      }
    }
    return this.elapsed
  }
}
