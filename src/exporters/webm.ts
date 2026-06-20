import type { Engine } from '../core/engine'

function pickMime(): string | null {
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  if (typeof MediaRecorder === 'undefined') return null
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? null
}

export function webmSupported(): boolean {
  return typeof HTMLCanvasElement.prototype.captureStream === 'function' && pickMime() !== null
}

export function exportWebm(
  engine: Engine,
  stage: HTMLCanvasElement,
  fps: number,
  durationMs: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const mime = pickMime()
    if (!mime) return reject(new Error('浏览器不支持 WebM 录制'))
    const stream = stage.captureStream(fps)
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 })
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    rec.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }))
    rec.onerror = (e) => reject((e as any).error ?? new Error('录制失败'))

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
