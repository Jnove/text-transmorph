import type { Engine } from '../core/engine'
import { recordStream, recordingSupported } from './recorder'

const WEBM_MIMES = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']

export function webmSupported(): boolean {
  return recordingSupported(WEBM_MIMES)
}

export function exportWebm(
  engine: Engine,
  stage: HTMLCanvasElement,
  fps: number,
  durationMs: number,
): Promise<Blob> {
  return recordStream(engine, stage, fps, durationMs, WEBM_MIMES, 'video/webm')
}
