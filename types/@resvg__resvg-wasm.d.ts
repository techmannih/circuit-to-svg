declare module "@resvg/resvg-wasm" {
  type FitToMode = "width" | "height" | "zoom" | "original"

  interface FitTo {
    mode: FitToMode
    value: number
  }

  export interface ResvgRenderOptions {
    background?: string
    fitTo?: FitTo
  }

  interface RenderResult {
    asPng(): Uint8Array
  }

  export class Resvg {
    constructor(svg: string, options?: ResvgRenderOptions)
    render(): RenderResult
  }

  type InitInput =
    | ArrayBuffer
    | ArrayBufferView
    | Promise<Response>
    | Response
    | WebAssembly.Module
    | string

  export function initWasm(module: InitInput): Promise<void>
}
