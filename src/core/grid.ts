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
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = offsetX + col * cell + cell / 2
      const cy = offsetY + row * cell + cell / 2
      const px = Math.floor(cx)
      const py = Math.floor(cy)
      if (alpha[py * width + px] >= threshold) {
        points.push({ x: cx, y: cy })
      }
    }
  }
  return points
}
