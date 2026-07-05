import type { Vec2 } from './types'
import { pointsFromAlpha } from './grid'

/** Alpha cut-off for turning rasterized text into dots. Text is drawn opaque
 *  white, so anything above half-coverage counts as "inside the glyph". */
export const ALPHA_THRESHOLD = 128

export type SampleOptions = {
  width: number
  height: number
  cell: number
  threshold: number
  fontFamily: string
  fontWeight: string
  fillRatio: number
}

export type RasterizeFn = (
  text: string,
  opts: SampleOptions,
) => { alpha: Uint8ClampedArray; width: number; height: number }

export function sampleWithRasterizer(
  text: string,
  opts: SampleOptions,
  rasterize: RasterizeFn,
): Vec2[] {
  if (!splitLines(text).length) return []
  const { alpha, width, height } = rasterize(text, opts)
  return pointsFromAlpha(alpha, width, height, opts.cell, opts.threshold)
}

/** Split a phrase into stacked lines on the `|` separator (trimmed, blanks
 *  dropped). A phrase with no `|` is a single line — unchanged behaviour. */
export function splitLines(text: string): string[] {
  return text.split('|').map((s) => s.trim()).filter(Boolean)
}

/** Vertical spacing between baselines as a multiple of the font size. */
const LINE_GAP = 1.18

/** Real DOM rasterizer. Draws centred text (one or more `|`-separated lines)
 *  scaled so the whole block fits within stage width and fillRatio*height. */
export const rasterizeCanvas: RasterizeFn = (text, opts) => {
  const canvas = document.createElement('canvas')
  canvas.width = opts.width
  canvas.height = opts.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.clearRect(0, 0, opts.width, opts.height)
  const lines = splitLines(text)
  const maxH = opts.height * opts.fillRatio
  const maxW = opts.width * 0.92
  // Vertical budget: a block of n lines spans font*(1 + (n-1)*gap). For n=1 this
  // reduces to `font`, so single-line sizing is identical to before.
  const vDenom = 1 + (lines.length - 1) * LINE_GAP
  let fontPx = maxH / vDenom
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // Then shrink until the widest line also fits the width (each pass rescales
  // by the overflow ratio).
  for (let i = 0; i < 8; i++) {
    ctx.font = `${opts.fontWeight} ${fontPx}px ${opts.fontFamily}`
    let w = 0
    for (const ln of lines) w = Math.max(w, ctx.measureText(ln).width)
    if (w > maxW) fontPx *= maxW / w
    else break
  }
  ctx.font = `${opts.fontWeight} ${fontPx}px ${opts.fontFamily}`
  ctx.fillStyle = '#fff'
  const lineH = fontPx * LINE_GAP
  const firstCenter = opts.height / 2 - ((lines.length - 1) * lineH) / 2
  lines.forEach((ln, i) => ctx.fillText(ln, opts.width / 2, firstCenter + i * lineH))
  const img = ctx.getImageData(0, 0, opts.width, opts.height).data
  const alpha = new Uint8ClampedArray(opts.width * opts.height)
  for (let i = 0; i < alpha.length; i++) alpha[i] = img[i * 4 + 3]
  return { alpha, width: opts.width, height: opts.height }
}

export function sampleText(text: string, opts: SampleOptions): Vec2[] {
  return sampleWithRasterizer(text, opts, rasterizeCanvas)
}
