import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import type { Engine } from '../core/engine'
import { exportWebm } from './webm'

let ffmpeg: FFmpeg | null = null

async function getFFmpeg(onProgress?: (m: string) => void): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg
  const instance = new FFmpeg()
  const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  onProgress?.('正在加载转码核心（首次约 30MB）…')
  await instance.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
  })
  ffmpeg = instance
  return instance
}

export async function exportMp4(
  engine: Engine,
  stage: HTMLCanvasElement,
  fps: number,
  durationMs: number,
  onProgress?: (msg: string) => void,
): Promise<Blob> {
  onProgress?.('正在录制源视频…')
  const webm = await exportWebm(engine, stage, fps, durationMs)
  const ff = await getFFmpeg(onProgress)
  onProgress?.('正在转码为 MP4…')
  await ff.writeFile('in.webm', await fetchFile(webm))
  await ff.exec([
    '-i', 'in.webm',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    'out.mp4',
  ])
  const data = await ff.readFile('out.mp4')
  // readFile returns FileData (Uint8Array | string); we always get binary here.
  // Slice into a fresh Uint8Array backed by a plain ArrayBuffer so Blob() accepts it.
  const raw = data as Uint8Array
  const bytes = raw.buffer instanceof ArrayBuffer
    ? new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength)
    : new Uint8Array(raw)
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'video/mp4' })
}
