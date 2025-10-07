import type { CopperLayerName } from "./colors"

export const COPPER_LAYER_DRAW_ORDER: CopperLayerName[] = [
  "bottom",
  "inner6",
  "inner5",
  "inner4",
  "inner3",
  "inner2",
  "inner1",
  "top",
]

const PRIORITY_MAP = new Map(
  COPPER_LAYER_DRAW_ORDER.map((layer, index) => [layer, index] as const),
)

export function getCopperLayerPriority(layer?: string) {
  if (!layer) return -1
  const priority = PRIORITY_MAP.get(layer as CopperLayerName)
  return priority ?? PRIORITY_MAP.size
}

export function isCopperLayerName(layer?: string): layer is CopperLayerName {
  return PRIORITY_MAP.has(layer as CopperLayerName)
}
