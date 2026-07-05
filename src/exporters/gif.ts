import { GIFEncoder, quantize, applyPalette } from 'gifenc'
import type { Engine } from '../core/engine'
import { captureFrames } from './capture'

export async function exportGif(
  engine: Engine,
  stage: HTMLCanvasElement,
  fps: number,
  durationMs: number,
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const gif = GIFEncoder()
  const delay = Math.round(1000 / fps)
  await captureFrames(
    engine, stage, fps, durationMs,
    (ctx, w, h) => {
      const { data } = ctx.getImageData(0, 0, w, h)
      const palette = quantize(data, 256)
      const index = applyPalette(data, palette)
      gif.writeFrame(index, w, h, { palette, delay })
    },
    onProgress,
  )
  gif.finish()
  return new Blob([gif.bytes()], { type: 'image/gif' })
}
