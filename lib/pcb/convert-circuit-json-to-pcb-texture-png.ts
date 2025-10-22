import type { AnyCircuitElement } from "circuit-json"
import type { ResvgRenderOptions } from "@resvg/resvg-wasm"
import { convertCircuitJsonToPcbSvg } from "./convert-circuit-json-to-pcb-svg"
import { getResvg } from "../utils/load-resvg-wasm"

type PcbSvgOptions = Parameters<typeof convertCircuitJsonToPcbSvg>[1]

export interface ConvertCircuitJsonToPcbTexturePngOptions
  extends PcbSvgOptions {
  /**
   * Additional rendering options forwarded to Resvg when rasterizing the SVG
   * into a PNG texture. Useful for adjusting DPI, scaling, or background color.
   */
  resvgOptions?: ResvgRenderOptions
}

function mergeRenderOptions(
  options?: ConvertCircuitJsonToPcbTexturePngOptions,
): ResvgRenderOptions | undefined {
  let renderOptions: ResvgRenderOptions | undefined

  if (options?.resvgOptions) {
    renderOptions = { ...options.resvgOptions }
  }

  if (options?.backgroundColor !== undefined) {
    if (renderOptions) {
      if (renderOptions.background === undefined) {
        renderOptions.background = options.backgroundColor
      }
    } else {
      renderOptions = { background: options.backgroundColor }
    }
  }

  return renderOptions
}

export async function convertCircuitJsonToPcbTexturePng(
  circuitJson: AnyCircuitElement[],
  options?: ConvertCircuitJsonToPcbTexturePngOptions,
): Promise<Uint8Array> {
  const svg = convertCircuitJsonToPcbSvg(circuitJson, options)
  const renderOptions = mergeRenderOptions(options)
  const Resvg = await getResvg()
  const renderer = new Resvg(svg, renderOptions ?? null)
  const pngData = renderer.render().asPng()
  return pngData instanceof Uint8Array ? pngData : new Uint8Array(pngData)
}
