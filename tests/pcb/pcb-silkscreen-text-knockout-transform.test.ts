import { test, expect } from "bun:test"
import { rotate } from "transformation-matrix"
import { DEFAULT_PCB_COLOR_MAP } from "lib/pcb/colors"
import { createSvgObjectsFromPcbSilkscreenText } from "lib/pcb/svg-object-fns/create-svg-objects-from-pcb-silkscreen-text"

test("knockout silkscreen text respects board rotation transform", () => {
  const ctx = {
    transform: rotate(Math.PI / 2),
    colorMap: DEFAULT_PCB_COLOR_MAP,
  }

  const [mask] = createSvgObjectsFromPcbSilkscreenText(
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_rot_ctx",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "rot",
      is_knockout: true,
    },
    ctx,
  )

  const maskText = mask.children[1]

  expect(parseFloat(maskText.attributes["font-size"])).toBeGreaterThan(0)
  expect(parseFloat(mask.attributes.width)).toBeGreaterThan(0)
  expect(parseFloat(mask.attributes.height)).toBeGreaterThan(0)
})
