import type { EasingName } from '../core/easing'
import type { SequenceMode } from '../core/sequencer'
import type { MovementMode } from '../core/particles'

export const STAGE_WIDTH = 1280
export const STAGE_HEIGHT = 520

export interface Config {
  phrases: string[]
  mode: SequenceMode
  backgroundColor: string
  dotColor: string
  dotShape: 'square' | 'circle'
  dotSize: number        // stage px
  gridSpacing: number    // stage px (cell size; controls density)
  threshold: number      // 0-255 alpha cut-off
  fontFamily: string
  fontWeight: string
  fillRatio: number      // text height as fraction of stage height (0-1)
  transitionMs: number
  holdMs: number
  easing: EasingName
  scatterAmount: number  // stage px
  randomness: number     // 0-1
  movement: MovementMode
  seed: number
}

export const defaultConfig: Config = {
  phrases: ['灵感指南', 'AI时代的', 'Text Morph'],
  mode: 'sequence',
  backgroundColor: '#e2483d',
  dotColor: '#ffffff',
  dotShape: 'square',
  dotSize: 10,
  gridSpacing: 14,
  threshold: 128,
  fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
  fontWeight: '700',
  fillRatio: 0.62,
  transitionMs: 1400,
  holdMs: 1200,
  easing: 'easeInOutCubic',
  scatterAmount: 120,
  randomness: 0.6,
  movement: 'random',
  seed: 1,
}
