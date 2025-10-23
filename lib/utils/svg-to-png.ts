import type { ResvgRenderOptions } from "./types/svg-to-png"

type ResvgCtor = new (
  svg: string | Uint8Array,
  options?: ResvgRenderOptions,
) => {
  render: () => {
    asPng: () => Uint8Array | ArrayBuffer
  }
}

interface ResvgRuntime {
  Resvg: ResvgCtor
  initWasm?: (module: any) => Promise<void>
}

let runtimePromise: Promise<ResvgRuntime> | undefined
let wasmInitialized = false

const RESVG_WASM_MODULE = "@resvg/" + "resvg-wasm"
const RESVG_JS_MODULE = "@resvg/" + "resvg-js"

async function loadResvgRuntime(): Promise<ResvgRuntime> {
  if (runtimePromise) return runtimePromise

  runtimePromise = (async () => {
    try {
      const wasmModule = (await import(RESVG_WASM_MODULE)) as ResvgRuntime & {
        default?: any
        wasmBytes?: ArrayBuffer
      }

      if (typeof wasmModule.initWasm === "function") {
        if (!wasmInitialized) {
          const wasmBinary =
            wasmModule.wasmBytes || wasmModule.default || undefined

          if (wasmBinary) {
            await wasmModule.initWasm(wasmBinary)
            wasmInitialized = true
          }
        }
        if (wasmModule.Resvg) {
          return wasmModule
        }
      }
    } catch (error) {
      const shouldWarn =
        typeof process !== "undefined" &&
        process?.env?.NODE_ENV !== "production"
      if (shouldWarn) {
        console.warn(
          "@resvg/resvg-wasm not available, falling back to @resvg/resvg-js",
          error,
        )
      }
    }

    const jsModule = (await import(RESVG_JS_MODULE)) as ResvgRuntime
    return jsModule
  })()

  return runtimePromise
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64")
  }

  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  if (typeof btoa === "function") {
    return btoa(binary)
  }

  throw new Error("No base64 encoder available in this environment")
}

export interface SvgToPngOptions {
  width?: number
  height?: number
  background?: string
  fonts?: string[]
  wasmModule?: any
}

function buildRenderOptions(options: SvgToPngOptions): ResvgRenderOptions {
  const fitTo = options.width
    ? { mode: "width", value: options.width }
    : options.height
      ? { mode: "height", value: options.height }
      : undefined

  return {
    background: options.background,
    fitTo,
    font: options.fonts?.length
      ? {
          fontFiles: options.fonts,
        }
      : undefined,
  }
}

export async function svgToPng(svg: string, options: SvgToPngOptions = {}) {
  const runtime = await loadResvgRuntime()

  if (runtime.initWasm && options.wasmModule && !wasmInitialized) {
    await runtime.initWasm(options.wasmModule)
    wasmInitialized = true
  }

  const resvg = new runtime.Resvg(svg, buildRenderOptions(options))
  const pngData = resvg.render()
  const pngBuffer = pngData.asPng()
  const bytes =
    pngBuffer instanceof Uint8Array ? pngBuffer : new Uint8Array(pngBuffer)
  return bytes
}

export async function svgToPngDataUrl(
  svg: string,
  options: SvgToPngOptions = {},
): Promise<string> {
  const png = await svgToPng(svg, options)
  return `data:image/png;base64,${toBase64(png)}`
}
