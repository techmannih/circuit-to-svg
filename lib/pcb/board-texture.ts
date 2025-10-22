import type { SvgObject } from "lib/svg-object"
import { DEFAULT_PCB_COLOR_MAP } from "./colors"

const PCB_BOARD_TEXTURE_PATTERN_ID = "pcb-board-texture"
const TEXTURE_TILE_SIZE = 128

const DEFAULT_TEXTURE_BASE_COLOR = DEFAULT_PCB_COLOR_MAP.soldermask.top

const isNodeEnvironment =
  typeof process !== "undefined" && !!process.versions?.node

type PngRenderer = (svg: string) => Uint8Array

let rendererPromise: Promise<PngRenderer | null> | null = null

async function getPngRenderer(): Promise<PngRenderer | null> {
  if (!isNodeEnvironment) {
    return null
  }

  if (!rendererPromise) {
    rendererPromise = (async () => {
      try {
        const wasmModule: any = await import("@resvg/resvg-wasm")
        const initWasm: ((wasm: ArrayBuffer | Uint8Array) => Promise<void>) |
          undefined =
          typeof wasmModule?.default === "function"
            ? wasmModule.default
            : typeof wasmModule?.initWasm === "function"
              ? wasmModule.initWasm
              : undefined
        const Resvg = wasmModule?.Resvg

        if (initWasm && Resvg) {
          const [{ readFile }, { createRequire }] = await Promise.all([
            import("node:fs/promises"),
            import("node:module"),
          ])
          const require = createRequire(import.meta.url)
          const wasmPath = require.resolve("@resvg/resvg-wasm/index_bg.wasm")
          const wasmBytes = await readFile(wasmPath)
          await initWasm(wasmBytes)

          return (svg: string) => {
            const instance = new Resvg(svg, {
              fitTo: { mode: "original" },
            })
            return instance.render().asPng()
          }
        }

        throw new Error("Unable to initialize resvg-wasm renderer")
      } catch (wasmError) {
        try {
          const resvgJs: any = await import("@resvg/resvg-js")
          const Resvg = resvgJs?.Resvg
          if (!Resvg) {
            throw new Error("Resvg class unavailable in resvg-js")
          }

          return (svg: string) => {
            const instance = new Resvg(svg, {
              fitTo: { mode: "original" },
            })
            return instance.render().asPng()
          }
        } catch (jsError) {
          console.warn(
            "[circuit-to-svg] Failed to initialize resvg renderer for PCB board texture.",
            { jsError, wasmError },
          )
          return null
        }
      }
    })()
  }

  return rendererPromise
}

async function renderSvgToPngDataUrl(svg: string): Promise<string | null> {
  const renderer = await getPngRenderer()
  if (!renderer) {
    return null
  }

  const pngData = renderer(svg)
  return `data:image/png;base64,${Buffer.from(pngData).toString("base64")}`
}

interface RgbColor {
  r: number
  g: number
  b: number
}

function parseColor(color: string): RgbColor | null {
  const trimmed = color.trim()

  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1)
    if (hex.length === 6) {
      const r = Number.parseInt(hex.slice(0, 2), 16)
      const g = Number.parseInt(hex.slice(2, 4), 16)
      const b = Number.parseInt(hex.slice(4, 6), 16)
      return { r, g, b }
    }
    if (hex.length === 3) {
      const r = Number.parseInt(hex[0] + hex[0], 16)
      const g = Number.parseInt(hex[1] + hex[1], 16)
      const b = Number.parseInt(hex[2] + hex[2], 16)
      return { r, g, b }
    }
  }

  const rgbMatch =
    /^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(
      trimmed,
    )
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3]),
    }
  }

  return null
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function adjustColor(rgb: RgbColor, factor: number): RgbColor {
  const adjust = (channel: number) =>
    factor >= 0
      ? channel + (255 - channel) * factor
      : channel * (1 + factor)

  return {
    r: clampChannel(adjust(rgb.r)),
    g: clampChannel(adjust(rgb.g)),
    b: clampChannel(adjust(rgb.b)),
  }
}

function rgbToString({ r, g, b }: RgbColor): string {
  return `rgb(${r}, ${g}, ${b})`
}

function formatNumber(value: number): string {
  return Number(value.toFixed(2)).toString()
}

