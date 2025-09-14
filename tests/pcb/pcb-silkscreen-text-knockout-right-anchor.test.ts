import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "lib"

test("knockout silkscreen text right anchors", () => {
  const result = convertCircuitJsonToPcbSvg([
    {
      type: "pcb_board",
      width: 12,
      height: 12,
      center: { x: 0, y: 0 },
      num_layers: 2,
      pcb_board_id: "pcb_board_0",
      thickness: 1.2,
      material: "fr1",
    },
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_top_right_knockout",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 3, y: 3 },
      anchor_alignment: "top_right",
      text: "top_right",
      is_knockout: true,
    } as any,
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_center_right_knockout",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 3, y: 0 },
      anchor_alignment: "center_right",
      text: "center_right",
      is_knockout: true,
    } as any,
    {
      type: "pcb_silkscreen_text",
      layer: "top",
      pcb_silkscreen_text_id: "pcb_silkscreen_text_bottom_right_knockout",
      font: "tscircuit2024",
      font_size: 1,
      pcb_component_id: "pcb_generic_component_0",
      anchor_position: { x: 3, y: -3 },
      anchor_alignment: "bottom_right",
      text: "bottom_right",
      is_knockout: true,
    } as any,
  ])

  expect(result).toMatchSvgSnapshot(import.meta.path)
})
