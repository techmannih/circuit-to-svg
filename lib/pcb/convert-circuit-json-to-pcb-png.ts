import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "./convert-circuit-json-to-pcb-svg"
import type { ConvertCircuitJsonToPcbSvgOptions } from "./convert-circuit-json-to-pcb-svg"

type ResvgFitToMode = "width" | "height" | "zoom" | "original"

interface ResvgRenderFitTo {
  mode: ResvgFitToMode
  value: number
}

interface ResvgRenderOptions {
  background?: string
  fitTo?: ResvgRenderFitTo
}

interface ResvgRenderResult {
  asPng(): Uint8Array
}

interface ResvgInstance {
  render(): ResvgRenderResult
}

interface ResvgConstructor {
  new (svg: string, options?: ResvgRenderOptions): ResvgInstance
}

interface ResvgWasmModule {
  initWasm(module: ResvgWasmInitInput): Promise<void>
  Resvg: ResvgConstructor
}

type ResvgWasmInitInput =
  | ArrayBuffer
  | ArrayBufferView
  | Promise<Response>
  | Response
  | WebAssembly.Module
  | string

export type PcbPngOutputFormat = "uint8array" | "buffer" | "data-url"

export type ConvertCircuitJsonToPcbPngResult<
  Output extends PcbPngOutputFormat | undefined,
> = Output extends "buffer"
  ? Buffer
  : Output extends "data-url"
    ? string
    : Uint8Array

export interface ConvertCircuitJsonToPcbPngOptions<
  Output extends PcbPngOutputFormat | undefined = undefined,
> extends ConvertCircuitJsonToPcbSvgOptions {
  output?: Output
  resvgModule?: ResvgWasmModule
  resvgModuleLoader?: () => Promise<ResvgWasmModule>
  resvgInitModule?: ResvgWasmInitInput
  resvgRenderOptions?: ResvgRenderOptions
}

const defaultModuleInitState = new WeakMap<
  ResvgWasmModule,
  Promise<void> | boolean
>()

async function loadDefaultResvgModule(): Promise<ResvgWasmModule> {
  try {
    const mod = (await import("@resvg/resvg-wasm")) as ResvgWasmModule
    return mod
  } catch (error) {
    throw new Error(
      "`@resvg/resvg-wasm` must be installed to render PCB textures. Install it or provide `resvgModule` explicitly.",
      error instanceof Error ? { cause: error } : undefined,
    )
  }
}

async function resolveWasmPath(): Promise<string> {
  const specifier = "@resvg/resvg-wasm/index_bg.wasm"
  const metaResolve = (
    import.meta as unknown as {
      resolve?: (specifier: string) => string | Promise<string>
    }
  ).resolve

  if (typeof metaResolve === "function") {
    try {
      const resolved = await metaResolve(specifier)
      if (resolved) {
        return resolved
      }
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code: string }).code === "ERR_MODULE_NOT_FOUND"
      ) {
        // Fall back to createRequire resolution below
      } else {
        throw error
      }
    }
  }

  const { createRequire } = await import("module")
  const require = createRequire(import.meta.url)
  return require.resolve(specifier)
}

async function loadDefaultWasmBinary(): Promise<ResvgWasmInitInput> {
  try {
    const wasmPath = await resolveWasmPath()
    const { readFile } = await import("fs/promises")
    return await readFile(wasmPath)
  } catch (error) {
    throw new Error(
      "Failed to load the default Resvg WASM binary. Provide `resvgInitModule` when calling `convertCircuitJsonToPcbPng`.",
      error instanceof Error ? { cause: error } : undefined,
    )
  }
}

async function ensureModuleInitialized(
  module: ResvgWasmModule,
  initInput?: ResvgWasmInitInput,
): Promise<void> {
  const current = defaultModuleInitState.get(module)
  if (current === true) {
    return
  }

  if (current) {
    await current
    return
  }

  const promise = (async () => {
    const wasmInput = initInput ?? (await loadDefaultWasmBinary())
    await module.initWasm(wasmInput)
    defaultModuleInitState.set(module, true)
  })()

  defaultModuleInitState.set(module, promise)
  await promise
}

function buildResvgRenderOptions(
  options?: ConvertCircuitJsonToPcbPngOptions<PcbPngOutputFormat | undefined>,
): ResvgRenderOptions | undefined {
  if (!options) return undefined

  const renderOptions: ResvgRenderOptions = {
    ...options.resvgRenderOptions,
  }

  if (!renderOptions.fitTo) {
    if (options.width) {
      renderOptions.fitTo = { mode: "width", value: options.width }
    } else if (options.height) {
      renderOptions.fitTo = { mode: "height", value: options.height }
    }
  }

  if (options.backgroundColor && renderOptions.background === undefined) {
    renderOptions.background = options.backgroundColor
  }

  return renderOptions
}

export async function convertCircuitJsonToPcbPng<
  Output extends PcbPngOutputFormat | undefined = undefined,
>(
  circuitJson: AnyCircuitElement[],
  options?: ConvertCircuitJsonToPcbPngOptions<Output>,
): Promise<ConvertCircuitJsonToPcbPngResult<Output>> {
  const svgOptions: ConvertCircuitJsonToPcbSvgOptions | undefined = options
  const svgString = convertCircuitJsonToPcbSvg(circuitJson, svgOptions)

  const module = options?.resvgModule
    ? options.resvgModule
    : options?.resvgModuleLoader
      ? await options.resvgModuleLoader()
      : await loadDefaultResvgModule()

  await ensureModuleInitialized(module, options?.resvgInitModule)

  const renderOptions = buildResvgRenderOptions(options)
  const resvg = new module.Resvg(svgString, renderOptions)
  const pngBytes = resvg.render().asPng()

  if (options?.output === "buffer") {
    return Buffer.from(pngBytes) as ConvertCircuitJsonToPcbPngResult<Output>
  }

  if (options?.output === "data-url") {
    const buffer = Buffer.from(pngBytes)
    return `data:image/png;base64,${buffer.toString("base64")}` as ConvertCircuitJsonToPcbPngResult<Output>
  }

  return pngBytes as ConvertCircuitJsonToPcbPngResult<Output>
}
