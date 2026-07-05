import type { EasingName } from '../core/easing'
import type { SequenceMode } from '../core/sequencer'
import type { MovementMode } from '../core/particles'

export const STAGE_WIDTH = 1280
export const STAGE_HEIGHT = 520

/** Selectable output canvas sizes (label + pixel dimensions). */
export const STAGE_PRESETS = [
  { value: 'wide', label: '宽幅 · 1280×520', width: 1280, height: 520 },
  { value: 'landscape', label: '横屏 16:9 · 1280×720', width: 1280, height: 720 },
  { value: 'square', label: '方形 1:1 · 1080×1080', width: 1080, height: 1080 },
  { value: 'portrait', label: '竖屏 9:16 · 720×1280', width: 720, height: 1280 },
] as const

export interface Config {
  phrases: string[]
  mode: SequenceMode
  stageWidth: number
  stageHeight: number
  backgroundColor: string
  dotColor: string
  dotColor2: string      // second stop when gradient is on
  gradient: boolean      // colour dots left→right across the two stops
  dotShape: 'square' | 'circle'
  dotSize: number        // stage px
  gridSpacing: number    // stage px (cell size; controls density)
  fontFamily: string
  fontWeight: string
  fillRatio: number      // text height as fraction of stage height (0-1)
  transitionMs: number
  holdMs: number
  easing: EasingName
  scatterAmount: number  // stage px — dispersal distance to the waypoint
  randomness: number     // 0-1
  stagger: number        // 0-0.6 — per-particle start-time spread (wave feel)
  idleFloat: number      // stage px — resting-text shimmer amplitude during hold
  movement: MovementMode
  seed: number
  fileName: string
}

export const defaultConfig: Config = {
  phrases: ['Transmorph', '文字解离重组动画'],
  mode: 'sequence',
  stageWidth: STAGE_WIDTH,
  stageHeight: STAGE_HEIGHT,
  backgroundColor: '#e2483d',
  dotColor: '#ffffff',
  dotColor2: '#ffd34e',
  gradient: false,
  dotShape: 'square',
  dotSize: 10,
  gridSpacing: 14,
  fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
  fontWeight: '700',
  fillRatio: 0.62,
  transitionMs: 1400,
  holdMs: 1200,
  easing: 'easeInOutCubic',
  scatterAmount: 280,
  randomness: 0.6,
  stagger: 0.12,
  idleFloat: 1.5,
  movement: 'random',
  seed: 1,
  fileName: 'transmorph',
}
