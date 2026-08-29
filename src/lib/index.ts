/**
 * text-transmorph — embeddable text-to-dots morph animation.
 *
 * Framework-agnostic: point it at any <canvas> (or any Canvas 2D context via
 * the lower-level Engine) and drive it with options; it renders the dot-morph
 * timeline itself.
 *
 *   import { createTextTransmorph } from 'text-transmorph'
 *
 *   const tm = createTextTransmorph(canvas, {
 *     phrases: ['文字解离', '重组动画'],
 *     movement: 'explode',
 *   })
 */
export { Transmorph, transmorphDefaults } from './transmorph'
export type { TransmorphOptions, TransmorphConfig } from './transmorph'
import { Transmorph } from './transmorph'
export { PlaybackClock } from './playback'
export type { ClockOptions } from './playback'
export { Engine } from '../core/engine'
export type { EngineOptions } from '../core/engine'
export { defaultConfig, STAGE_PRESETS } from '../config/types'
export type { Config } from '../config/types'
export { createStore } from '../config/store'
export type { Store } from '../config/store'
export { sampleText, sampleWithRasterizer, rasterizeCanvas, splitLines, ALPHA_THRESHOLD } from '../core/sampler'
export type { SampleOptions, RasterizeFn } from '../core/sampler'
export { ParticleSystem, pairPoints, waypointFor } from '../core/particles'
export type { MovementMode, ParticleSystemOptions } from '../core/particles'
export { easings } from '../core/easing'
export type { EasingName } from '../core/easing'
export { sequenceState, cycleDuration } from '../core/sequencer'
export type { SequenceMode, SegmentState } from '../core/sequencer'
export { mulberry32 } from '../core/rng'
export { drawStage, blitFit } from '../render/renderer'
export type { DrawStyle } from '../render/renderer'
export type { Vec2 } from '../core/types'

/** Convenience factory. */
export function createTextTransmorph(
  target: HTMLCanvasElement,
  options?: ConstructorParameters<typeof Transmorph>[1],
): Transmorph {
  return new Transmorph(target, options)
}
