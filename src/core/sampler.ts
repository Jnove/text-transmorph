import type { Vec2 } from './types'
import { pointsFromAlpha } from './grid'

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
  if (!text) return []
  const { alpha, width, height } = rasterize(text, opts)
  return pointsFromAlpha(alpha, width, height, opts.cell, opts.threshold)
}

/** Real DOM rasterizer. Draws centred text scaled to fillRatio*height. */
export const rasterizeCanvas: RasterizeFn = (text, opts) => {
  const canvas = document.createElement('canvas')
  canvas.width = opts.width
  canvas.height = opts.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.clearRect(0, 0, opts.width, opts.height)
  // Binary-search a font size so the text fits within width and fillRatio*height.
  const maxH = opts.height * opts.fillRatio
  let fontPx = maxH
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < 8; i++) {
    ctx.font = `${opts.fontWeight} ${fontPx}px ${opts.fontFamily}`
    const w = ctx.measureText(text).width
    const maxW = opts.width * 0.92
    if (w > maxW) fontPx *= maxW / w
    else break
  }
  ctx.font = `${opts.fontWeight} ${fontPx}px ${opts.fontFamily}`
  ctx.fillStyle = '#fff'
  ctx.fillText(text, opts.width / 2, opts.height / 2)
  const img = ctx.getImageData(0, 0, opts.width, opts.height).data
  const alpha = new Uint8ClampedArray(opts.width * opts.height)
  for (let i = 0; i < alpha.length; i++) alpha[i] = img[i * 4 + 3]
  return { alpha, width: opts.width, height: opts.height }
}

export function sampleText(text: string, opts: SampleOptions): Vec2[] {
  return sampleWithRasterizer(text, opts, rasterizeCanvas)
}
