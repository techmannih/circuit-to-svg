import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("knockout silkscreen text with rotation", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      center: { x: 0, y: 0 },
      width: 8,
      height: 8,
      subcircuit_id: "pcb_generic_component_0",
      material: "fr4",
      num_layers: 2,
      pcb_board_id: "pcb_board_0",
      thickness: 1,
      is_subcircuit: false,
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_rot",
      font: "tscircuit2024",
      font_size: 0.5,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 0, y: 0 },
      anchor_alignment: "center",
      text: "rot",
      ccw_rotation: 45,
      is_knockout: true,
    },
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path)
})
