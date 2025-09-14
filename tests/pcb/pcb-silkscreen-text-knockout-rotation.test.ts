import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("knockout silkscreen text with rotation", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      width: 8,
      height: 8,
      center: { x: 0, y: 0 },
      num_layers: 2,
      pcb_board_id: "pcb_board_0",
      thickness: 1.2,
      material: "fr1",
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_rotated_knockout",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "rotated",
      ccw_rotation: 90,
      is_knockout: true,
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path)
})
