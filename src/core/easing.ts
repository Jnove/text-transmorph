export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export type EasingName =
  | 'linear'
  | 'easeInOutCubic'
  | 'easeOutCubic'
  | 'easeInOutQuad'

export const easings: Record<EasingName, (t: number) => number> = {
  linear: (t) => t,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeInOutQuad: (t) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
}

/** Bell-shaped envelope: 0 at t=0 and t=1, peaks at 1 when t=0.5. */
export function scatterEnvelope(t: number): number {
  return 4 * t * (1 - t)
}
