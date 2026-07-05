import type { Vec2 } from '../core/types'

export type DrawStyle = {
  backgroundColor: string
  dotColor: string
  dotShape: 'square' | 'circle'
  dotSize: number
}

export function drawStage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  points: Vec2[],
  style: DrawStyle,
  scales?: number[],
): void {
  ctx.fillStyle = style.backgroundColor
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = style.dotColor
  const s = style.dotSize
  const square = style.dotShape === 'square'
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const half = (scales ? s * scales[i] : s) / 2
    if (square) {
      ctx.fillRect(p.x - half, p.y - half, half * 2, half * 2)
    } else {
      ctx.beginPath()
      ctx.arc(p.x, p.y, half, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

export function blitFit(
  dst: CanvasRenderingContext2D,
  src: HTMLCanvasElement,
  dstW: number,
  dstH: number,
  bg: string,
): void {
  dst.fillStyle = bg
  dst.fillRect(0, 0, dstW, dstH)
  const scale = Math.min(dstW / src.width, dstH / src.height)
  const w = src.width * scale
  const h = src.height * scale
  dst.drawImage(src, (dstW - w) / 2, (dstH - h) / 2, w, h)
}
