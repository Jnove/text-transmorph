import type { Engine } from '../core/engine'

/**
 * Renders one deterministic cycle frame by frame, yielding to the event loop
 * between frames so the UI (status text, preview blit) stays responsive while
 * heavy per-frame work (e.g. GIF quantization) runs.
 */
export async function captureFrames(
  engine: Engine,
  stage: HTMLCanvasElement,
  fps: number,
  durationMs: number,
  onFrame: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const ctx = stage.getContext('2d')!
  const step = 1000 / fps
  const frames = Math.max(1, Math.round(durationMs / step))
  for (let i = 0; i < frames; i++) {
    engine.renderAt(i * step)
    onFrame(ctx, stage.width, stage.height)
    onProgress?.(i + 1, frames)
    await new Promise((r) => requestAnimationFrame(r))
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
