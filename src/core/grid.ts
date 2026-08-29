import type { Vec2 } from './types'

export function gridDimensions(
  width: number,
  height: number,
  cell: number,
): { cols: number; rows: number; offsetX: number; offsetY: number } {
  const cols = Math.floor(width / cell)
  const rows = Math.floor(height / cell)
  const offsetX = (width - cols * cell) / 2
  const offsetY = (height - rows * cell) / 2
  return { cols, rows, offsetX, offsetY }
}

export function pointsFromAlpha(
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  cell: number,
  threshold: number,
): Vec2[] {
  const { cols, rows, offsetX, offsetY } = gridDimensions(width, height, cell)
  const points: Vec2[] = []
  // A subpixel cell can visit the same raster pixel more than once. The source
  // image has no extra information there, so keep one representative point
  // instead of stacking duplicate particles and amplifying antialiasing.
  const seenPixels = cell < 1 ? new Uint8Array(width * height) : null
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = offsetX + col * cell + cell / 2
      const cy = offsetY + row * cell + cell / 2
      const px = Math.floor(cx)
      const py = Math.floor(cy)
      const index = py * width + px
      if (alpha[index] < threshold) continue
      if (seenPixels && seenPixels[index]) continue
      if (seenPixels) seenPixels[index] = 1
      points.push(seenPixels ? { x: px + 0.5, y: py + 0.5 } : { x: cx, y: cy })
    }
  }
  return points
}
