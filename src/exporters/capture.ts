import type { Engine } from '../core/engine'

export function captureFrames(
  engine: Engine,
  stage: HTMLCanvasElement,
  fps: number,
  durationMs: number,
  onFrame: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): void {
  const ctx = stage.getContext('2d')!
  const step = 1000 / fps
  const frames = Math.max(1, Math.round(durationMs / step))
  for (let i = 0; i < frames; i++) {
    engine.renderAt(i * step)
    onFrame(ctx, stage.width, stage.height)
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
