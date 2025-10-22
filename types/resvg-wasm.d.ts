declare module "@resvg/resvg-wasm" {
  export type ResvgRenderOptions = {
    font?: {
      loadSystemFonts?: boolean
      fontFiles?: string[]
      fontDirs?: string[]
      defaultFontSize?: number
      defaultFontFamily?: string
      serifFamily?: string
      sansSerifFamily?: string
      cursiveFamily?: string
      fantasyFamily?: string
      monospaceFamily?: string
    }
    dpi?: number
    languages?: string[]
    shapeRendering?: 0 | 1 | 2
    textRendering?: 0 | 1 | 2
    imageRendering?: 0 | 1
    fitTo?:
      | { mode: "original" }
      | { mode: "width"; value: number }
      | { mode: "height"; value: number }
      | { mode: "zoom"; value: number }
    background?: string
    crop?: {
      left: number
      top: number
      right?: number
      bottom?: number
    }
    logLevel?: "off" | "error" | "warn" | "info" | "debug" | "trace"
  }

  export class RenderedImage {
    asPng(): Uint8Array
    readonly pixels: Uint8Array
    readonly width: number
    readonly height: number
  }

  export class Resvg {
    constructor(svg: string | Uint8Array, options?: ResvgRenderOptions | null)
    render(): RenderedImage
    toString(): string
    innerBBox():
      | { x: number; y: number; width: number; height: number }
      | undefined
    getBBox():
      | { x: number; y: number; width: number; height: number }
      | undefined
    cropByBBox(bbox: {
      x: number
      y: number
      width: number
      height: number
    }): void
    imagesToResolve(): string[]
    resolveImage(href: string, buffer: Uint8Array): void
    readonly width: number
    readonly height: number
  }

  export function initWasm(
    wasmSource:
      | ArrayBuffer
      | Uint8Array
      | Promise<ArrayBuffer>
      | { arrayBuffer(): Promise<ArrayBuffer> },
  ): Promise<void>
}
