import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "./convert-circuit-json-to-pcb-svg"

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

export type ResvgWasmInput =
  | WebAssembly.Module
  | ArrayBuffer
  | Uint8Array
  | Uint8ClampedArray
  | Int8Array
  | Uint16Array
  | Int16Array
  | Uint32Array
  | Int32Array
  | Float32Array
  | Float64Array
  | DataView

export interface ResvgRenderInitOptions {
  fitTo?:
    | { mode: "width"; value: number }
    | { mode: "height"; value: number }
    | { mode: "zoom"; value: number }
    | { mode: "original" }
  background?: string
  font?: {
    fontFiles?: string[]
    defaultFontFamily?: string
    loadSystemFonts?: boolean
  }
  [key: string]: unknown
}

export interface ResvgInstanceLike {
  render(): ResvgRenderResult
}

export interface ResvgRenderResult {
  width: number
  height: number
  asPng(): Uint8Array
}

export interface ResvgConstructorLike {
  new (svg: string, options?: ResvgRenderInitOptions): ResvgInstanceLike
}

export interface ResvgModuleLike {
  initWasm?: (
    module: ResvgWasmInput,
    importObject?: WebAssembly.Imports,
  ) => Promise<void>
  Resvg: ResvgConstructorLike
}

export type ResvgModuleLoader =
  | ResvgModuleLike
  | Promise<ResvgModuleLike>
  | (() => Promise<ResvgModuleLike>)

export type ResvgWasmLoader =
  | ResvgWasmInput
  | Promise<ResvgWasmInput>
  | (() => Promise<ResvgWasmInput>)

export type ConvertCircuitJsonToPcbSvgOptions = NonNullable<
  Parameters<typeof convertCircuitJsonToPcbSvg>[1]
>

export interface ConvertCircuitJsonToPcbTexturePngOptions
  extends Omit<ConvertCircuitJsonToPcbSvgOptions, "width" | "height"> {
  /**
   * Desired texture width (in pixels). Defaults to 1024.
   */
  textureWidth?: number
  /**
   * Desired texture height (in pixels). Defaults to the same value as
   * `textureWidth`.
   */
  textureHeight?: number
  /**
   * Resvg WASM module (or loader) that provides the `Resvg` constructor and
   * optional `initWasm` initializer.
   */
  resvgModule: ResvgModuleLoader
  /**
   * WASM binary/module or loader. If provided and the resvg module exposes an
   * `initWasm` function it will be invoked before rendering.
   */
  wasmModule?: ResvgWasmLoader
  /**
   * Optional import object forwarded to `initWasm`.
   */
  wasmImportObject?: WebAssembly.Imports
  /**
   * Additional options forwarded to the Resvg constructor.
   */
  resvgOptions?: ResvgRenderInitOptions
  /**
   * Controls which outputs are returned. Defaults to `"uint8array"`.
   */
  output?: "uint8array" | "data-url" | "both"
}

export interface ConvertCircuitJsonToPcbTexturePngResult {
  png: Uint8Array
  width: number
  height: number
  dataUrl?: string
}

const DEFAULT_TEXTURE_SIZE = 1024

export async function convertCircuitJsonToPcbTexturePng(
  circuitJson: AnyCircuitElement[],
  options: ConvertCircuitJsonToPcbTexturePngOptions,
): Promise<ConvertCircuitJsonToPcbTexturePngResult> {
  if (!options?.resvgModule) {
    throw new Error("resvgModule must be provided to render PCB textures")
  }

  const {
    resvgModule,
    wasmModule,
    wasmImportObject,
    resvgOptions,
    textureWidth = DEFAULT_TEXTURE_SIZE,
    textureHeight,
    output = "uint8array",
    ...svgOptions
  } = options

  const resolvedResvgModule = await resolveResvgModule(resvgModule)

  if (resolvedResvgModule?.initWasm && wasmModule !== undefined) {
    const resolvedWasmModule = await resolveWasmModule(wasmModule)
    await resolvedResvgModule.initWasm(resolvedWasmModule, wasmImportObject)
  }

  const pcbSvg = convertCircuitJsonToPcbSvg(circuitJson, {
    ...svgOptions,
    drawPaddingOutsideBoard: svgOptions.drawPaddingOutsideBoard ?? false,
    matchBoardAspectRatio: svgOptions.matchBoardAspectRatio ?? true,
    width: textureWidth,
    height: textureHeight ?? textureWidth,
  })

  const preparedResvgOptions = prepareResvgOptions(
    resvgOptions,
    textureWidth,
    textureHeight,
    svgOptions.backgroundColor,
  )

  const resvgInstance = new resolvedResvgModule.Resvg(
    pcbSvg,
    preparedResvgOptions,
  )
  const renderResult = resvgInstance.render()
  const pngBytes = renderResult.asPng()

  const result: ConvertCircuitJsonToPcbTexturePngResult = {
    png: pngBytes,
    width: renderResult.width,
    height: renderResult.height,
  }

  if (output === "data-url" || output === "both") {
    const base64 = encodeBase64(pngBytes)
    result.dataUrl = `data:image/png;base64,${base64}`
  }

  return result
}

async function resolveResvgModule(
  loader: ResvgModuleLoader,
): Promise<ResvgModuleLike> {
  if (typeof loader === "function") {
    return loader()
  }
  return await loader
}

async function resolveWasmModule(
  loader: ResvgWasmLoader,
): Promise<ResvgWasmInput> {
  if (typeof loader === "function") {
    return loader()
  }
  return await loader
}

function prepareResvgOptions(
  resvgOptions: ResvgRenderInitOptions | undefined,
  textureWidth: number,
  textureHeight: number | undefined,
  fallbackBackground: string | undefined,
): ResvgRenderInitOptions {
  const options: ResvgRenderInitOptions = {
    ...resvgOptions,
  }

  if (!options.fitTo) {
    options.fitTo = textureHeight
      ? { mode: "height", value: textureHeight }
      : { mode: "width", value: textureWidth }
  }

  if (options.background === undefined && fallbackBackground !== undefined) {
    options.background = fallbackBackground
  }

  return options
}

function encodeBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64")
  }

  let output = ""
  let i = 0
  while (i + 2 < bytes.length) {
    output += BASE64_ALPHABET[bytes[i] >> 2]
    output += BASE64_ALPHABET[((bytes[i] & 0x03) << 4) | (bytes[i + 1] >> 4)]
    output +=
      BASE64_ALPHABET[((bytes[i + 1] & 0x0f) << 2) | (bytes[i + 2] >> 6)]
    output += BASE64_ALPHABET[bytes[i + 2] & 0x3f]
    i += 3
  }

  const remaining = bytes.length - i
  if (remaining === 1) {
    const byte = bytes[i]
    output += BASE64_ALPHABET[byte >> 2]
    output += BASE64_ALPHABET[(byte & 0x03) << 4]
    output += "=="
  } else if (remaining === 2) {
    const byte1 = bytes[i]
    const byte2 = bytes[i + 1]
    output += BASE64_ALPHABET[byte1 >> 2]
    output += BASE64_ALPHABET[((byte1 & 0x03) << 4) | (byte2 >> 4)]
    output += BASE64_ALPHABET[(byte2 & 0x0f) << 2]
    output += "="
  }

  return output
}
