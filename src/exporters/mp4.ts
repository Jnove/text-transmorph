import type { Engine } from '../core/engine'
import { recordStream, recordingSupported } from './recorder'

const MP4_MIMES = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4']

export function mp4Supported(): boolean {
  return recordingSupported(MP4_MIMES)
}

export function exportMp4(
  engine: Engine,
  stage: HTMLCanvasElement,
  fps: number,
  durationMs: number,
): Promise<Blob> {
  return recordStream(engine, stage, fps, durationMs, MP4_MIMES, 'video/mp4')
}
