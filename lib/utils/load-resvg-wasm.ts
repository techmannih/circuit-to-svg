import type { ResvgRenderOptions } from "@resvg/resvg-wasm"

interface ResvgConstructor {
  new (
    svg: string | Uint8Array,
    options?: ResvgRenderOptions | null,
  ): {
    render(): {
      asPng(): Uint8Array
    }
  }
}

interface ResvgModule {
  Resvg: ResvgConstructor
}

let resvgModulePromise: Promise<ResvgModule> | undefined
let wasmBinaryPromise: Promise<Uint8Array> | undefined

async function loadWasmBinary(): Promise<Uint8Array> {
  if (wasmBinaryPromise) {
    return wasmBinaryPromise
  }

  wasmBinaryPromise = (async () => {
    try {
      const { createRequire } = await import("node:module")
      const require = createRequire(import.meta.url)
      const wasmPath = require.resolve("@resvg/resvg-wasm/index_bg.wasm")
      const { readFile } = await import("node:fs/promises")
      return await readFile(wasmPath)
    } catch (nodeError) {
      const fetchFn = (globalThis as { fetch?: unknown }).fetch as
        | undefined
        | ((input: unknown) => Promise<{
            ok: boolean
            status: number
            statusText?: string
            arrayBuffer(): Promise<ArrayBuffer>
          }>)

      if (typeof fetchFn === "function") {
        let resolvedSpecifier = "@resvg/resvg-wasm/index_bg.wasm"
        const metaWithResolve = import.meta as ImportMeta & {
          resolve?: (specifier: string) => Promise<string> | string
        }

        if (typeof metaWithResolve.resolve === "function") {
          try {
            const possible = await metaWithResolve.resolve(
              "@resvg/resvg-wasm/index_bg.wasm",
            )
            if (typeof possible === "string") {
              resolvedSpecifier = possible
            }
          } catch {
            // Ignore resolve errors and fall back to the bare specifier.
          }
        }

        const response = await fetchFn(resolvedSpecifier)

        if (!response.ok) {
          throw new Error(
            `Failed to fetch @resvg/resvg-wasm binary (status: ${response.status}${response.statusText ? ` ${response.statusText}` : ""})`,
          )
        }

        return new Uint8Array(await response.arrayBuffer())
      }

      throw new Error(
        "Unable to load @resvg/resvg-wasm/index_bg.wasm. Ensure the package is installed and accessible.",
      )
    }
  })()

  return wasmBinaryPromise
}

async function loadResvgModule(): Promise<ResvgModule> {
  if (!resvgModulePromise) {
    resvgModulePromise = (async () => {
      const wasmModule = await import("@resvg/resvg-wasm")

      if (typeof wasmModule.initWasm === "function") {
        const wasmBinary = await loadWasmBinary()
        await wasmModule.initWasm(wasmBinary)
      }

      return { Resvg: wasmModule.Resvg as ResvgConstructor }
    })().catch((error) => {
      resvgModulePromise = undefined
      throw new Error(
        "Failed to initialize @resvg/resvg-wasm. Please ensure the dependency is installed correctly.",
        { cause: error },
      )
    })
  }

  return resvgModulePromise
}

export async function getResvg(): Promise<ResvgConstructor> {
  const module = await loadResvgModule()
  return module.Resvg
}
