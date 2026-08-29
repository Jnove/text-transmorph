import type { Vec2 } from '../core/types'

const CIRCLE_BATCH = 512

export type DrawStyle = {
  backgroundColor: string
  dotColor: string
  dotColor2: string
  gradient: boolean
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
  if (style.gradient) {
    // A left→right gradient spanning the stage colours every dot by its x
    // position in one shot — no per-dot fillStyle churn.
    const g = ctx.createLinearGradient(0, 0, width, 0)
    g.addColorStop(0, style.dotColor)
    g.addColorStop(1, style.dotColor2)
    ctx.fillStyle = g
  } else {
    ctx.fillStyle = style.dotColor
  }
  const s = style.dotSize
  const square = style.dotShape === 'square'
  if (square) {
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      const half = (scales ? s * scales[i] : s) / 2
      ctx.fillRect(p.x - half, p.y - half, half * 2, half * 2)
    }
    return
  }
  // Keep paths bounded: very dense text can exceed browser path limits when
  // every circle is appended to one giant path.
  for (let start = 0; start < points.length; start += CIRCLE_BATCH) {
    ctx.beginPath()
    const end = Math.min(points.length, start + CIRCLE_BATCH)
    for (let i = start; i < end; i++) {
      const p = points[i]
      const half = (scales ? s * scales[i] : s) / 2
      // Move first so Canvas does not connect this circle to the previous one.
      ctx.moveTo(p.x + half, p.y)
      ctx.arc(p.x, p.y, half, 0, Math.PI * 2)
    }
    ctx.fill()
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