function createBoardTextureSvg(baseColor: string): string {
  const parsedColor = parseColor(baseColor) ?? parseColor("#a83232")!
  const highlight = adjustColor(parsedColor, 0.18)
  const midTone = adjustColor(parsedColor, 0.08)
  const shadow = adjustColor(parsedColor, -0.16)

  const size = TEXTURE_TILE_SIZE
  const diagonal = formatNumber(size * 0.65)
  const offscreen = formatNumber(size * 1.2)
  const negativeOffset = formatNumber(-size * 0.2)
  const diagonalMinor = formatNumber(size * 0.5)
  const strokeWidth = formatNumber(size * 0.06)
  const minorStrokeWidth = formatNumber(size * 0.04)

  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${rgbToString(parsedColor)}" />
  <path d="M0 ${diagonal} L ${diagonal} ${size} L 0 ${size} Z" fill="${rgbToString(shadow)}" opacity="0.3" />
  <path d="M${diagonal} 0 L ${size} 0 L ${size} ${diagonal} Z" fill="${rgbToString(shadow)}" opacity="0.24" />
  <path d="M0 ${formatNumber(size * 0.25)} L ${formatNumber(size * 0.25)} 0 L ${size} ${formatNumber(size * 0.75)} L ${formatNumber(size * 0.75)} ${size} Z" fill="${rgbToString(highlight)}" opacity="0.18" />
  <path d="M${negativeOffset} ${formatNumber(size * 0.6)} L ${formatNumber(size * 0.4)} ${negativeOffset} L ${offscreen} ${formatNumber(size * 0.4)} L ${formatNumber(size * 0.6)} ${offscreen} Z" fill="${rgbToString(midTone)}" opacity="0.12" />
  <path d="M0 ${size} L ${size} 0" stroke="${rgbToString(highlight)}" stroke-width="${strokeWidth}" opacity="0.12" stroke-linecap="round" />
  <path d="M0 ${diagonalMinor} L ${diagonalMinor} 0" stroke="${rgbToString(shadow)}" stroke-width="${minorStrokeWidth}" opacity="0.1" stroke-linecap="round" />
</svg>`
}

interface BoardTextureResources {
  defs: SvgObject
  fill: string
  pngDataUrl: string
}

function createBoardTextureResources(pngDataUrl: string): BoardTextureResources {
  const size = TEXTURE_TILE_SIZE.toString()

  const defs: SvgObject = {
    name: "defs",
    type: "element",
    value: "",
    attributes: {},
    children: [
      {
        name: "pattern",
        type: "element",
        value: "",
        attributes: {
          id: PCB_BOARD_TEXTURE_PATTERN_ID,
          width: size,
          height: size,
          patternUnits: "userSpaceOnUse",
        },
        children: [
          {
            name: "image",
            type: "element",
            value: "",
            attributes: {
              href: pngDataUrl,
              "xlink:href": pngDataUrl,
              width: size,
              height: size,
              preserveAspectRatio: "none",
            },
            children: [],
          },
        ],
      },
    ],
  }

  return {
    defs,
    fill: `url(#${PCB_BOARD_TEXTURE_PATTERN_ID})`,
    pngDataUrl,
  }
}

async function loadBoardTextureResources(): Promise<BoardTextureResources | null> {
  try {
    const svg = createBoardTextureSvg(DEFAULT_TEXTURE_BASE_COLOR)
    const dataUrl = await renderSvgToPngDataUrl(svg)
    if (!dataUrl) {
      return null
    }

    return createBoardTextureResources(dataUrl)
  } catch (error) {
    console.warn(
      "[circuit-to-svg] Failed to generate PCB board texture, falling back to flat fill.",
      error,
    )
    return null
  }
}

const boardTextureResources = isNodeEnvironment
  ? await loadBoardTextureResources()
  : null

export const pcbBoardTextureDefs = boardTextureResources?.defs ?? null
export const pcbBoardTextureFill = boardTextureResources?.fill ?? null
export const pcbBoardTexturePngDataUrl = boardTextureResources?.pngDataUrl ?? null
export const PCB_BOARD_TEXTURE_SUPPORTED_COLOR = DEFAULT_TEXTURE_BASE_COLOR
export { PCB_BOARD_TEXTURE_PATTERN_ID, TEXTURE_TILE_SIZE as PCB_BOARD_TEXTURE_TILE_SIZE }
