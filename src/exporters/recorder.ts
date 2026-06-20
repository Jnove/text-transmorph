import type { Engine } from '../core/engine'

/** First MediaRecorder mime in the candidate list the browser supports, or null. */
export function pickSupportedMime(candidates: string[]): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? null
}

/** True when canvas.captureStream and at least one candidate mime are available. */
export function recordingSupported(candidates: string[]): boolean {
  return (
    typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    pickSupportedMime(candidates) !== null
  )
}

/**
 * Records one deterministic cycle of the engine to a video Blob via MediaRecorder.
 * Drives engine.renderAt in real time against the canvas capture stream, then
 * renders a final frame at durationMs-1 and stops.
 */
export function recordStream(
  engine: Engine,
  stage: HTMLCanvasElement,
  fps: number,
  durationMs: number,
  candidates: string[],
  blobType: string,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const mime = pickSupportedMime(candidates)
    if (!mime) return reject(new Error('浏览器不支持该录制格式'))
    const stream = stage.captureStream(fps)
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 })
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      resolve(new Blob(chunks, { type: blobType }))
    }
    rec.onerror = (e) =>
      reject((e as unknown as { error?: Error }).error ?? new Error('录制失败'))

    const start = performance.now()
    rec.start()
    const tick = (now: number) => {
      const t = now - start
      if (t >= durationMs) {
        engine.renderAt(durationMs - 1)
        rec.stop()
        return
      }
      engine.renderAt(t)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}
