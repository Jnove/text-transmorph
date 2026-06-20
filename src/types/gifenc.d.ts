declare module 'gifenc' {
  export function GIFEncoder(opts?: { initialCapacity?: number; auto?: boolean }): {
    reset(): void
    finish(): void
    bytes(): Uint8Array<ArrayBuffer>
    bytesView(): Uint8Array<ArrayBuffer>
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      opts?: {
        transparent?: boolean
        transparentIndex?: number
        delay?: number
        palette?: number[][]
        repeat?: number
        colorDepth?: number
        dispose?: number
      },
    ): void
  }
  export function quantize(
    data: Uint8ClampedArray,
    maxColors: number,
    opts?: Record<string, unknown>,
  ): number[][]
  export function applyPalette(data: Uint8ClampedArray, palette: number[][]): Uint8Array
}
