import type { AnyCircuitElement, PcbBoard, PcbPanel, Point } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "./convert-circuit-json-to-pcb-svg"
import { svgToPngDataUrl } from "../utils/svg-to-png"

export interface RenderPcbLayerOptions {
  layer: "top" | "bottom"
  resolution?: number
  backgroundColor?: string
  copperColor?: string
  silkscreenColor?: string
  drillColor?: string
}

export interface RenderPcbTexturesOptions {
  resolution?: number
  topBackgroundColor?: string
  bottomBackgroundColor?: string
}

export interface PcbBoxTextureOptions extends RenderPcbTexturesOptions {
  boardThickness?: number
  fallbackColor?: string
}

interface BoardDimensions {
  center: { x: number; y: number }
  width: number
  height: number
}

export interface TexturedBox {
  center: { x: number; y: number; z: number }
  size: { x: number; y: number; z: number }
  texture?: { top?: string; bottom?: string }
  color?: string
}

export async function renderPcbLayerToPng(
  circuitJson: AnyCircuitElement[],
  options: RenderPcbLayerOptions,
): Promise<string> {
  const {
    layer,
    resolution = 1024,
    backgroundColor = "transparent",
    copperColor = "#ffe066",
    silkscreenColor = "#ffffff",
    drillColor = "rgba(0,0,0,0.5)",
  } = options

  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    layer,
    matchBoardAspectRatio: true,
    backgroundColor,
    drawPaddingOutsideBoard: false,
    colorOverrides: {
      soldermask: {
        top: "#4CAF50",
        bottom: "#4CAF50",
      },
      copper: {
        top: copperColor,
        bottom: copperColor,
      },
      silkscreen: {
        top: silkscreenColor,
        bottom: silkscreenColor,
      },
      drill: drillColor,
    },
  })

  return await svgToPngDataUrl(svg, {
    width: resolution,
    background: backgroundColor,
  })
}

export async function renderPcbTextures(
  circuitJson: AnyCircuitElement[],
  options: RenderPcbTexturesOptions = {},
): Promise<{ top: string; bottom: string }> {
  const {
    resolution = 1024,
    topBackgroundColor = "#008C00",
    bottomBackgroundColor = "#006600",
  } = options

  const [top, bottom] = await Promise.all([
    renderPcbLayerToPng(circuitJson, {
      layer: "top",
      resolution,
      backgroundColor: topBackgroundColor,
    }),
    renderPcbLayerToPng(circuitJson, {
      layer: "bottom",
      resolution,
      backgroundColor: bottomBackgroundColor,
    }),
  ])

  return { top, bottom }
}

export async function createTexturedPcbBox(
  circuitJson: AnyCircuitElement[],
  options: PcbBoxTextureOptions = {},
): Promise<TexturedBox> {
  const board = findPrimaryBoard(circuitJson)
  if (!board) {
    throw new Error("No pcb_board element found in circuit JSON")
  }

  const thickness = options.boardThickness ?? 1.6
  let textures: { top: string; bottom: string } | undefined

  try {
    textures = await renderPcbTextures(circuitJson, options)
  } catch (error) {
    console.warn("Failed to render PCB textures", error)
  }

  const width = Number(board.width)
  const height = Number(board.height)
  const centerX = Number(board.center.x)
  const centerY = Number(board.center.y)

  return {
    center: {
      x: centerX,
      y: 0,
      z: centerY,
    },
    size: {
      x: width,
      y: thickness,
      z: height,
    },
    texture: textures,
    color: textures
      ? undefined
      : (options.fallbackColor ?? "rgba(0,140,0,0.8)"),
  }
}

function findPrimaryBoard(
  circuitJson: AnyCircuitElement[],
): BoardDimensions | undefined {
  let candidate: BoardDimensions | undefined

  for (const element of circuitJson) {
    if (element.type === "pcb_board") {
      const board = element as PcbBoard
      candidate = normalizeBoard(board)
    } else if (!candidate && element.type === "pcb_panel") {
      const panel = element as PcbPanel
      candidate = {
        center: { x: Number(panel.width) / 2, y: Number(panel.height) / 2 },
        width: Number(panel.width),
        height: Number(panel.height),
      }
    }
  }

  return candidate
}

function normalizeBoard(board: PcbBoard): BoardDimensions {
  if (board.outline && board.outline.length >= 3) {
    const outline = board.outline as Point[]
    const xs = outline.map((point) => point.x)
    const ys = outline.map((point) => point.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    return {
      center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
      width: maxX - minX,
      height: maxY - minY,
    }
  }

  return {
    center: {
      x: Number(board.center?.x ?? 0),
      y: Number(board.center?.y ?? 0),
    },
    width: Number(board.width),
    height: Number(board.height),
  }
}
